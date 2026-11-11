/**
 * Cloudflare Worker API Gateway for Rippoma Global E-commerce Platform.
 *
 * Architecture:
 *   - Native Cloudflare D1 database (ripoma_db) for catalog, stats, promos, categories.
 *   - Coordinated Durable Object rate limiting (RipomaApi) across all regions.
 *   - Edge Caching (caches.default) for public storefront requests.
 *   - Native D1 execution with container / origin fallback for complex admin operations.
 */

import { Container, getContainer } from '@cloudflare/containers';
import { env } from 'cloudflare:workers';
import { RipomaApi as BaseRipomaApi, resolveRatePolicy } from './durableRateLimiter.js';
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

const ALLOWED_ORIGINS = new Set([
  'https://ripomaglobal.org',
  'https://www.ripomaglobal.org',
  'https://ripoma-global.pages.dev',
  'http://localhost:5173',
  'http://localhost:5174'
]);

const PAGES_PREVIEW = /^https:\/\/([a-z0-9-]+\.)?ripoma-global\.pages\.dev$/i;

/** Secrets / vars forwarded into the Container process env */
const CONTAINER_ENV_KEYS = [
  'MONGODB_URI',
  'FRONTEND_URL',
  'CORS_PAGES_HOST',
  'CORS_ORIGINS',
  'NODE_ENV',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'CUSTOMER_JWT_SECRET',
  'CUSTOMER_JWT_REFRESH_SECRET',
  'GOOGLE_CLIENT_ID',
  'CUSTOMER_REQUIRE_EMAIL_VERIFICATION',
  'EMAIL_FROM',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
  'STORAGE_PROVIDER',
  'PRODUCT_IMAGE_STORAGE_PROVIDER',
  'AWS_REGION',
  'AWS_S3_BUCKET',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_PRODUCT_BUCKET',
  'R2_PUBLIC_URL',
  'R2_DOCUMENTS_BUCKET',
  'OPEN_EXCHANGE_RATES_APP_ID'
];

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

function isAllowedOrigin(origin) {
  if (!origin) return false;
  const frontend = normalizeOrigin(env.FRONTEND_URL);
  if (frontend && origin === frontend) return true;
  const extras = String(env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => normalizeOrigin(s))
    .filter(Boolean);
  if (extras.includes(origin)) return true;
  return ALLOWED_ORIGINS.has(origin) || PAGES_PREVIEW.test(origin);
}

function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cookie, X-Request-ID',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
  if (origin && isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function withCors(response, origin, requestId = '') {
  const headers = new Headers(response.headers);
  const cors = corsHeaders(origin);
  for (const [key, value] of Object.entries(cors)) {
    headers.set(key, value);
  }
  if (requestId) headers.set('X-Request-ID', requestId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function jsonResponse(data, status = 200, origin = '', requestId = '', extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...corsHeaders(origin),
    ...extraHeaders
  };
  if (requestId) headers['X-Request-ID'] = requestId;
  return new Response(JSON.stringify(data), { status, headers });
}

function buildContainerEnvVars() {
  const vars = {
    PORT: '8080',
    NODE_ENV: env.NODE_ENV || 'production',
    DATA_BACKEND: 'd1',
    FRONTEND_URL: env.FRONTEND_URL || 'https://ripoma-global.pages.dev',
    CORS_PAGES_HOST: env.CORS_PAGES_HOST || 'ripoma-global.pages.dev'
  };

  for (const key of CONTAINER_ENV_KEYS) {
    const value = env[key];
    if (value != null && String(value).length > 0) {
      vars[key] = String(value);
    }
  }

  return vars;
}

function getApiOrigin() {
  const raw = env.API_ORIGIN;
  if (!raw) return '';
  return String(raw).replace(/\/+$/, '');
}

/**
 * Coordinated Durable Object rate limiter caller.
 */
async function checkDurableRateLimit(workerEnv, policy, key) {
  if (!workerEnv?.RIPOMA_API) {
    return { allowed: true };
  }
  try {
    const id = workerEnv.RIPOMA_API.idFromName('global-rate-limiter');
    const stub = workerEnv.RIPOMA_API.get(id);
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

async function proxyToOrigin(request, apiOrigin, requestId = '') {
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
    return await fetch(upstream, init);
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

function normalizeCacheKey(url) {
  const u = new URL(url.toString());
  u.searchParams.sort();
  return new Request(u.toString(), { method: 'GET' });
}

/**
 * RipomaApi Durable Object class.
 * Inherits rate-limiting logic from BaseRipomaApi while maintaining Container compatibility.
 */
export class RipomaApi extends BaseRipomaApi {
  defaultPort = 8080;
  sleepAfter = '30m';
  enableInternet = true;
  envVars = buildContainerEnvVars();
  pingEndpoint = '/health';

  onStart() {
    console.log('[RipomaApi] started');
  }

  onStop() {
    console.log('[RipomaApi] stopped');
  }

  onError(error) {
    console.error('[RipomaApi] error:', error);
  }
}

export default {
  async fetch(request, workerEnv, ctx) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);
    const requestId = request.headers.get('cf-ray') || crypto.randomUUID();
    const startTime = Date.now();

    // ── 1. Preflight OPTIONS ──────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin)
      });
    }

    // ── 2. D1 Internal Gateway (for Express / Container queries) ─────────────
    if (url.pathname === '/internal/d1' && request.method === 'POST') {
      const secret = workerEnv.D1_INTERNAL_SECRET || env.D1_INTERNAL_SECRET || '';
      const provided = request.headers.get('X-D1-Secret') || '';
      if (!secret || provided !== secret) {
        return jsonResponse({ success: false, error: 'unauthorized' }, 401, origin, requestId);
      }

      const db = workerEnv.ripoma_db;
      if (!db) {
        return jsonResponse({ success: false, error: 'd1_unbound' }, 500, origin, requestId);
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
        return jsonResponse({ success: true, result: results }, 200, origin, requestId);
      } catch (error) {
        return jsonResponse({ success: false, error: String(error?.message || error) }, 400, origin, requestId);
      }
    }

    // ── 3. Gateway Root & Health Probes ──────────────────────────────────────
    if (url.pathname === '/' && request.method === 'GET') {
      return jsonResponse(
        {
          ok: true,
          service: 'ripoma-api-gateway',
          architecture: 'cloudflare_native',
          database: workerEnv.ripoma_db ? 'd1' : 'unbound',
          durableObjects: Boolean(workerEnv.RIPOMA_API),
          timestamp: new Date().toISOString()
        },
        200,
        origin,
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
        requestId
      );
    }

    // ── 4. Coordinated Durable Object Rate Limiting ──────────────────────────
    const ratePolicy = resolveRatePolicy(url, request.method);
    if (ratePolicy) {
      const clientIp =
        request.headers.get('cf-connecting-ip') ||
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        'unknown';
      const authHeader = request.headers.get('Authorization') || '';
      const rateKey = authHeader ? `user:${authHeader.slice(-16)}` : `ip:${clientIp}`;

      const rateCheck = await checkDurableRateLimit(workerEnv, ratePolicy, rateKey);
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
          requestId,
          {
            'Retry-After': String(rateCheck.retryAfter || 5),
            'X-RateLimit-Source': 'durable_object',
            'X-RateLimit-Policy': ratePolicy
          }
        );
      }
    }

    // ── 5. Anonymous Guest Customer Auth Refresh Fast-Path ───────────────────
    if (url.pathname === '/api/customer-auth/refresh' && request.method === 'POST') {
      const cookieHeader = request.headers.get('Cookie') || '';
      if (!cookieHeader.includes('customerRefreshToken')) {
        return jsonResponse({ authenticated: false }, 200, origin, requestId);
      }
    }

    // ── 6. Native D1 Storefront Read Path (with Cloudflare Edge Cache) ───────
    const hasAuth = request.headers.has('Authorization');
    const hasCookie = request.headers.has('Cookie');
    const isPublicStorefrontGet =
      request.method === 'GET' &&
      !hasAuth &&
      !hasCookie &&
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

    // Check Cloudflare Edge Cache
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
          return withCors(cached, origin, requestId);
        }
      } catch (cacheErr) {
        console.warn('[RipomaApi] edge cache match error:', cacheErr);
      }
    }

    // Execute Native D1 Storefront Queries
    const db = workerEnv.ripoma_db;
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
          const response = jsonResponse(d1Data, 200, origin, requestId, {
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
        console.error('[RipomaApi] native D1 query failed, falling back to backend:', d1Err);
      }
    }

    // ── 7. Forwarding for Admin, Order Mutations & Backend Services ──────────
    const apiOrigin = getApiOrigin();
    let upstream;

    try {
      if (apiOrigin) {
        upstream = await proxyToOrigin(request, apiOrigin, requestId);
      } else if (workerEnv.RIPOMA_API) {
        const container = getContainer(workerEnv.RIPOMA_API, 'ripoma-api');
        upstream = await container.fetch(request);
      } else {
        return jsonResponse(
          { success: false, error: 'backend_unavailable', message: 'No backend origin or container bound.' },
          503,
          origin,
          requestId
        );
      }

      if (upstream.status === 101) {
        return upstream;
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

      return withCors(upstream, origin, requestId);
    } catch (error) {
      return jsonResponse(
        {
          success: false,
          error: 'backend_error',
          reason: String(error?.message || error)
        },
        502,
        origin,
        requestId
      );
    }
  }
};
