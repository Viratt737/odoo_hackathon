import api from './api';

const BASE = '/audits';

export const auditService = {
  getAll: ()                 => api.get(BASE),
  getOne: (id)               => api.get(`${BASE}/${id}`),
  create: (data)             => api.post(BASE, data),
  assignAuditors: (id, auditors) => api.patch(`${BASE}/${id}/assign-auditors`, { auditors }),
  updateItem: (cycleId, itemId, data) => api.patch(`${BASE}/${cycleId}/items/${itemId}`, data), // { result, notes }
  getDiscrepancies: (id)     => api.get(`${BASE}/${id}/discrepancies`),
  close: (id)                => api.patch(`${BASE}/${id}/close`),
};

export default auditService;
