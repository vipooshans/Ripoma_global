/**
 * Build the list of allowed browser origins for CORS / Socket.IO.
 *
 * Supports:
 * - FRONTEND_URL (primary production / local URL)
 * - CORS_ORIGINS (comma-separated extra origins)
 * - Cloudflare Pages preview hosts: https://*.<project>.pages.dev
 * - Local Vite ports
 */

const LOCAL_ORIGINS = ['http://localhost:5173', 'http://localhost:5174'];

const parseList = (value) =>
  String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/** Build regex that allows https://project.pages.dev and https://*.project.pages.dev */
const pagesHostPattern = (pagesHost) => {
  const host = String(pagesHost || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '');
  if (!host.endsWith('.pages.dev')) return null;
  const escaped = host.replace(/\./g, '\\.');
  return new RegExp(`^https:\\/\\/([a-z0-9-]+\\.)?${escaped}$`, 'i');
};

const pagesPreviewPatternFromUrl = (url) => {
  try {
    const { hostname } = new URL(url);
    if (!hostname.endsWith('.pages.dev')) return null;
    // hash.project.pages.dev → project.pages.dev; project.pages.dev stays
    const parts = hostname.split('.');
    const projectHost = parts.length > 3 ? parts.slice(-3).join('.') : hostname;
    return pagesHostPattern(projectHost);
  } catch {
    return null;
  }
};

const getAllowedOrigins = () => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const extras = parseList(process.env.CORS_ORIGINS);
  const origins = [...new Set([frontendUrl, ...extras, ...LOCAL_ORIGINS])];

  // Prefer explicit CORS_PAGES_HOST=ripoma-global.pages.dev for all preview deploys
  const previewRe =
    pagesHostPattern(process.env.CORS_PAGES_HOST) || pagesPreviewPatternFromUrl(frontendUrl);

  return { origins, previewRe };
};

/**
 * cors / socket.io compatible origin checker.
 * Returns the request origin when allowed, or false.
 */
const corsOriginDelegate = (origin, callback) => {
  // Non-browser / same-origin requests may omit Origin
  if (!origin) return callback(null, true);

  const { origins, previewRe } = getAllowedOrigins();
  if (origins.includes(origin) || (previewRe && previewRe.test(origin))) {
    return callback(null, true);
  }

  return callback(null, false);
};

module.exports = {
  getAllowedOrigins,
  corsOriginDelegate
};
