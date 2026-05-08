import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Zap, Calendar, RefreshCw, AlertTriangle, Clock, TrendingUp, Check, X as XIcon, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../../context/authStore'
import { useSubscriptionStore } from '../../context/subscriptionStore'
import { paymentApiService } from '../../api/paymentApi'
import { formatDate, daysRemaining, subscriptionProgress } from '../../utils/paymentUtils'
import PlanBadge from '../../components/ui/PlanBadge'

// ── Loading skeleton ───────────────────────────────────────
function SubscriptionSkeleton() {
  return (
    <div className="space-y-4">
      <div className="shimmer h-48 rounded-3xl" />
      <div className="shimmer h-8 w-48 rounded-xl" />
      <div className="shimmer h-64 rounded-3xl" />
    </div>
  )
}

// ── Cancel Confirmation Modal ──────────────────────────────
function CancelModal({ isOpen, endDate, onConfirm, onClose, loading }) {
  if (!isOpen) return null
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden animate-slide-up"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
      >
        <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #ef4444, #f97316)' }} />
        <div className="p-7">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 mx-auto"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            <AlertTriangle size={22} style={{ color: '#ef4444' }} />
          </div>

          <h3 className="text-lg font-bold text-center mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
            Cancel Subscription?
          </h3>

          <p className="text-sm text-center mb-6" style={{ color: 'var(--text-secondary)' }}>
            You will keep your{' '}
            <span className="font-semibold" style={{ color: '#f59e0b' }}>PRO access</span> until{' '}
            <strong>{formatDate(endDate)}</strong>. After that, your account will revert to the FREE plan.
          </p>

          <button
            onClick={onConfirm}
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-white text-sm mb-3 transition-all flex items-center justify-center gap-2"
            style={{ background: loading ? '#9ca3af' : '#ef4444', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? <><RefreshCw size={15} className="animate-spin" /> Cancelling…</> : 'Yes, Cancel Subscription'}
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ color: 'var(--text-muted)', background: 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Keep My PRO Plan
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Transaction status badge ───────────────────────────────
function StatusBadge({ status }) {
  const map = {
    SUCCESS:  { label: 'Paid',     bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', border: 'rgba(34,197,94,0.3)' },
    FAILED:   { label: 'Failed',   bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
    REFUNDED: { label: 'Refunded', bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
    CREATED:  { label: 'Pending',  bg: 'rgba(107,114,128,0.12)', color: '#9ca3af', border: 'rgba(107,114,128,0.3)' },
  }
  const cfg = map[status] || map.CREATED
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-xs font-bold"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  )
}

// ── Toggle switch ──────────────────────────────────────────
function Toggle({ checked, onChange, loading }) {
  return (
    <button
      onClick={onChange}
      disabled={loading}
      className="relative inline-flex items-center rounded-full transition-colors"
      style={{
        width: 44, height: 24,
        background: checked ? '#6366f1' : 'var(--border)',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
      }}
    >
      <span
        className="inline-block rounded-full bg-white transition-transform"
        style={{
          width: 18, height: 18,
          transform: checked ? 'translateX(22px)' : 'translateX(3px)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  )
}

// ── Main SubscriptionPage ──────────────────────────────────
export default function SubscriptionPage() {
  const { accessToken } = useAuthStore()
  const {
    planName, isProUser, status, endDate, startDate, autoRenew,
    setAutoRenew, fetchSubscription, fetchLimits,
  } = useSubscriptionStore()

  const navigate     = useNavigate()
  const queryClient  = useQueryClient()

  const [cancelModal, setCancelModal]     = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [renewLoading, setRenewLoading]   = useState(false)

  // Redirect if not logged in
  if (!accessToken) return <Navigate to="/login" state={{ from: '/subscription' }} replace />

  // ── Fetch subscription (React Query) ──────────────────
  const { data: subData, isLoading: subLoading, refetch: refetchSub } = useQuery({
    queryKey: ['subscription'],
    queryFn:  () => paymentApiService.getMySubscription().then(r => r.data),
    staleTime: 60_000,
    onSuccess: (data) => {
      // Keep Zustand in sync
      const isActuallyPro = data.isProUser ?? data.proUser ?? false;
      if (isActuallyPro !== isProUser) fetchSubscription()
    },
  })

  // ── Fetch payment history ──────────────────────────────
  const { data: historyData, isLoading: histLoading } = useQuery({
    queryKey: ['paymentHistory'],
    queryFn:  () => paymentApiService.getPaymentHistory().then(r => r.data),
    staleTime: 60_000,
  })

  const sub     = subData || {}
  const history = Array.isArray(historyData) ? historyData : (historyData?.data || [])
  const daysLeft = daysRemaining(sub.endDate || endDate)
  const progress = subscriptionProgress(sub.startDate || startDate, sub.endDate || endDate)

  // ── Handle auto-renew toggle ──────────────────────────
  const handleToggleRenew = async () => {
    const newVal = !autoRenew
    setRenewLoading(true)
    try {
      await paymentApiService.toggleAutoRenew(newVal)
      setAutoRenew(newVal)
      toast.success(newVal ? 'Auto-renewal enabled' : 'Auto-renewal disabled')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update auto-renewal')
    } finally {
      setRenewLoading(false)
    }
  }

  // ── Handle cancel subscription ─────────────────────────
  const handleCancelConfirm = async () => {
    setCancelLoading(true)
    try {
      await paymentApiService.cancelSubscription()
      await fetchSubscription()
      await fetchLimits()
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
      refetchSub()
      setCancelModal(false)
      toast.success(
        `Subscription cancelled. You have PRO access until ${formatDate(sub.endDate || endDate)}`
      )
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to cancel subscription')
    } finally {
      setCancelLoading(false)
    }
  }

  const currentEndDate = sub.endDate || endDate

  return (
    <div
      className="h-full w-full py-10 px-4 sm:px-8 relative overflow-y-auto"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-72 h-72 rounded-full opacity-15"
             style={{ background: 'radial-gradient(circle, #6366f1, transparent)', filter: 'blur(60px)' }} />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Mobile Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="md:hidden flex items-center gap-2 text-sm mb-6 transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        {/* Page header */}
        <div className="mb-8">
          <h1
            className="text-3xl font-black mb-1"
            style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}
          >
            My Subscription
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Manage your plan, billing, and payment history
          </p>
        </div>

        {subLoading ? (
          <SubscriptionSkeleton />
        ) : (
          <>
            {/* ── Current Plan Card ──────────────────────── */}
            {isProUser || (sub.isProUser ?? sub.proUser) ? (
              /* PRO CARD */
              <div
                className="rounded-3xl overflow-hidden mb-8"
                style={{
                  background: 'linear-gradient(145deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
                  boxShadow: '0 0 0 1px #6366f1, 0 24px 64px rgba(99,102,241,0.25)',
                }}
              >
                <div className="p-7">
                  {/* Header row */}
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                    <div>
                      <PlanBadge plan="PRO" size="lg" />
                      <p className="text-indigo-300 text-sm mt-2">
                        Active subscription • {(sub.status || status) === 'CANCELLED' ? 'Cancelled (access until end date)' : 'Auto-renews monthly'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-black text-white">₹199</div>
                      <div className="text-xs text-indigo-400">/month</div>
                    </div>
                  </div>

                  {/* Date grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="rounded-2xl p-4" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)' }}>
                      <div className="flex items-center gap-1.5 text-indigo-300 text-xs mb-1">
                        <Calendar size={12} /> Start Date
                      </div>
                      <div className="text-white font-semibold text-sm">
                        {formatDate(sub.startDate || startDate)}
                      </div>
                    </div>
                    <div className="rounded-2xl p-4" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)' }}>
                      <div className="flex items-center gap-1.5 text-indigo-300 text-xs mb-1">
                        <Clock size={12} /> End Date
                      </div>
                      <div className="text-white font-semibold text-sm">
                        {formatDate(currentEndDate)}
                      </div>
                    </div>
                  </div>

                  {/* Days remaining + progress */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-indigo-200 text-xs">Days remaining</span>
                      <span className="text-white font-black text-2xl">{daysLeft}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.25)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${100 - progress}%`,
                          background: daysLeft < 5 ? '#ef4444' : 'linear-gradient(90deg, #6366f1, #a855f7)',
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-indigo-400">
                      <span>Active</span>
                      <span>{Math.round(progress)}% used</span>
                    </div>
                  </div>

                  {/* Auto-renew toggle */}
                  <div
                    className="flex items-center justify-between p-4 rounded-2xl mb-5"
                    style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}
                  >
                    <div>
                      <div className="text-white text-sm font-semibold flex items-center gap-2">
                        <RefreshCw size={14} /> Auto-renewal
                      </div>
                      <div className="text-indigo-300 text-xs mt-0.5">
                        {autoRenew ? 'Renews automatically each month' : 'Will not renew at period end'}
                      </div>
                    </div>
                    <Toggle
                      checked={autoRenew || sub.autoRenew}
                      onChange={handleToggleRenew}
                      loading={renewLoading}
                    />
                  </div>

                  {/* Cancel button (only if not already cancelled) */}
                  {(sub.status || status) !== 'CANCELLED' && (
                    <button
                      onClick={() => setCancelModal(true)}
                      className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
                      style={{
                        background: 'transparent',
                        border: '1.5px solid rgba(239,68,68,0.4)',
                        color: '#ef4444',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      Cancel Subscription
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* FREE CARD */
              <div
                className="rounded-3xl p-7 mb-8"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '2px solid #6b7280',
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <PlanBadge plan="FREE" size="lg" />
                    <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                      You are on the FREE plan
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>₹0</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>/month</div>
                  </div>
                </div>

                {/* Limits summary */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                  {[
                    { label: 'Rooms',    value: '5' },
                    { label: 'Members',  value: '50' },
                    { label: 'File size', value: '5 MB' },
                    { label: 'History',  value: '30 days' },
                    { label: 'Devices',  value: '1' },
                    { label: 'Reactions', value: 'No' },
                  ].map(item => (
                    <div
                      key={item.label}
                      className="rounded-xl p-3 text-center"
                      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
                    >
                      <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{item.value}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.label}</div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => navigate('/payment/checkout')}
                  className="w-full py-4 rounded-xl font-bold text-white text-sm transition-all flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none' }}
                >
                  <Zap size={16} fill="currentColor" /> Upgrade to PRO — ₹199/month
                </button>
              </div>
            )}

            {/* ── Payment History ──────────────────────────── */}
            <div>
              <h2
                className="text-xl font-bold mb-4 flex items-center gap-2"
                style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}
              >
                <TrendingUp size={18} /> Payment History
              </h2>

              <div
                className="rounded-3xl overflow-hidden"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              >
                {histLoading ? (
                  <div className="p-6 space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="shimmer h-12 rounded-xl" />
                    ))}
                  </div>
                ) : history.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>No payment history yet</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                      Your transactions will appear here after your first payment.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          {['Date', 'Plan', 'Amount', 'Status', 'Payment ID'].map(h => (
                            <th
                              key={h}
                              className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((tx, i) => (
                          <tr
                            key={tx.transactionId || i}
                            style={{ borderBottom: '1px solid var(--border)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td className="px-5 py-3.5 text-sm whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                              {formatDate(tx.createdAt)}
                            </td>
                            <td className="px-5 py-3.5">
                              <PlanBadge plan={tx.planName || 'PRO'} size="sm" />
                            </td>
                            <td className="px-5 py-3.5 text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                              ₹{tx.amount?.toFixed(2) || '—'}
                            </td>
                            <td className="px-5 py-3.5">
                              <StatusBadge status={tx.status} />
                            </td>
                            <td className="px-5 py-3.5 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                              {tx.razorpayPaymentId
                                ? `${tx.razorpayPaymentId.slice(0, 14)}…`
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Cancel Modal */}
      <CancelModal
        isOpen={cancelModal}
        endDate={currentEndDate}
        onConfirm={handleCancelConfirm}
        onClose={() => setCancelModal(false)}
        loading={cancelLoading}
      />
    </div>
  )
}
