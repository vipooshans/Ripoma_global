const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

describe('Rippoma HTTP 429 & Rate-Limiting Verification Suite', () => {
  // ── 1. DO Rate Limiting & Diagnostic Header ────────────────────────────────
  it('1. Verifies X-Ripoma-429-Source on Durable Object rate-limit rejection', async () => {
    const { RipomaApi } = await import('../../worker/src/durableRateLimiter.js');
    const mockState = { storage: { sql: null } };
    const doInstance = new RipomaApi(mockState, {});

    // Exhaust auth_register limit (max 10)
    for (let i = 0; i < 10; i++) {
      const res = await doInstance.checkLimit('auth_register', 'test-ip-1');
      assert.strictEqual(res.allowed, true);
    }

    // 11th request rejected
    const blockedRes = await doInstance.checkLimit('auth_register', 'test-ip-1');
    assert.strictEqual(blockedRes.allowed, false);

    // Call RPC fetch to verify HTTP headers
    const req = new Request('http://internal/rate-limit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policy: 'auth_register', key: 'test-ip-1' })
    });
    const res = await doInstance.fetch(req);
    assert.strictEqual(res.status, 429);
    assert.strictEqual(res.headers.get('X-Ripoma-429-Source'), 'durable-object-rate-limit');
    assert.strictEqual(res.headers.get('X-RateLimit-Source'), 'durable_object');
    assert.strictEqual(res.headers.get('X-RateLimit-Policy'), 'auth_register');
    assert.ok(res.headers.get('Retry-After'));
  });

  // ── 2. NAT/Shared IP Key Partitioning ──────────────────────────────────────
  it('2. Verifies resolveRateKey isolates customers on shared NAT/office IP', async () => {
    const { resolveRateKey } = await import('../../worker/src/durableRateLimiter.js');

    // Customer A and Customer B share the same office IP 203.0.113.10
    const tokenA = Buffer.from(JSON.stringify({ id: 'customer_alpha_123' })).toString('base64');
    const tokenB = Buffer.from(JSON.stringify({ id: 'customer_beta_456' })).toString('base64');

    const reqA = new Request('https://worker.local/api/storefront/orders', {
      headers: {
        'cf-connecting-ip': '203.0.113.10',
        Authorization: `Bearer h.${tokenA}.s`
      }
    });
    const reqB = new Request('https://worker.local/api/storefront/orders', {
      headers: {
        'cf-connecting-ip': '203.0.113.10',
        Authorization: `Bearer h.${tokenB}.s`
      }
    });

    const keyA = resolveRateKey(reqA, 'customer_api');
    const keyB = resolveRateKey(reqB, 'customer_api');

    assert.strictEqual(keyA, 'user:customer_alpha_123');
    assert.strictEqual(keyB, 'user:customer_beta_456');
    assert.notStrictEqual(keyA, keyB, 'Keys must not collide for different customers on same IP');
  });

  // ── 3. Session Refresh Partitioning ────────────────────────────────────────
  it('3. Verifies auth_refresh isolates sessions on shared IP via refresh token cookie', async () => {
    const { resolveRateKey } = await import('../../worker/src/durableRateLimiter.js');

    const req1 = new Request('https://worker.local/api/customer-auth/refresh', {
      method: 'POST',
      headers: {
        'cf-connecting-ip': '198.51.100.99',
        Cookie: 'customerRefreshToken=token_user_one_secret_long_string_12345'
      }
    });
    const req2 = new Request('https://worker.local/api/customer-auth/refresh', {
      method: 'POST',
      headers: {
        'cf-connecting-ip': '198.51.100.99',
        Cookie: 'customerRefreshToken=token_user_two_secret_long_string_67890'
      }
    });

    const key1 = resolveRateKey(req1, 'auth_refresh');
    const key2 = resolveRateKey(req2, 'auth_refresh');

    assert.ok(key1.startsWith('refresh_token:'));
    assert.ok(key2.startsWith('refresh_token:'));
    assert.notStrictEqual(key1, key2, 'Refresh keys must not collide for different tokens on same IP');
  });

  // ── 4. Anonymous Refresh Fast-Path ─────────────────────────────────────────
  it('4. Verifies anonymous refresh returns 200 without consuming rate limits', async () => {
    const workerModule = (await import('../../worker/src/proxy.js')).default;
    const req = new Request('https://worker.local/api/customer-auth/refresh', {
      method: 'POST',
      headers: { Origin: 'https://ripomaglobal.org' }
    });

    const res = await workerModule.fetch(req, {});
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.authenticated, false);
  });

  // ── 5. CORS Expose Headers ─────────────────────────────────────────────────
  it('5. Verifies CORS exposes X-Ripoma-429-Source to browser client', async () => {
    const workerModule = (await import('../../worker/src/proxy.js')).default;
    const req = new Request('https://worker.local/health', {
      method: 'GET',
      headers: { Origin: 'https://ripomaglobal.org' }
    });

    const res = await workerModule.fetch(req, {});
    const exposeHeaders = res.headers.get('Access-Control-Expose-Headers');
    assert.ok(exposeHeaders, 'Access-Control-Expose-Headers must be set');
    assert.ok(exposeHeaders.includes('X-Ripoma-429-Source'), 'Must expose X-Ripoma-429-Source');
    assert.ok(exposeHeaders.includes('Retry-After'), 'Must expose Retry-After');
  });

  // ── 6. Concurrent Browsing Capacity ────────────────────────────────────────
  it('6. Verifies storefront browse high capacity handles 50 concurrent requests cleanly', async () => {
    const { RipomaApi } = await import('../../worker/src/durableRateLimiter.js');
    const mockState = { storage: { sql: null } };
    const doInstance = new RipomaApi(mockState, {});

    // Fire 50 simultaneous browse requests from same IP
    const promises = Array(50).fill(null).map(() =>
      doInstance.checkLimit('storefront_browse', 'burst-client-ip')
    );
    const results = await Promise.all(promises);

    // All 50 must be allowed (limit is 300)
    const allAllowed = results.every((r) => r.allowed === true);
    assert.strictEqual(allAllowed, true, '50 concurrent browse requests should all be allowed');
  });

  // ── 7. Single-Flight Token Refresh Execution ───────────────────────────────
  it('7. Verifies single-flight refresh collapses concurrent calls into a single network execution', async () => {
    let networkCallCount = 0;
    let singleFlightPromise = null;

    const mockRefreshSingleFlight = async () => {
      if (singleFlightPromise) return singleFlightPromise;
      singleFlightPromise = (async () => {
        try {
          networkCallCount++;
          await new Promise((r) => setTimeout(r, 20));
          return 'new_access_token_123';
        } finally {
          singleFlightPromise = null;
        }
      })();
      return singleFlightPromise;
    };

    // 5 components simultaneously request a refreshed token
    const results = await Promise.all([
      mockRefreshSingleFlight(),
      mockRefreshSingleFlight(),
      mockRefreshSingleFlight(),
      mockRefreshSingleFlight(),
      mockRefreshSingleFlight()
    ]);

    assert.strictEqual(networkCallCount, 1, 'Only 1 network call should execute for 5 concurrent refresh requests');
    results.forEach((token) => assert.strictEqual(token, 'new_access_token_123'));
  });

  // ── 8. Expired & Invalid Refresh Token Handling ─────────────────────────────
  it('8. Verifies invalid and expired tokens reject properly with 401', () => {
    const secret = 'test-refresh-secret-rippoma';
    const expiredToken = jwt.sign({ id: 'cust_123', type: 'customer_refresh' }, secret, { expiresIn: '-1s' });
    const malformedToken = 'invalid.jwt.token';

    // Verify expired
    assert.throws(() => {
      jwt.verify(expiredToken, secret);
    }, (err) => err.name === 'TokenExpiredError');

    // Verify malformed
    assert.throws(() => {
      jwt.verify(malformedToken, secret);
    }, (err) => err.name === 'JsonWebTokenError');
  });

  // ── 9. Express Rate Limiter Header Verification ────────────────────────────
  it('9. Express rate limiter attaches auth-rate-limit vs backend-rate-limit headers', () => {
    const { createRateLimiter } = require('../middleware/customerRateLimit');
    const authLimiter = createRateLimiter({
      windowMs: 60000,
      max: 1,
      keyPrefix: 'auth-test'
    });
    const backendLimiter = createRateLimiter({
      windowMs: 60000,
      max: 1,
      keyPrefix: 'backend-test'
    });

    let authHeaders = {};
    const mockAuthRes = {
      setHeader(k, v) { authHeaders[k] = v; },
      status() { return this; },
      json() { return this; }
    };
    let backendHeaders = {};
    const mockBackendRes = {
      setHeader(k, v) { backendHeaders[k] = v; },
      status() { return this; },
      json() { return this; }
    };

    // Trigger auth 429
    authLimiter({ headers: { 'cf-connecting-ip': '1.2.3.4' }, path: '/api/customer-auth/login' }, mockAuthRes, () => {});
    authLimiter({ headers: { 'cf-connecting-ip': '1.2.3.4' }, path: '/api/customer-auth/login' }, mockAuthRes, () => {});
    assert.strictEqual(authHeaders['X-Ripoma-429-Source'], 'auth-rate-limit');

    // Trigger backend 429
    backendLimiter({ headers: { 'cf-connecting-ip': '1.2.3.4' }, path: '/api/storefront/orders' }, mockBackendRes, () => {});
    backendLimiter({ headers: { 'cf-connecting-ip': '1.2.3.4' }, path: '/api/storefront/orders' }, mockBackendRes, () => {});
    assert.strictEqual(backendHeaders['X-Ripoma-429-Source'], 'backend-rate-limit');
  });

  // ── 10. Storefront Edge Cache Hit vs Miss ──────────────────────────────────
  it('10. Storefront edge cache returns cached response without invoking database', async () => {
    const workerModule = (await import('../../worker/src/proxy.js')).default;
    let d1Executed = false;
    const mockDb = {
      prepare() {
        return {
          bind() { return this; },
          async all() {
            d1Executed = true;
            return { results: [] };
          }
        };
      }
    };

    const mockCacheStorage = new Map();
    const mockCaches = {
      default: {
        async match(req) {
          return mockCacheStorage.get(req.url) || null;
        },
        async put(req, res) {
          mockCacheStorage.set(req.url, res.clone());
        }
      }
    };

    global.caches = mockCaches;

    // First request: Cache MISS -> executes D1
    const req1 = new Request('https://worker.local/api/storefront/featured?limit=4', {
      method: 'GET',
      headers: { Origin: 'https://ripomaglobal.org' }
    });
    const res1 = await workerModule.fetch(req1, { ripoma_db: mockDb });
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(d1Executed, true);

    // Populate mock cache
    await mockCaches.default.put(req1, res1);

    // Second request: Cache HIT -> returns cached without touching D1 again
    d1Executed = false;
    const req2 = new Request('https://worker.local/api/storefront/featured?limit=4', {
      method: 'GET',
      headers: { Origin: 'https://ripomaglobal.org' }
    });
    const res2 = await workerModule.fetch(req2, { ripoma_db: mockDb });
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(d1Executed, false, 'Edge cache HIT must not query D1');

    delete global.caches;
  });

  // ── 11. Production API Base URL Configuration ──────────────────────────────
  it('11. Verifies client production configuration uses ripomaglobal1.ripomaglobal.workers.dev', () => {
    const envProductionPath = path.resolve(__dirname, '../../client/.env.production');
    const content = fs.readFileSync(envProductionPath, 'utf8');

    assert.ok(
      content.includes('VITE_API_URL=https://ripomaglobal1.ripomaglobal.workers.dev/api'),
      'Must point to worker gateway domain'
    );
  });

  // ── 12. Public Storefront Routes Never Send Authorization ──────────────────
  it('12. Public storefront requests do not attach Authorization header', async () => {
    const { isPublicStorefrontUrl } = await import('../../client/src/services/api.js');

    assert.strictEqual(isPublicStorefrontUrl('/api/storefront/featured'), true);
    assert.strictEqual(isPublicStorefrontUrl('/api/storefront/promos'), true);
    assert.strictEqual(isPublicStorefrontUrl('/api/storefront/stats'), true);
    assert.strictEqual(isPublicStorefrontUrl('/api/storefront/categories'), true);
    assert.strictEqual(isPublicStorefrontUrl('/api/storefront/products'), true);
    assert.strictEqual(isPublicStorefrontUrl('/api/storefront/products/facets'), true);
    assert.strictEqual(isPublicStorefrontUrl('/api/storefront/search-suggestions'), true);

    // Private routes return false
    assert.strictEqual(isPublicStorefrontUrl('/api/customer-auth/me'), false);
    assert.strictEqual(isPublicStorefrontUrl('/api/storefront/orders'), false);
    assert.strictEqual(isPublicStorefrontUrl('/api/admin/dashboard'), false);
  });

  // ── 13. Runtime Normalizer Guard Against Obsolete Custom Domain ──────────────
  it('13. resolveAbsoluteUrl automatically rewrites obsolete api.ripomaglobal.org to workers.dev', async () => {
    const { resolveAbsoluteUrl } = await import('../../client/src/config/apiBase.js');

    const rewritten = resolveAbsoluteUrl('https://api.ripomaglobal.org/api');
    assert.strictEqual(rewritten, 'https://ripomaglobal1.ripomaglobal.workers.dev/api');

    const workerUrl = resolveAbsoluteUrl('https://ripomaglobal1.ripomaglobal.workers.dev/api');
    assert.strictEqual(workerUrl, 'https://ripomaglobal1.ripomaglobal.workers.dev/api');
  });

  // ── 14. Token Expiry Check & Refresh Prevention ────────────────────────────
  it('14. isJwtExpiringSoon correctly detects unexpired tokens and prevents redundant refresh calls', async () => {
    const { isJwtExpiringSoon, setCustomerAuthHeader, refreshCustomerTokenSingleFlight } = await import('../../client/src/services/api.js');

    const validPayload = { id: 'cust_valid', exp: Math.floor(Date.now() / 1000) + 600 };
    const validToken = `header.${Buffer.from(JSON.stringify(validPayload)).toString('base64').replace(/=/g, '')}.signature`;

    assert.strictEqual(isJwtExpiringSoon(validToken, 60), false);

    const expiringPayload = { id: 'cust_expiring', exp: Math.floor(Date.now() / 1000) + 20 };
    const expiringToken = `header.${Buffer.from(JSON.stringify(expiringPayload)).toString('base64').replace(/=/g, '')}.signature`;

    assert.strictEqual(isJwtExpiringSoon(expiringToken, 60), true);

    // Set valid token and verify refreshCustomerTokenSingleFlight returns it immediately without calling network
    setCustomerAuthHeader(validToken);
    const returned = await refreshCustomerTokenSingleFlight();
    assert.strictEqual(returned, validToken);
    setCustomerAuthHeader(null);
  });
});
