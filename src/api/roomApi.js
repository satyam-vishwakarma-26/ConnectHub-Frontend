import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

// ── Axios instance for room-service ──────────────────────
const roomApi = axios.create({
  baseURL: `${API_BASE_URL}/api/rooms`,
  headers: { 'Content-Type': 'application/json' },
})

// ── Attach token on every request ────────────────────────
roomApi.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Auto-refresh on 401 ───────────────────────────────────
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token))
  failedQueue = []
}

roomApi.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`
          return roomApi(original)
        })
      }

      original._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) {
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(err)
      }

      try {
        const { data } = await axios.post('/api/auth/refresh', { refreshToken })
        const newToken = data.data.accessToken
        localStorage.setItem('accessToken', newToken)
        localStorage.setItem('refreshToken', data.data.refreshToken)
        roomApi.defaults.headers.Authorization = `Bearer ${newToken}`
        processQueue(null, newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return roomApi(original)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(err)
  }
)

// ── Room API methods ──────────────────────────────────────
export const roomApiService = {
  // Room CRUD
  create:       (data) => roomApi.post('', data),
  getById:      (roomId) => roomApi.get(`/${roomId}`),
  getMyRooms:   () => roomApi.get('/my'),
  update:       (roomId, data) => roomApi.put(`/${roomId}`, data),
  delete:       (roomId) => roomApi.delete(`/${roomId}`),

  // Join / Leave / Invite
  joinByInvite: (inviteCode) => roomApi.post(`/join/${inviteCode}`),
  leave:        (roomId) => roomApi.post(`/${roomId}/leave`),
  regenerateInvite: (roomId) => roomApi.post(`/${roomId}/invite/regenerate`),

  // Member Management
  getMembers:   (roomId) => roomApi.get(`/${roomId}/members`),
  addMember:    (roomId, data) => roomApi.post(`/${roomId}/members`, data),
  removeMember: (roomId, userId) => roomApi.delete(`/${roomId}/members/${userId}`),
  updateRole:   (roomId, userId, data) => roomApi.put(`/${roomId}/members/${userId}/role`, data),
  mute:         (roomId, userId) => roomApi.put(`/${roomId}/members/${userId}/mute`),
  unmute:       (roomId, userId) => roomApi.put(`/${roomId}/members/${userId}/unmute`),

  // Unread Tracking
  updateLastRead: (roomId, data) => roomApi.put(`/${roomId}/read`, data),
  getUnreadCount: (roomId, lastMessageAt) => roomApi.get(`/${roomId}/unread`, { params: { lastMessageAt } }),

  // DM
  getOrCreateDm: (targetUserId) => roomApi.post(`/dm/${targetUserId}`),

  // Admin
  getAllRooms:  () => roomApi.get('/admin/all'),
  adminDelete:  (roomId) => roomApi.delete(`/admin/${roomId}`),
}

export default roomApi
