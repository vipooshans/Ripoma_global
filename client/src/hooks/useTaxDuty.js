import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useTaxDuty = (params = {}) =>
  useQuery({
    queryKey: ['taxDuty', params],
    queryFn: async () => {
      const { data } = await api.get('/tax-duty', { params });
      return data;
    }
  });

export const useTaxDutySummary = () =>
  useQuery({
    queryKey: ['taxDutySummary'],
    queryFn: async () => {
      const { data } = await api.get('/tax-duty/summary');
      return data;
    }
  });

export const useUpcomingTaxDuty = () =>
  useQuery({
    queryKey: ['upcomingTaxDuty'],
    queryFn: async () => {
      const { data } = await api.get('/tax-duty/upcoming');
      return data;
    }
  });

export const useTaxDutyDetail = (id) =>
  useQuery({
    queryKey: ['taxDutyDetail', id],
    queryFn: async () => {
      const { data } = await api.get(`/tax-duty/${id}`);
      return data;
    },
    enabled: !!id
  });

export const useCreateTaxDuty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/tax-duty', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['taxDuty'] });
      qc.invalidateQueries({ queryKey: ['taxDutySummary'] });
      qc.invalidateQueries({ queryKey: ['upcomingTaxDuty'] });
      qc.invalidateQueries({ queryKey: ['profitAnalysisSummary'] });
    }
  });
};

export const useUpdateTaxDuty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.put(`/tax-duty/${id}`, payload);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['taxDuty'] });
      qc.invalidateQueries({ queryKey: ['taxDutyDetail', data?.record?._id] });
      qc.invalidateQueries({ queryKey: ['taxDutySummary'] });
      qc.invalidateQueries({ queryKey: ['upcomingTaxDuty'] });
    }
  });
};

export const useUpdateTaxDutyStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }) => {
      const { data } = await api.patch(`/tax-duty/${id}/status`, { status });
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['taxDuty'] });
      qc.invalidateQueries({ queryKey: ['taxDutyDetail', data?.record?._id] });
      qc.invalidateQueries({ queryKey: ['taxDutySummary'] });
      qc.invalidateQueries({ queryKey: ['upcomingTaxDuty'] });
      qc.invalidateQueries({ queryKey: ['profitAnalysisSummary'] });
    }
  });
};
