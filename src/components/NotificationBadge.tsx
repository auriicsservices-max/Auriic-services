import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { Bell } from 'lucide-react';

interface Props {
  onClick?: () => void;
}

export default function NotificationBadge({ onClick }: Props) {
  const { unreadCount } = useNotifications();

  return (
    <div className="relative cursor-pointer" onClick={onClick}>
      <Bell size={20} className="text-[var(--text-muted)] hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
          {unreadCount}
        </span>
      )}
    </div>
  );
}
