import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApiService } from '../api/authApi'
import { wsService } from '../api/wsService'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:         null,
      accessToken:  null,
      refreshToken: null,
      isLoading:    false,
      error:        null,

      // ── Register ─────────────────────────────────────
      register: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const res = await authApiService.register(data)
          const { accessToken, refreshToken, user } = res.data.data
          localStorage.setItem('accessToken', accessToken)
          localStorage.setItem('refreshToken', refreshToken)
          set({ user, accessToken, refreshToken, isLoading: false })
          wsService.connect(accessToken)
          return { success: true }
        } catch (err) {
          const msg = err.response?.data?.message || 'Registration failed'
          set({ isLoading: false, error: msg })
          return { success: false, message: msg }
        }
      },

      // ── Login ────────────────────────────────────────
      login: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const res = await authApiService.login(data)
          const { accessToken, refreshToken, user } = res.data.data
          localStorage.setItem('accessToken', accessToken)
          localStorage.setItem('refreshToken', refreshToken)
          set({ user, accessToken, refreshToken, isLoading: false })
          wsService.connect(accessToken)
          return { success: true }
        } catch (err) {
          const msg = err.response?.data?.message || 'Login failed'
          set({ isLoading: false, error: msg })
          return { success: false, message: msg }
        }
      },

      // ── Logout ───────────────────────────────────────
      logout: async () => {
        try {
          await authApiService.logout()
        } catch (_) {}
        wsService.disconnect()
        localStorage.clear()
        set({ user: null, accessToken: null, refreshToken: null })
      },

      // ── Update profile ───────────────────────────────
      updateProfile: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const res = await authApiService.updateProfile(data)
          set({ user: res.data.data, isLoading: false })
          return { success: true }
        } catch (err) {
          const msg = err.response?.data?.message || 'Update failed'
          set({ isLoading: false, error: msg })
          return { success: false, message: msg }
        }
      },

      // ── Change password ──────────────────────────────
      changePassword: async (data) => {
        set({ isLoading: true, error: null })
        try {
          await authApiService.changePassword(data)
          set({ isLoading: false })
          return { success: true }
        } catch (err) {
          const msg = err.response?.data?.message || 'Password change failed'
          set({ isLoading: false, error: msg })
          return { success: false, message: msg }
        }
      },

      // ── Update status ────────────────────────────────
      updateStatus: async (status) => {
        try {
          const res = await authApiService.updateStatus({ status })
          set(state => ({ user: { ...state.user, status: res.data.data.status } }))
          // Broadcast to all connected users via WebSocket in real time
          wsService.sendPresenceUpdate(status)
          return { success: true }
        } catch (err) {
          return { success: false, message: err.response?.data?.message }
        }
      },

      // ── Refresh user from API ─────────────────────────
      refreshUser: async () => {
        try {
          const res = await authApiService.getProfile()
          set({ user: res.data.data })
        } catch (_) {}
      },

      // ── Setters ──────────────────────────────────────
      setUser:  (user)  => set({ user }),
      setError: (error) => set({ error }),
      clearError: ()    => set({ error: null }),

      isAuthenticated: () => !!get().accessToken,
      isAdmin: () => get().user?.role === 'PLATFORM_ADMIN',
    }),
    {
      name: 'connecthub-auth',
      partialize: state => ({
        user:         state.user,
        accessToken:  state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
)
