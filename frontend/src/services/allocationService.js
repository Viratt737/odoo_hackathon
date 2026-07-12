import api from './api';

const BASE = '/allocations';

export const allocationService = {
  getAll: (params = {}) => api.get(BASE, { params }),
  create: (data)        => api.post(BASE, data),
  return: (id, conditionNotesOnReturn) => api.patch(`${BASE}/${id}/return`, { conditionNotesOnReturn }),
  getOverdue: ()        => api.get(`${BASE}/overdue`),

  // Polymorphic Transfers
  getTransfers: ()             => api.get(`${BASE}/transfers`),
  requestTransfer: (data)      => api.post(`${BASE}/transfers`, data),
  approveTransfer: (id, action) => api.patch(`${BASE}/transfers/${id}/approve`, { action }), // action: 'Approve' | 'Reject'
};
export default allocationService;
