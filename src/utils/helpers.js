import { clsx } from 'clsx'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'

// ── Class name helper ─────────────────────────────────────
export { clsx as cn }

// ── Avatar initials ───────────────────────────────────────
export function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// ── Avatar background from username ──────────────────────
const COLORS = [
  ['#170C79','#56B6C6'], ['#8ACBD0','#170C79'],
  ['#56B6C6','#8ACBD0'], ['#170C79','#EFE3CA'],
  ['#8ACBD0','#D9C7A8'], ['#56B6C6','#170C79'],
]
export function getAvatarGradient(str = '') {
  const idx = str.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length
  const [from, to] = COLORS[idx]
  return `linear-gradient(135deg, ${from}, ${to})`
}

// ── Timestamp formatting ──────────────────────────────────
export function formatMessageTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return format(d, 'HH:mm')
}

export function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isToday(d))     return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'dd MMM')
}

export function formatFullTime(dateStr) {
  if (!dateStr) return ''
  return format(new Date(dateStr), 'dd MMM yyyy, HH:mm')
}

export function timeAgo(dateStr) {
  if (!dateStr) return ''
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
}

// ── Status helpers ────────────────────────────────────────
export const STATUS_LABELS = {
  ONLINE:    'Online',
  AWAY:      'Away',
  DND:       'Do Not Disturb',
  INVISIBLE: 'Invisible',
}

export const STATUS_COLORS = {
  ONLINE:    'status-online',
  AWAY:      'status-away',
  DND:       'status-dnd',
  INVISIBLE: 'status-invisible',
}

// ── Role badge helpers ────────────────────────────────────
export const ROLE_LABELS = {
  USER:            'User',
  ROOM_ADMIN:      'Room Admin',
  PLATFORM_ADMIN:  'Admin',
}

// ── File size formatter ───────────────────────────────────
export function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024)       return bytes + ' B'
  if (bytes < 1048576)    return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

// ── Extract error message from axios error ────────────────
export function extractError(err) {
  return err?.response?.data?.message
      || err?.response?.data?.error
      || err?.message
      || 'Something went wrong'
}
