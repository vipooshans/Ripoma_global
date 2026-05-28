import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// --- STOCK ALERTS ---

export const useLowStockAlerts = () => {
  return useQuery({
    queryKey: ['lowStockAlerts'],
    queryFn: async () => {
      const { data } = await api.get('/alerts/low-stock');
      return data;
    }
  });
};

export const useExpiringAlerts = (days = 30) => {
  return useQuery({
    queryKey: ['expiringAlerts', days],
    queryFn: async () => {
      const { data } = await api.get(`/alerts/expiring`, { params: { days } });
      return data;
    }
  });
};

export const useSaveAlertSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/alerts/settings', payload);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lowStockAlerts'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['productDetail', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['inventoryDashboard'] });
    }
  });
};
