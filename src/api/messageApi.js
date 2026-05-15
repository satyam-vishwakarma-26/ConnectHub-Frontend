import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

const messageApi = axios.create({
  baseURL: `${API_BASE_URL}/api/messages`,
  headers: { 'Content-Type': 'application/json' },
})

messageApi.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token))
  failedQueue = []
}

messageApi.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    if (err.response?.status === 401 && !original?._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`
          return messageApi(original)
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
        messageApi.defaults.headers.Authorization = `Bearer ${newToken}`
        processQueue(null, newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return messageApi(original)
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

export const messageApiService = {
  // Send a message (REST fallback — normally done via WebSocket)
  send: (data) => messageApi.post('', data),
  sendDirect: (data) => messageApi.post('/direct', data),

  // Standalone media upload — returns { mediaUrl, fileName }, no message created
  uploadMedia: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return messageApi.post('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  sendImage: (roomId, imageFile, content = '', replyToMessageId = null) => {
    const formData = new FormData()
    formData.append('image', imageFile)
    if (content) formData.append('content', content)
    if (replyToMessageId != null) formData.append('replyToMessageId', String(replyToMessageId))

    return messageApi.post(`/room/${roomId}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  sendFile: (roomId, file, content = '', replyToMessageId = null) => {
    const formData = new FormData()
    formData.append('file', file)
    if (content) formData.append('content', content)
    if (replyToMessageId != null) formData.append('replyToMessageId', String(replyToMessageId))

    return messageApi.post(`/room/${roomId}/file`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  sendDirectImage: (recipientId, imageFile, content = '', replyToMessageId = null) => {
    const formData = new FormData()
    formData.append('image', imageFile)
    if (content) formData.append('content', content)
    if (replyToMessageId != null) formData.append('replyToMessageId', String(replyToMessageId))

    return messageApi.post(`/direct/${recipientId}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  sendDirectFile: (recipientId, file, content = '', replyToMessageId = null) => {
    const formData = new FormData()
    formData.append('file', file)
    if (content) formData.append('content', content)
    if (replyToMessageId != null) formData.append('replyToMessageId', String(replyToMessageId))

    return messageApi.post(`/direct/${recipientId}/file`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  // Paginated history for a room — infinite scroll (newest first)
  getByRoom: (roomId, page = 0, size = 30) =>
    messageApi.get(`/room/${roomId}?page=${page}&size=${size}`),

  // Load messages before a timestamp (for scroll-up pagination)
  getBefore: (roomId, before, size = 30) =>
    messageApi.get(`/room/${roomId}/before?before=${before}&size=${size}`),

  getDirect: (otherUserId, page = 0, size = 30) =>
    messageApi.get(`/direct/${otherUserId}?page=${page}&size=${size}`),

  getDirectBefore: (otherUserId, before, size = 30) =>
    messageApi.get(`/direct/${otherUserId}/before?before=${before}&size=${size}`),

  getById:  (id)         => messageApi.get(`/${id}`),
  edit:     (id, data)   => messageApi.put(`/${id}`, data),
  delete:   (id)         => messageApi.delete(`/${id}`),
  addReaction:    (id, emoji) => messageApi.post(`/${id}/reactions`, { emoji }),
  removeReaction: (id, emoji) => messageApi.delete(`/${id}/reactions?emoji=${encodeURIComponent(emoji)}`),
  search:   (roomId, q)  => messageApi.get(`/room/${roomId}/search?keyword=${encodeURIComponent(q)}`),
  getCount: (roomId)     => messageApi.get(`/room/${roomId}/count`),
  getUnreadCount: (roomId, afterIso) => messageApi.get(`/room/${roomId}/unread?after=${encodeURIComponent(afterIso)}`),

  // Delivery status update
  updateStatus: (id, status) => messageApi.put(`/${id}/status`, { status }),

  // Pinning
  pin:              (id)     => messageApi.put(`/${id}/pin`),
  unpin:            (id)     => messageApi.put(`/${id}/unpin`),
  getPinnedMessages:(roomId) => messageApi.get(`/room/${roomId}/pinned`),

  // Admin — delete any message (admin privilege)
  adminDelete:      (messageId)        => messageApi.delete(`/admin/${messageId}`),
  // Admin — wipe all messages in a room
  adminDeleteRoomHistory: (roomId)     => messageApi.delete(`/admin/room/${roomId}/history`),
}

export default messageApi
