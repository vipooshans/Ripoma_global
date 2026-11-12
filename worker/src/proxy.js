/**
 * Cloudflare Worker API Gateway for Rippoma Global E-commerce Platform.
 *
 * Architecture:
 *   - Native Cloudflare D1 database (ripoma_db) for catalog, stats, promos, categories.
 *   - Coordinated Durable Object rate limiting (RipomaApi) across all regions.
 *   - Edge Caching (caches.default) for public storefront requests.
 *   - Native D1 execution with container / origin fallback for complex admin operations.
 */

import { RipomaApi, resolveRatePolicy, resolveRateKey } from './durableRateLimiter.js';
import {
  getStorefrontCategories,
  getStorefrontCategoryDetail,
  getStorefrontFeatured,
  getStorefrontProducts,
  getStorefrontProductDetail,
  getStorefrontFacets,
  getStorefrontStats,
  getStorefrontPromos,
  getStorefrontSearchSuggestions
} from './storefrontD1.js';

export { RipomaApi };

const LOCAL_ORIGINS = ['http://localhost:5173', 'http://localhost:5174'];
const DEFAULT_PAGES = 'https://ripoma-global.pages.dev';
const STATIC_ORIGINS = [
  'https://ripomaglobal.org',
  'https://www.ripomaglobal.org',
  DEFAULT_PAGES
];
const PAGES_PREVIEW = /^https:\/\/([a-z0-9-]+\.)?ripoma-global\.pages\.dev$/i;

function normalizeOrigin(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    return `${url.protocol}//${url.host}`;
  } catch {
    return raw.replace(/\/+$/, '');
  }
}

function allowedOriginSet(env) {
  const set = new Set([...STATIC_ORIGINS, ...LOCAL_ORIGINS]);
  const frontend = normalizeOrigin(env?.FRONTEND_URL);
  if (frontend) set.add(frontend);
  String(env?.CORS_ORIGINS || '')
    .split(',')
    .map((s) => normalizeOrigin(s))
    .filter(Boolean)
    .forEach((o) => set.add(o));
  return set;
}

function isAllowedOrigin(origin, env) {
  if (!origin) return false;
  return allowedOriginSet(env).has(origin) || PAGES_PREVIEW.test(origin);
}

function corsHeaders(origin, env) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cookie, X-Request-ID',
    'Access-Control-Expose-Headers':
      'X-Ripoma-429-Source, Retry-After, X-RateLimit-Source, X-RateLimit-Policy, X-Data-Source, X-Request-ID',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
  if (origin && isAllowedOrigin(origin, env)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function withCors(response, origin, env, requestId = '') {
  const headers = new Headers(response.headers);
  const cors = corsHeaders(origin, env);
  for (const [key, value] of Object.entries(cors)) {
    headers.set(key, value);
  }
  if (requestId) {
    headers.set('X-Request-ID', requestId);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function jsonResponse(data, status = 200, origin = '', env = {}, requestId = '', extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...corsHeaders(origin, env),
    ...extraHeaders
  };
  if (requestId) headers['X-Request-ID'] = requestId;
  return new Response(JSON.stringify(data), { status, headers });
}

function getApiOrigin(env) {
  const raw = String(env?.API_ORIGIN || '').trim().replace(/\/+$/, '');
  if (!raw) return '';
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    if (!url.hostname || !url.hostname.includes('.')) {
      if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') return '';
    }
    return `${url.protocol}//${url.host}`;
  } catch {
    return '';
  }
}

/**
 * Coordinated Durable Object rate limiter caller.
 */
async function checkDurableRateLimit(env, policy, key) {
  if (!env?.RIPOMA_API) {
    return { allowed: true };
  }
  try {
    const shard = 'rl-' + policy;
    const id = env.RIPOMA_API.idFromName(shard);
    const stub = env.RIPOMA_API.get(id);
    const res = await stub.fetch('http://internal/rate-limit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policy, key })
    });
    return await res.json();
  } catch (err) {
    console.warn('[DO RateLimiter] Call failed, failing open:', err);
    return { allowed: true };
  }
}

/**
 * Proxy to upstream backend (Render or container) for admin and mutation operations.
 */
async function proxyToOrigin(request, env, apiOrigin, requestId = '') {
  const target = new URL(request.url);
  const upstream = `${apiOrigin}${target.pathname}${target.search}`;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.set('X-Forwarded-Host', target.host);
  headers.set('X-Forwarded-Proto', target.protocol.replace(':', ''));
  if (requestId) headers.set('X-Request-ID', requestId);

  const clientIp =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for') ||
    '';
  if (clientIp) {
    headers.set('CF-Connecting-IP', clientIp);
    headers.set('X-Forwarded-For', clientIp);
  }

  const init = {
    method: request.method,
    headers,
    redirect: 'manual'
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    init.duplex = 'half';
  }

  try {
    const response = await fetch(upstream, init);
    if (response.status === 530 || response.status === 502 || response.status === 503) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'upstream_service_unreachable',
          source: 'gateway',
          upstream,
          status: response.status,
          message: 'Upstream backend is starting or temporarily unreachable. Please retry.'
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return response;
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'upstream_fetch_failed',
        source: 'gateway',
        reason: String(error?.message || error)
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Normalize cache key URL with sorted query parameters.
 */
function normalizeCacheKey(url) {
  const u = new URL(url.toString());
  u.searchParams.sort();
  return new Request(u.toString(), { method: 'GET' });
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);
    const requestId = request.headers.get('cf-ray') || crypto.randomUUID();
    const startTime = Date.now();

    // ── 1. Preflight OPTIONS ──────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin, env)
      });
    }

    // ── 2. D1 Internal Gateway (for Express / Container queries) ─────────────
    if (url.pathname === '/internal/d1' && request.method === 'POST') {
      const secret = env?.D1_INTERNAL_SECRET || '';
      const provided = request.headers.get('X-D1-Secret') || '';
      if (!secret || provided !== secret) {
        return jsonResponse({ success: false, error: 'unauthorized' }, 401, origin, env, requestId);
      }

      const db = env?.ripoma_db;
      if (!db) {
        return jsonResponse({ success: false, error: 'd1_unbound' }, 500, origin, env, requestId);
      }

      try {
        const body = await request.json();
        const statements = Array.isArray(body.batch)
          ? body.batch
          : [{ sql: body.sql, params: body.params || [] }];

        const results = [];
        for (const stmt of statements) {
          const sql = String(stmt.sql || '').trim();
          if (!sql) throw new Error('empty sql');
          const params = Array.isArray(stmt.params) ? stmt.params : [];
          let q = db.prepare(sql);
          if (params.length) q = q.bind(...params);
          const outcome = await q.all();
          results.push({
            results: outcome.results || [],
            success: outcome.success !== false,
            meta: outcome.meta || {}
          });
        }
        return jsonResponse({ success: true, result: results }, 200, origin, env, requestId);
      } catch (error) {
        return jsonResponse({ success: false, error: String(error?.message || error) }, 400, origin, env, requestId);
      }
    }

    // ── 3. Gateway Root & Health Probes ──────────────────────────────────────
    if (url.pathname === '/' && request.method === 'GET') {
      return jsonResponse(
        {
          ok: true,
          service: 'ripoma-api-gateway',
          architecture: 'cloudflare_native',
          database: env?.ripoma_db ? 'd1' : 'unbound',
          durableObjects: Boolean(env?.RIPOMA_API),
          timestamp: new Date().toISOString()
        },
        200,
        origin,
        env,
        requestId
      );
    }

    if (url.pathname === '/health' && request.method === 'GET') {
      return jsonResponse(
        {
          status: 'healthy',
          service: 'ripoma-api-gateway',
          database: 'd1',
          timestamp: new Date().toISOString()
        },
        200,
        origin,
        env,
        requestId
      );
    }

    // ── 4. Anonymous Guest Auth Refresh Fast-Path ───────────────────────────
    if (url.pathname === '/api/customer-auth/refresh' && request.method === 'POST') {
      const cookieHeader = request.headers.get('Cookie') || '';
      if (!cookieHeader.includes('customerRefreshToken')) {
        return jsonResponse({ authenticated: false }, 200, origin, env, requestId);
      }
    }
    if (url.pathname === '/api/auth/refresh' && request.method === 'POST') {
      const cookieHeader = request.headers.get('Cookie') || '';
      if (!cookieHeader.includes('refreshToken')) {
        return jsonResponse({ message: 'No refresh token' }, 401, origin, env, requestId);
      }
    }

    // ── 5. Cloudflare Edge Cache for Public Storefront GET (Pre-Rate-Limit) ───
    const hasAuth = request.headers.has('Authorization');
    const isPublicStorefrontGet =
      request.method === 'GET' &&
      !hasAuth &&
      (url.pathname === '/api/storefront/categories' ||
        url.pathname.startsWith('/api/storefront/categories/') ||
        url.pathname === '/api/storefront/featured' ||
        url.pathname === '/api/storefront/promos' ||
        url.pathname === '/api/storefront/stats' ||
        url.pathname === '/api/storefront/products' ||
        url.pathname.startsWith('/api/storefront/products/') ||
        url.pathname === '/api/storefront/search-suggestions');

    const cache = typeof caches !== 'undefined' && caches.default ? caches.default : null;
    const cacheKey = cache && isPublicStorefrontGet ? normalizeCacheKey(url) : null;

    // Check Cloudflare Edge Cache — cache hits do NOT consume rate-limit quota
    if (cache && cacheKey) {
      try {
        const cached = await cache.match(cacheKey);
        if (cached) {
          const durationMs = Date.now() - startTime;
          console.log(
            JSON.stringify({
              requestId,
              method: request.method,
              pathname: url.pathname,
              status: cached.status,
              durationMs,
              cached: true,
              source: 'worker_edge_cache'
            })
          );
          return withCors(cached, origin, env, requestId);
        }
      } catch (cacheErr) {
        console.warn('[proxy] edge cache match error:', cacheErr);
      }
    }

    // ── 6. Coordinated Durable Object Rate Limiting ──────────────────────────
    const ratePolicy = resolveRatePolicy(url, request.method);
    if (ratePolicy) {
      const rateKey = resolveRateKey(request, ratePolicy);
      const rateCheck = await checkDurableRateLimit(env, ratePolicy, rateKey);
      if (!rateCheck.allowed) {
        return jsonResponse(
          {
            success: false,
            error: 'too_many_requests',
            source: 'durable_object',
            policy: ratePolicy,
            message: rateCheck.message || 'Too many requests. Please slow down.',
            retryAfter: rateCheck.retryAfter || 5
          },
          429,
          origin,
          env,
          requestId,
          {
            'Retry-After': String(rateCheck.retryAfter || 5),
            'X-Ripoma-429-Source': 'durable-object-rate-limit',
            'X-RateLimit-Source': 'durable_object',
            'X-RateLimit-Policy': ratePolicy
          }
        );
      }
    }

    // Execute Native D1 Storefront Queries
    const db = env?.ripoma_db;
    if (db && request.method === 'GET') {
      try {
        let d1Data = null;
        let isLongLived = false;

        if (url.pathname === '/api/storefront/categories') {
          d1Data = await getStorefrontCategories(db);
          isLongLived = true;
        } else if (url.pathname.startsWith('/api/storefront/categories/')) {
          const id = url.pathname.replace('/api/storefront/categories/', '').trim();
          d1Data = await getStorefrontCategoryDetail(db, id);
          isLongLived = true;
        } else if (url.pathname === '/api/storefront/featured') {
          const limit = url.searchParams.get('limit') || 8;
          d1Data = await getStorefrontFeatured(db, limit);
        } else if (url.pathname === '/api/storefront/stats') {
          d1Data = await getStorefrontStats(db);
          isLongLived = true;
        } else if (url.pathname === '/api/storefront/promos') {
          d1Data = getStorefrontPromos();
          isLongLived = true;
        } else if (url.pathname === '/api/storefront/products/facets') {
          d1Data = await getStorefrontFacets(db, Object.fromEntries(url.searchParams));
        } else if (url.pathname === '/api/storefront/products') {
          d1Data = await getStorefrontProducts(db, Object.fromEntries(url.searchParams));
        } else if (
          url.pathname.startsWith('/api/storefront/products/') &&
          !url.pathname.includes('/reviews')
        ) {
          const id = url.pathname.replace('/api/storefront/products/', '').trim();
          d1Data = await getStorefrontProductDetail(db, id);
        } else if (url.pathname === '/api/storefront/search-suggestions') {
          d1Data = await getStorefrontSearchSuggestions(db, url.searchParams.get('q'));
          isLongLived = true;
        }

        if (d1Data) {
          const sMaxAge = isLongLived ? 300 : 60;
          const cacheControl = `public, max-age=15, s-maxage=${sMaxAge}`;
          const response = jsonResponse(d1Data, 200, origin, env, requestId, {
            'Cache-Control': cacheControl,
            'X-Data-Source': 'native_d1'
          });

          // Store in Cloudflare Edge Cache
          if (cache && cacheKey) {
            try {
              const toCache = response.clone();
              const putPromise = cache.put(cacheKey, toCache).catch(() => {});
              if (ctx && typeof ctx.waitUntil === 'function') {
                ctx.waitUntil(putPromise);
              }
            } catch {}
          }

          const durationMs = Date.now() - startTime;
          console.log(
            JSON.stringify({
              requestId,
              method: request.method,
              pathname: url.pathname,
              status: 200,
              durationMs,
              source: 'native_d1'
            })
          );
          return response;
        }
      } catch (d1Err) {
        console.error('[proxy] native D1 query failed, falling back to upstream:', d1Err);
      }
    }

    // ── 7. Forwarding for Admin, Order Mutations & Backend Services ──────────
    const apiOrigin = getApiOrigin(env);
    if (!apiOrigin) {
      return jsonResponse(
        {
          success: false,
          error: 'service_unavailable',
          message: 'Backend service is not configured for non-storefront route.'
        },
        503,
        origin,
        env,
        requestId
      );
    }

    const upstream = await proxyToOrigin(request, env, apiOrigin, requestId);

    if (upstream.status === 101) {
      return upstream; // WebSocket upgrades
    }

    // Tag diagnostic header if upstream backend returned 429
    if (upstream.status === 429) {
      const headers = new Headers(upstream.headers);
      if (!headers.has('X-Ripoma-429-Source')) {
        const p = url.pathname;
        const isAuth = p.includes('/auth') || p.includes('/customer-auth');
        headers.set('X-Ripoma-429-Source', isAuth ? 'auth-rate-limit' : 'backend-rate-limit');
      }
      return withCors(new Response(upstream.body, { status: 429, headers }), origin, env, requestId);
    }

    // ── 8. Active Edge Cache Invalidation on Mutations ──────────────────────
    if (
      cache &&
      upstream.status >= 200 &&
      upstream.status < 300 &&
      (request.method === 'POST' ||
        request.method === 'PUT' ||
        request.method === 'PATCH' ||
        request.method === 'DELETE')
    ) {
      const p = url.pathname;
      if (
        p.startsWith('/api/products') ||
        p.startsWith('/api/categories') ||
        p.startsWith('/api/coupons') ||
        p.startsWith('/api/storefront/reviews')
      ) {
        const purgeKeys = [
          new Request(new URL('/api/storefront/categories', url.origin).toString(), { method: 'GET' }),
          new Request(new URL('/api/storefront/stats', url.origin).toString(), { method: 'GET' }),
          new Request(new URL('/api/storefront/promos', url.origin).toString(), { method: 'GET' }),
          new Request(new URL('/api/storefront/featured?limit=8', url.origin).toString(), { method: 'GET' }),
          new Request(new URL('/api/storefront/products', url.origin).toString(), { method: 'GET' })
        ];
        const purgePromise = Promise.all(purgeKeys.map((k) => cache.delete(k))).catch(() => {});
        if (ctx && typeof ctx.waitUntil === 'function') {
          ctx.waitUntil(purgePromise);
        }
      }
    }

    return withCors(upstream, origin, env, requestId);
  }
};
