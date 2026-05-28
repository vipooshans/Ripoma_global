import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// --- CATEGORIES ---

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/categories');
      return data;
    }
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/categories', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/categories/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/categories/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });
};

// --- WAREHOUSES ---

export const useWarehouses = () => {
  return useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data } = await api.get('/warehouses');
      return data;
    }
  });
};

export const useWarehouseDetail = (id) => {
  return useQuery({
    queryKey: ['warehouseDetail', id],
    queryFn: async () => {
      const { data } = await api.get(`/warehouses/${id}`);
      return data;
    },
    enabled: !!id
  });
};

export const useCreateWarehouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/warehouses', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    }
  });
};

export const useUpdateWarehouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/warehouses/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['warehouseDetail', id] });
    }
  });
};

// --- PRODUCTS ---

export const useProducts = (params = {}) => {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const { data } = await api.get('/products', { params });
      return data;
    }
  });
};

export const useProductDetail = (id) => {
  return useQuery({
    queryKey: ['productDetail', id],
    queryFn: async () => {
      const { data } = await api.get(`/products/${id}`);
      return data;
    },
    enabled: !!id
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/products', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/products/${id}`, payload);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['productDetail', variables.id] });
    }
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/products/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
};

export const useUpdateProductStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }) => {
      const { data } = await api.patch(`/products/${id}/status`, { status });
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['productDetail', variables.id] });
    }
  });
};

export const useImportProductsCSV = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData) => {
      const { data } = await api.post('/products/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryDashboard'] });
    }
  });
};

// --- STOCK & INVENTORY ---

export const useStockItems = (params = {}) => {
  return useQuery({
    queryKey: ['stockItems', params],
    queryFn: async () => {
      const { data } = await api.get('/inventory', { params });
      return data;
    }
  });
};

export const useInventoryDashboard = () => {
  return useQuery({
    queryKey: ['inventoryDashboard'],
    queryFn: async () => {
      const { data } = await api.get('/inventory/dashboard');
      return data;
    }
  });
};

export const useProductWarehouseStock = (productId, warehouseId) => {
  return useQuery({
    queryKey: ['productWarehouseStock', productId, warehouseId],
    queryFn: async () => {
      const { data } = await api.get(`/inventory/${productId}/${warehouseId}`);
      return data;
    },
    enabled: !!productId && !!warehouseId
  });
};

export const useUpdateStockMeta = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, warehouseId, ...payload }) => {
      const { data } = await api.patch(`/inventory/${productId}/${warehouseId}`, payload);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stockItems'] });
      queryClient.invalidateQueries({ queryKey: ['productWarehouseStock', variables.productId, variables.warehouseId] });
      queryClient.invalidateQueries({ queryKey: ['productDetail', variables.productId] });
    }
  });
};

// --- STOCK MOVEMENTS ---

export const useStockMovements = (params = {}) => {
  return useQuery({
    queryKey: ['stockMovements', params],
    queryFn: async () => {
      const { data } = await api.get('/stock-movements', { params });
      return data;
    }
  });
};

export const useCreateStockMovement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/stock-movements', payload);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stockItems'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['productDetail', variables.product] });
      queryClient.invalidateQueries({ queryKey: ['warehouseDetail', variables.warehouse] });
      if (variables.transferTo) {
        queryClient.invalidateQueries({ queryKey: ['warehouseDetail', variables.transferTo] });
      }
    }
  });
};

// --- SUPPLIERS ---

export const useSuppliers = () => {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data } = await api.get('/suppliers');
      return data;
    }
  });
};

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/suppliers', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    }
  });
};
