import api from './api';

// In-memory & session cache + inflight request deduplication to prevent burst 429 errors
const cache = new Map();
const inflight = new Map();
const STORAGE_PREFIX = 'sf_cache_';

function readSessionCache(key, ttlMs) {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp < ttlMs) {
      return data;
    }
    sessionStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  } catch {}
  return null;
}

function writeSessionCache(key, data) {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    sessionStorage.setItem(
      `${STORAGE_PREFIX}${key}`,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {}
}

async function cachedFetch(key, ttlMs, fetcher) {
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && now - cached.timestamp < ttlMs) {
    return cached.data;
  }
  const sessionCached = readSessionCache(key, ttlMs);
  if (sessionCached) {
    cache.set(key, { data: sessionCached, timestamp: now });
    return sessionCached;
  }
  if (inflight.has(key)) {
    return inflight.get(key);
  }
  const promise = (async () => {
    try {
      const data = await fetcher();
      cache.set(key, { data, timestamp: Date.now() });
      writeSessionCache(key, data);
      return data;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, promise);
  return promise;
}

export function clearStorefrontCache(prefix = '') {
  if (!prefix) {
    cache.clear();
  } else {
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) cache.delete(key);
    }
  }
}

const storefrontService = {
  getFeaturedProducts: async (limit = 8) => {
    return cachedFetch(`featured:${limit}`, 120_000, async () => {
      const res = await api.get('/storefront/featured', { params: { limit } });
      return res.data;
    });
  },

  getCategories: async () => {
    return cachedFetch('categories', 300_000, async () => {
      const res = await api.get('/storefront/categories');
      return res.data;
    });
  },

  getCategoryDetail: async (id) => {
    return cachedFetch(`cat:${id}`, 300_000, async () => {
      const res = await api.get(`/storefront/categories/${id}`);
      return res.data;
    });
  },

  getProducts: async (params = {}) => {
    const cacheKey = `products:${JSON.stringify(params || {})}`;
    return cachedFetch(cacheKey, 20_000, async () => {
      const res = await api.get('/storefront/products', { params });
      return res.data;
    });
  },

  getProductFacets: async (params = {}) => {
    const cacheKey = `facets:${JSON.stringify(params || {})}`;
    return cachedFetch(cacheKey, 120_000, async () => {
      const res = await api.get('/storefront/products/facets', { params });
      return res.data;
    });
  },

  getProductDetail: async (id) => {
    return cachedFetch(`product:${id}`, 60_000, async () => {
      const res = await api.get(`/storefront/products/${id}`);
      return res.data;
    });
  },

  getProductReviews: async (id) => {
    const res = await api.get(`/storefront/products/${id}/reviews`);
    return res.data;
  },

  createProductReview: async (id, payload) => {
    const res = await api.post(`/storefront/products/${id}/reviews`, payload);
    clearStorefrontCache(`product:${id}`);
    return res.data;
  },

  updateMyProductReview: async (id, payload) => {
    const res = await api.put(`/storefront/products/${id}/reviews/mine`, payload);
    clearStorefrontCache(`product:${id}`);
    return res.data;
  },

  deleteMyProductReview: async (id) => {
    const res = await api.delete(`/storefront/products/${id}/reviews/mine`);
    clearStorefrontCache(`product:${id}`);
    return res.data;
  },

  getSearchSuggestions: async (q) => {
    const cleanQ = String(q || '').trim().toLowerCase();
    const cacheKey = `suggestions:${cleanQ}`;
    return cachedFetch(cacheKey, 60_000, async () => {
      const res = await api.get('/storefront/search-suggestions', { params: { q } });
      return {
        suggestions: res.data?.suggestions || [],
        categories: res.data?.categories || []
      };
    });
  },

  getStats: async () => {
    return cachedFetch('stats', 600_000, async () => {
      const res = await api.get('/storefront/stats');
      return res.data;
    });
  },

  getPromos: async () => {
    return cachedFetch('promos', 600_000, async () => {
      const res = await api.get('/storefront/promos');
      return res.data;
    });
  },

  estimateCart: async (payload) => {
    const res = await api.post('/storefront/cart/estimate', payload);
    return res.data;
  },

  validateCoupon: async (payload) => {
    const res = await api.post('/storefront/coupons/validate', payload);
    return res.data;
  },

  placeOrder: async (payload) => {
    const res = await api.post('/storefront/orders', payload);
    clearStorefrontCache('stats');
    return res.data;
  },

  getMyOrders: async () => {
    const res = await api.get('/storefront/orders');
    return res.data;
  },

  getOrder: async (id) => {
    const res = await api.get(`/storefront/orders/${id}`);
    return res.data;
  },

  requestOrderCancel: async (id, payload = {}) => {
    const res = await api.post(`/storefront/orders/${id}/cancel-request`, payload);
    return res.data;
  },

  downloadOrderInvoice: async (id, orderNumber = 'order') => {
    const res = await api.get(`/storefront/orders/${id}/invoice`, {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `invoice-${orderNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  getMyNotifications: async (limit = 30) => {
    const res = await api.get('/storefront/notifications', { params: { limit } });
    return res.data;
  },

  getUnreadNotificationCount: async () => {
    const res = await api.get('/storefront/notifications/unread-count');
    return res.data;
  },

  markNotificationRead: async (id) => {
    const res = await api.patch(`/storefront/notifications/${id}/read`);
    return res.data;
  },

  markAllNotificationsRead: async () => {
    const res = await api.post('/storefront/notifications/read-all');
    return res.data;
  },

  getFaqs: async (params = {}) => {
    const cacheKey = `faqs:${JSON.stringify(params || {})}`;
    return cachedFetch(cacheKey, 300_000, async () => {
      const res = await api.get('/storefront/faqs', { params });
      return res.data;
    });
  },

  createSupportTicket: async (payload) => {
    const res = await api.post('/storefront/support', payload);
    return res.data;
  },

  getMySupportTickets: async () => {
    const res = await api.get('/storefront/support/mine');
    return res.data;
  },

  getSupportTicket: async (id, params = {}) => {
    const res = await api.get(`/storefront/support/${id}`, { params });
    return res.data;
  },

  addSupportMessage: async (id, payload) => {
    const res = await api.post(`/storefront/support/${id}/messages`, payload);
    return res.data;
  }
};

export default storefrontService;
