import axios from 'axios';

const BASE = 'http://localhost:5000/api/documents';

const getHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const documentService = {
  getDashboard: () =>
    axios.get(`${BASE}/dashboard`, { headers: getHeaders() }),

  getDocuments: (params = {}) =>
    axios.get(BASE, { params, headers: getHeaders() }),

  getById: (id) =>
    axios.get(`${BASE}/${id}`, { headers: getHeaders() }),

  upload: (formData, onProgress) =>
    axios.post(BASE, formData, {
      headers: { ...getHeaders(), 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(pct);
        }
      }
    }),

  update: (id, data) =>
    axios.put(`${BASE}/${id}`, data, { headers: getHeaders() }),

  delete: (id) =>
    axios.delete(`${BASE}/${id}`, { headers: getHeaders() }),

  restore: (id) =>
    axios.patch(`${BASE}/${id}/restore`, {}, { headers: getHeaders() }),

  getDownloadUrl: (id) =>
    axios.get(`${BASE}/${id}/download`, { headers: getHeaders() }),

  getThumbnailUrl: (id) =>
    axios.get(`${BASE}/${id}/thumbnail`, { headers: getHeaders() }),

  uploadVersion: (id, formData, onProgress) =>
    axios.post(`${BASE}/${id}/version`, formData, {
      headers: { ...getHeaders(), 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(pct);
        }
      }
    }),

  bulkDownload: (ids) =>
    axios.post(`${BASE}/bulk-download`, { ids }, {
      headers: getHeaders(),
      responseType: 'blob'
    }),
};

export const activityService = {
  getGlobal: (params = {}) =>
    axios.get('http://localhost:5000/api/document-activity', { params, headers: getHeaders() }),

  getForDocument: (docId, params = {}) =>
    axios.get(`http://localhost:5000/api/document-activity/${docId}`, { params, headers: getHeaders() }),
};
