import api, { setCustomerAuthHeader } from './api';

const customerAuthService = {
  register: async (data) => {
    const response = await api.post('/customer-auth/register', data);
    return response.data;
  },

  verifyEmail: async (token) => {
    const response = await api.get(`/customer-auth/verify-email/${token}`);
    return response.data;
  },

  resendVerification: async (email) => {
    const response = await api.post('/customer-auth/resend-verification', { email });
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post('/customer-auth/login', { email, password });
    if (response.data.accessToken) {
      setCustomerAuthHeader(response.data.accessToken);
    }
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/customer-auth/logout');
    } finally {
      setCustomerAuthHeader(null);
    }
  },

  refresh: async () => {
    const response = await api.post('/customer-auth/refresh');
    if (response.data.accessToken) {
      setCustomerAuthHeader(response.data.accessToken);
    }
    return response.data;
  },

  getCurrentCustomer: async () => {
    const response = await api.get('/customer-auth/me');
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.put('/customer-auth/me', data);
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await api.post('/customer-auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token, password) => {
    const response = await api.post('/customer-auth/reset-password', { token, password });
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post('/customer-auth/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  },

  getLegal: async () => {
    const response = await api.get('/customer-auth/legal');
    return response.data;
  },

  listSessions: async () => {
    const response = await api.get('/customer-auth/sessions');
    return response.data;
  },

  revokeSession: async (id) => {
    const response = await api.delete(`/customer-auth/sessions/${id}`);
    return response.data;
  },

  logoutAllSessions: async () => {
    const response = await api.post('/customer-auth/logout-all');
    return response.data;
  },

  exportMyData: async () => {
    const response = await api.get('/customer-auth/export-data');
    return response.data;
  },

  deleteMyAccount: async (password, confirm = 'DELETE') => {
    const response = await api.post('/customer-auth/delete-account', { password, confirm });
    return response.data;
  }
};

export default customerAuthService;
