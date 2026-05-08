import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Check, X, Zap, Shield } from 'lucide-react'
import { useAuthStore } from '../../context/authStore'
import { useSubscriptionStore } from '../../context/subscriptionStore'
import { paymentApiService } from '../../api/paymentApi'
import { formatLimit } from '../../utils/paymentUtils'
import PlanBadge from '../../components/ui/PlanBadge'

// ── Loading skeleton ────────────────────────────────────────
function PlanSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 justify-center items-stretch w-full max-w-4xl mx-auto">
      {[0, 1].map(i => (
        <div
          key={i}
          className="flex-1 rounded-3xl p-8"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          <div className="shimmer h-6 w-20 rounded-full mb-4" />
          <div className="shimmer h-10 w-32 rounded-xl mb-2" />
          <div className="shimmer h-4 w-24 rounded mb-8" />
          {[...Array(6)].map((_, j) => (
            <div key={j} className="shimmer h-4 w-full rounded mb-3" />
          ))}
          <div className="shimmer h-12 w-full rounded-xl mt-8" />
        </div>
      ))}
    </div>
  )
}

// ── Feature row ────────────────────────────────────────────
function FeatureRow({ label, value, isPro }) {
  const display = formatLimit(value)
  const isBool  = typeof value === 'boolean'
  const isGood  = isBool ? value : (value === -1 || (typeof value === 'number' && value > 0))

  return (
    <div className="flex items-center justify-between py-2.5 border-b last:border-0"
         style={{ borderColor: 'var(--border)' }}>
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        {isBool ? (
          isGood
            ? <Check size={16} className="text-green-500" strokeWidth={2.5} />
            : <X size={16} style={{ color: '#ef4444' }} strokeWidth={2.5} />
        ) : (
          <span style={{ color: isPro && display === 'Unlimited' ? '#22c55e' : 'var(--text-primary)' }}>
            {display}
          </span>
        )}
      </span>
    </div>
  )
}

// ── Feature list definition (maps backend keys → labels) ──
const FEATURES = [
  { key: 'maxRooms',           label: 'Max Rooms' },
  { key: 'maxMembersPerRoom',  label: 'Members per Room' },
  { key: 'maxFileSizeMb',      label: 'File Upload Size (MB)' },
  { key: 'messageHistoryDays', label: 'Message History' },
  { key: 'maxDevices',         label: 'Connected Devices' },
  { key: 'readReceipts',       label: 'Read Receipts' },
  { key: 'messageReactions',   label: 'Message Reactions' },
  { key: 'customRoomAvatar',   label: 'Custom Room Avatars' },
  { key: 'priorityNotifications', label: 'Priority Notifications' },
]

// ── Static fallback plan data (matches backend DataInitializer) ──
const FALLBACK_PLANS = [
  {
    planName: 'FREE',
    price: 0,
    maxRooms: 5,
    maxMembersPerRoom: 50,
    maxFileSizeMb: 5,
    messageHistoryDays: 30,
    maxDevices: 1,
    readReceipts: false,
    messageReactions: false,
    customRoomAvatar: false,
    priorityNotifications: false,
  },
  {
    planName: 'PRO',
    price: 199,
    maxRooms: -1,
    maxMembersPerRoom: -1,
    maxFileSizeMb: 100,
    messageHistoryDays: -1,
    maxDevices: -1,
    readReceipts: true,
    messageReactions: true,
    customRoomAvatar: true,
    priorityNotifications: true,
  },
]

export default function PricingPage() {
  const navigate  = useNavigate()
  const { accessToken } = useAuthStore()
  const { isProUser, planName } = useSubscriptionStore()

  const { data: plansData, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn:  () => paymentApiService.getPlans().then(r => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  // Normalize: backend returns array OR object with data wrapper
  const rawPlans = Array.isArray(plansData)
    ? plansData
    : Array.isArray(plansData?.data)
      ? plansData.data
      : FALLBACK_PLANS

  const freePlan = rawPlans.find(p => p.planName === 'FREE') || FALLBACK_PLANS[0]
  const proPlan  = rawPlans.find(p => p.planName === 'PRO')  || FALLBACK_PLANS[1]

  const isLoggedIn = !!accessToken

  return (
    <div
      className="h-full w-full py-16 px-4 sm:px-8 relative overflow-y-auto"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-20"
             style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full opacity-15"
             style={{ background: 'radial-gradient(circle, #a855f7, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5"
            style={{
              background: 'rgba(99,102,241,0.12)',
              border: '1px solid rgba(99,102,241,0.25)',
              color: '#6366f1',
            }}
          >
            <Zap size={13} />
            Simple, transparent pricing
          </div>

          <h1
            className="text-4xl md:text-5xl font-black mb-4"
            style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}
          >
            Choose Your Plan
          </h1>
          <p className="text-lg max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Start free. Upgrade when your team is ready for more power.
          </p>
        </div>

        {/* Cards */}
        {isLoading ? (
          <PlanSkeleton />
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 justify-center items-stretch w-full max-w-4xl mx-auto">

            {/* ── FREE CARD ── */}
            <div
              className="flex-1 rounded-3xl p-8 flex flex-col transition-shadow duration-300 hover:shadow-lg"
              style={{
                background: 'var(--bg-secondary)',
                border: '2px solid #6b7280',
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <PlanBadge plan="FREE" size="md" />
                {isLoggedIn && planName === 'FREE' && !isProUser && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(107,114,128,0.15)', color: '#6b7280' }}>
                    Current Plan
                  </span>
                )}
              </div>

              <div className="mb-6">
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black" style={{ color: 'var(--text-primary)' }}>
                    ₹0
                  </span>
                  <span className="text-sm pb-1.5" style={{ color: 'var(--text-muted)' }}>/month</span>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Free forever. No credit card required.
                </p>
              </div>

              <div className="flex-1 mb-8">
                {FEATURES.map(f => (
                  <FeatureRow
                    key={f.key}
                    label={f.label}
                    value={freePlan[f.key]}
                    isPro={false}
                  />
                ))}
              </div>

              {!isLoggedIn ? (
                <button
                  onClick={() => navigate('/register')}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all"
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1.5px solid #6b7280',
                    color: '#6b7280',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                >
                  Get Started Free
                </button>
              ) : isLoggedIn && !isProUser ? (
                <button
                  disabled
                  className="w-full py-3 rounded-xl font-bold text-sm cursor-not-allowed"
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1.5px solid var(--border)',
                    color: 'var(--text-muted)',
                  }}
                >
                  ✓ Current Plan
                </button>
              ) : (
                <button
                  disabled
                  className="w-full py-3 rounded-xl font-bold text-sm cursor-not-allowed"
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1.5px solid var(--border)',
                    color: 'var(--text-muted)',
                  }}
                >
                  Downgrade Not Available
                </button>
              )}
            </div>

            {/* ── PRO CARD ── */}
            <div
              className="flex-1 rounded-3xl p-8 flex flex-col relative overflow-hidden transition-shadow duration-300"
              style={{
                background: 'linear-gradient(145deg, #1e1b4b 0%, #312e81 40%, #1e1b4b 100%)',
                border: '2px solid transparent',
                backgroundClip: 'padding-box',
                boxShadow: '0 0 0 2px #6366f1, 0 24px 64px rgba(99,102,241,0.3)',
              }}
            >
              {/* MOST POPULAR ribbon */}
              <div
                className="absolute top-5 right-0 px-4 py-1 text-xs font-bold text-white"
                style={{
                  background: 'linear-gradient(90deg, #f59e0b, #d97706)',
                  borderRadius: '4px 0 0 4px',
                  boxShadow: '-2px 2px 8px rgba(245,158,11,0.4)',
                }}
              >
                MOST POPULAR
              </div>

              {/* Glow orbs */}
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
                   style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.25), transparent 70%)', filter: 'blur(30px)' }} />
              <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full pointer-events-none"
                   style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.2), transparent 70%)', filter: 'blur(24px)' }} />

              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <PlanBadge plan="PRO" size="md" />
                  {isLoggedIn && isProUser && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                      Current Plan
                    </span>
                  )}
                </div>

                <div className="mb-6">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black text-white">₹199</span>
                    <span className="text-sm pb-1.5 text-indigo-300">/month</span>
                  </div>
                  <p className="text-xs mt-1 text-indigo-400">
                    Cancel anytime. Keep access till billing period ends.
                  </p>
                </div>

                <div className="flex-1 mb-8">
                  {FEATURES.map(f => (
                    <div key={f.key} className="flex items-center justify-between py-2.5 border-b last:border-0"
                         style={{ borderColor: 'rgba(99,102,241,0.25)' }}>
                      <span className="text-sm text-indigo-200">{f.label}</span>
                      <span className="flex items-center gap-1.5 text-sm font-semibold">
                        {typeof proPlan[f.key] === 'boolean' ? (
                          proPlan[f.key]
                            ? <Check size={16} className="text-green-400" strokeWidth={2.5} />
                            : <X size={16} className="text-red-400" strokeWidth={2.5} />
                        ) : (
                          <span style={{ color: formatLimit(proPlan[f.key]) === 'Unlimited' ? '#4ade80' : '#e0e7ff' }}>
                            {formatLimit(proPlan[f.key])}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                {isLoggedIn && isProUser ? (
                  <button
                    disabled
                    className="w-full py-3 rounded-xl font-bold text-sm cursor-not-allowed"
                    style={{
                      background: 'rgba(245,158,11,0.2)',
                      border: '1.5px solid rgba(245,158,11,0.4)',
                      color: '#f59e0b',
                    }}
                  >
                    ⭐ Current Plan
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(isLoggedIn ? '/payment/checkout' : '/login')}
                    className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                      boxShadow: '0 4px 20px rgba(99,102,241,0.45)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.filter = 'brightness(1.1)'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow = '0 8px 28px rgba(99,102,241,0.6)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.filter = 'none'
                      e.currentTarget.style.transform = 'none'
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.45)'
                    }}
                  >
                    {isLoggedIn ? '⚡ Upgrade to PRO' : 'Get Started with PRO'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bottom trust strip */}
        <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm" style={{ color: 'var(--text-muted)' }}>
          {[
            { icon: <Shield size={14} />, text: 'Secure Razorpay Payments' },
            { icon: <Check size={14} />, text: 'Cancel Anytime' },
            { icon: <Zap size={14} />, text: 'Instant Activation' },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-1.5">
              {item.icon}
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
