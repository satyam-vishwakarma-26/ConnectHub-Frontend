import { format } from 'date-fns'

/**
 * Converts a backend value to a display string.
 * -1 → "Unlimited", number → string, boolean → "Yes"/"No"
 */
export function formatLimit(val) {
  if (val === -1 || val === '-1') return 'Unlimited'
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  return String(val)
}

/**
 * Format ISO date string as "29 Apr 2026"
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return format(new Date(dateStr), 'dd MMM yyyy')
  } catch {
    return dateStr
  }
}

/**
 * Calculate days remaining from today to endDate.
 * Returns 0 if past.
 */
export function daysRemaining(endDate) {
  if (!endDate) return 0
  const diff = new Date(endDate) - new Date()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

/**
 * Calculate progress percentage: days used / total days in period.
 */
export function subscriptionProgress(startDate, endDate) {
  if (!startDate || !endDate) return 0
  const total = new Date(endDate) - new Date(startDate)
  const used  = new Date() - new Date(startDate)
  const pct   = (used / total) * 100
  return Math.min(100, Math.max(0, pct))
}

/**
 * Load Razorpay checkout.js dynamically.
 * Returns a promise that resolves when the script is loaded.
 */
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload  = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}
