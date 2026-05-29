import { useState, useCallback } from 'react';
import { documentService } from '../services/documentService';
import toast from 'react-hot-toast';

export const useDocuments = (initialParams = {}) => {
  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 12 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [params, setParams] = useState({ page: 1, limit: 12, ...initialParams });

  const fetchDocuments = useCallback(async (overrideParams) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = overrideParams || params;
      const { data } = await documentService.getDocuments(queryParams);
      setDocuments(data.documents);
      setPagination(data.pagination);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to fetch documents';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [params]);

  const updateParams = useCallback((newParams) => {
    const merged = { ...params, ...newParams, page: newParams.page || 1 };
    setParams(merged);
    return merged;
  }, [params]);

  const deleteDocument = useCallback(async (id) => {
    try {
      await documentService.delete(id);
      toast.success('Document deleted');
      setDocuments(prev => prev.filter(d => d._id !== id));
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
      return false;
    }
  }, []);

  const downloadDocument = useCallback(async (id, filename) => {
    try {
      const { data } = await documentService.getDownloadUrl(id);
      const link = document.createElement('a');
      link.href = data.url;
      link.download = filename || 'document';
      link.target = '_blank';
      link.click();
      toast.success('Download started');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Download failed');
    }
  }, []);

  return {
    documents,
    pagination,
    loading,
    error,
    params,
    fetchDocuments,
    updateParams,
    deleteDocument,
    downloadDocument
  };
};

export const useDocumentDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await documentService.getDashboard();
      setData(res);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load dashboard';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchDashboard };
};
