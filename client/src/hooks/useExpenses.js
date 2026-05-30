import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useExpenses = (params = {}) =>
  useQuery({
    queryKey: ['expenses', params],
    queryFn: async () => {
      const { data } = await api.get('/expenses', { params });
      return data;
    }
  });

export const useExpensesDashboard = () =>
  useQuery({
    queryKey: ['expensesDashboard'],
    queryFn: async () => {
      const { data } = await api.get('/expenses/dashboard');
      return data;
    }
  });

export const useExpenseDetail = (id) =>
  useQuery({
    queryKey: ['expenseDetail', id],
    queryFn: async () => {
      const { data } = await api.get(`/expenses/${id}`);
      return data;
    },
    enabled: !!id
  });

export const useCreateExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/expenses', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expensesDashboard'] });
    }
  });
};

export const useUpdateExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.put(`/expenses/${id}`, payload);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expenseDetail', data?.expense?._id] });
      qc.invalidateQueries({ queryKey: ['expensesDashboard'] });
    }
  });
};

export const useSubmitExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.patch(`/expenses/${id}/submit`);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expenseDetail', data?.expense?._id] });
      qc.invalidateQueries({ queryKey: ['expensesDashboard'] });
    }
  });
};

export const useApproveExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.patch(`/expenses/${id}/approve`);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expenseDetail', data?.expense?._id] });
      qc.invalidateQueries({ queryKey: ['expensesDashboard'] });
      qc.invalidateQueries({ queryKey: ['profitAnalysisSummary'] });
    }
  });
};

export const useRejectExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, rejectionReason }) => {
      const { data } = await api.patch(`/expenses/${id}/reject`, { rejectionReason });
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expenseDetail', data?.expense?._id] });
      qc.invalidateQueries({ queryKey: ['expensesDashboard'] });
    }
  });
};

export const useMarkExpensePaid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.patch(`/expenses/${id}/mark-paid`);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expenseDetail', data?.expense?._id] });
      qc.invalidateQueries({ queryKey: ['expensesDashboard'] });
      qc.invalidateQueries({ queryKey: ['profitAnalysisSummary'] });
    }
  });
};

export const useDeleteExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/expenses/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expensesDashboard'] });
    }
  });
};
