import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Toaster } from 'react-hot-toast'
import { useTheme } from '../../context/ThemeContext'
import NotificationPanel from '../ui/NotificationPanel'
import { NotificationCenterProvider, useNotificationCenter } from '../../context/NotificationCenterContext'
import UpgradeBanner from '../ui/UpgradeBanner'
import { Bell, MessageSquare, UserPlus, Plus, Star } from 'lucide-react'
import { useAuthStore } from '../../context/authStore'
import Avatar from '../ui/Avatar'

function NotificationOverlay() {
  const {
    isOpen,
    unreadCount,
    notifications,
    close,
    markAsRead,
    markAllAsRead,
    remove,
  } = useNotificationCenter()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[80] pointer-events-none">
      <div className="pointer-events-auto absolute inset-0 flex items-center justify-center p-4">
        <NotificationPanel
          notifications={notifications}
          onClose={close}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onDelete={remove}
          unreadCount={unreadCount}
        />
      </div>
    </div>
  )
}

export default function AppLayout() {
  const { isDark } = useTheme()

  return (
    <NotificationCenterProvider>
      <div className="flex h-full overflow-hidden flex-col md:flex-row" style={{ minHeight: '100dvh' }}>
        
        <Sidebar mobileOpen={false} onClose={() => {}} />

        <main className="flex-1 min-w-0 min-h-0 overflow-hidden flex flex-col relative"
              style={{ background: 'var(--bg-primary)' }}>
          <UpgradeBanner />
          <Outlet />
        </main>

        <NotificationOverlay />

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '0.9rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            },
          }}
        />
      </div>
    </NotificationCenterProvider>
  )
}
