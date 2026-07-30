import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export const NotificationBadge: React.FC = () => {
  const { user, role } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;

    const recipientIds = [user.uid, 'all'];
    if (role === 'admin' || role === 'developer') recipientIds.push('admin');
    if (role === 'recruiter') recipientIds.push('recruiter');

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', 'in', recipientIds),
      where('read', '==', false)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => unsub();
  }, [user?.uid, role]);

  if (unreadCount === 0) return null;

  return (
    <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce shadow-sm z-50">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  );
};
