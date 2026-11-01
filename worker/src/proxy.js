/**
 * Proxy-only Worker: reverse-proxies to Express on Render / Fly / Railway.
 *
 * Set secret (no trailing slash):
 *   npx wrangler secret put API_ORIGIN -c wrangler.proxy.jsonc
 *   # e.g. https://ripoma-api.onrender.com
 *
 * Deploy: npm run deploy:proxy
 */

import { categoriesResponseFromD1 } from './storefrontCategories.js';

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
  const frontend = normalizeOrigin(env.FRONTEND_URL);
  if (frontend) set.add(frontend);
  String(env.CORS_ORIGINS || '')
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
      'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cookie',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
  if (origin && isAllowedOrigin(origin, env)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function withCors(response, origin, env) {
  const headers = new Headers(response.headers);
  const cors = corsHeaders(origin, env);
  for (const [key, value] of Object.entries(cors)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function getApiOrigin(env) {
  const raw = String(env.API_ORIGIN || '')
    .trim()
    .replace(/\/+$/, '');
  if (!raw) return '';
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    // Reject bare host fragments without a real origin (e.g. "vipoo")
    if (!url.hostname || !url.hostname.includes('.')) {
      // Allow localhost for local tunnels
      if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') return '';
    }
    return `${url.protocol}//${url.host}`;
  } catch {
    return '';
  }
}

/**
 * Proxy to permanent Express host (Render / Railway / Fly).
 * Reads API_ORIGIN only from Worker env — never hardcodes upstream hosts.
 */
async function proxyToOrigin(request, env, apiOrigin) {
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
    init.duplex = 'half';
  }

  try {
    const response = await fetch(upstream, init);

    // Gateway / origin DNS failures from Cloudflare edge in front of upstream
    if (response.status === 530 || response.status === 502 || response.status === 503) {
      const detail = await response.text().catch(() => '');
      console.error('[proxy] upstream gateway error', {
        upstream,
        status: response.status,
        detail: detail.slice(0, 300)
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: 'api_origin_unreachable',
          upstream,
          reason: `Upstream returned HTTP ${response.status}`,
          status: response.status,
          message:
            'API_ORIGIN host is unreachable. Set API_ORIGIN to a permanent Render/Railway/Fly URL and ensure that service is running.'
        }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return response;
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

/**
 * Retained for Cloudflare Durable Object migration compatibility on ripomaglobal1.
 */
export class RipomaApi {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    return new Response(JSON.stringify({ ok: true, service: 'RipomaApi' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin, env)
      });
    }

    // Express (API_ORIGIN) queries D1 through this Worker binding so it does
    // not need a Cloudflare API token. Not for browsers — shared secret only.
    if (url.pathname === '/internal/d1' && request.method === 'POST') {
      const secret = env.D1_INTERNAL_SECRET || '';
      const provided = request.headers.get('X-D1-Secret') || '';
      if (!secret || provided !== secret) {
        return new Response(JSON.stringify({ success: false, error: 'unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const db = env.ripoma_db;
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

    const apiOrigin = getApiOrigin(env);

    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(
        JSON.stringify({
          ok: true,
          service: 'ripoma-api-gateway',
          mode: 'api_origin',
          configured: Boolean(apiOrigin),
          health: '/health',
          api: '/api'
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin, env)
          }
        }
      );
    }

    if (!apiOrigin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'api_origin_missing',
          message:
            'API_ORIGIN is missing or invalid. Set a full URL, e.g. https://YOUR-SERVICE.onrender.com (include https://, no /api path).',
          hint: 'npx wrangler secret put API_ORIGIN -c wrangler.proxy.jsonc'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin, env)
          }
        }
      );
    }

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
          return withCors(cached, origin, env);
        }
      } catch (cacheErr) {
        console.warn('[proxy] cache match error:', cacheErr);
      }
    }

    const upstream = await proxyToOrigin(request, env, apiOrigin);
    // WebSocket upgrades (socket.io): reconstructing the Response in withCors
    // drops the webSocket handle and the browser reports a failed wss:// probe.
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
        const fallback = await categoriesResponseFromD1(env);
        if (fallback) {
          return withCors(fallback, origin, env);
        }
      } catch (fallbackErr) {
        console.error('[proxy] D1 categories fallback failed:', fallbackErr);
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
            ...corsHeaders(origin, env)
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
        console.warn('[proxy] cache put error:', cachePutErr);
      }
    }

    return withCors(upstream, origin, env);
  }
};
