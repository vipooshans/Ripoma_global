import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useDispatches = (params = {}) =>
  useQuery({
    queryKey: ['dispatches', params],
    queryFn: async () => {
      const { data } = await api.get('/dispatches', { params });
      return data;
    }
  });

export const useDispatchDetail = (id) =>
  useQuery({
    queryKey: ['dispatchDetail', id],
    queryFn: async () => {
      const { data } = await api.get(`/dispatches/${id}`);
      return data;
    },
    enabled: !!id
  });

export const useCreateDispatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/dispatches', payload);
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['dispatches'] });
      qc.invalidateQueries({ queryKey: ['exportOrderDetail', v.exportOrderId] });
      qc.invalidateQueries({ queryKey: ['exportDashboard'] });
      qc.invalidateQueries({ queryKey: ['inventory'] }); // stock changed
    }
  });
};

export const useUpdateDispatchStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.patch(`/dispatches/${id}/status`, payload);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['dispatches'] });
      qc.invalidateQueries({ queryKey: ['dispatchDetail', data.dispatch?._id] });
      if (data.dispatch?.exportOrder) {
        qc.invalidateQueries({ queryKey: ['exportOrderDetail', data.dispatch.exportOrder._id || data.dispatch.exportOrder] });
      }
      qc.invalidateQueries({ queryKey: ['exportDashboard'] });
    }
  });
};
