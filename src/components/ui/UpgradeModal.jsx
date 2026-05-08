import { useNavigate } from 'react-router-dom'
import { X, Zap } from 'lucide-react'

/**
 * UpgradeModal — shown when a FREE user tries to use a PRO feature.
 *
 * Props:
 *   isOpen      — boolean
 *   onClose     — () => void
 *   featureName — string  e.g. "Message Reactions"
 */
export default function UpgradeModal({ isOpen, onClose, featureName }) {
  const navigate = useNavigate()

  if (!isOpen) return null

  const handleUpgrade = () => {
    onClose()
    navigate('/payment/checkout')
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden animate-slide-up"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        }}
      >
        {/* Gradient top strip */}
        <div
          className="h-1.5 w-full"
          style={{ background: 'linear-gradient(90deg, #6366f1, #a855f7, #f59e0b)' }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <X size={18} />
        </button>

        <div className="p-8">
          {/* Icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 mx-auto"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
          >
            <Zap size={26} className="text-white" fill="white" />
          </div>

          {/* Title */}
          <h2
            className="text-xl font-bold text-center mb-2"
            style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}
          >
            PRO Feature Required
          </h2>

          {/* Body */}
          <p className="text-center text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {featureName}
            </span>{' '}
            is available on{' '}
            <span style={{ color: '#f59e0b', fontWeight: 700 }}>ConnectHub PRO</span>{' '}
            for just ₹199/month. Unlock unlimited rooms, reactions, read receipts, and more.
          </p>

          {/* Feature highlights */}
          <div
            className="rounded-2xl p-4 mb-6 grid grid-cols-2 gap-2"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
          >
            {[
              '✓ Unlimited rooms',
              '✓ Message reactions',
              '✓ Read receipts',
              '✓ Priority notifications',
              '✓ Custom room avatars',
              '✓ Unlimited members',
            ].map(f => (
              <div key={f} className="text-xs font-medium" style={{ color: '#22c55e' }}>
                {f}
              </div>
            ))}
          </div>

          {/* Buttons */}
          <button
            onClick={handleUpgrade}
            className="w-full py-3 rounded-xl font-bold text-white text-sm mb-3 transition-all"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
            }}
            onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
            onMouseLeave={e => e.currentTarget.style.filter = 'none'}
          >
            ⭐ Upgrade Now — ₹199/month
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ color: 'var(--text-muted)', background: 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  )
}
