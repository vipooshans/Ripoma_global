const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Rippoma HTTP 429 & Rate-Limiting Verification Suite', () => {
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
});

