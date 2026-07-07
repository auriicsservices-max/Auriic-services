import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, Timestamp, where, updateDoc, doc, writeBatch, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { auth } from '../lib/firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // Not re-throwing here to avoid breaking app functionality, 
  // keeping it for debugging as per requirements.
}

interface Notification {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  recipientId: string;
  relatedCandidateId?: string;
  createdAt: Timestamp;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, role } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !role) return;

    // Admin/TL see all, Recruiter sees assigned or all_privileged (for broadcast)
    let q;
    if (role === 'admin' || role === 'team_leader' || role === 'developer') {
      q = query(
        collection(db, 'notifications'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    } else {
      q = query(
        collection(db, 'notifications'),
        where('recipientId', 'in', [user.uid, 'all']),
        limit(50)
      );
    }

    const unsub = onSnapshot(q, (snapshot) => {
      const allNotifs: Notification[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification)).sort((a, b) => {
        const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
        const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      
      setNotifications(allNotifs);
      const unread = allNotifs.filter(n => !n.read).length;
      setUnreadCount(unread);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
    });

    return () => unsub();
  }, [user, role]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    try {
      const batch = writeBatch(db);
      unread.forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications (batch)');
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
