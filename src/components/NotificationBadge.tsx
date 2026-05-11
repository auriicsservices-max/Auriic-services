import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { Bell } from 'lucide-react';

export default function NotificationBadge() {
  const { unreadCount } = useNotifications();

  return (
    <div className="relative">
      <Bell size={20} className="text-[var(--text-muted)]" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
          {unreadCount}
        </span>
      )}
    </div>
  );
}
