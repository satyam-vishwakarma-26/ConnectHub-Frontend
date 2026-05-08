import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Rocket, X } from 'lucide-react'
import { useSubscriptionStore } from '../../context/subscriptionStore'

const DISMISSED_KEY = 'connecthub_upgrade_banner_dismissed'

/**
 * UpgradeBanner — slim top banner shown to FREE users on dashboard/room pages.
 * Dismissible; state stored in localStorage.
 *
 * Usage: Place at the top of Dashboard/ChatLayout
 */
export default function UpgradeBanner() {
  const { isProUser } = useSubscriptionStore()
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === '1'
  )

  // Don't show if PRO or already dismissed
  if (isProUser || dismissed) return null

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  return (
    <div
      className="relative flex items-center justify-between gap-3 px-4 py-2.5 text-white text-sm font-medium"
      style={{
        background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #f59e0b 100%)',
        zIndex: 50,
      }}
    >
      {/* Left side */}
      <div className="flex items-center gap-2 min-w-0">
        <Rocket size={16} className="shrink-0" />
        <span className="truncate">
          🚀 Upgrade to PRO for unlimited rooms, reactions &amp; more —{' '}
          <strong>₹199/month</strong>
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => navigate('/payment/checkout')}
          className="px-3 py-1 rounded-full text-xs font-bold transition-all"
          style={{
            background: 'rgba(255,255,255,0.22)',
            border: '1px solid rgba(255,255,255,0.35)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.35)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
        >
          Upgrade Now
        </button>

        <button
          onClick={handleDismiss}
          className="p-1 rounded-full transition-colors"
          style={{ opacity: 0.8 }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}
          aria-label="Dismiss upgrade banner"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  )
}
