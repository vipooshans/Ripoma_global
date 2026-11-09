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

let isRefreshing = false;
let failedQueue = [];

// Global rate-limit cooldown to coordinate across concurrent requests
let rateLimitCooldownUntil = 0;

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

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

// Request interceptor — handles authorization headers & global rate-limit cooldown
api.interceptors.request.use(async (config) => {
  // If in a global 429 cooldown, pause to prevent thundering herd
  const now = Date.now();
  if (rateLimitCooldownUntil > now) {
    const waitTime = rateLimitCooldownUntil - now + Math.floor(Math.random() * 200);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  const token = resolveTokenForUrl(config.url || '');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const isAuthRefreshRequest = (url) =>
  url?.includes('/auth/refresh') || url?.includes('/customer-auth/refresh');

// Response interceptor — auto-retry on 429 & auto-refresh expired access tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    // 1. Transparent retry for 429 Too Many Requests (rate limiting) with exponential backoff & jitter
    if (error.response?.status === 429) {
      originalRequest._rateLimitRetryCount = (originalRequest._rateLimitRetryCount || 0) + 1;
      const maxRetries = 2;
      if (originalRequest._rateLimitRetryCount <= maxRetries) {
        const retryAfterHeader = error.response.headers?.['retry-after'];
        let delaySeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 1.5 * originalRequest._rateLimitRetryCount;
        if (isNaN(delaySeconds) || delaySeconds <= 0) delaySeconds = 1.5;
        delaySeconds = Math.min(8, delaySeconds);

        const delayMs = Math.round(delaySeconds * 1000) + Math.floor(Math.random() * 400);
        // Coordinate backoff across all requests
        rateLimitCooldownUntil = Math.max(rateLimitCooldownUntil, Date.now() + delayMs);

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return api(originalRequest);
      }
    }

    const errorCode = error.response?.data?.code;

    if (
      error.response?.status !== 401 ||
      !errorCode ||
      originalRequest._retry ||
      isAuthRefreshRequest(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    const isCustomer = errorCode === 'CUSTOMER_TOKEN_EXPIRED';
    const isStaff = errorCode === 'TOKEN_EXPIRED';

    if (!isCustomer && !isStaff) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (token) {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
          }
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Use the same axios instance so baseURL stays absolute and method stays POST
      const refreshPath = isCustomer ? '/customer-auth/refresh' : '/auth/refresh';
      const response = await api.post(refreshPath, {});
      const { accessToken } = response.data;

      // Ensure valid access token returned; if guest/unauthenticated, do not continue refresh loop
      if (!accessToken) {
        throw new Error('Refresh did not return a valid access token');
      }

      if (isCustomer) {
        setCustomerAuthHeader(accessToken);
      } else {
        setAuthHeader(accessToken);
      }

      originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
      processQueue(null, accessToken);
      isRefreshing = false;

      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      isRefreshing = false;

      if (isCustomer) {
        setCustomerAuthHeader(null);
        window.dispatchEvent(new Event('customer-auth-expired'));
      } else {
        setAuthHeader(null);
        window.dispatchEvent(new Event('auth-expired'));
      }

      return Promise.reject(refreshError);
    }
  }
);

export const setAuthHeader = (token) => {
  staffAccessToken = token || null;
  if (token) {
    activeAuthType = 'staff';
  } else if (activeAuthType === 'staff') {
    activeAuthType = customerAccessToken ? 'customer' : null;
  }
  applyAuthorizationHeader();
};

export const setCustomerAuthHeader = (token) => {
  customerAccessToken = token || null;
  if (token) {
    activeAuthType = 'customer';
  } else if (activeAuthType === 'customer') {
    activeAuthType = staffAccessToken ? 'staff' : null;
  }
  applyAuthorizationHeader();
};

export default api;
