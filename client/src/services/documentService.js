import api from './api';

const BASE = '/documents';

export const documentService = {
  getDashboard: () =>
    api.get(`${BASE}/dashboard`),

  getDocuments: (params = {}) =>
    api.get(BASE, { params }),

  getById: (id) =>
    api.get(`${BASE}/${id}`),

  upload: (formData, onProgress) =>
    api.post(BASE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(pct);
        }
      }
    }),

  update: (id, data) =>
    api.put(`${BASE}/${id}`, data),

  delete: (id) =>
    api.delete(`${BASE}/${id}`),

  restore: (id) =>
    api.patch(`${BASE}/${id}/restore`),

  getDownloadUrl: (id) =>
    api.get(`${BASE}/${id}/download`),

  getThumbnailUrl: (id) =>
    api.get(`${BASE}/${id}/thumbnail`),

  uploadVersion: (id, formData, onProgress) =>
    api.post(`${BASE}/${id}/version`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(pct);
        }
      }
    }),

  bulkDownload: (ids) =>
    api.post(`${BASE}/bulk-download`, { ids }, {
      responseType: 'blob'
    }),
};

export const activityService = {
  getGlobal: (params = {}) =>
    api.get('/document-activity', { params }),

  getForDocument: (docId, params = {}) =>
    api.get(`/document-activity/${docId}`, { params }),
};
