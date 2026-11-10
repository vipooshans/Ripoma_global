import axios from 'axios';
import { API_BASE_URL } from '../config/apiBase';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

let staffAccessToken = null;
let customerAccessToken = null;
let activeAuthType = null; // 'staff' | 'customer' | null

// Single-flight refresh promises for staff and customer
let customerRefreshPromise = null;
let staffRefreshPromise = null;

// Global rate-limit cooldown to coordinate across concurrent requests
let rateLimitCooldownUntil = 0;

export const hasCustomerSessionHint = () => {
  try {
    return localStorage.getItem('ripoma_has_customer_session') === 'true';
  } catch {
    return false;
  }
};

export const setCustomerSessionHint = (active) => {
  try {
    if (active) {
      localStorage.setItem('ripoma_has_customer_session', 'true');
    } else {
      localStorage.removeItem('ripoma_has_customer_session');
    }
  } catch {}
};

export const hasStaffSessionHint = () => {
  try {
    return localStorage.getItem('ripoma_has_staff_session') === 'true';
  } catch {
    return false;
  }
};

export const setStaffSessionHint = (active) => {
  try {
    if (active) {
      localStorage.setItem('ripoma_has_staff_session', 'true');
    } else {
      localStorage.removeItem('ripoma_has_staff_session');
    }
  } catch {}
};

export const isPublicStorefrontUrl = (url = '') => {
  const path = String(url).split('?')[0];
  return (
    path.includes('/storefront/categories') ||
    path.includes('/storefront/featured') ||
    path.includes('/storefront/promos') ||
    path.includes('/storefront/stats') ||
    path.includes('/storefront/faqs') ||
    path.includes('/storefront/products') ||
    path.includes('/storefront/search-suggestions') ||
    path.includes('/customer-auth/legal')
  );
};

export const isAuthRefreshRequest = (url = '') =>
  url.includes('/auth/refresh') || url.includes('/customer-auth/refresh');

const applyAuthorizationHeader = () => {
  const token =
    activeAuthType === 'customer'
      ? customerAccessToken
      : activeAuthType === 'staff'
        ? staffAccessToken
        : null;

  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

/** Pick the correct JWT for this request (staff vs customer APIs can coexist). */
const resolveTokenForUrl = (url = '') => {
  const path = String(url);
  const isStaffStorefrontAdmin =
    path.includes('/storefront-orders') ||
    path.includes('/storefront-reviews') ||
    path.includes('/storefront-support');
  const isCustomerApi =
    path.includes('/customer-auth') ||
    (path.includes('/storefront') && !isStaffStorefrontAdmin);

  if (isCustomerApi) {
    return customerAccessToken || null;
  }
  if (staffAccessToken) return staffAccessToken;
  return customerAccessToken || null;
};

export const setAuthHeader = (token) => {
  staffAccessToken = token;
  activeAuthType = token ? 'staff' : activeAuthType === 'staff' ? null : activeAuthType;
  applyAuthorizationHeader();
};

export const setCustomerAuthHeader = (token) => {
  customerAccessToken = token;
  activeAuthType = token ? 'customer' : activeAuthType === 'customer' ? null : activeAuthType;
  applyAuthorizationHeader();
};

// Single-flight customer token refresh
export const refreshCustomerTokenSingleFlight = async () => {
  if (customerRefreshPromise) {
    return customerRefreshPromise;
  }

  // If there's no session hint and no customer token, do not make network calls for guests
  if (!hasCustomerSessionHint() && !customerAccessToken) {
    setCustomerAuthHeader(null);
    return null;
  }

  customerRefreshPromise = (async () => {
    try {
      const response = await api.post(
        '/customer-auth/refresh',
        {},
        { _skipAuthRefresh: true, _rateLimitRetryCount: 3 }
      );

      const { accessToken, authenticated } = response.data || {};
      if (authenticated === false || !accessToken) {
        setCustomerAuthHeader(null);
        setCustomerSessionHint(false);
        window.dispatchEvent(new Event('customer-auth-expired'));
        return null;
      }

      setCustomerAuthHeader(accessToken);
      setCustomerSessionHint(true);
      return accessToken;
    } catch (err) {
      setCustomerAuthHeader(null);
      setCustomerSessionHint(false);
      window.dispatchEvent(new Event('customer-auth-expired'));
      throw err;
    } finally {
      customerRefreshPromise = null;
    }
  })();

  return customerRefreshPromise;
};

// Single-flight staff token refresh
export const refreshStaffTokenSingleFlight = async () => {
  if (staffRefreshPromise) {
    return staffRefreshPromise;
  }

  if (!hasStaffSessionHint() && !staffAccessToken) {
    setAuthHeader(null);
    return null;
  }

  staffRefreshPromise = (async () => {
    try {
      const response = await api.post(
        '/auth/refresh',
        {},
        { _skipAuthRefresh: true, _rateLimitRetryCount: 3 }
      );

      const { accessToken } = response.data || {};
      if (!accessToken) {
        setAuthHeader(null);
        setStaffSessionHint(false);
        window.dispatchEvent(new Event('auth-expired'));
        return null;
      }

      setAuthHeader(accessToken);
      setStaffSessionHint(true);
      return accessToken;
    } catch (err) {
      setAuthHeader(null);
      setStaffSessionHint(false);
      window.dispatchEvent(new Event('auth-expired'));
      throw err;
    } finally {
      staffRefreshPromise = null;
    }
  })();

  return staffRefreshPromise;
};

// Request interceptor — handles authorization headers & global rate-limit cooldown
api.interceptors.request.use(async (config) => {
  // If in a global 429 cooldown, pause to prevent thundering herd
  const now = Date.now();
  if (rateLimitCooldownUntil > now) {
    const waitTime = rateLimitCooldownUntil - now + Math.floor(Math.random() * 200);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  // Do not add Authorization headers to purely public storefront requests unless customer token exists and endpoint is user-specific
  const url = config.url || '';
  if (isPublicStorefrontUrl(url)) {
    return config;
  }

  const token = resolveTokenForUrl(url);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — auto-retry on 429 & auto-refresh expired access tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    // 1. Transparent retry for 429 Too Many Requests with exponential backoff & jitter
    if (error.response?.status === 429) {
      // Never retry the refresh endpoint itself on 429 to avoid cascade
      if (isAuthRefreshRequest(originalRequest.url)) {
        return Promise.reject(error);
      }

      originalRequest._rateLimitRetryCount = (originalRequest._rateLimitRetryCount || 0) + 1;
      const maxRetries = 2;
      if (originalRequest._rateLimitRetryCount <= maxRetries) {
        const retryAfterHeader = error.response.headers?.['retry-after'];
        let delaySeconds = retryAfterHeader
          ? parseInt(retryAfterHeader, 10)
          : 1.5 * originalRequest._rateLimitRetryCount;
        if (isNaN(delaySeconds) || delaySeconds <= 0) delaySeconds = 1.5;
        delaySeconds = Math.min(8, delaySeconds);

        const delayMs = Math.round(delaySeconds * 1000) + Math.floor(Math.random() * 400);
        // Coordinate backoff across all requests
        rateLimitCooldownUntil = Math.max(rateLimitCooldownUntil, Date.now() + delayMs);

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return api(originalRequest);
      }
      return Promise.reject(error);
    }

    // 2. Token refresh handling on 401 Unauthorized
    const errorCode = error.response?.data?.code;

    // Reject immediately without refreshing if:
    // - Not a 401 response
    // - Request already retried once (_retry flag)
    // - Request explicitly skipped auth refresh (_skipAuthRefresh)
    // - It is the auth refresh request itself
    // - It is a public storefront route (public storefront routes must never refresh auth)
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest._skipAuthRefresh ||
      isAuthRefreshRequest(originalRequest.url) ||
      isPublicStorefrontUrl(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    const isCustomer =
      errorCode === 'CUSTOMER_TOKEN_EXPIRED' ||
      (originalRequest.url && originalRequest.url.includes('/customer-auth/'));
    const isStaff =
      errorCode === 'TOKEN_EXPIRED' || (!isCustomer && Boolean(staffAccessToken));

    if (!isCustomer && !isStaff) {
      return Promise.reject(error);
    }

    // Mark as retried — ensures retry happens only ONCE
    originalRequest._retry = true;

    try {
      const newToken = isCustomer
        ? await refreshCustomerTokenSingleFlight()
        : await refreshStaffTokenSingleFlight();

      if (!newToken) {
        return Promise.reject(error);
      }

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshErr) {
      return Promise.reject(refreshErr);
    }
  }
);

export default api;
