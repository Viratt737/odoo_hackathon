import api from './api';

const BASE = '/bookings';

export const bookingService = {
  getAll: ()               => api.get(BASE),
  getOne: (id)             => api.get(`${BASE}/${id}`),
  create: (data)           => api.post(BASE, data),
  update: (id, data)       => api.patch(`${BASE}/${id}`, data),
  cancel: (id)             => api.patch(`${BASE}/${id}/cancel`),
  getResourceBookings: (assetId) => api.get(`${BASE}/resource/${assetId}`),
};

export default bookingService;
