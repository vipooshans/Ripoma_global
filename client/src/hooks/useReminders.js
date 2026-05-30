import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useReminders = () =>
  useQuery({
    queryKey: ['reminders'],
    queryFn: async () => {
      const { data } = await api.get('/reminders');
      return data;
    }
  });

export const useCreateReminder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/reminders', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] });
    }
  });
};

export const useUpdateReminder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.put(`/reminders/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] });
    }
  });
};

export const useCompleteReminder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.put(`/reminders/${id}/complete`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] });
    }
  });
};

export const useSnoozeReminder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, snoozeMinutes }) => {
      const { data } = await api.put(`/reminders/${id}/snooze`, { snoozeMinutes });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] });
    }
  });
};

export const useDeleteReminder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/reminders/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] });
    }
  });
};
