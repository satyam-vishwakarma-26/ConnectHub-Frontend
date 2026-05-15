import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

// ── Axios instance for payment-service (via gateway) ──────
const paymentApi = axios.create({
  baseURL: `${API_BASE_URL}/api/payments`,
  headers: { 'Content-Type': 'application/json' },
})

// ── Attach token from localStorage on every request ───────
paymentApi.interceptors.request.use(config => {
  const token =
    localStorage.getItem('connecthub_token') ||
    localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Payment API methods ───────────────────────────────────
export const paymentApiService = {
  // Plans (public — no auth needed)
  getPlans: () => paymentApi.get('/plans'),

  // Order + verify
  createOrder: (data) => paymentApi.post('/create-order', data),
  verifyPayment: (data) => paymentApi.post('/verify', data),

  // Subscription
  getMySubscription: () => paymentApi.get('/subscription/my'),
  getMyLimits:       () => paymentApi.get('/subscription/limits'),
  cancelSubscription: () => paymentApi.put('/subscription/cancel'),
  toggleAutoRenew: (autoRenew) =>
    paymentApi.put(`/subscription/auto-renew?autoRenew=${autoRenew}`),

  // History
  getPaymentHistory: () => paymentApi.get('/history'),

  // Health (public)
  getHealth: () => paymentApi.get('/health'),
}

export default paymentApi
