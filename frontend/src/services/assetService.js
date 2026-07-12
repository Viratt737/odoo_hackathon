import api from './api';

const BASE = '/assets';

/**
 * For file uploads we send multipart/form-data.
 * For regular JSON requests we use default api config.
 */

const buildFormData = (data, files = {}) => {
  const fd = new FormData();

  // Append all scalar fields
  Object.entries(data).forEach(([key, val]) => {
    if (val === null || val === undefined) return;
    if (key === 'customFieldValues') {
      fd.append(key, JSON.stringify(val));
    } else {
      fd.append(key, val);
    }
  });

  // Append files
  (files.photos    || []).forEach((f) => fd.append('photos',    f));
  (files.documents || []).forEach((f) => fd.append('documents', f));

  return fd;
};

export const assetService = {
  // List with filters
  getAll: (params = {}) => api.get(BASE, { params }),

  // Single asset (with full history)
  getOne: (id) => api.get(`${BASE}/${id}`),

  // Create — uses multipart
  create: (data, files = {}) =>
    api.post(BASE, buildFormData(data, files), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Update — uses multipart
  update: (id, data, files = {}) =>
    api.put(`${BASE}/${id}`, buildFormData(data, files), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Explicit status transition
  updateStatus: (id, status) => api.patch(`${BASE}/${id}/status`, { status }),

  // Delete (Admin only)
  remove: (id) => api.delete(`${BASE}/${id}`),
};
