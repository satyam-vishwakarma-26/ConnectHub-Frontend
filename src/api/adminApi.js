import axios from 'axios'

const adminApi = axios.create({
  baseURL: '/api/admin',
  headers: { 'Content-Type': 'application/json' },
})

adminApi.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const adminApiService = {
  // Users
  getAllUsers:    () => adminApi.get('/users'),
  suspendUser:    (id) => adminApi.put(`/users/${id}/suspend`),
  reactivateUser: (id) => adminApi.put(`/users/${id}/reactivate`),
  deleteUser:     (id) => adminApi.delete(`/users/${id}`),
  promoteUser:    (id) => adminApi.put(`/users/${id}/promote`),
  demoteUser:     (id) => adminApi.put(`/users/${id}/demote`),

  // Rooms & Messages
  getAllRooms:    () => adminApi.get('/rooms'),
  deleteRoom:     (id) => adminApi.delete(`/rooms/${id}`),
  deleteMessage:  (id) => adminApi.delete(`/messages/${id}`),

  // Analytics & Connection
  getAnalytics:   () => adminApi.get('/analytics'),
  getConnections: () => adminApi.get('/connections'),

  // Broadcasting
  broadcast:      (data) => adminApi.post('/broadcast', data),

  // Audit Logs
  getAuditLogs:   () => adminApi.get('/audit-logs'),
}

export default adminApi
