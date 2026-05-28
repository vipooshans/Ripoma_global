import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useCustomers = (params = {}) =>
  useQuery({
    queryKey: ['customers', params],
    queryFn: async () => {
      const { data } = await api.get('/customers', { params });
      return data;
    }
  });

export const useCustomerDetail = (id) =>
  useQuery({
    queryKey: ['customerDetail', id],
    queryFn: async () => {
      const { data } = await api.get(`/customers/${id}`);
      return data;
    },
    enabled: !!id
  });

export const useCustomerStats = (id) =>
  useQuery({
    queryKey: ['customerStats', id],
    queryFn: async () => {
      const { data } = await api.get(`/customers/${id}/stats`);
      return data;
    },
    enabled: !!id
  });

export const useCreateCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/customers', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] })
  });
};

export const useUpdateCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/customers/${id}`, payload);
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customerDetail', v.id] });
    }
  });
};

export const useDeleteCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/customers/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] })
  });
};

export const useUpdateCustomerStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }) => {
      const { data } = await api.patch(`/customers/${id}/status`, { status });
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customerDetail', v.id] });
    }
  });
};

export const useImportCustomersCSV = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData) => {
      const { data } = await api.post('/customers/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] })
  });
};

export const useContacts = (params = {}) =>
  useQuery({
    queryKey: ['contacts', params],
    queryFn: async () => {
      const { data } = await api.get('/contacts', { params });
      return data;
    }
  });
