import api, {
  setAuthHeader,
  setStaffSessionHint,
  refreshStaffTokenSingleFlight
} from './api';

const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.accessToken) {
      setAuthHeader(response.data.accessToken);
      setStaffSessionHint(true);
    }
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAuthHeader(null);
      setStaffSessionHint(false);
    }
  },

  refresh: async () => {
    const token = await refreshStaffTokenSingleFlight();
    return { accessToken: token };
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token, password) => {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post('/auth/change-password', { currentPassword, newPassword });
    return response.data;
  }
};

export default authService;
