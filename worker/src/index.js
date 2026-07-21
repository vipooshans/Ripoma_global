/**
 * Temporary Worker for ripomaglobal1.
 *
 * This is NOT the Express API. It only:
 * 1) Answers CORS preflight for the Pages frontend
 * 2) Returns a clear JSON error so the browser is not blocked by CORS
 *
 * Deploy the real Express `server/` to Railway/Render/Fly and point
 * VITE_API_URL at that host (…/api). Then you can remove this stub.
 */

const ALLOWED_ORIGINS = new Set([
  'https://ripoma-global.pages.dev',
  'http://localhost:5173',
  'http://localhost:5174'
]);

const PAGES_PREVIEW =
  /^https:\/\/([a-z0-9-]+\.)?ripoma-global\.pages\.dev$/i;

function isAllowedOrigin(origin) {
  if (!origin) return false;
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

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin)
    }
  });
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin)
      });
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return json(
        {
          status: 'worker-stub',
          message:
            'This Cloudflare Worker is a CORS stub, not the Rippoma Express API. Deploy server/ to Railway/Render and set VITE_API_URL to that host /api.',
          path: url.pathname
        },
        200,
        origin
      );
    }

    return json(
      {
        error: 'api_not_deployed',
        message:
          'Rippoma Express backend is not running on this Worker. Deploy the Node server, then point the Pages VITE_API_URL to https://YOUR-API-HOST/api.',
        requested: `${request.method} ${url.pathname}${url.search}`
      },
      503,
      origin
    );
  }
};
