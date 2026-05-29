import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export const useShippingSchedule = (params = {}) =>
  useQuery({
    queryKey: ['shippingSchedule', params],
    queryFn: async () => {
      const { data } = await api.get('/shipments/schedule', { params });
      return data.entries || [];
    }
  });
