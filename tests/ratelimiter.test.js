/*
 * ratelimiter.test.js — deterministic tests for every algorithm taught
 * on the site. Uses Node's built-in test runner and the SAME shared
 * implementations from js/ratelimiter.js, with an injectable fake
 * clock so no test ever depends on real wall-clock time.
 *
 * Run with:  node tests/ratelimiter.test.js
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  TokenBucket,
  FixedWindow,
  SlidingWindowLog,
  SlidingWindowCounter,
  makeFakeClock,
} = require('../js/ratelimiter.js');

/* ==================== TOKEN BUCKET ==================== */

test('TokenBucket: starts full, allows exactly up to capacity in a burst', () => {
  const clock = makeFakeClock(0);
  const bucket = new TokenBucket(5, 1, clock.now);

  const results = [];
  for (let i = 0; i < 6; i++) results.push(bucket.allowRequest());

  assert.deepStrictEqual(results, [true, true, true, true, true, false]);
  assert.strictEqual(bucket.peekTokens(), 0);
});

test('TokenBucket: lazy refill adds elapsedSeconds * refillRate tokens', () => {
  const clock = makeFakeClock(0);
  const bucket = new TokenBucket(5, 1, clock.now);

  for (let i = 0; i < 5; i++) assert.strictEqual(bucket.allowRequest(), true);

  clock.advance(3000); // 3 sec * 1 token/sec = 3 tokens
  assert.strictEqual(bucket.peekTokens(), 3);
  assert.strictEqual(bucket.allowRequest(), true);
  assert.strictEqual(bucket.allowRequest(), true);
  assert.strictEqual(bucket.allowRequest(), true);
  assert.strictEqual(bucket.allowRequest(), false);
});

test('TokenBucket: fractional refill only grants whole tokens', () => {
  const clock = makeFakeClock(0);
  const bucket = new TokenBucket(5, 2, clock.now); // 2 tokens/sec
  for (let i = 0; i < 5; i++) bucket.allowRequest();

  clock.advance(750); // 750ms * 2/sec = 1.5 tokens -> 1 request fits
  assert.strictEqual(bucket.allowRequest(), true);
  assert.strictEqual(bucket.allowRequest(), false); // 0.5 token left, not enough
});

test('TokenBucket: getRemaining returns floor of current tokens', () => {
  const clock = makeFakeClock(0);
  const bucket = new TokenBucket(5, 2, clock.now); // 2 tokens/sec
  for (let i = 0; i < 5; i++) bucket.allowRequest();
  assert.strictEqual(bucket.getRemaining(), 0);

  clock.advance(750); // 750ms * 2/sec = 1.5 tokens
  assert.strictEqual(bucket.getRemaining(), 1); // Math.floor(1.5) = 1
});

test('TokenBucket: refill is capped at capacity (no infinite banking)', () => {
  const clock = makeFakeClock(0);
  const bucket = new TokenBucket(5, 1, clock.now);

  clock.advance(10_000); // 10 seconds pass with no traffic
  assert.strictEqual(bucket.peekTokens(), 5); // still capped at capacity
});

test('TokenBucket: secondsUntilAvailable matches the math', () => {
  const clock = makeFakeClock(0);
  const bucket = new TokenBucket(2, 1, clock.now);
  bucket.allowRequest();
  bucket.allowRequest(); // empty now

  assert.strictEqual(bucket.secondsUntilAvailable(), 1); // 1 token / 1 per sec
  clock.advance(1000);
  assert.strictEqual(bucket.secondsUntilAvailable(), 0); // one token is back
});

/* ==================== FIXED WINDOW ==================== */

test('FixedWindow: allows limit per window and resets at the edge', () => {
  const clock = makeFakeClock(0);
  const fw = new FixedWindow(3, 1000, clock.now);

  for (let i = 0; i < 3; i++) assert.strictEqual(fw.allowRequest(), true);
  assert.strictEqual(fw.allowRequest(), false);

  clock.advance(1000); // exactly one full window later -> new window
  assert.strictEqual(fw.allowRequest(), true);
});

test('FixedWindow: boundary burst lets 2x the limit through', () => {
  // Windows are epoch-aligned: [0,1000), [1000,2000), ...
  // We place 5 requests at t=900 (window [0,1000))
  // then 5 more  at t=1100 (window [1000,2000)).
  // Both batches are allowed even though only 800ms separate them.
  const clock = makeFakeClock(0);
  const fw = new FixedWindow(5, 1000, clock.now);

  clock.set(900); // late in window [0,1000)
  let allowed = 0;
  for (let i = 0; i < 5; i++) if (fw.allowRequest()) allowed++;

  clock.set(1100); // early in window [1000,2000) — only 200ms later
  for (let i = 0; i < 5; i++) if (fw.allowRequest()) allowed++;

  // 10 requests in 200ms even though the limit is 5/window.
  assert.strictEqual(allowed, 10);
});

/* ==================== SLIDING WINDOW LOG ==================== */

test('SlidingWindowLog: enforces the limit over a truly sliding window', () => {
  // limit=3, window=1000ms
  // Send 2 at t=0, 1 at t=300 (fills window to 3), then verify
  // the window clears correctly as time passes.
  const clock = makeFakeClock(0);
  const log = new SlidingWindowLog(3, 1000, clock.now);

  clock.set(0);
  assert.strictEqual(log.allowRequest(), true);  // timestamps: [0]
  assert.strictEqual(log.allowRequest(), true);  // timestamps: [0,0]
  clock.set(300);
  assert.strictEqual(log.allowRequest(), true);  // timestamps: [0,0,300]
  assert.strictEqual(log.allowRequest(), false); // window full (3 active)

  // At t=1001, cutoff=1. The two t=0 entries slide out; t=300 stays.
  clock.set(1001);
  assert.strictEqual(log.allowRequest(), true);  // active: [300, 1001]
  assert.strictEqual(log.allowRequest(), true);  // active: [300, 1001, 1001]
  assert.strictEqual(log.allowRequest(), false); // window is full again
});

test('SlidingWindowLog: rejected requests are never remembered', () => {
  const clock = makeFakeClock(0);
  const log = new SlidingWindowLog(2, 1000, clock.now);

  assert.strictEqual(log.allowRequest(), true);
  assert.strictEqual(log.allowRequest(), true);
  assert.strictEqual(log.allowRequest(), false); // rejected -> not logged
  assert.strictEqual(log.getActiveTimestamps().length, 2);

  clock.advance(1000); // t=1000; entries from t=0 are exactly at the edge,
  assert.strictEqual(log.allowRequest(), false); // so they are still active

  clock.advance(1); // t=1001; the t=0 pair has now slid out
  assert.strictEqual(log.allowRequest(), true);  // one slot free
  assert.strictEqual(log.allowRequest(), true);  // and a second one
  assert.strictEqual(log.allowRequest(), false); // 1001 + 1001 fill it up
});

test('SlidingWindowLog: expiry boundary is strict (age must exceed window)', () => {
  const clock = makeFakeClock(0);
  const log = new SlidingWindowLog(1, 1000, clock.now);

  clock.set(0);
  assert.strictEqual(log.allowRequest(), true);
  clock.set(999);
  assert.strictEqual(log.allowRequest(), false); // age 999ms: still inside
  clock.set(1000);
  assert.strictEqual(log.allowRequest(), false); // age exactly 1000ms: still inside
  clock.set(1001);
  assert.strictEqual(log.allowRequest(), true);  // age 1001ms: slid out
});

test('SlidingWindowLog: fixes the boundary burst that breaks FixedWindow', () => {
  // Same traffic for both: 5 requests just before a window edge (t=900)
  // and 5 requests just after it (t=1100) — 10 requests inside 200ms.
  const clock = makeFakeClock(0);

  const fw = new FixedWindow(5, 1000, clock.now);
  let fwAllowed = 0;
  clock.set(900);
  for (let i = 0; i < 5; i++) if (fw.allowRequest()) fwAllowed++;
  clock.set(1100);
  for (let i = 0; i < 5; i++) if (fw.allowRequest()) fwAllowed++;

  clock.set(900);
  const log = new SlidingWindowLog(5, 1000, clock.now);
  let logAllowed = 0;
  for (let i = 0; i < 5; i++) if (log.allowRequest()) logAllowed++;
  clock.set(1100);
  for (let i = 0; i < 5; i++) if (log.allowRequest()) logAllowed++;

  assert.strictEqual(fwAllowed, 10); // fixed window: 2x the limit slips through
  assert.strictEqual(logAllowed, 5);  // sliding log: never more than 5 per 1000ms
});

/* ==================== SLIDING WINDOW COUNTER ==================== */

test('SlidingWindowCounter: behaves like FixedWindow at the start of a window', () => {
  const clock = makeFakeClock(0);
  const sc = new SlidingWindowCounter(5, 1000, clock.now);

  clock.set(0); // no previous traffic, fresh window
  let allowed = 0;
  for (let i = 0; i < 8; i++) if (sc.allowRequest()) allowed++;
  assert.strictEqual(allowed, 5);
});

test('SlidingWindowCounter: weights the previous window mid-window', () => {
  const clock = makeFakeClock(0);
  const sc = new SlidingWindowCounter(5, 1000, clock.now);

  clock.set(100);
  for (let i = 0; i < 4; i++) sc.allowRequest(); // window [0,1000): 4 allowed

  clock.set(1100); // 10% into window [1000,2000): estimate = 4*0.9 + 0 = 3.6
  // Condition: estimate + 1 <= limit
  // Req 1: 3.6 + 1 = 4.6 <= 5 -> allowed! currentCount becomes 1
  assert.strictEqual(sc.allowRequest(), true);
  // Req 2: 4*0.9 + 1 = 4.6. 4.6 + 1 = 5.6 > 5 -> rejected!
  assert.strictEqual(sc.allowRequest(), false);

  const info = sc.getWeightedEstimate();
  assert.ok(Math.abs(info.estimate - 4.6) < 1e-9);
  assert.strictEqual(info.currentCount, 1);
});

test('SlidingWindowCounter: boundary burst demo scenario (t=900ms and t=1100ms)', () => {
  // Lesson scenario: limit 5, window 1000ms.
  // 5 requests at t=900ms (all 5 allowed in window [0, 1000ms)).
  // 5 requests at t=1100ms:
  // At t=1100ms, elapsedFraction = 100/1000 = 0.1, weight for previous = 0.9.
  // estimate = 5 * 0.9 + 0 = 4.5.
  // First request check: 4.5 + 1 = 5.5 > 5 -> REJECTED.
  // All 5 requests at t=1100ms are rejected. Total allowed across the 200ms burst = 5.
  const clock = makeFakeClock(0);
  const sc = new SlidingWindowCounter(5, 1000, clock.now);

  clock.set(900);
  let allowedAt900 = 0;
  for (let i = 0; i < 5; i++) {
    if (sc.allowRequest()) allowedAt900++;
  }
  assert.strictEqual(allowedAt900, 5);

  clock.set(1100);
  let allowedAt1100 = 0;
  for (let i = 0; i < 5; i++) {
    if (sc.allowRequest()) allowedAt1100++;
  }
  assert.strictEqual(allowedAt1100, 0); // 4.5 + 1 = 5.5 > 5 -> all rejected!
});

test('SlidingWindowCounter: two full idle windows reset everything', () => {
  const clock = makeFakeClock(0);
  const sc = new SlidingWindowCounter(3, 1000, clock.now);

  clock.set(500);
  for (let i = 0; i < 3; i++) sc.allowRequest();
  assert.strictEqual(sc.allowRequest(), false);

  clock.set(2500); // skipped a whole window entirely
  assert.strictEqual(sc.allowRequest(), true);
});

test('SlidingWindowCounter: memory stays tiny no matter the traffic', () => {
  const clock = makeFakeClock(0);
  const sc = new SlidingWindowCounter(1000, 1000, clock.now);
  const log = new SlidingWindowLog(1000, 1000, clock.now);

  for (let ms = 0; ms < 500; ms++) { // 500 requests
    clock.set(ms);
    sc.allowRequest();
    log.allowRequest();
  }

  assert.ok(log.getActiveTimestamps().length >= 400); // log stores timestamps…
  // …while the counter only ever keeps two integers:
  const info = sc.getWeightedEstimate();
  assert.ok(info.previousCount + info.currentCount === 500);
});
