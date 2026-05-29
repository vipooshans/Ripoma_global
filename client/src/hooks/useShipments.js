import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useShipments = (params = {}) =>
  useQuery({
    queryKey: ['shipments', params],
    queryFn: async () => {
      const { data } = await api.get('/shipments', { params });
      return data;
    }
  });

export const useShipmentDetail = (id) =>
  useQuery({
    queryKey: ['shipmentDetail', id],
    queryFn: async () => {
      const { data } = await api.get(`/shipments/${id}`);
      return data;
    },
    enabled: !!id
  });

export const useShipmentDashboard = () =>
  useQuery({
    queryKey: ['shipmentDashboard'],
    queryFn: async () => {
      const { data } = await api.get('/shipments/dashboard');
      return data;
    }
  });

export const useNotifications = () =>
  useQuery({
    queryKey: ['logisticsNotifications'],
    queryFn: async () => {
      const { data } = await api.get('/shipments/notifications');
      return data;
    }
  });

export const useCreateShipment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/shipments', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shipments'] });
      qc.invalidateQueries({ queryKey: ['shipmentDashboard'] });
      qc.invalidateQueries({ queryKey: ['shippingSchedule'] });
      qc.invalidateQueries({ queryKey: ['containers'] });
    }
  });
};

export const useUpdateShipment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.patch(`/shipments/${id}`, payload);
      return data;
    },
    onSuccess: (data) => {
      const shipmentId = data.shipment?._id || data.shipment;
      qc.invalidateQueries({ queryKey: ['shipments'] });
      qc.invalidateQueries({ queryKey: ['shipmentDetail', shipmentId] });
      qc.invalidateQueries({ queryKey: ['shipmentDashboard'] });
      qc.invalidateQueries({ queryKey: ['shippingSchedule'] });
      qc.invalidateQueries({ queryKey: ['containers'] });
    }
  });
};

export const useAddTrackingEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.post(`/shipments/${id}/events`, payload);
      return data;
    },
    onSuccess: (data) => {
      const shipmentId = data.shipment?._id || data.shipment;
      qc.invalidateQueries({ queryKey: ['shipments'] });
      qc.invalidateQueries({ queryKey: ['shipmentDetail', shipmentId] });
      qc.invalidateQueries({ queryKey: ['shipmentDashboard'] });
      qc.invalidateQueries({ queryKey: ['shippingSchedule'] });
      qc.invalidateQueries({ queryKey: ['logisticsNotifications'] });
    }
  });
};

export const useTriggerCarrierPoll = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/shipments/poll');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shipments'] });
      qc.invalidateQueries({ queryKey: ['shipmentDashboard'] });
      qc.invalidateQueries({ queryKey: ['shippingSchedule'] });
      qc.invalidateQueries({ queryKey: ['logisticsNotifications'] });
    }
  });
};

export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.patch(`/shipments/notifications/${id}/read`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['logisticsNotifications'] });
      qc.invalidateQueries({ queryKey: ['shipmentDashboard'] });
    }
  });
};

export const useMarkAllNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.patch('/shipments/notifications/read-all');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['logisticsNotifications'] });
      qc.invalidateQueries({ queryKey: ['shipmentDashboard'] });
    }
  });
};
