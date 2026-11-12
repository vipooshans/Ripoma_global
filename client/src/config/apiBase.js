/**
 * Resolve Vite env URLs to absolute http(s) origins/paths.
 * Prevents relative values like "ripomaglobal1....workers.dev/api" from becoming
 * https://ripoma-global.pages.dev/ripomaglobal1....workers.dev/api
 */
export const resolveAbsoluteUrl = (raw, fallback = '') => {
  let value = String(raw ?? '').trim();
  if (!value) value = String(fallback ?? '').trim();
  if (!value) return '';

  // Accidental leading slash → relative to Pages host
  value = value.replace(/^\/+/, '');

  if (value.startsWith('//')) {
    value = `https:${value}`;
  } else if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }

  // Hard Production Guard:
  // Cross-origin browser calls to *.workers.dev are intercepted by Cloudflare's
  // shared-tier Bot Challenge / WAF returning HTTP 429 HTML ("Just a moment...").
  // Always rewrite *.workers.dev endpoints to the dedicated custom domain https://api.ripomaglobal.org
  // when running in production (ripomaglobal.org or pages.dev).
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    const isProdHost =
      host === 'ripomaglobal.org' ||
      host === 'www.ripomaglobal.org' ||
      host.endsWith('.pages.dev');

    if (isProdHost && value.includes('.workers.dev')) {
      console.warn(
        `[API Base] Overriding obsolete workers.dev URL (${value}) with dedicated production API domain https://api.ripomaglobal.org`
      );
      value = value.replace(/https:\/\/[^/]+\.workers\.dev/i, 'https://api.ripomaglobal.org');
    }
  }

  return value.replace(/\/+$/, '');
};

const isBrowserProd =
  typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1';

export const API_BASE_URL = resolveAbsoluteUrl(
  (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_API_URL),
  isBrowserProd ? 'https://api.ripomaglobal.org/api' : 'http://localhost:5000/api'
);

export const SOCKET_BASE_URL = resolveAbsoluteUrl(
  (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SOCKET_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_SOCKET_URL),
  isBrowserProd ? 'https://api.ripomaglobal.org' : 'http://localhost:5000'
);

/** Join API base with a path that may or may not start with `/`. */
export const apiUrl = (path = '') => {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const suffix = String(path || '');
  if (!suffix) return base;
  if (/^https?:\/\//i.test(suffix)) return suffix;
  return `${base}${suffix.startsWith('/') ? suffix : `/${suffix}`}`;
};
