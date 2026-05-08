import axios from 'axios'

// ── Axios instance for auth-service ──────────────────────
const authApi = axios.create({
  baseURL: '/api/auth',
  headers: { 'Content-Type': 'application/json' },
})

// ── Attach token on every request ────────────────────────
authApi.interceptors.request.use(config => {
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

authApi.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    // Skip auto-refresh for public auth endpoints (login, register, etc.)
    const publicPaths = ['/login', '/register', '/forgot-password', '/verify-otp', '/reset-password']
    const isPublicAuth = publicPaths.some(p => original.url?.endsWith(p))
    if (err.response?.status === 401 && !original._retry && !isPublicAuth) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`
          return authApi(original)
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
        authApi.defaults.headers.Authorization = `Bearer ${newToken}`
        processQueue(null, newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return authApi(original)
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

// ── Auth API methods ──────────────────────────────────────
export const authApiService = {
  register: (data) => authApi.post('/register', data),
  login:    (data) => authApi.post('/login', data),
  logout:   ()     => authApi.post('/logout'),
  refresh:  (refreshToken) => authApi.post('/refresh', { refreshToken }),
  requestRegistrationOtp: (data) => authApi.post('/register/request-otp', data),
  verifyRegistrationOtp:  (data) => authApi.post('/register/verify-otp', data),

  getProfile:    ()     => authApi.get('/profile'),
  getProfileById:(id)   => authApi.get(`/profile/${id}`),
  updateProfile: (data) => authApi.put('/profile', data),
  changePassword:(data) => authApi.put('/password', data),
  updateStatus:  (data) => authApi.put('/status', data),
  searchUsers:   (q)    => authApi.get(`/search?q=${encodeURIComponent(q)}`),
  recordLastSeen:()     => authApi.post('/last-seen'),

  // Password Reset
  forgotPassword: (data) => authApi.post('/forgot-password', data),
  verifyOtp:      (data) => authApi.post('/verify-otp', data),
  resetPassword:  (data) => authApi.post('/reset-password', data),

  // Admin
  getAllUsers:     ()   => authApi.get('/admin/users'),
  suspendUser:    (id) => authApi.put(`/admin/users/${id}/suspend`),
  reactivateUser: (id) => authApi.put(`/admin/users/${id}/reactivate`),
  deleteUser:     (id) => authApi.delete(`/admin/users/${id}`),

  // Account Deletion (self-service)
  requestDeletionOtp:  (data) => authApi.post('/account/delete/request-otp', data),
  verifyDeletionOtp:   (data) => authApi.post('/account/delete/verify-otp', data),
  confirmAccountDeletion: (data) => authApi.post('/account/delete/confirm', data),
}

export default authApi
