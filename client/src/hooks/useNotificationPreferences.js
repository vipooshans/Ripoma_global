import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useNotificationPreferences = () =>
  useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: async () => {
      const { data } = await api.get('/notification-preferences');
      return data;
    }
  });

export const useUpdateNotificationPreferences = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.put('/notification-preferences', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notificationPreferences'] });
    }
  });
};
