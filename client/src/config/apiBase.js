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

  return value.replace(/\/+$/, '');
};

export const API_BASE_URL = resolveAbsoluteUrl(
  import.meta.env.VITE_API_URL,
  'http://localhost:5000/api'
);

export const SOCKET_BASE_URL = resolveAbsoluteUrl(
  import.meta.env.VITE_SOCKET_URL,
  'http://localhost:5000'
);

/** Join API base with a path that may or may not start with `/`. */
export const apiUrl = (path = '') => {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const suffix = String(path || '');
  if (!suffix) return base;
  if (/^https?:\/\//i.test(suffix)) return suffix;
  return `${base}${suffix.startsWith('/') ? suffix : `/${suffix}`}`;
};
