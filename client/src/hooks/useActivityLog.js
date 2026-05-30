import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export const useActivityLog = (params = {}) =>
  useQuery({
    queryKey: ['activityLog', params],
    queryFn: async () => {
      const { data } = await api.get('/activity-log', { params });
      return data;
    }
  });
