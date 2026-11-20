/**
 * Lightweight in-memory rate limiter (no external dependency).
 * Suitable for single-process Node / Container; reset on restart is acceptable for this app.
 */
const buckets = new Map();

const prune = (key, windowMs) => {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry) return;
  entry.hits = entry.hits.filter((t) => now - t < windowMs);
  if (!entry.hits.length) buckets.delete(key);
};

// Periodic cleanup of expired entries
if (typeof setInterval !== 'undefined') {
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of buckets.entries()) {
      entry.hits = entry.hits.filter((t) => now - t < 3600000);
      if (!entry.hits.length) buckets.delete(key);
    }
  }, 10 * 60 * 1000);
  if (cleanup.unref) cleanup.unref();
}

// Cloudflare Worker subrequests reach a Cloudflare-fronted origin (Render) with
// CF-Connecting-IP set to the Worker's egress IP, not the visitor's.
const WORKER_EGRESS_PREFIXES = ['2a06:98c0:3600:'];
const isWorkerEgressIp = (ip) =>
  !!ip && WORKER_EGRESS_PREFIXES.some((p) => String(ip).toLowerCase().startsWith(p));

const trustForwardedClientIp = (req) => {
  const secret = process.env.PROXY_SHARED_SECRET;
  if (secret) return req?.headers?.['x-ripoma-proxy-secret'] === secret;
  const cfIp = req?.headers?.['cf-connecting-ip'];
  // No secret configured: only trust it when the request clearly came through a Worker.
  return !cfIp || isWorkerEgressIp(cfIp);
};

const getClientIp = (req) => {
  const forwarded = req?.headers?.['x-ripoma-client-ip'];
  if (forwarded && trustForwardedClientIp(req)) return String(forwarded).trim();
  const cfIp = req?.headers?.['cf-connecting-ip'];
  if (cfIp) return String(cfIp).trim();
  const fwd = req?.headers?.['x-forwarded-for'];
  if (fwd) {
    const list = String(fwd).split(',');
    return list[0].trim();
  }
  return req?.ip || req?.connection?.remoteAddress || 'unknown';
};

const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 20,
  keyPrefix = 'rl',
  message = 'Too many requests. Please try again later.',
  skipSuccessfulRequests = false
} = {}) => {
  return (req, res, next) => {
    const ip = getClientIp(req);
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();
    prune(key, windowMs);

    let entry = buckets.get(key);
    if (!entry) {
      entry = { hits: [] };
      buckets.set(key, entry);
    }

    if (entry.hits.length >= max) {
      const retryAfter = Math.ceil((entry.hits[0] + windowMs - now) / 1000);
      const delay = Math.max(1, retryAfter);
      const isAuth = keyPrefix.includes('auth') || req.path?.includes('auth');
      res.setHeader('Retry-After', String(delay));
      res.setHeader('X-RateLimit-Source', 'express');
      res.setHeader('X-Ripoma-429-Source', isAuth ? 'auth-rate-limit' : 'backend-rate-limit');
      return res.status(429).json({
        success: false,
        error: 'too_many_requests',
        source: 'express',
        message,
        retryAfter: delay
      });
    }

    entry.hits.push(now);
    if (skipSuccessfulRequests && typeof res.on === 'function') {
      // Only failed attempts count toward the limit (successful sign-ins are refunded).
      res.on('finish', () => {
        if (res.statusCode < 400) {
          const idx = entry.hits.indexOf(now);
          if (idx !== -1) entry.hits.splice(idx, 1);
          if (!entry.hits.length && buckets.get(key) === entry) buckets.delete(key);
        }
      });
    }
    return next();
  };
};

/** Per-customer limiter (requires auth middleware first). */
const createCustomerRateLimiter = ({
  windowMs = 60 * 60 * 1000,
  max = 10,
  keyPrefix = 'crl',
  message = 'Too many requests. Please try again later.'
} = {}) => {
  return (req, res, next) => {
    const id = req.customerUser?._id || getClientIp(req);
    const key = `${keyPrefix}:${id}`;
    const now = Date.now();
    prune(key, windowMs);

    let entry = buckets.get(key);
    if (!entry) {
      entry = { hits: [] };
      buckets.set(key, entry);
    }

    if (entry.hits.length >= max) {
      const retryAfter = Math.ceil((entry.hits[0] + windowMs - now) / 1000);
      const delay = Math.max(1, retryAfter);
      const isAuth = keyPrefix.includes('auth') || req.path?.includes('auth');
      res.setHeader('Retry-After', String(delay));
      res.setHeader('X-RateLimit-Source', 'express');
      res.setHeader('X-Ripoma-429-Source', isAuth ? 'auth-rate-limit' : 'backend-rate-limit');
      return res.status(429).json({
        success: false,
        error: 'too_many_requests',
        source: 'express',
        message,
        retryAfter: delay
      });
    }

    entry.hits.push(now);
    return next();
  };
};

module.exports = { createRateLimiter, createCustomerRateLimiter, getClientIp };
