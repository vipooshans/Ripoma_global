/**
 * Cloudflare Worker gateway for the Rippoma Express API.
 *
 * Mode A — Cloudflare Containers (default): Express runs in server/Dockerfile
 * Mode B — External origin: set secret/var API_ORIGIN (e.g. Render/Fly/Railway URL)
 *          and the Worker reverse-proxies all traffic there.
 *
 * Express cannot run as a pure Worker (mongoose, socket.io, node-cron, sharp, pdfmake).
 */

import { Container, getContainer } from '@cloudflare/containers';
import { env } from 'cloudflare:workers';
import { categoriesResponseFromD1 } from './storefrontCategories.js';

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

function buildContainerEnvVars() {
  const vars = {
    PORT: '8080',
    NODE_ENV: env.NODE_ENV || 'production',
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

function withCors(response, origin, requestId = '') {
  const headers = new Headers(response.headers);
  const cors = corsHeaders(origin);
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

function getApiOrigin() {
  const raw = env.API_ORIGIN;
  if (!raw) return '';
  return String(raw).replace(/\/+$/, '');
}

/**
 * Reverse-proxy to external Express (Render / Railway / Fly).
 * Reads API_ORIGIN only from Worker env — never hardcodes upstream hosts.
 */
async function proxyToOrigin(request, apiOrigin, requestId = '') {
  const target = new URL(request.url);
  const upstream = `${apiOrigin}${target.pathname}${target.search}`;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.set('X-Forwarded-Host', target.host);
  headers.set('X-Forwarded-Proto', target.protocol.replace(':', ''));
  if (requestId) {
    headers.set('X-Request-ID', requestId);
  }

  // Forward client IP so upstream rate limiters/logging know the true client
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
    console.error('[proxy] fetch failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'api_origin_unreachable',
        source: 'gateway',
        upstream,
        reason: String(error?.message || error)
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId }
      }
    );
  }
}

export class RipomaApi extends Container {
  defaultPort = 8080;
  sleepAfter = '30m';
  enableInternet = true;
  envVars = buildContainerEnvVars();
  pingEndpoint = '/health';

  onStart() {
    console.log('[RipomaApi] container started');
  }

  onStop() {
    console.log('[RipomaApi] container stopped');
  }

  onError(error) {
    console.error('[RipomaApi] container error:', error);
  }
}

export default {
  async fetch(request, workerEnv, ctx) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);
    const requestId = request.headers.get('cf-ray') || crypto.randomUUID();
    const startTime = Date.now();

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin)
      });
    }

    // Express (API_ORIGIN) queries D1 through this Worker binding so it does
    // not need a Cloudflare API token. Not for browsers — shared secret only.
    if (url.pathname === '/internal/d1' && request.method === 'POST') {
      const secret = workerEnv.D1_INTERNAL_SECRET || env.D1_INTERNAL_SECRET || '';
      const provided = request.headers.get('X-D1-Secret') || '';
      if (!secret || provided !== secret) {
        return new Response(JSON.stringify({ success: false, error: 'unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId }
        });
      }

      const db = workerEnv.ripoma_db;
      if (!db) {
        return new Response(JSON.stringify({ success: false, error: 'd1_unbound' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId }
        });
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

        return new Response(JSON.stringify({ success: true, result: results }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId }
        });
      } catch (error) {
        console.error('[D1 gateway]', error);
        return new Response(
          JSON.stringify({ success: false, error: String(error?.message || error) }),
          { status: 400, headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId } }
        );
      }
    }

    const apiOrigin = getApiOrigin();

    // Friendly root — this is an API gateway, not a website
    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(
        JSON.stringify({
          ok: true,
          service: 'ripoma-api-gateway',
          mode: apiOrigin ? 'api_origin' : 'container',
          health: '/health',
          api: '/api'
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
            ...corsHeaders(origin)
          }
        }
      );
    }

    // Direct gateway health check (avoids consuming upstream rate limits for pings)
    if (url.pathname === '/health' && request.method === 'GET') {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          service: 'ripoma-api-gateway',
          mode: apiOrigin ? 'api_origin' : 'container',
          timestamp: new Date().toISOString()
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
            ...corsHeaders(origin)
          }
        }
      );
    }

    // Only cache genuinely public, non-personalized GET requests (never cache authenticated users or cookies)
    const hasAuth = request.headers.has('Authorization');
    const hasCookie = request.headers.has('Cookie');
    const isPublicStorefrontGet =
      request.method === 'GET' &&
      !hasAuth &&
      !hasCookie &&
      (url.pathname === '/api/storefront/categories' ||
        url.pathname === '/api/storefront/featured' ||
        url.pathname === '/api/storefront/promos' ||
        url.pathname === '/api/storefront/stats' ||
        url.pathname === '/api/storefront/faqs' ||
        url.pathname === '/api/storefront/products' ||
        url.pathname === '/api/storefront/products/facets' ||
        url.pathname === '/api/storefront/search-suggestions');

    const cache =
      typeof caches !== 'undefined' && caches.default ? caches.default : null;
    const cacheKey = cache && isPublicStorefrontGet ? new Request(url.toString(), { method: 'GET' }) : null;

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
        console.warn('[RipomaApi] cache match error:', cacheErr);
      }
    }

    try {
      let upstream;
      let sourceTag = 'upstream_origin';

      if (apiOrigin) {
        upstream = await proxyToOrigin(request, apiOrigin, requestId);
      } else {
        sourceTag = 'container';
        const container = getContainer(workerEnv.RIPOMA_API, 'ripoma-api');
        upstream = await container.fetch(request);
      }

      // WebSocket upgrades
      if (upstream.status === 101) {
        return upstream;
      }

      // D1 fallback for categories if upstream returns 5xx or 429
      if (
        (upstream.status >= 500 || upstream.status === 429) &&
        request.method === 'GET' &&
        url.pathname === '/api/storefront/categories'
      ) {
        try {
          const fallback = await categoriesResponseFromD1(workerEnv);
          if (fallback) {
            console.log(
              JSON.stringify({
                requestId,
                method: 'GET',
                pathname: url.pathname,
                status: 200,
                durationMs: Date.now() - startTime,
                source: 'd1_fallback'
              })
            );
            return withCors(fallback, origin, requestId);
          }
        } catch (fallbackErr) {
          console.error('[RipomaApi] D1 categories fallback failed:', fallbackErr);
        }
      }

      // Structured JSON response for 429 rate limit
      if (upstream.status === 429) {
        const retryAfter = upstream.headers.get('Retry-After') || '3';
        let upstreamBody = null;
        try {
          const cloned = upstream.clone();
          upstreamBody = await cloned.json();
        } catch {}

        const source = upstream.headers.get('X-RateLimit-Source') || sourceTag;
        const message =
          upstreamBody?.message ||
          'Server is receiving high traffic. Please retry in a few seconds.';

        console.warn(
          JSON.stringify({
            requestId,
            method: request.method,
            pathname: url.pathname,
            status: 429,
            durationMs: Date.now() - startTime,
            source,
            retryAfter
          })
        );

        return new Response(
          JSON.stringify({
            success: false,
            error: 'too_many_requests',
            source,
            message,
            retryAfter: parseInt(retryAfter, 10) || 3
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfter),
              'X-Rippoma-429-Source': source,
              'X-Request-ID': requestId,
              ...corsHeaders(origin)
            }
          }
        );
      }

      // Cache successful public storefront responses at Cloudflare edge
      if (
        cache &&
        cacheKey &&
        upstream.status === 200 &&
        !upstream.headers.has('Set-Cookie')
      ) {
        try {
          const toCache = upstream.clone();
          const ch = new Headers(toCache.headers);
          ch.delete('Set-Cookie');
          const isLongLived =
            url.pathname === '/api/storefront/categories' ||
            url.pathname === '/api/storefront/stats' ||
            url.pathname === '/api/storefront/promos' ||
            url.pathname === '/api/storefront/faqs';
          const sMaxAge = isLongLived ? 300 : 60;
          ch.set('Cache-Control', `public, max-age=15, s-maxage=${sMaxAge}`);
          const cachedRes = new Response(toCache.body, {
            status: toCache.status,
            statusText: toCache.statusText,
            headers: ch
          });
          const putPromise = cache.put(cacheKey, cachedRes).catch((err) => {
            console.warn('[RipomaApi] cache put error:', err);
          });
          if (ctx && typeof ctx.waitUntil === 'function') {
            ctx.waitUntil(putPromise);
          }
        } catch (cachePutErr) {
          console.warn('[RipomaApi] cache put error:', cachePutErr);
        }
      }

      const durationMs = Date.now() - startTime;
      console.log(
        JSON.stringify({
          requestId,
          method: request.method,
          pathname: url.pathname,
          status: upstream.status,
          durationMs,
          source: sourceTag
        })
      );

      return withCors(upstream, origin, requestId);
    } catch (error) {
      console.error('[RipomaApi] proxy failed:', error);
      const upstream = apiOrigin
        ? `${apiOrigin}${url.pathname}${url.search}`
        : null;
      return new Response(
        JSON.stringify({
          success: false,
          error: 'api_origin_unreachable',
          source: 'gateway',
          upstream,
          reason: String(error?.message || error),
          message: apiOrigin
            ? `Could not reach API_ORIGIN (${apiOrigin}). Check the Render/Railway/Fly URL and that Express is running.`
            : 'Rippoma API container is starting or unavailable. Wait a minute and retry, or set API_ORIGIN to an external Express host. Requires Workers Paid + Containers when not using API_ORIGIN.'
        }),
        {
          status: apiOrigin ? 502 : 503,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
            ...corsHeaders(origin)
          }
        }
      );
    }
  }
};
