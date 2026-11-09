/**
 * Lightweight in-memory rate limiter (no external dependency).
 * Suitable for single-process Node; reset on restart is acceptable for this app.
 */
const buckets = new Map();

const prune = (key, windowMs) => {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry) return;
  entry.hits = entry.hits.filter((t) => now - t < windowMs);
  if (!entry.hits.length) buckets.delete(key);
};

const getClientIp = (req) => {
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
  message = 'Too many requests. Please try again later.'
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
      res.setHeader('Retry-After', String(Math.max(1, retryAfter)));
      return res.status(429).json({ message });
    }

    entry.hits.push(now);
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
      res.setHeader('Retry-After', String(Math.max(1, retryAfter)));
      return res.status(429).json({ message });
    }

    entry.hits.push(now);
    return next();
  };
};

module.exports = { createRateLimiter, createCustomerRateLimiter, getClientIp };
