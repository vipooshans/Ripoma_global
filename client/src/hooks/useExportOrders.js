import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useExportOrders = (params = {}) =>
  useQuery({
    queryKey: ['exportOrders', params],
    queryFn: async () => {
      const { data } = await api.get('/export-orders', { params });
      return data;
    }
  });

export const useExportOrderDetail = (id) =>
  useQuery({
    queryKey: ['exportOrderDetail', id],
    queryFn: async () => {
      const { data } = await api.get(`/export-orders/${id}`);
      return data;
    },
    enabled: !!id
  });

export const useCreateExportOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/export-orders', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exportOrders'] });
      qc.invalidateQueries({ queryKey: ['exportDashboard'] });
    }
  });
};

export const useUpdateExportOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/export-orders/${id}`, payload);
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['exportOrders'] });
      qc.invalidateQueries({ queryKey: ['exportOrderDetail', v.id] });
      qc.invalidateQueries({ queryKey: ['exportDashboard'] });
    }
  });
};

export const useConfirmExportOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.patch(`/export-orders/${id}/confirm`);
      return data;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['exportOrders'] });
      qc.invalidateQueries({ queryKey: ['exportOrderDetail', id] });
      qc.invalidateQueries({ queryKey: ['exportDashboard'] });
    }
  });
};

export const useTransitionExportOrderStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, note }) => {
      const { data } = await api.patch(`/export-orders/${id}/status`, { status, note });
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['exportOrders'] });
      qc.invalidateQueries({ queryKey: ['exportOrderDetail', v.id] });
      qc.invalidateQueries({ queryKey: ['exportDashboard'] });
    }
  });
};

export const useCancelExportOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }) => {
      const { data } = await api.patch(`/export-orders/${id}/cancel`, { note });
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['exportOrders'] });
      qc.invalidateQueries({ queryKey: ['exportOrderDetail', v.id] });
      qc.invalidateQueries({ queryKey: ['exportDashboard'] });
    }
  });
};

export const useAddExportTimelineNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }) => {
      const { data } = await api.post(`/export-orders/${id}/timeline-note`, { note });
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['exportOrderDetail', v.id] });
    }
  });
};

export const useExportDashboard = () =>
  useQuery({
    queryKey: ['exportDashboard'],
    queryFn: async () => {
      const { data } = await api.get('/export-orders/dashboard');
      return data;
    }
  });
