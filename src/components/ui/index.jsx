import { forwardRef, useState } from 'react'
import { cn } from '../../utils/helpers'
import { Loader2, X, Eye, EyeOff } from 'lucide-react'

// ── Input ─────────────────────────────────────────────────
export const Input = forwardRef(({
  label, error, icon: Icon, className = '', id, ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false)
  const inputId = id || `input-${label?.replace(/\s+/g, '-').toLowerCase()}`
  const hasValue = typeof props.value !== 'undefined' && props.value !== null && String(props.value).length > 0
  const isPassword = props.type === 'password'

  const togglePassword = () => setShowPassword(!showPassword)

  return (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label htmlFor={inputId} className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
    )}
    <div className="relative">
      <input
        ref={ref}
        id={inputId}
        className={cn('input-base', Icon && 'input-with-icon', isPassword && 'input-with-action', className)}
        style={error ? { borderColor: 'var(--danger)' } : {}}
        {...props}
        type={isPassword && showPassword ? 'text' : props.type}
      />
      {Icon && (
        <Icon
          size={16}
          className="input-leading-icon absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            color: 'var(--text-muted)',
            opacity: 0.72,
          }}
        />
      )}
      {isPassword && (
        <button
          type="button"
          onClick={togglePassword}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          style={{ color: 'var(--text-muted)' }}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
    </div>
    {error && (
      <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>
    )}
  </div>
  )
})
Input.displayName = 'Input'

// ── Textarea ──────────────────────────────────────────────
export const Textarea = forwardRef(({
  label, error, className = '', rows = 3, id, ...props
}, ref) => {
  const inputId = id || `textarea-${label?.replace(/\s+/g, '-').toLowerCase()}`
  return (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label htmlFor={inputId} className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
    )}
    <textarea
      ref={ref}
      id={inputId}
      rows={rows}
      className={cn('input-base resize-none', className)}
      style={{ ...(error ? { borderColor: 'var(--danger)' } : {}), lineHeight: 1.6 }}
      {...props}
    />
  </div>
)})
Textarea.displayName = 'Textarea'

// ── Button ────────────────────────────────────────────────
export function Button({
  children, variant = 'primary', size = 'md',
  loading = false, icon: Icon, className = '', ...props
}) {
  const base = variant === 'primary'   ? 'btn-primary'
             : variant === 'secondary' ? 'btn-secondary'
             : variant === 'danger'    ? 'btn-primary btn-danger'
             : 'btn-secondary'

  const sz = size === 'sm' ? 'px-3 py-1.5 text-sm' : size === 'lg' ? 'px-6 py-3 text-base' : ''

  return (
    <button
      className={cn(base, sz, className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : Icon ? (
        <Icon size={16} />
      ) : null}
      {children}
    </button>
  )
}

// ── Badge ─────────────────────────────────────────────────
export function Badge({ children, color = 'brand', className = '' }) {
  const colors = {
    brand:   'bg-orange-100 text-orange-700 dark:bg-brand-800 dark:text-beige',
    green:   'bg-emerald-100 text-emerald-700 dark:bg-sea-900 dark:text-beige',
    red:     'bg-red-100 text-red-700 dark:bg-brand-800 dark:text-beige',
    yellow:  'bg-amber-100 text-amber-700 dark:bg-blue-900 dark:text-beige',
    gray:    'bg-gray-100 text-gray-600 dark:bg-surface-800 dark:text-gray-400',
    purple:  'bg-rose-100 text-rose-700 dark:bg-brand-800 dark:text-beige',
  }
  return (
    <span className={cn('badge', colors[color] || colors.gray, className)}>
      {children}
    </span>
  )
}

// ── Spinner ───────────────────────────────────────────────
export function Spinner({ size = 24, className = '' }) {
  return (
    <Loader2
      size={size}
      className={cn('animate-spin', className)}
      style={{ color: 'var(--brand)' }}
    />
  )
}

// ── Modal ─────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, maxWidth = '480px' }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="glass-card rounded-2xl w-full animate-slide-up"
        style={{ maxWidth }}
      >
        <div className="flex items-center justify-between p-5 border-b"
             style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-semibold font-display"
              style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────
export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={cn('glass-card rounded-2xl', className)}
      {...props}
    >
      {children}
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────
export function Divider({ text }) {
  if (!text) return (
    <hr style={{ borderColor: 'var(--border)', margin: '8px 0' }} />
  )
  return <div className="divider my-4">{text}</div>
}
