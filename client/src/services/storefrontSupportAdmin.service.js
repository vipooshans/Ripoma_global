import api from './api';

const storefrontSupportAdminService = {
  listTickets: async (params = {}) => {
    const res = await api.get('/storefront-support', { params });
    return res.data;
  },

  getTicket: async (id) => {
    const res = await api.get(`/storefront-support/${id}`);
    return res.data;
  },

  reply: async (id, payload) => {
    const res = await api.post(`/storefront-support/${id}/reply`, payload);
    return res.data;
  },

  updateStatus: async (id, status) => {
    const res = await api.patch(`/storefront-support/${id}/status`, { status });
    return res.data;
  }
};

export default storefrontSupportAdminService;
