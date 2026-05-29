import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useContainers = (params = {}) =>
  useQuery({
    queryKey: ['containers', params],
    queryFn: async () => {
      const { data } = await api.get('/containers', { params });
      return data;
    }
  });

export const useContainerDetail = (id) =>
  useQuery({
    queryKey: ['containerDetail', id],
    queryFn: async () => {
      const { data } = await api.get(`/containers/${id}`);
      return data;
    },
    enabled: !!id
  });

export const useAvailableContainers = () =>
  useQuery({
    queryKey: ['availableContainers'],
    queryFn: async () => {
      const { data } = await api.get('/containers/available');
      return data.containers || [];
    }
  });

export const useCreateContainer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/containers', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['containers'] });
      qc.invalidateQueries({ queryKey: ['availableContainers'] });
    }
  });
};

export const useUpdateContainer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.patch(`/containers/${id}`, payload);
      return data;
    },
    onSuccess: (data) => {
      const containerId = data.container?._id || data.container;
      qc.invalidateQueries({ queryKey: ['containers'] });
      qc.invalidateQueries({ queryKey: ['containerDetail', containerId] });
      qc.invalidateQueries({ queryKey: ['availableContainers'] });
    }
  });
};

export const useDeleteContainer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/containers/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['containers'] });
      qc.invalidateQueries({ queryKey: ['availableContainers'] });
    }
  });
};
