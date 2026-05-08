import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { paymentApiService } from '../api/paymentApi'

export const useSubscriptionStore = create(
  persist(
    (set, get) => ({
      planName: 'FREE',
      isProUser: false,
      status: 'EXPIRED',
      endDate: null,
      startDate: null,
      autoRenew: false,
      limits: null,
      isLoading: false,
      error: null,

      // ── Fetch current subscription ─────────────────────
      fetchSubscription: async () => {
        const token =
          localStorage.getItem('connecthub_token') ||
          localStorage.getItem('accessToken')
        if (!token) return

        set({ isLoading: true, error: null })
        try {
          const res = await paymentApiService.getMySubscription()
          const sub = res.data
          set({
            planName:  sub.planName  || 'FREE',
            isProUser: sub.isProUser ?? sub.proUser ?? false,
            status:    sub.status    || 'EXPIRED',
            endDate:   sub.endDate   || null,
            startDate: sub.startDate || null,
            autoRenew: sub.autoRenew ?? false,
            isLoading: false,
          })
        } catch (err) {
          // 401/403 = not logged in — silently set FREE
          set({
            planName: 'FREE',
            isProUser: false,
            status: 'EXPIRED',
            endDate: null,
            isLoading: false,
            error: null,
          })
        }
      },

      // ── Fetch plan limits ──────────────────────────────
      fetchLimits: async () => {
        const token =
          localStorage.getItem('connecthub_token') ||
          localStorage.getItem('accessToken')
        if (!token) return

        try {
          const res = await paymentApiService.getMyLimits()
          set({ limits: res.data })
        } catch (_) {}
      },

      // ── Check single feature ───────────────────────────
      isFeatureEnabled: (feature) => {
        const { limits, isProUser } = get()
        if (!limits) return isProUser
        const val = limits[feature]
        if (typeof val === 'boolean') return val
        if (typeof val === 'number')  return val === -1 || val > 0
        return isProUser
      },

      // ── Mark as PRO immediately (optimistic after payment) ─
      markAsPro: (endDate) => {
        set({
          planName: 'PRO',
          isProUser: true,
          status: 'ACTIVE',
          endDate,
        })
      },

      // ── Reset to FREE ──────────────────────────────────
      resetToFree: () => {
        set({
          planName: 'FREE',
          isProUser: false,
          status: 'EXPIRED',
          endDate: null,
          startDate: null,
          autoRenew: false,
          limits: null,
        })
      },

      setAutoRenew: (val) => set({ autoRenew: val }),
    }),
    {
      name: 'connecthub-subscription',
      partialize: state => ({
        planName:  state.planName,
        isProUser: state.isProUser,
        status:    state.status,
        endDate:   state.endDate,
        startDate: state.startDate,
        autoRenew: state.autoRenew,
        limits:    state.limits,
      }),
    }
  )
)
