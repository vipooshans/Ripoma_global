import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const usePayments = (params = {}) =>
  useQuery({
    queryKey: ['payments', params],
    queryFn: async () => {
      const { data } = await api.get('/payments', { params });
      return data;
    }
  });

export const usePaymentsDashboard = () =>
  useQuery({
    queryKey: ['paymentsDashboard'],
    queryFn: async () => {
      const { data } = await api.get('/payments/dashboard');
      return data;
    }
  });

export const useOverduePayments = () =>
  useQuery({
    queryKey: ['overduePayments'],
    queryFn: async () => {
      const { data } = await api.get('/payments/overdue');
      return data;
    }
  });

export const usePaymentDetail = (id) =>
  useQuery({
    queryKey: ['paymentDetail', id],
    queryFn: async () => {
      const { data } = await api.get(`/payments/${id}`);
      return data;
    },
    enabled: !!id
  });

export const useCreatePayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/payments', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['paymentsDashboard'] });
      qc.invalidateQueries({ queryKey: ['overduePayments'] });
      qc.invalidateQueries({ queryKey: ['profitAnalysisSummary'] });
    }
  });
};

export const useUpdatePayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.put(`/payments/${id}`, payload);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['paymentDetail', data?.payment?._id] });
      qc.invalidateQueries({ queryKey: ['paymentsDashboard'] });
    }
  });
};

export const useUpdatePaymentStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }) => {
      const { data } = await api.patch(`/payments/${id}/status`, { status });
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['paymentDetail', data?.payment?._id] });
      qc.invalidateQueries({ queryKey: ['paymentsDashboard'] });
      qc.invalidateQueries({ queryKey: ['overduePayments'] });
      qc.invalidateQueries({ queryKey: ['profitAnalysisSummary'] });
    }
  });
};
