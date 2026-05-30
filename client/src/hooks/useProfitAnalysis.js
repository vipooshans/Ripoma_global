import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export const useProfitAnalysisSummary = (params = {}) =>
  useQuery({
    queryKey: ['profitAnalysisSummary', params],
    queryFn: async () => {
      const { data } = await api.get('/profit-analysis/summary', { params });
      return data;
    }
  });

export const useProfitAnalysisByPeriod = (params = {}) =>
  useQuery({
    queryKey: ['profitAnalysisByPeriod', params],
    queryFn: async () => {
      const { data } = await api.get('/profit-analysis/by-period', { params });
      return data;
    }
  });

export const useProfitAnalysisByOrder = (type, id) =>
  useQuery({
    queryKey: ['profitAnalysisByOrder', type, id],
    queryFn: async () => {
      const { data } = await api.get(`/profit-analysis/by-order/${type}/${id}`);
      return data;
    },
    enabled: !!type && !!id
  });

export const useProfitAnalysisByCustomer = (params = {}) =>
  useQuery({
    queryKey: ['profitAnalysisByCustomer', params],
    queryFn: async () => {
      const { data } = await api.get('/profit-analysis/by-customer', { params });
      return data;
    }
  });

export const useProfitAnalysisByProduct = (params = {}) =>
  useQuery({
    queryKey: ['profitAnalysisByProduct', params],
    queryFn: async () => {
      const { data } = await api.get('/profit-analysis/by-product', { params });
      return data;
    }
  });
