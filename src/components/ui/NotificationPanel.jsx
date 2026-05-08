import React, { useState } from 'react';
import { X, MessageSquare, AtSign, Users, Trash2, Check, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationApiService } from '../../api/notificationApi';

const NotificationPanel = ({
  notifications,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  unreadCount
}) => {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(null);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'NEW_MESSAGE':
        return <MessageSquare size={18} className="text-orange-500" />;
      case 'MENTION':
        return <AtSign size={18} className="text-orange-500" />;
      case 'ROOM_INVITE':
        return <Users size={18} className="text-green-500" />;
      default:
        return <MessageSquare size={18} className="text-gray-500" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'NEW_MESSAGE':
        return 'bg-orange-50 border-orange-200';
      case 'MENTION':
        return 'bg-orange-50 border-orange-200';
      case 'ROOM_INVITE':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getNotificationDestination = (notification) => {
    if (notification.roomId) return `/chat/${notification.roomId}`;
    if (notification.actorId) return `/chat/dm/${notification.actorId}`;
    if (notification.type === 'SYSTEM' && String(notification.message || '').trim().startsWith('📢')) {
      return '/chat/dm/1';
    }
    return null;
  };

  const handleNotificationClick = (notification) => {
    // Mark as read
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }

    const destination = getNotificationDestination(notification);
    if (destination) {
      navigate(destination);
    }

    onClose();
  };

  const handleDelete = async (e, notificationId) => {
    e.stopPropagation();
    setDeleting(notificationId);
    if (onDelete) {
      await onDelete(notificationId);
    } else {
      await notificationApiService.remove(notificationId);
    }
    setDeleting(null);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="w-[calc(100vw-2rem)] sm:w-96 rounded-lg shadow-lg border border-gray-200 dark:border-surface-800 bg-white dark:bg-surface-900 z-[90] max-h-[75vh] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-800 bg-gray-50 dark:bg-surface-850">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
          {unreadCount > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{unreadCount} unread</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X size={20} />
        </button>
      </div>

      {/* Mark all as read button */}
      {unreadCount > 0 && (
        <button
          onClick={onMarkAllAsRead}
          className="px-4 py-2 text-sm text-brand hover:text-brand-hover dark:text-brand-light dark:hover:text-white font-medium border-b border-gray-200 dark:border-surface-800 flex items-center justify-center gap-2"
        >
          <CheckCheck size={16} />
          Mark all as read
        </button>
      )}

      {/* Notifications List */}
      <div className="overflow-y-auto flex-1">
        {notifications && notifications.length > 0 ? (
          notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`p-4 border-b border-gray-100 dark:border-surface-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-surface-850 transition-colors ${
                !notification.isRead ? 'bg-orange-50 dark:bg-surface-800' : 'bg-white dark:bg-surface-900'
              }`}
            >
              <div className="flex gap-3">
                {/* Icon */}
                <div className="flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">
                        {notification.title}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>

                    {/* Unread indicator and delete button */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-brand dark:bg-brand-light rounded-full flex-shrink-0" />
                      )}
                      <button
                        onClick={(e) => handleDelete(e, notification.id)}
                        disabled={deleting === notification.id}
                        className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1"
                        title="Delete notification"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center bg-white dark:bg-surface-900">
            <MessageSquare size={32} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No notifications yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
