import api from './api';

// ─── Departments ─────────────────────────────────────────────────────────────
export const departmentService = {
  getAll:         (params = {}) => api.get('/departments', { params }),
  getOne:         (id)          => api.get(`/departments/${id}`),
  create:         (data)        => api.post('/departments', data),
  update:         (id, data)    => api.put(`/departments/${id}`, data),
  toggleStatus:   (id)          => api.patch(`/departments/${id}/status`),
  remove:         (id)          => api.delete(`/departments/${id}`),
};

// ─── Asset Categories ─────────────────────────────────────────────────────────
export const categoryService = {
  getAll:         (params = {}) => api.get('/categories', { params }),
  getOne:         (id)          => api.get(`/categories/${id}`),
  create:         (data)        => api.post('/categories', data),
  update:         (id, data)    => api.put(`/categories/${id}`, data),
  toggleStatus:   (id)          => api.patch(`/categories/${id}/status`),
  remove:         (id)          => api.delete(`/categories/${id}`),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const userService = {
  getAll:         (params = {}) => api.get('/users', { params }),
  getOne:         (id)          => api.get(`/users/${id}`),
  updateRole:     (id, role)    => api.patch(`/users/${id}/role`, { role }),
  updateStatus:   (id)          => api.patch(`/users/${id}/status`),
  update:         (id, data)    => api.put(`/users/${id}`, data),
};
