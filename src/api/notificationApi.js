import axios from 'axios'

const notificationApi = axios.create({
  baseURL: '/api/notifications',
  headers: { 'Content-Type': 'application/json' },
})

notificationApi.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const notificationApiService = {
  getAll: () => notificationApi.get(''),
  getUnread: () => notificationApi.get('/unread'),
  getUnreadCount: () => notificationApi.get('/unread/count'),
  markRead: (id) => notificationApi.put(`/${id}/read`),
  markAllRead: () => notificationApi.put('/read-all'),
  remove: (id) => notificationApi.delete(`/${id}`),
}

export default notificationApi
