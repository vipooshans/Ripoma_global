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

  getProducts: async (params = {}) => {
    const res = await api.get('/storefront/products', { params });
    return res.data;
  },

  getProductDetail: async (id) => {
    const res = await api.get(`/storefront/products/${id}`);
    return res.data;
  },

  getSearchSuggestions: async (q) => {
    const res = await api.get('/storefront/search-suggestions', { params: { q } });
    return res.data;
  },

  getStats: async () => {
    const res = await api.get('/storefront/stats');
    return res.data;
  },

  getPromos: async () => {
    const res = await api.get('/storefront/promos');
    return res.data;
  }
};

export default storefrontService;
