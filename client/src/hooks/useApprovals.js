import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

/**
 * Fetches the queue of pending approvals for the current user.
 */
export const usePendingApprovals = () =>
  useQuery({
    queryKey: ['pendingApprovals'],
    queryFn: async () => {
      const { data } = await api.get('/import-orders/pending-approvals');
      return data;
    }
  });

/**
 * Mutation to approve a purchase order at the current level.
 */
export const useApproveImportOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, comments }) => {
      const { data } = await api.patch(`/import-orders/${id}/approve`, { comments });
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['importOrders'] });
      qc.invalidateQueries({ queryKey: ['importOrderDetail', v.id] });
      qc.invalidateQueries({ queryKey: ['importDashboard'] });
      qc.invalidateQueries({ queryKey: ['pendingApprovals'] });
    }
  });
};

/**
 * Mutation to reject a purchase order and revert it to draft.
 */
export const useRejectImportOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, comments }) => {
      const { data } = await api.patch(`/import-orders/${id}/reject`, { comments });
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['importOrders'] });
      qc.invalidateQueries({ queryKey: ['importOrderDetail', v.id] });
      qc.invalidateQueries({ queryKey: ['importDashboard'] });
      qc.invalidateQueries({ queryKey: ['pendingApprovals'] });
    }
  });
};
