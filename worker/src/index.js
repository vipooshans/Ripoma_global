/**
 * Cloudflare Worker + Container gateway for the Rippoma Express API.
 *
 * - OPTIONS / CORS answered at the edge (fast preflight)
 * - All other traffic proxied into the Node container (server/Dockerfile)
 */

import { Container, getContainer } from '@cloudflare/containers';
import { env } from 'cloudflare:workers';

const ALLOWED_ORIGINS = new Set([
  'https://ripoma-global.pages.dev',
  'http://localhost:5173',
  'http://localhost:5174'
]);

const PAGES_PREVIEW = /^https:\/\/([a-z0-9-]+\.)?ripoma-global\.pages\.dev$/i;

const CONTAINER_ENV_KEYS = [
  'MONGODB_URI',
  'FRONTEND_URL',
  'CORS_PAGES_HOST',
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
  'R2_BUCKET_NAME',
  'R2_PUBLIC_BASE_URL'
];

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

export class RipomaApi extends Container {
  defaultPort = 8080;
  // Keep warm longer so Mongo + cron survive short idle gaps
  sleepAfter = '30m';
  enableInternet = true;
  envVars = buildContainerEnvVars();

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

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin)
      });
    }

    try {
      const container = getContainer(workerEnv.RIPOMA_API);
      const upstream = await container.fetch(request);
      return withCors(upstream, origin);
    } catch (error) {
      console.error('[RipomaApi] proxy failed:', error);
      return new Response(
        JSON.stringify({
          error: 'container_unavailable',
          message:
            'Rippoma API container is starting or unavailable. Wait a minute and retry. Ensure Workers Paid + Containers are enabled and secrets are set.',
          detail: String(error?.message || error)
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin)
          }
        }
      );
    }
  }
};
