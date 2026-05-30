import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

const STALE_TIME = 2 * 60 * 1000; // 2 minutes

export const useDashboardKpis = () =>
  useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/kpis');
      return data;
    },
    staleTime: STALE_TIME,
    retry: 1,
  });

export const useDashboardAlerts = () =>
  useQuery({
    queryKey: ['dashboard', 'alerts'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/alerts');
      return data;
    },
    staleTime: STALE_TIME,
    retry: 1,
  });

export const useDashboardChartData = () =>
  useQuery({
    queryKey: ['dashboard', 'chart-data'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/chart-data');
      return data;
    },
    staleTime: STALE_TIME,
    retry: 1,
  });

export const useDashboardNeedsAttention = () =>
  useQuery({
    queryKey: ['dashboard', 'needs-attention'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/needs-attention');
      return data;
    },
    staleTime: STALE_TIME,
    retry: 1,
  });

export const useActivityFeed = () =>
  useQuery({
    queryKey: ['dashboard', 'activity-feed'],
    queryFn: async () => {
      const { data } = await api.get('/activity-log?page=1&limit=8');
      return data;
    },
    staleTime: STALE_TIME,
    retry: 1,
  });
