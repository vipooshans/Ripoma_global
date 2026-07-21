/**
 * Build the list of allowed browser origins for CORS / Socket.IO.
 *
 * Supports:
 * - FRONTEND_URL (primary production / local URL; trailing slash ignored)
 * - CORS_ORIGINS (comma-separated extra origins)
 * - CORS_PAGES_HOST (e.g. ripoma-global.pages.dev) for all Pages + preview URLs
 * - Local Vite ports
 */

const LOCAL_ORIGINS = ['http://localhost:5173', 'http://localhost:5174'];

/** Default Pages project host for this product (override with CORS_PAGES_HOST). */
const DEFAULT_PAGES_HOST = 'ripoma-global.pages.dev';

const normalizeOrigin = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    return `${url.protocol}//${url.host}`;
  } catch {
    return raw.replace(/\/+$/, '');
  }
};

const parseList = (value) =>
  String(value || '')
    .split(',')
    .map((s) => normalizeOrigin(s))
    .filter(Boolean);

/** Build regex that allows https://project.pages.dev and https://*.project.pages.dev */
const pagesHostPattern = (pagesHost) => {
  const host = normalizeOrigin(pagesHost)
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '');
  if (!host.endsWith('.pages.dev')) return null;
  const escaped = host.replace(/\./g, '\\.');
  return new RegExp(`^https:\\/\\/([a-z0-9-]+\\.)?${escaped}$`, 'i');
};

const pagesPreviewPatternFromUrl = (url) => {
  try {
    const { hostname } = new URL(normalizeOrigin(url) || url);
    if (!hostname.endsWith('.pages.dev')) return null;
    const parts = hostname.split('.');
    const projectHost = parts.length > 3 ? parts.slice(-3).join('.') : hostname;
    return pagesHostPattern(projectHost);
  } catch {
    return null;
  }
};

const getAllowedOrigins = () => {
  const frontendUrl = normalizeOrigin(process.env.FRONTEND_URL || 'http://localhost:5173');
  const extras = parseList(process.env.CORS_ORIGINS);
  const origins = [...new Set([frontendUrl, ...extras, ...LOCAL_ORIGINS].filter(Boolean))];

  const pagesHost = process.env.CORS_PAGES_HOST || DEFAULT_PAGES_HOST;
  const previewRe =
    pagesHostPattern(pagesHost) ||
    pagesPreviewPatternFromUrl(frontendUrl) ||
    pagesHostPattern(DEFAULT_PAGES_HOST);

  return { origins, previewRe };
};

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  const { origins, previewRe } = getAllowedOrigins();
  return origins.includes(normalized) || Boolean(previewRe && previewRe.test(normalized));
};

/**
 * cors / socket.io compatible origin checker.
 */
const corsOriginDelegate = (origin, callback) => {
  if (!origin) return callback(null, true);

  if (isOriginAllowed(origin)) {
    return callback(null, true);
  }

  console.warn(`[CORS] Blocked origin: ${origin}`);
  return callback(null, false);
};

/** Express cors() options used by server.js */
const corsOptions = {
  origin: corsOriginDelegate,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cookie'
  ],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 204
};

module.exports = {
  normalizeOrigin,
  getAllowedOrigins,
  isOriginAllowed,
  corsOriginDelegate,
  corsOptions
};
