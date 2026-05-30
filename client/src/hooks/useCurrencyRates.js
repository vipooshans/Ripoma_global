import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useCurrencyRates = () =>
  useQuery({
    queryKey: ['currencyRates'],
    queryFn: async () => {
      const { data } = await api.get('/currency/rates');
      return data;
    }
  });

export const useCurrencyRatesHistory = () =>
  useQuery({
    queryKey: ['currencyRatesHistory'],
    queryFn: async () => {
      const { data } = await api.get('/currency/rates/history');
      return data;
    }
  });

export const useHistoricalCurrencyRates = (date) =>
  useQuery({
    queryKey: ['currencyRatesHistorical', date],
    queryFn: async () => {
      const { data } = await api.get(`/currency/rates/${date}`);
      return data;
    },
    enabled: !!date
  });

export const useBaseCurrency = () =>
  useQuery({
    queryKey: ['baseCurrency'],
    queryFn: async () => {
      const { data } = await api.get('/currency/base');
      return data;
    }
  });

export const useConvertCurrency = () =>
  useMutation({
    mutationFn: async ({ amount, from, to, date }) => {
      const { data } = await api.post('/currency/convert', { amount, from, to, date });
      return data;
    }
  });

export const useRefreshRates = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/currency/rates/refresh');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['currencyRates'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['taxDuty'] });
    }
  });
};

export const useUpdateBaseCurrency = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (baseCurrency) => {
      const { data } = await api.post('/currency/base', { baseCurrency });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['baseCurrency'] });
      qc.invalidateQueries({ queryKey: ['currencyRates'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['taxDuty'] });
      qc.invalidateQueries({ queryKey: ['profitAnalysisSummary'] });
      qc.invalidateQueries({ queryKey: ['profitAnalysisByPeriod'] });
    }
  });
};
