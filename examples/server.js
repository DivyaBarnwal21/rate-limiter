/**
 * examples/server.js — Runnable ChaiPay Rate Limiter HTTP Server
 *
 * Demonstrates the Token Bucket algorithm running in a real Node.js HTTP server.
 * Uses built-in 'http' so it runs out-of-the-box without requiring 'npm install'.
 * Also compatible with Express.js middleware patterns.
 *
 * Run with:
 *   node examples/server.js
 *
 * Test with curl (burst of 8 requests to trigger HTTP 429):
 *   Linux/Mac/Git Bash:
 *     for i in {1..8}; do curl -i http://localhost:3000/api/pay; sleep 0.1; done
 *   PowerShell:
 *     1..8 | ForEach-Object { (Invoke-WebRequest -Uri "http://localhost:3000/api/pay" -SkipHttpErrorCheck).StatusCode }
 */
'use strict';

const http = require('http');
const { TokenBucket } = require('../js/ratelimiter.js');

const PORT = process.env.PORT || 3000;
const CAPACITY = 5;          // Burst capacity: max 5 tokens
const REFILL_RATE = 1;       // Steady refill: 1 token per second

// In-memory table storing a TokenBucket per client: Map<string, TokenBucket>
const clientBuckets = new Map();

/**
 * Extract client identity. In production, choose wisely:
 * - Per-IP (req.socket.remoteAddress): Good for public signup/login, but shared NATs (colleges/offices) share one quota.
 * - Per-User (JWT/session user ID): Fair across devices, but requires authentication.
 * - Per-API-Key (x-api-key header): Standard for B2B developer APIs with tier quotas.
 */
function getClientKey(req) {
  return (
    req.headers['x-api-key'] ||
    req.headers['x-user-id'] ||
    req.headers['x-forwarded-for'] ||
    req.socket.remoteAddress ||
    'anonymous'
  );
}

/**
 * Rate Limiter Middleware Logic
 * Returns { allowed, remaining, retryAfter }
 */
function checkRateLimit(req) {
  const clientKey = getClientKey(req);

  if (!clientBuckets.has(clientKey)) {
    clientBuckets.set(clientKey, new TokenBucket(CAPACITY, REFILL_RATE));
  }

  const bucket = clientBuckets.get(clientKey);
  const allowed = bucket.allowRequest(1);
  const remaining = bucket.getRemaining();
  const retryAfter = allowed ? 0 : bucket.secondsUntilAvailable(1);

  return { clientKey, allowed, remaining, retryAfter };
}

/**
 * Periodic Cleanup: Prevent memory leak from stale client keys.
 * Deletes buckets that are completely full and have been idle for > 60 seconds.
 */
const CLEANUP_INTERVAL_MS = 30 * 1000;
setInterval(() => {
  const now = Date.now();
  let pruned = 0;
  for (const [key, bucket] of clientBuckets.entries()) {
    if (bucket.peekTokens() >= CAPACITY && (now - bucket.lastRefill) > 60 * 1000) {
      clientBuckets.delete(key);
      pruned++;
    }
  }
  if (pruned > 0) {
    console.log(`[Bouncer Garbage Collector] Pruned ${pruned} stale rate limiter keys.`);
  }
}, CLEANUP_INTERVAL_MS).unref();

// Create HTTP Server
const server = http.createServer((req, res) => {
  // Common Rate Limiting HTTP Headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-RateLimit-Limit', CAPACITY);

  const { clientKey, allowed, remaining, retryAfter } = checkRateLimit(req);
  res.setHeader('X-RateLimit-Remaining', remaining);

  if (!allowed) {
    // 429 Too Many Requests
    res.setHeader('Retry-After', retryAfter); // Standard HTTP header (seconds)
    res.writeHead(429);
    res.end(
      JSON.stringify(
        {
          error: 'Too Many Requests',
          status: 429,
          client: clientKey,
          message: 'Bouncer Bhaiya says: ChaiPay rate limit exceeded! Please slow down.',
          retryAfterSeconds: retryAfter,
        },
        null,
        2
      )
    );
    return;
  }

  // 200 OK — Allowed
  res.writeHead(200);
  res.end(
    JSON.stringify(
      {
        status: 200,
        client: clientKey,
        message: 'Payment processed successfully! ☕ ₹50 sent to Chai Stall.',
        remainingTokens: remaining,
        capacity: CAPACITY,
      },
      null,
      2
    )
  );
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🛡️  ChaiPay Bouncer Server running on http://localhost:${PORT}`);
  console.log(`   Rate Limit: ${CAPACITY} tokens capacity, ${REFILL_RATE} token/sec refill`);
  console.log(`====================================================`);
  console.log(`Test with curl:`);
  console.log(`  curl -i http://localhost:${PORT}/api/pay`);
  console.log(`Trigger 429 with 8 rapid requests:`);
  console.log(`  for i in {1..8}; do curl -s -o /dev/null -w "%{http_code}\\n" http://localhost:${PORT}/api/pay; done`);
  console.log(`====================================================\n`);
});

module.exports = server;

