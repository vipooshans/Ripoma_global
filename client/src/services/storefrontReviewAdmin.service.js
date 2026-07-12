import api from './api';

const storefrontReviewAdminService = {
  listReviews: async (params = {}) => {
    const res = await api.get('/storefront-reviews', { params });
    return res.data;
  },

  approveReview: async (id) => {
    const res = await api.post(`/storefront-reviews/${id}/approve`);
    return res.data;
  },

  rejectReview: async (id) => {
    const res = await api.post(`/storefront-reviews/${id}/reject`);
    return res.data;
  }
};

export default storefrontReviewAdminService;
