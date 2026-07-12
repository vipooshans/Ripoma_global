import api from './api';

const storefrontOrderAdminService = {
  listOrders: async (params = {}) => {
    const res = await api.get('/storefront-orders', { params });
    return res.data;
  },

  getOrder: async (id) => {
    const res = await api.get(`/storefront-orders/${id}`);
    return res.data;
  },

  updateStatus: async (id, payload) => {
    const res = await api.patch(`/storefront-orders/${id}/status`, payload);
    return res.data;
  },

  approveCancel: async (id, payload = {}) => {
    const res = await api.post(`/storefront-orders/${id}/cancel-approve`, payload);
    return res.data;
  },

  rejectCancel: async (id, payload = {}) => {
    const res = await api.post(`/storefront-orders/${id}/cancel-reject`, payload);
    return res.data;
  },

  sendPromoNotify: async (payload) => {
    const res = await api.post('/storefront-orders/promo-notify', payload);
    return res.data;
  }
};

export default storefrontOrderAdminService;
