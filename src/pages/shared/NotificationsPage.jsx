import { useEffect, useMemo, useState } from 'react'
import { Bell, CheckCheck, Trash2, MessageSquare, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { notificationApiService } from '../../api/notificationApi'
import { timeAgo } from '../../utils/helpers'

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState([])

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.isRead).length,
    [notifications]
  )

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const res = await notificationApiService.getAll()
      const data = res.data?.data || []
      setNotifications(data)
    } catch {
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const markRead = async (id) => {
    try {
      await notificationApiService.markRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    } catch {
      toast.error('Unable to mark notification as read')
    }
  }

  const markAllRead = async () => {
    if (notifications.length === 0) return
    try {
      await notificationApiService.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      toast.success('All notifications marked as read')
    } catch {
      toast.error('Unable to mark all as read')
    }
  }

  const removeOne = async (id) => {
    try {
      await notificationApiService.remove(id)
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch {
      toast.error('Unable to delete notification')
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6 max-w-4xl mx-auto pt-14 md:pt-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
            Notifications
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Stay on top of mentions, invites, and alerts
          </p>
        </div>
        <button
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className="btn-secondary flex items-center gap-2 px-4 py-2"
        >
          <CheckCheck size={16} />
          Mark all read ({unreadCount})
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin" style={{ color: 'var(--brand)' }} />
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="glass-card rounded-2xl p-10 text-center">
          <div className="mx-auto mb-3 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
            <Bell size={22} style={{ color: 'var(--text-muted)' }} />
          </div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No notifications yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            New activity will appear here.
          </p>
        </div>
      )}

      {!loading && notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map(item => (
            <article
              key={item.id}
              className="glass-card rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
              style={{ borderLeft: item.isRead ? '3px solid var(--border)' : '3px solid var(--brand)' }}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mt-0.5"
                     style={{ background: item.isRead ? 'var(--bg-tertiary)' : 'var(--brand-light)' }}>
                  <MessageSquare size={16} style={{ color: item.isRead ? 'var(--text-muted)' : 'var(--brand)' }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {item.title || 'Notification'}
                    </p>
                    <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                      {timeAgo(item.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {item.message}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {!item.isRead && (
                      <button
                        onClick={() => markRead(item.id)}
                        className="btn-primary px-3 py-1.5 text-xs"
                      >
                        Mark as read
                      </button>
                    )}
                    <button
                      onClick={() => removeOne(item.id)}
                      className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
