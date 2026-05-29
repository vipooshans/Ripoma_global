import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useImportOrders = (params = {}) =>
  useQuery({
    queryKey: ['importOrders', params],
    queryFn: async () => {
      const { data } = await api.get('/import-orders', { params });
      return data;
    }
  });

export const useImportOrderDetail = (id) =>
  useQuery({
    queryKey: ['importOrderDetail', id],
    queryFn: async () => {
      const { data } = await api.get(`/import-orders/${id}`);
      return data;
    },
    enabled: !!id
  });

export const useCreateImportOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/import-orders', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['importOrders'] });
      qc.invalidateQueries({ queryKey: ['importDashboard'] });
    }
  });
};

export const useUpdateImportOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/import-orders/${id}`, payload);
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['importOrders'] });
      qc.invalidateQueries({ queryKey: ['importOrderDetail', v.id] });
    }
  });
};

export const useCancelImportOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, comments }) => {
      const { data } = await api.delete(`/import-orders/${id}`, { data: { comments } });
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['importOrders'] });
      qc.invalidateQueries({ queryKey: ['importOrderDetail', v.id] });
      qc.invalidateQueries({ queryKey: ['importDashboard'] });
    }
  });
};

export const useSubmitImportOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.patch(`/import-orders/${id}/submit`);
      return data;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['importOrders'] });
      qc.invalidateQueries({ queryKey: ['importOrderDetail', id] });
      qc.invalidateQueries({ queryKey: ['importDashboard'] });
      qc.invalidateQueries({ queryKey: ['pendingApprovals'] });
    }
  });
};

export const useApproveImportOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, comments }) => {
      const { data } = await api.patch(`/import-orders/${id}/approve`, { comments });
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['importOrders'] });
      qc.invalidateQueries({ queryKey: ['importOrderDetail', v.id] });
      qc.invalidateQueries({ queryKey: ['importDashboard'] });
      qc.invalidateQueries({ queryKey: ['pendingApprovals'] });
    }
  });
};

export const useRejectImportOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, comments }) => {
      const { data } = await api.patch(`/import-orders/${id}/reject`, { comments });
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['importOrders'] });
      qc.invalidateQueries({ queryKey: ['importOrderDetail', v.id] });
      qc.invalidateQueries({ queryKey: ['importDashboard'] });
      qc.invalidateQueries({ queryKey: ['pendingApprovals'] });
    }
  });
};

export const useMarkOrdered = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.patch(`/import-orders/${id}/mark-ordered`);
      return data;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['importOrders'] });
      qc.invalidateQueries({ queryKey: ['importOrderDetail', id] });
      qc.invalidateQueries({ queryKey: ['importDashboard'] });
    }
  });
};

export const useMarkInTransit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }) => {
      const { data } = await api.patch(`/import-orders/${id}/mark-in-transit`, { notes });
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['importOrders'] });
      qc.invalidateQueries({ queryKey: ['importOrderDetail', v.id] });
      qc.invalidateQueries({ queryKey: ['importDashboard'] });
    }
  });
};

export const useImportDashboard = () =>
  useQuery({
    queryKey: ['importDashboard'],
    queryFn: async () => {
      const { data } = await api.get('/import-orders/dashboard');
      return data;
    }
  });

export const usePendingApprovals = () =>
  useQuery({
    queryKey: ['pendingApprovals'],
    queryFn: async () => {
      const { data } = await api.get('/import-orders/pending-approvals');
      return data;
    }
  });

export const useDeliverySchedule = (params = {}) =>
  useQuery({
    queryKey: ['deliverySchedule', params],
    queryFn: async () => {
      const { data } = await api.get('/import-orders/delivery-schedule', { params });
      return data;
    }
  });
