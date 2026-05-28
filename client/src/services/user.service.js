import api from './api';

const userService = {
  // User endpoints
  getUsers: async (params = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  createUser: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  getUser: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  updateUser: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  changeStatus: async (id, status) => {
    const response = await api.patch(`/users/${id}/status`, { status });
    return response.data;
  },

  adminResetPassword: async (id, password) => {
    const response = await api.post(`/users/${id}/reset-password`, { password });
    return response.data;
  },

  // Role endpoints
  getRoles: async () => {
    const response = await api.get('/roles');
    return response.data;
  },

  createRole: async (roleData) => {
    const response = await api.post('/roles', roleData);
    return response.data;
  },

  updateRolePermissions: async (id, permissions, description) => {
    const response = await api.put(`/roles/${id}`, { permissions, description });
    return response.data;
  },

  deleteRole: async (id) => {
    const response = await api.delete(`/roles/${id}`);
    return response.data;
  }
};

export default userService;
