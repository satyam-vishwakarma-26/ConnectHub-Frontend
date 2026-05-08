/**
 * PlanBadge — displays FREE (grey) or PRO (amber/gold) pill badge.
 * Usage: <PlanBadge plan="PRO" />
 */
export default function PlanBadge({ plan, size = 'md' }) {
  const isPro = plan === 'PRO'

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  }

  if (isPro) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full font-bold tracking-wide ${sizeClasses[size]}`}
        style={{
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          color: '#fff',
          boxShadow: '0 2px 8px rgba(245,158,11,0.35)',
        }}
      >
        ⭐ PRO
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold tracking-wide ${sizeClasses[size]}`}
      style={{
        background: 'rgba(107,114,128,0.15)',
        color: '#6b7280',
        border: '1px solid rgba(107,114,128,0.3)',
      }}
    >
      FREE
    </span>
  )
}
