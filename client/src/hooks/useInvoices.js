import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useInvoices = (params = {}) =>
  useQuery({
    queryKey: ['invoices', params],
    queryFn: async () => {
      const { data } = await api.get('/invoices', { params });
      return data;
    }
  });

export const useInvoiceDetail = (id) =>
  useQuery({
    queryKey: ['invoiceDetail', id],
    queryFn: async () => {
      const { data } = await api.get(`/invoices/${id}`);
      return data;
    },
    enabled: !!id
  });

export const useCreateInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/invoices', payload);
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['exportOrderDetail', v.exportOrderId] });
    }
  });
};

export const useSendInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.patch(`/invoices/${id}/send`);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['invoiceDetail', data.invoice?._id] });
      if (data.invoice?.exportOrder) {
        qc.invalidateQueries({ queryKey: ['exportOrderDetail', data.invoice.exportOrder] });
      }
    }
  });
};

export const usePayInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, amountPaid, note }) => {
      const { data } = await api.patch(`/invoices/${id}/pay`, { amountPaid, note });
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['invoiceDetail', data.invoice?._id] });
      if (data.invoice?.exportOrder) {
        qc.invalidateQueries({ queryKey: ['exportOrderDetail', data.invoice.exportOrder] });
      }
      qc.invalidateQueries({ queryKey: ['exportDashboard'] });
    }
  });
};
