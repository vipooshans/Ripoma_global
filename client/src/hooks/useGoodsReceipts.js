import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useGoodsReceipts = (params = {}) =>
  useQuery({
    queryKey: ['goodsReceipts', params],
    queryFn: async () => {
      const { data } = await api.get('/goods-receipts', { params });
      return data;
    }
  });

export const useGoodsReceiptDetail = (id) =>
  useQuery({
    queryKey: ['goodsReceiptDetail', id],
    queryFn: async () => {
      const { data } = await api.get(`/goods-receipts/${id}`);
      return data;
    },
    enabled: !!id
  });

export const useCreateGoodsReceipt = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/goods-receipts', payload);
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['goodsReceipts'] });
      qc.invalidateQueries({ queryKey: ['importOrderDetail', v.importOrder] });
      qc.invalidateQueries({ queryKey: ['importOrders'] });
      qc.invalidateQueries({ queryKey: ['importDashboard'] });
      qc.invalidateQueries({ queryKey: ['stockItems'] }); // invalidate inventory levels
    }
  });
};
