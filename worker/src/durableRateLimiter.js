/**
 * Cloudflare Durable Object for coordinated distributed rate limiting.
 *
 * Provides strongly consistent atomic rate-limit state across all global edge regions.
 * Backed by native Durable Object SQLite storage (v1 migration class RipomaApi).
 */

export const RATE_POLICIES = {
  auth_login: {
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Too many sign-in attempts. Please wait 15 minutes.'
  },
  auth_register: {
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Too many registration attempts. Please try again later.'
  },
  auth_refresh: {
    windowMs: 15 * 60 * 1000,
    max: 60,
    message: 'Too many session refresh attempts. Please wait and try again.'
  },
  auth_reset: {
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Too many password reset requests. Please try again later.'
  },
  storefront_browse: {
    windowMs: 60 * 1000,
    max: 300,
    message: 'Browsing too quickly. Please slow down and try again.'
  },
  customer_api: {
    windowMs: 60 * 1000,
    max: 120,
    message: 'Too many customer requests. Please slow down and try again.'
  },
  admin_api: {
    windowMs: 60 * 1000,
    max: 180,
    message: 'Too many administrative requests. Please slow down.'
  }
};

export class RipomaApi {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.memoryBuckets = new Map();
    this.initSql();
  }

  initSql() {
    if (this.state?.storage?.sql) {
      try {
        this.state.storage.sql.exec(`
          CREATE TABLE IF NOT EXISTS rate_limits (
            policy TEXT NOT NULL,
            key TEXT NOT NULL,
            timestamp INTEGER NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_rate_limits ON rate_limits(policy, key, timestamp);
        `);
      } catch (err) {
        console.warn('[RipomaApi DO] SQLite table init warning:', err);
      }
    }
  }

  async checkLimit(policy, key) {
    const config = RATE_POLICIES[policy] || RATE_POLICIES.storefront_browse;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // 1. Production SQLite storage path
    if (this.state?.storage?.sql) {
      try {
        this.state.storage.sql.exec(
          'DELETE FROM rate_limits WHERE policy = ? AND key = ? AND timestamp < ?',
          policy,
          key,
          windowStart
        );
        const cursor = this.state.storage.sql.exec(
          'SELECT count(*) as count, min(timestamp) as oldest FROM rate_limits WHERE policy = ? AND key = ?',
          policy,
          key
        );
        const row = cursor.one();
        const count = row?.count || 0;

        if (count >= config.max) {
          const oldest = row?.oldest || now;
          const retryAfter = Math.max(1, Math.ceil((oldest + config.windowMs - now) / 1000));
          return {
            allowed: false,
            policy,
            count,
            max: config.max,
            retryAfter,
            message: config.message
          };
        }

        this.state.storage.sql.exec(
          'INSERT INTO rate_limits (policy, key, timestamp) VALUES (?, ?, ?)',
          policy,
          key,
          now
        );
        return {
          allowed: true,
          policy,
          count: count + 1,
          max: config.max
        };
      } catch (sqlErr) {
        console.warn('[RipomaApi DO] SQLite execution error, falling back to memory:', sqlErr);
      }
    }

    // 2. In-Memory / KV fallback path (for mock testing and environments without SQLite storage)
    const mapKey = `${policy}:${key}`;
    let entry = this.memoryBuckets.get(mapKey);
    if (!entry) {
      entry = [];
      this.memoryBuckets.set(mapKey, entry);
    }

    // Prune expired
    const active = entry.filter((t) => t > windowStart);
    this.memoryBuckets.set(mapKey, active);

    if (active.length >= config.max) {
      const oldest = active[0] || now;
      const retryAfter = Math.max(1, Math.ceil((oldest + config.windowMs - now) / 1000));
      return {
        allowed: false,
        policy,
        count: active.length,
        max: config.max,
        retryAfter,
        message: config.message
      };
    }

    active.push(now);
    return {
      allowed: true,
      policy,
      count: active.length,
      max: config.max
    };
  }

  async fetch(request) {
    const url = new URL(request.url);

    // Coordinated rate-limit evaluation endpoint
    if (url.pathname.endsWith('/rate-limit') && request.method === 'POST') {
      try {
        const { policy, key } = await request.json();
        const result = await this.checkLimit(policy, key);
        return new Response(JSON.stringify(result), {
          status: result.allowed ? 200 : 429,
          headers: {
            'Content-Type': 'application/json',
            ...(result.allowed
              ? {}
              : {
                  'X-Ripoma-429-Source': 'durable-object-rate-limit',
                  'X-RateLimit-Source': 'durable_object',
                  'X-RateLimit-Policy': result.policy || policy
                }),
            ...(result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : {})
          }
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ allowed: true, error: String(err?.message || err) }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(JSON.stringify({ ok: true, service: 'RipomaApi' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Resolves client key for rate limiting to prevent global/IP collisions behind NAT/proxies.
 *
 * Strategies:
 *   - auth_refresh: keyed by token hash/prefix extracted from Cookie (safe against shared IP).
 *   - authenticated requests: keyed by user/customer ID extracted from Bearer JWT.
 *   - storefront_browse / unauthenticated: keyed by trusted cf-connecting-ip.
 */
export function resolveRateKey(request, policy) {
  const clientIp =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';

  // 1. Session Refresh: isolate by refresh token cookie if present
  if (policy === 'auth_refresh') {
    const cookieHeader = request.headers.get('Cookie') || '';
    const match = cookieHeader.match(/(?:customerRefreshToken|refreshToken)=([^;]+)/);
    if (match && match[1]) {
      const tokenValue = match[1].trim();
      const tokenSlice = tokenValue.slice(0, 32);
      return `refresh_token:${tokenSlice}`;
    }
    return `refresh_ip:${clientIp}`;
  }

  // 2. Authenticated requests: isolate by JWT subject (user/customer ID)
  const authHeader = request.headers.get('Authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    try {
      const parts = authHeader.slice(7).split('.');
      if (parts.length >= 2) {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = atob(base64);
        const payload = JSON.parse(json);
        const userId = payload.id || payload._id || payload.sub;
        if (userId) {
          return `user:${userId}`;
        }
      }
    } catch {
      return `auth:${authHeader.slice(-16)}`;
    }
  }

  // 3. Fallback: IP-based key with policy prefix to avoid cross-policy collision
  return `${policy}:${clientIp}`;
}

/**
 * Resolves the appropriate rate policy based on URL path and HTTP method.
 */
export function resolveRatePolicy(url, method) {
  const path = url.pathname;
  if (method === 'OPTIONS' || path === '/' || path === '/health') {
    return null; // Exempt from rate limiting
  }

  // 1. Authentication: Login
  if (
    path === '/api/customer-auth/login' ||
    path === '/api/customer-auth/google' ||
    path === '/api/auth/login'
  ) {
    return 'auth_login';
  }

  // 2. Authentication: Registration
  if (path === '/api/customer-auth/register') {
    return 'auth_register';
  }

  // 3. Authentication: Session Refresh
  if (path === '/api/customer-auth/refresh' || path === '/api/auth/refresh') {
    return 'auth_refresh';
  }

  // 4. Authentication: Password Reset
  if (
    path.includes('/forgot-password') ||
    path.includes('/reset-password') ||
    path.includes('/resend-verification')
  ) {
    return 'auth_reset';
  }

  // 5. Public Storefront Browsing (GET)
  if (method === 'GET' && path.startsWith('/api/storefront/')) {
    return 'storefront_browse';
  }

  // 6. Customer Mutation APIs (POST, PUT, DELETE)
  if (path.startsWith('/api/storefront/') || path.startsWith('/api/customer-auth/')) {
    return 'customer_api';
  }

  // 7. Administrative APIs
  return 'admin_api';
}
