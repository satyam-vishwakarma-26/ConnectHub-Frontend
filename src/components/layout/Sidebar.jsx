import { NavLink, useNavigate } from 'react-router-dom'
import {
  MessageSquare, Users, Settings, LogOut, Shield,
  Moon, Sun, Bell, User
} from 'lucide-react'
import { useAuthStore } from '../../context/authStore'
import { useTheme } from '../../context/ThemeContext'
import { useNotificationCenter } from '../../context/NotificationCenterContext'
import { useSubscriptionStore } from '../../context/subscriptionStore'
import Avatar from '../ui/Avatar'
import LogoMark from '../ui/LogoMark'
import { STATUS_COLORS, STATUS_LABELS } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function Sidebar({ mobileOpen = false, onClose = () => { } }) {
  const { user, logout, updateStatus } = useAuthStore()
  const { toggle, isDark } = useTheme()
  const { open: openNotifications } = useNotificationCenter()
  const { isProUser } = useSubscriptionStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
    toast.success('Logged out')
  }

  const cycleStatus = async () => {
    const statuses = ['ONLINE', 'AWAY', 'DND', 'INVISIBLE']
    const idx = statuses.indexOf(user?.status || 'ONLINE')
    const next = statuses[(idx + 1) % statuses.length]
    const res = await updateStatus(next)
    if (res.success) toast.success(`Status: ${STATUS_LABELS[next]}`)
  }

  return (
    <aside
      className={`${mobileOpen ? 'flex h-full w-full absolute inset-0' : 'hidden md:flex md:static md:h-screen w-[272px]'} flex-col border-r shrink-0 page-shell z-[90]`}
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-4 py-5 border-b"
        style={{ borderColor: 'var(--border)' }}>
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-lg"
          style={{ background: 'rgba(86,182,198,0.08)' }}>
          <LogoMark size={22} />
        </div>
        <div className="min-w-0">
          <span className="font-display font-700 text-lg tracking-tight flex items-center gap-1"
            style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
            <span>Connect<span style={{ color: 'var(--brand)' }}>Hub</span></span>
            {isProUser && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white', letterSpacing: '0.05em' }}>PRO</span>
            )}
          </span>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Realtime workspace</p>
        </div>
      </div>

      <div className="mx-3 mt-4 mb-2 rounded-2xl px-4 py-3 surface-card">
        <p className="text-xs uppercase tracking-[0.18em] font-semibold" style={{ color: 'var(--text-muted)' }}>
          Live status
        </p>
        <div className="flex items-center justify-between mt-2">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Team online</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Fast rooms and direct messages</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--brand-light)', color: 'var(--brand)' }}>
            Ready
          </span>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex flex-col gap-1 px-3 py-4 flex-1 overflow-y-auto">
        <p className="px-3 mb-2 text-xs font-600 tracking-wider uppercase"
          style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
          Navigation
        </p>

        <NavLink to="/chat"
          onClick={onClose}
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
          <MessageSquare size={18} />
          Messages
        </NavLink>


        <NavLink to="/search"
          onClick={onClose}
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
          <Users size={18} />
          Find Users
        </NavLink>

        <button
          type="button"
          onClick={() => {
            openNotifications()
            onClose()
          }}
          className="sidebar-item w-full text-left"
        >
          <Bell size={18} />
          Notifications
        </button>

        <NavLink to="/subscription"
          onClick={onClose}
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
          <span className="text-amber-500">⭐</span>
          Subscription
        </NavLink>

        {user?.role === 'PLATFORM_ADMIN' && (
          <>
            <div className="my-2 border-t" style={{ borderColor: 'var(--border)' }} />
            <p className="px-3 mb-2 text-xs font-600 tracking-wider uppercase"
              style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
              Admin
            </p>
            <NavLink to="/admin"
              onClick={onClose}
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
              <Shield size={18} />
              Admin Panel
            </NavLink>
          </>
        )}
      </nav>

      {/* ── Bottom ── */}
      <div className="px-3 pb-4 border-t pt-3 space-y-1"
        style={{ borderColor: 'var(--border)' }}>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="sidebar-item w-full text-left"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </button>

        <NavLink to="/settings"
          onClick={onClose}
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
          <Settings size={18} />
          Settings
        </NavLink>

        <button onClick={handleLogout} className="sidebar-item w-full text-left"
          style={{ color: 'var(--danger)', background: 'linear-gradient(135deg, rgba(23,12,121,0.10), rgba(138,203,208,0.08))' }}>
          <LogOut size={18} />
          Sign Out
        </button>

        {/* User mini-card — click to open profile */}
        <button
          onClick={() => { navigate('/profile'); onClose() }}
          className="w-full flex items-center gap-3 mt-3 px-3 py-3 rounded-2xl text-left transition-all hover:opacity-80 relative overflow-hidden"
          style={{ 
            border: isProUser ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid transparent',
            background: isProUser ? 'linear-gradient(145deg, rgba(30,27,75,0.4), rgba(49,46,129,0.2))' : 'var(--bg-tertiary)',
            boxShadow: isProUser ? '0 4px 15px rgba(168, 85, 247, 0.1)' : 'none',
            cursor: 'pointer' 
          }}
          title="View my profile"
        >
          {isProUser && (
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-purple-500 rounded-full blur-2xl opacity-20 pointer-events-none" />
          )}
          <div
            className="relative shrink-0"
            onClick={(e) => { e.stopPropagation(); cycleStatus() }}
            data-tooltip={`Status: ${STATUS_LABELS[user?.status] || 'Online'}`}
          >
            <Avatar user={user} size={32} />
            <span className={`presence-ring ${STATUS_COLORS[user?.status] || 'status-online'}`}
              style={{ width: 10, height: 10 }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate"
              style={{ color: 'var(--text-primary)' }}>
              {user?.fullName || user?.username}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                @{user?.username}
              </p>
              {isProUser && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white', boxShadow: '0 2px 8px rgba(168, 85, 247, 0.3)' }}>
                  PRO
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                {STATUS_LABELS[user?.status] || 'Online'}
              </span>
            </div>
          </div>
        </button>
      </div>
    </aside>
  )
}
