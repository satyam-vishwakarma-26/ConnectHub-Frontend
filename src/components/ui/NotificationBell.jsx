import React from 'react';
import { Bell } from 'lucide-react';
import { useNotificationCenter } from '../../context/NotificationCenterContext';

const NotificationBell = () => {
  const { unreadCount, open } = useNotificationCenter();

  return (
    <button
      onClick={open}
      className="relative p-2 transition-colors hover:opacity-70 rounded-xl"
      style={{ color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}
      title="Notifications"
    >
      <Bell size={18} />
      {unreadCount > 0 && (
        <span 
          className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/3 -translate-y-1/3 rounded-full shadow-sm"
          style={{ background: 'var(--danger)' }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
