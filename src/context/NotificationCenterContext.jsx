import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { notificationApiService } from '../api/notificationApi'

const NotificationCenterContext = createContext(null)

export function NotificationCenterProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationApiService.getUnreadCount()
      const count = response?.data?.data?.unreadCount || 0
      setUnreadCount(count)
    } catch {
      setUnreadCount(0)
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await notificationApiService.getUnread()
      setNotifications(response?.data?.data || [])
    } catch {
      setNotifications([])
    }
  }, [])

  const open = useCallback(async () => {
    await Promise.all([fetchUnreadCount(), fetchNotifications()])
    setIsOpen(true)
  }, [fetchNotifications, fetchUnreadCount])

  const close = useCallback(() => setIsOpen(false), [])

  const refresh = useCallback(async () => {
    await Promise.all([fetchUnreadCount(), fetchNotifications()])
  }, [fetchNotifications, fetchUnreadCount])

  const markAsRead = useCallback(async (notificationId) => {
    await notificationApiService.markRead(notificationId)
    setNotifications(prev => prev.map(n => (
      n.id === notificationId ? { ...n, isRead: true } : n
    )))
    fetchUnreadCount()
  }, [fetchUnreadCount])

  const markAllAsRead = useCallback(async () => {
    await notificationApiService.markAllRead()
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }, [])

  const remove = useCallback(async (notificationId) => {
    await notificationApiService.remove(notificationId)
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
    fetchUnreadCount()
  }, [fetchUnreadCount])

  const markChatAsRead = useCallback(async (roomId, actorId) => {
    const toMark = notifications.filter(n => {
      if (n.isRead) return false
      // If it's a room message notification
      if (roomId && String(n.roomId) === String(roomId)) return true
      // If it's a DM notification (no roomId, actorId matches sender)
      if (actorId && !n.roomId && String(n.actorId) === String(actorId)) return true
      return false
    })

    if (toMark.length === 0) return

    // Optimistically update local state so the bell badge drops immediately
    setNotifications(prev => prev.map(n => 
      toMark.some(t => t.id === n.id) ? { ...n, isRead: true } : n
    ))

    // Fire off API calls quietly
    await Promise.allSettled(toMark.map(n => notificationApiService.markRead(n.id)))
    fetchUnreadCount()
  }, [notifications, fetchUnreadCount])

  useEffect(() => {
    refresh()
    const interval = setInterval(fetchUnreadCount, 5000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount, refresh])

  const value = useMemo(() => ({
    isOpen,
    unreadCount,
    notifications,
    open,
    close,
    refresh,
    markAsRead,
    markAllAsRead,
    remove,
    markChatAsRead,
  }), [
    isOpen,
    unreadCount,
    notifications,
    open,
    close,
    refresh,
    markAsRead,
    markAllAsRead,
    remove,
    markChatAsRead,
  ])

  return (
    <NotificationCenterContext.Provider value={value}>
      {children}
    </NotificationCenterContext.Provider>
  )
}

export function useNotificationCenter() {
  const context = useContext(NotificationCenterContext)
  if (!context) {
    throw new Error('useNotificationCenter must be used within NotificationCenterProvider')
  }
  return context
}