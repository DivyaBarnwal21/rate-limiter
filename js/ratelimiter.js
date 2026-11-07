/*
 * ratelimiter.js — the ONE shared implementation of every algorithm
 * taught on this site. The simulators, the coding challenge and the
 * Node.js test suite all run this exact code, so what you read is
 * what actually runs.
 *
 * Every class takes an injectable `clock` function (defaults to
 * Date.now) so tests can freeze and step time deterministically.
 *
 * UMD-style wrapper: loadable with a plain <script> tag (browser)
 * AND with require() (Node.js tests) — no build step needed.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RateLimiterAlgorithms = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------
   * 1. TOKEN BUCKET
   * tokens = min(capacity, tokens + elapsedSeconds * refillRate)
   * ------------------------------------------------------------------ */
  class TokenBucket {
    constructor(capacity, refillRate, clock) {
      if (!(capacity > 0)) throw new Error('capacity must be > 0');
      if (!(refillRate > 0)) throw new Error('refillRate must be > 0');
      this.capacity = capacity;
      this.refillRate = refillRate;              // tokens added per second
      this.clock = clock || (() => Date.now());  // injectable time source
      this.tokens = capacity;                    // bucket starts full
      this.lastRefill = this.clock();            // ms timestamp
    }

    // Lazily refill the bucket: we do NOT run a timer. We only compute
    // how many tokens accrued since the last check, when asked.
    _refill() {
      const now = this.clock();
      const elapsedSeconds = (now - this.lastRefill) / 1000;
      if (elapsedSeconds > 0) {
        this.tokens = Math.min(
          this.capacity,
          this.tokens + elapsedSeconds * this.refillRate
        );
        this.lastRefill = now;
      }
    }

    // Returns true (allow) and spends a token, or false (429, reject).
    allowRequest(cost = 1) {
      this._refill();
      if (this.tokens >= cost) {
        this.tokens -= cost;
        return true;
      }
      return false;
    }

    // Whole seconds until `cost` tokens will be available (for Retry-After).
    // Returns 0 when the request would be allowed right now.
    secondsUntilAvailable(cost = 1) {
      this._refill();
      if (this.tokens >= cost) return 0;
      return Math.ceil((cost - this.tokens) / this.refillRate);
    }

    // Current token count after refill, clamped to [0, capacity].
    peekTokens() {
      this._refill();
      return this.tokens;
    }

    // Current integer token count remaining (for X-RateLimit-Remaining).
    getRemaining() {
      this._refill();
      return Math.floor(this.tokens);
    }
  }

  /* ------------------------------------------------------------------
   * 2. FIXED WINDOW  (has the boundary-burst flaw — taught on purpose)
   *
   * Windows are aligned to the epoch (multiples of windowMs) so that
   * the boundary burst is predictable and testable regardless of when
   * the limiter is created.
   * ------------------------------------------------------------------ */
  class FixedWindow {
    constructor(limit, windowMs, clock) {
      this.limit = limit;
      this.windowMs = windowMs;
      this.clock = clock || (() => Date.now());
      const now = this.clock();
      // Align to epoch so windows are 0–999ms, 1000–1999ms, etc.
      this.windowStart = Math.floor(now / windowMs) * windowMs;
      this.count = 0;
    }

    allowRequest() {
      const now = this.clock();
      if (now - this.windowStart >= this.windowMs) {
        // Jump forward to the epoch-aligned window that contains `now`.
        this.windowStart = Math.floor(now / this.windowMs) * this.windowMs;
        this.count = 0;
      }
      if (this.count < this.limit) {
        this.count++;
        return true;
      }
      return false;
    }
  }

  /* ------------------------------------------------------------------
   * 3. SLIDING WINDOW LOG  (exact, but stores every timestamp)
   *
   * A request is allowed if fewer than `limit` requests happened in
   * the window (now - windowMs, now].
   * A timestamp expires when its age is STRICTLY GREATER than windowMs
   * (i.e. timestamp < now - windowMs).
   * ------------------------------------------------------------------ */
  class SlidingWindowLog {
    constructor(limit, windowMs, clock) {
      this.limit = limit;
      this.windowMs = windowMs;
      this.clock = clock || (() => Date.now());
      this.timestamps = [];      // sorted ascending; only allowed requests
    }

    allowRequest() {
      const now = this.clock();
      const cutoff = now - this.windowMs;
      // Drop every timestamp strictly older than windowMs.
      while (this.timestamps.length && this.timestamps[0] < cutoff) {
        this.timestamps.shift();
      }
      if (this.timestamps.length < this.limit) {
        this.timestamps.push(now);
        return true;
      }
      return false;
    }

    // For the visualiser: the timestamps still inside the window.
    getActiveTimestamps() {
      return this.timestamps.slice();
    }
  }

  /* ------------------------------------------------------------------
   * 4. SLIDING WINDOW COUNTER  (approximate, tiny memory)
   * weighted = previousCount * overlapFraction + currentCount
   * ------------------------------------------------------------------ */
  class SlidingWindowCounter {
    constructor(limit, windowMs, clock) {
      this.limit = limit;
      this.windowMs = windowMs;
      this.clock = clock || (() => Date.now());
      this.currentWindowStart = this._windowStartOf(this.clock());
      this.currentCount = 0;
      this.previousCount = 0;
    }

    _windowStartOf(ms) {
      return Math.floor(ms / this.windowMs) * this.windowMs;
    }

    _shiftWindows(now) {
      const start = this._windowStartOf(now);
      while (start > this.currentWindowStart) {
        // Time moved into a new window: current becomes previous…
        this.previousCount = this.currentCount;
        this.currentCount = 0;
        this.currentWindowStart += this.windowMs;
        // …and if we jumped two or more whole windows, the previous
        // window is empty too.
        if (start > this.currentWindowStart + this.windowMs) {
          this.previousCount = 0;
        }
      }
    }

    allowRequest() {
      const now = this.clock();
      this._shiftWindows(now);
      const elapsedFraction = (now - this.currentWindowStart) / this.windowMs;
      const weightedEstimate =
        this.previousCount * (1 - elapsedFraction) + this.currentCount;
      if (weightedEstimate + 1 <= this.limit) {
        this.currentCount++;
        return true;
      }
      return false;
    }

    // Exposed so the visualiser can draw the weighted estimate.
    getWeightedEstimate() {
      const now = this.clock();
      this._shiftWindows(now);
      const elapsedFraction = (now - this.currentWindowStart) / this.windowMs;
      return {
        estimate: this.previousCount * (1 - elapsedFraction) + this.currentCount,
        previousCount: this.previousCount,
        currentCount: this.currentCount,
        elapsedFraction: elapsedFraction,
      };
    }
  }

  /* ------------------------------------------------------------------
   * makeFakeClock — helper used by the tests and the "Predict the
   * output" activity to step time deterministically.
   * ------------------------------------------------------------------ */
  function makeFakeClock(startMs) {
    let t = startMs || 0;
    return {
      now: () => t,
      advance: (ms) => { t += ms; return t; },
      set: (ms) => { t = ms; return t; },
    };
  }

  return {
    TokenBucket,
    FixedWindow,
    SlidingWindowLog,
    SlidingWindowCounter,
    makeFakeClock,
  };
});
