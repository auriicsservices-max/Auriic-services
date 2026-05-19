import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { Clock, Check } from 'lucide-react';

export default function NotificationList({ onClose }: { onClose: () => void }) {
  const { notifications, markAsRead } = useNotifications();

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });
  };

  return (
    <div className="absolute right-0 top-12 w-96 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-xl z-50 overflow-hidden">
        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center">
            <h3 className="font-bold text-[var(--text-primary)]">Notifications</h3>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">Close</button>
        </div>
        <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && <p className="p-4 text-center text-xs text-[var(--text-muted)]">No notifications</p>}
            {suggestionsSorting(notifications).map(n => (
                <div key={n.id} className={`p-4 border-b border-[var(--border-color)] ${!n.read ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                    <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center font-bold text-xs shrink-0">{n.senderName.slice(0,2).toUpperCase()}</div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-[var(--text-primary)]">
                                {n.senderName} ({n.senderRole}) → {n.action}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)] mt-1 truncate">
                                {n.candidateName} → {n.receiverName}
                            </p>
                            <p className="text-[10px] italic text-[var(--text-muted)] mt-1">{n.purpose}</p>
                            <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                                    <Clock size={10} /> {formatTimestamp(n.createdAt)}
                                </div>
                                {!n.read && (
                                    <button onClick={() => markAsRead(n.id)} className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold">
                                        Mark as read
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  )
}

function suggestionsSorting(notifications: any[]) {
    return [...notifications].sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}
