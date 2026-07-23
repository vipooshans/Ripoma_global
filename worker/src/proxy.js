/**
 * Proxy-only Worker: reverse-proxies to Express on Render / Fly / Railway.
 *
 * Set secret (no trailing slash):
 *   npx wrangler secret put API_ORIGIN -c wrangler.proxy.jsonc
 *   # e.g. https://ripoma-api.onrender.com
 *
 * Deploy: npm run deploy:proxy
 */

const LOCAL_ORIGINS = ['http://localhost:5173', 'http://localhost:5174'];
const DEFAULT_PAGES = 'https://ripoma-global.pages.dev';
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
  const set = new Set([DEFAULT_PAGES, ...LOCAL_ORIGINS]);
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
  return String(env.API_ORIGIN || '')
    .trim()
    .replace(/\/+$/, '');
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
            'API_ORIGIN is not set. Deploy Express to Render/Railway/Fly, then: npx wrangler secret put API_ORIGIN -c wrangler.proxy.jsonc'
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

    const upstream = await proxyToOrigin(request, env, apiOrigin);
    return withCors(upstream, origin, env);
  }
};
