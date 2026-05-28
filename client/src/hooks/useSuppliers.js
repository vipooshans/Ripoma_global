import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useSuppliers = (params = {}) =>
  useQuery({
    queryKey: ['suppliers', params],
    queryFn: async () => {
      const { data } = await api.get('/suppliers', { params });
      return data;
    }
  });

export const useSupplierDetail = (id) =>
  useQuery({
    queryKey: ['supplierDetail', id],
    queryFn: async () => {
      const { data } = await api.get(`/suppliers/${id}`);
      return data;
    },
    enabled: !!id
  });

export const useSupplierStats = (id) =>
  useQuery({
    queryKey: ['supplierStats', id],
    queryFn: async () => {
      const { data } = await api.get(`/suppliers/${id}/stats`);
      return data;
    },
    enabled: !!id
  });

export const useSupplierProducts = (id) =>
  useQuery({
    queryKey: ['supplierProducts', id],
    queryFn: async () => {
      const { data } = await api.get(`/suppliers/${id}/products`);
      return data;
    },
    enabled: !!id
  });

export const useCreateSupplier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/suppliers', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] })
  });
};

export const useUpdateSupplier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/suppliers/${id}`, payload);
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      qc.invalidateQueries({ queryKey: ['supplierDetail', v.id] });
    }
  });
};

export const useDeleteSupplier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/suppliers/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] })
  });
};

export const useUpdateSupplierStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }) => {
      const { data } = await api.patch(`/suppliers/${id}/status`, { status });
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      qc.invalidateQueries({ queryKey: ['supplierDetail', v.id] });
    }
  });
};

export const useImportSuppliersCSV = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData) => {
      const { data } = await api.post('/suppliers/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] })
  });
};
