import api from './api';

const BASE = '/maintenance';

const buildFormData = (data, file) => {
  const fd = new FormData();
  Object.entries(data).forEach(([key, val]) => {
    if (val !== null && val !== undefined) fd.append(key, val);
  });
  if (file) fd.append('attachedPhoto', file);
  return fd;
};

export const maintenanceService = {
  getAll: (params = {}) => api.get(BASE, { params }),
  getOne: (id)          => api.get(`${BASE}/${id}`),
  create: (data, file)  => api.post(BASE, buildFormData(data, file), {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  approve: (id)                 => api.patch(`${BASE}/${id}/approve`),
  reject: (id)                  => api.patch(`${BASE}/${id}/reject`),
  assignTechnician: (id, tech)  => api.patch(`${BASE}/${id}/assign-technician`, { technician: tech }),
  start: (id)                   => api.patch(`${BASE}/${id}/start`),
  resolve: (id, resolution)     => api.patch(`${BASE}/${id}/resolve`, resolution), // { resolutionNotes, cost }
};

export default maintenanceService;
