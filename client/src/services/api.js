import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
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

const isAuthRefreshRequest = (url) =>
  url?.includes('/auth/refresh') || url?.includes('/customer-auth/refresh');

// Response interceptor — auto-refresh expired access tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
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
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshPath = isCustomer ? '/customer-auth/refresh' : '/auth/refresh';
      const response = await axios.post(
        `${api.defaults.baseURL}${refreshPath}`,
        {},
        { withCredentials: true }
      );
      const { accessToken } = response.data;

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
