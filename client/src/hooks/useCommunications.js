import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useCommunications = (params = {}) =>
  useQuery({
    queryKey: ['communications', params],
    queryFn: async () => {
      const { data } = await api.get('/communications', { params });
      return data;
    },
    enabled: !!(params.entityId)
  });

export const useCreateCommunication = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/communications', payload);
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['communications', { entityId: v.entityId }] });
      qc.invalidateQueries({ queryKey: ['communications'] });
    }
  });
};

export const useUpdateCommunication = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/communications/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['communications'] })
  });
};

export const useDeleteCommunication = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/communications/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['communications'] })
  });
};

export const useMarkFollowUpDone = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.patch(`/communications/${id}/follow-up`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['communications'] })
  });
};
