import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { useAuthStore } from './context/authStore'
import { useEffect } from 'react'
import { wsService } from './api/wsService'
import { authApiService } from './api/authApi'
import { useSubscriptionStore } from './context/subscriptionStore'

import AppLayout         from './components/layout/AppLayout'
import ProtectedRoute   from './components/layout/ProtectedRoute'
import LoginPage        from './pages/auth/LoginPage'
import RegisterPage         from './pages/auth/RegisterPage'
import ForgotPasswordPage   from './pages/auth/ForgotPasswordPage'
import ProfilePage      from './pages/auth/ProfilePage'
import SearchUsersPage  from './pages/auth/SearchUsersPage'
import ChatLayout       from './pages/chat/ChatLayout'
import ChatPage         from './pages/chat/ChatPage'
import AdminPage        from './pages/admin/AdminPage'
import NotificationsPage from './pages/shared/NotificationsPage'
import SettingsPage      from './pages/shared/SettingsPage'
import LandingPage      from './pages/LandingPage'
import PricingPage      from './pages/payment/PricingPage'
import CheckoutPage     from './pages/payment/CheckoutPage'
import SubscriptionPage from './pages/payment/SubscriptionPage'

function OAuth2Handler() {
  const navigate = useNavigate()

  useEffect(() => {
    const params  = new URLSearchParams(window.location.search)
    const token   = params.get('token')
    const refresh = params.get('refreshToken')
    if (token && refresh) {
      localStorage.setItem('accessToken', token)
      localStorage.setItem('refreshToken', refresh)
      wsService.connect(token)
      authApiService.getProfile()
        .then(res => {
          useAuthStore.setState({
            user: res.data.data,
            accessToken: token,
            refreshToken: refresh
          })
          navigate('/chat', { replace: true })
        })
        .catch(() => navigate('/login', { replace: true }))
    } else {
      navigate('/login', { replace: true })
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center auth-bg page-shell px-4">
      <div className="surface-card rounded-[28px] px-6 py-5 text-center shadow-lg">
        <div
          className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
          style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }}
        />
        <p className="font-medium" style={{ color:'var(--text-primary)' }}>Completing sign in</p>
        <p className="text-sm mt-1" style={{ color:'var(--text-muted)' }}>Bringing your workspace online...</p>
      </div>
    </div>
  )
}

export default function App() {
  const { accessToken, user, updateStatus } = useAuthStore()
  const { fetchSubscription, fetchLimits }  = useSubscriptionStore()

  // Fetch subscription state whenever user logs in
  useEffect(() => {
    if (accessToken) {
      fetchSubscription()
      fetchLimits()
    }
  }, [accessToken])

  useEffect(() => {
    if (accessToken && !wsService.isConnected()) wsService.connect(accessToken)
  }, [accessToken])

  useEffect(() => {
    if (!accessToken || !user?.id) return

    const syncOnlinePresence = () => {
      if (user.status && user.status !== 'INVISIBLE') return
      updateStatus('ONLINE').catch(() => {})
    }

    const detach = wsService.onConnect(syncOnlinePresence)

    if (wsService.isConnected()) {
      syncOnlinePresence()
    }

    return detach
  }, [accessToken, user?.id, user?.status, updateStatus])

  return (
    <ThemeProvider>
      <Routes>
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/register"        element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/pricing"         element={<PricingPage />} />
        <Route path="/oauth2/redirect" element={<OAuth2Handler />} />
        <Route path="/"                element={<LandingPage />} />

        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="chat" element={<ChatLayout />}>
            <Route index element={
              <div className="flex-1 flex items-center justify-center h-full p-6">
                <div className="empty-state-card max-w-xl w-full text-center">
                  <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                       style={{ background:'var(--brand-light)', color:'var(--brand)' }}>
                    <span className="text-2xl">💬</span>
                  </div>
                  <h2 className="text-2xl font-bold mb-2"
                      style={{ fontFamily:'Syne,sans-serif', color:'var(--text-primary)' }}>
                    Choose a conversation
                  </h2>
                  <p className="text-sm mb-5" style={{ color:'var(--text-muted)' }}>
                    Open a room from the sidebar or create a new space to get the team moving.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 text-sm" style={{ color:'var(--text-secondary)' }}>
                    <span className="px-3 py-1.5 rounded-full" style={{ background:'var(--bg-secondary)', border:'1px solid var(--border)' }}>Fast realtime chat</span>
                    <span className="px-3 py-1.5 rounded-full" style={{ background:'var(--bg-secondary)', border:'1px solid var(--border)' }}>Pins and reactions</span>
                    <span className="px-3 py-1.5 rounded-full" style={{ background:'var(--bg-secondary)', border:'1px solid var(--border)' }}>Private or public rooms</span>
                  </div>
                </div>
              </div>
            } />
            <Route path=":roomId"     element={<ChatPage />} />
            <Route path="dm/:userId"  element={<ChatPage />} />
            <Route path="user/:userId" element={<ChatPage />} />
          </Route>

          <Route path="profile"       element={<ProfilePage />} />
          <Route path="search"        element={<SearchUsersPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings"      element={<SettingsPage />} />
          <Route path="admin"         element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
          <Route path="payment/checkout" element={<CheckoutPage />} />
          <Route path="subscription"     element={<SubscriptionPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  )
}
