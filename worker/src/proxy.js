/**
 * Proxy-only Worker: reverse-proxies to Express on Render / Fly / Railway.
 * Set secret API_ORIGIN (no trailing slash), e.g. https://ripoma-api.onrender.com
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

async function proxyToOrigin(request, apiOrigin) {
  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, apiOrigin);

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.set('X-Forwarded-Host', incoming.host);
  headers.set('X-Forwarded-Proto', incoming.protocol.replace(':', ''));
  // localtunnel interstitial bypass (harmless for Render/Fly)
  headers.set('Bypass-Tunnel-Reminder', 'true');

  const init = {
    method: request.method,
    headers,
    redirect: 'manual'
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    init.duplex = 'half';
  }

  const upstream = await fetch(target.toString(), init);

  // Cloudflare origin/tunnel failures (502/503/520/521/522/523/524/525/530)
  if (upstream.status >= 502) {
    const detail = await upstream.text().catch(() => '');
    console.error('[proxy] upstream error', {
      target: target.toString(),
      status: upstream.status,
      detail: detail.slice(0, 500)
    });

    const isTunnelDead =
      upstream.status === 530 ||
      /Origin DNS error|Tunnel Unavailable|Error 1016|Error 1033/i.test(detail);

    return new Response(
      JSON.stringify({
        success: false,
        error: isTunnelDead ? 'api_origin_unreachable' : 'upstream_error',
        status: upstream.status,
        target: target.toString(),
        message: isTunnelDead
          ? 'API_ORIGIN tunnel/host is down. Start Express (and cloudflared), or set API_ORIGIN to a permanent Render/Fly URL.'
          : 'Upstream API returned an error gateway status.',
        detail: detail.includes('<!DOCTYPE')
          ? detail.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300)
          : detail.slice(0, 2000)
      }),
      {
        // Prefer 503 for clients; keep original CF code in body.status
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return upstream;
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

    const apiOrigin = String(env.API_ORIGIN || '').replace(/\/+$/, '');

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
            'Express is not running inside this Worker. Set secret API_ORIGIN to your Node host (Render/Fly/Railway), e.g. https://YOUR-SERVICE.onrender.com',
          hint: 'npx wrangler secret put API_ORIGIN -c wrangler.proxy.jsonc'
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin, env)
          }
        }
      );
    }

    try {
      const upstream = await proxyToOrigin(request, apiOrigin);
      return withCors(upstream, origin, env);
    } catch (error) {
      console.error('[proxy] failed:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'backend_unavailable',
          message: `Could not reach API_ORIGIN (${apiOrigin}).`,
          detail: String(error?.message || error),
          stack: String(error?.stack || '')
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin, env)
          }
        }
      );
    }
  }
};
