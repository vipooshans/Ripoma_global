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
      'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cookie',
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

function withCors(response, origin) {
  const headers = new Headers(response.headers);
  const cors = corsHeaders(origin);
  for (const [key, value] of Object.entries(cors)) {
    headers.set(key, value);
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
async function proxyToOrigin(request, apiOrigin) {
  const target = new URL(request.url);
  const upstream = `${apiOrigin}${target.pathname}${target.search}`;

  console.log('Proxying:', upstream);

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.set('X-Forwarded-Host', target.host);
  headers.set('X-Forwarded-Proto', target.protocol.replace(':', ''));

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
    // Required for streaming request bodies in Workers
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
        upstream,
        reason: String(error?.message || error)
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export class RipomaApi extends Container {
  defaultPort = 8080;
  // Keep warm longer so Mongo + cron survive short idle gaps
  sleepAfter = '30m';
  enableInternet = true;
  envVars = buildContainerEnvVars();
  // Express exposes GET /health after boot
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
  async fetch(request, workerEnv) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);

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
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const db = workerEnv.ripoma_db;
      if (!db) {
        return new Response(JSON.stringify({ success: false, error: 'd1_unbound' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
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
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('[D1 gateway]', error);
        return new Response(
          JSON.stringify({ success: false, error: String(error?.message || error) }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Friendly root — this is an API gateway, not a website
    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(
        JSON.stringify({
          ok: true,
          service: 'ripoma-api-gateway',
          mode: getApiOrigin() ? 'api_origin' : 'container',
          health: '/health',
          api: '/api'
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin)
          }
        }
      );
    }

    const apiOrigin = getApiOrigin();

    // Cloudflare Edge Cache for public storefront data
    const isPublicStorefrontGet =
      request.method === 'GET' &&
      (url.pathname === '/api/storefront/categories' ||
        url.pathname === '/api/storefront/featured' ||
        url.pathname === '/api/storefront/promos' ||
        url.pathname === '/api/storefront/stats' ||
        url.pathname === '/api/storefront/faqs' ||
        url.pathname === '/api/storefront/products/facets');

    const cache =
      typeof caches !== 'undefined' && caches.default ? caches.default : null;
    const cacheKey = cache && isPublicStorefrontGet ? new Request(url.toString(), { method: 'GET' }) : null;

    if (cache && cacheKey) {
      try {
        const cached = await cache.match(cacheKey);
        if (cached) {
          return withCors(cached, origin);
        }
      } catch (cacheErr) {
        console.warn('[RipomaApi] cache match error:', cacheErr);
      }
    }

    try {
      let upstream;

      if (apiOrigin) {
        upstream = await proxyToOrigin(request, apiOrigin);
        if (upstream.status === 101) {
          return upstream;
        }
        if (
          (upstream.status >= 500 || upstream.status === 429) &&
          request.method === 'GET' &&
          url.pathname === '/api/storefront/categories'
        ) {
          try {
            const fallback = await categoriesResponseFromD1(workerEnv);
            if (fallback) return withCors(fallback, origin);
          } catch (fallbackErr) {
            console.error('[RipomaApi] D1 categories fallback failed:', fallbackErr);
          }
        }

        // Structured JSON response for 429 rate limit
        if (upstream.status === 429) {
          const retryAfter = upstream.headers.get('Retry-After') || '3';
          return new Response(
            JSON.stringify({
              success: false,
              error: 'too_many_requests',
              message: 'Server is receiving high traffic. Please retry in a few seconds.',
              retryAfter: parseInt(retryAfter, 10) || 3
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(retryAfter),
                ...corsHeaders(origin)
              }
            }
          );
        }

        // Cache successful public storefront responses at Cloudflare edge
        if (cache && cacheKey && upstream.status === 200) {
          try {
            const toCache = upstream.clone();
            const ch = new Headers(toCache.headers);
            ch.set('Cache-Control', 'public, max-age=60, s-maxage=300');
            const cachedRes = new Response(toCache.body, {
              status: toCache.status,
              statusText: toCache.statusText,
              headers: ch
            });
            cache.put(cacheKey, cachedRes).catch(() => {});
          } catch (cachePutErr) {
            console.warn('[RipomaApi] cache put error:', cachePutErr);
          }
        }

        return withCors(upstream, origin);
      }

      const container = getContainer(workerEnv.RIPOMA_API, 'ripoma-api');
      upstream = await container.fetch(request);
      // WebSocket upgrades (socket.io): the 101 response carries a webSocket
      // handle that is lost if the Response is reconstructed — pass it through.
      if (upstream.status === 101) {
        return upstream;
      }

      if (
        (upstream.status >= 500 || upstream.status === 429) &&
        request.method === 'GET' &&
        url.pathname === '/api/storefront/categories'
      ) {
        try {
          const fallback = await categoriesResponseFromD1(workerEnv);
          if (fallback) return withCors(fallback, origin);
        } catch (fallbackErr) {
          console.error('[RipomaApi] D1 categories fallback failed:', fallbackErr);
        }
      }

      if (upstream.status === 429) {
        const retryAfter = upstream.headers.get('Retry-After') || '3';
        return new Response(
          JSON.stringify({
            success: false,
            error: 'too_many_requests',
            message: 'Server is receiving high traffic. Please retry in a few seconds.',
            retryAfter: parseInt(retryAfter, 10) || 3
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfter),
              ...corsHeaders(origin)
            }
          }
        );
      }

      if (cache && cacheKey && upstream.status === 200) {
        try {
          const toCache = upstream.clone();
          const ch = new Headers(toCache.headers);
          ch.set('Cache-Control', 'public, max-age=60, s-maxage=300');
          const cachedRes = new Response(toCache.body, {
            status: toCache.status,
            statusText: toCache.statusText,
            headers: ch
          });
          cache.put(cacheKey, cachedRes).catch(() => {});
        } catch {}
      }

      return withCors(upstream, origin);
    } catch (error) {
      console.error('[RipomaApi] proxy failed:', error);
      const upstream = apiOrigin
        ? `${apiOrigin}${url.pathname}${url.search}`
        : null;
      return new Response(
        JSON.stringify({
          success: false,
          error: 'api_origin_unreachable',
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
            ...corsHeaders(origin)
          }
        }
      );
    }
  }
};
