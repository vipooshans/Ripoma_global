import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useNotifications = (params = {}) =>
  useQuery({
    queryKey: ['notifications', params],
    queryFn: async () => {
      const { data } = await api.get('/notifications', { params });
      return data;
    }
  });

export const useUnreadCount = () =>
  useQuery({
    queryKey: ['unreadCount'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/unread/count');
      return data;
    }
  });

export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.put(`/notifications/${id}/read`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['unreadCount'] });
    }
  });
};

export const useMarkAllNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.put('/notifications/read-all');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['unreadCount'] });
    }
  });
};

export const useDismissNotification = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.put(`/notifications/${id}/dismiss`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['unreadCount'] });
    }
  });
};
