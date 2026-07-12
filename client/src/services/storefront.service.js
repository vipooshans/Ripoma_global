import api from './api';

const storefrontService = {
  getFeaturedProducts: async (limit = 8) => {
    const res = await api.get('/storefront/featured', { params: { limit } });
    return res.data;
  },

  getCategories: async () => {
    const res = await api.get('/storefront/categories');
    return res.data;
  },

  getCategoryDetail: async (id) => {
    const res = await api.get(`/storefront/categories/${id}`);
    return res.data;
  },

  getProducts: async (params = {}) => {
    const res = await api.get('/storefront/products', { params });
    return res.data;
  },

  getProductFacets: async (params = {}) => {
    const res = await api.get('/storefront/products/facets', { params });
    return res.data;
  },

  getProductDetail: async (id) => {
    const res = await api.get(`/storefront/products/${id}`);
    return res.data;
  },

  getProductReviews: async (id) => {
    const res = await api.get(`/storefront/products/${id}/reviews`);
    return res.data;
  },

  createProductReview: async (id, payload) => {
    const res = await api.post(`/storefront/products/${id}/reviews`, payload);
    return res.data;
  },

  getSearchSuggestions: async (q) => {
    const res = await api.get('/storefront/search-suggestions', { params: { q } });
    // { suggestions: ProductHit[], categories?: CategoryHit[] }
    return {
      suggestions: res.data?.suggestions || [],
      categories: res.data?.categories || []
    };
  },

  getStats: async () => {
    const res = await api.get('/storefront/stats');
    return res.data;
  },

  getPromos: async () => {
    const res = await api.get('/storefront/promos');
    return res.data;
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
  }
};

export default storefrontService;
