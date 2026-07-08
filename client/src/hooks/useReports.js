import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// ==========================================
// 1. Pre-built Report API Queries
// ==========================================

export const useReportsDashboard = () =>
  useQuery({
    queryKey: ['reportsDashboard'],
    queryFn: async () => {
      const { data } = await api.get('/reports/dashboard');
      return data;
    }
  });

export const useSalesReport = (params) =>
  useQuery({
    queryKey: ['salesReport', params],
    queryFn: async () => {
      const { data } = await api.get('/reports/sales', { params });
      return data;
    },
    enabled: !!params
  });

export const useFinancialReport = (params) =>
  useQuery({
    queryKey: ['financialReport', params],
    queryFn: async () => {
      const { data } = await api.get('/reports/financial', { params });
      return data;
    },
    enabled: !!params
  });

export const useBusinessAnalytics = (params) =>
  useQuery({
    queryKey: ['businessAnalytics', params],
    queryFn: async () => {
      const { data } = await api.get('/reports/business-analytics', { params });
      return data;
    },
    enabled: !!params
  });

// ==========================================
// 2. Report Definitions (Report Builder)
// ==========================================

export const useReportDefinitions = (params = {}) =>
  useQuery({
    queryKey: ['reportDefinitions', params],
    queryFn: async () => {
      const { data } = await api.get('/reports/definitions', { params });
      return data;
    }
  });

export const useCreateReportDefinition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/reports/definitions', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reportDefinitions'] });
    }
  });
};

export const useUpdateReportDefinition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/reports/definitions/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reportDefinitions'] });
    }
  });
};

export const useDeleteReportDefinition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/reports/definitions/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reportDefinitions'] });
      qc.invalidateQueries({ queryKey: ['scheduledReports'] });
    }
  });
};

export const useRunReportDefinition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dateFrom, dateTo }) => {
      const { data } = await api.post(`/reports/definitions/${id}/run`, { dateFrom, dateTo });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reportExports'] });
    }
  });
};

export const useToggleFavouriteReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.patch(`/reports/definitions/${id}/favourite`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reportDefinitions'] });
    }
  });
};

// ==========================================
// 3. Scheduled Reports Recurrence
// ==========================================

export const useScheduledReports = () =>
  useQuery({
    queryKey: ['scheduledReports'],
    queryFn: async () => {
      const { data } = await api.get('/reports/scheduled');
      return data;
    }
  });

export const useCreateScheduledReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/reports/scheduled', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduledReports'] });
    }
  });
};

export const useUpdateScheduledReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/reports/scheduled/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduledReports'] });
    }
  });
};

export const useDeleteScheduledReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/reports/scheduled/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduledReports'] });
    }
  });
};

export const useToggleScheduledReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.patch(`/reports/scheduled/${id}/toggle`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduledReports'] });
    }
  });
};

export const useRunScheduledReportNow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.post(`/reports/scheduled/${id}/run-now`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reportExports'] });
      qc.invalidateQueries({ queryKey: ['scheduledReports'] });
    }
  });
};

// ==========================================
// 4. Report File Exports Log History
// ==========================================

export const useReportExports = (params = {}, options = {}) =>
  useQuery({
    queryKey: ['reportExports', params],
    queryFn: async () => {
      const { data } = await api.get('/reports/exports', { params });
      return data;
    },
    ...options
  });

export const useCreateReportExport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/reports/exports', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reportExports'] });
    }
  });
};

export const useDownloadReportExport = () =>
  useMutation({
    mutationFn: async (id) => {
      const { data } = await api.get(`/reports/exports/${id}/download`);
      return data; // returns presigned download URL
    }
  });

export const useDeleteReportExport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/reports/exports/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reportExports'] });
    }
  });
};
