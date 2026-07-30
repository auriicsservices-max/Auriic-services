import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Info, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  X,
  UserCheck,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface ClientNotificationsProps {
  user: any;
}

export const ClientNotifications: React.FC<ClientNotificationsProps> = ({ user }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', 'in', [user.uid, 'all'])
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });
      setNotifications(list);
      setLoading(false);
    }, (err) => {
      console.warn("Notifications subscription error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.uid]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const promises = notifications
        .filter(n => !n.read)
        .map(n => updateDoc(doc(db, 'notifications', n.id), { read: true }));
      await Promise.all(promises);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Header Banner */}
      <div className="crm-card p-6 border-l-4 border-l-[#A98B56] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#A98B56]/10 text-[#A98B56] rounded-2xl">
            <Bell size={22} />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-[var(--text-primary)]">Client Notification Center</h1>
            <p className="text-xs text-[var(--text-muted)] font-medium">Alerts for new candidate assignments, status changes, and interview schedules.</p>
          </div>
        </div>

        {notifications.some(n => !n.read) && (
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[#A98B56] text-[var(--text-primary)] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <CheckCheck size={14} className="text-[#A98B56]" /> Mark All as Read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="crm-card p-6 space-y-4">
        {loading ? (
          <div className="py-12 text-center text-[var(--text-muted)] text-xs font-medium">Loading notifications...</div>
        ) : notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                  !n.read 
                    ? 'bg-[#A98B56]/5 border-[#A98B56]/30 font-semibold' 
                    : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-secondary)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    !n.read ? 'bg-[#A98B56] text-white' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border-color)]'
                  }`}>
                    {n.title?.toLowerCase().includes('candidate') ? (
                      <UserCheck size={16} />
                    ) : n.title?.toLowerCase().includes('interview') ? (
                      <Calendar size={16} />
                    ) : (
                      <Bell size={16} />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-[var(--text-primary)]">{n.title || 'Notification'}</h3>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-[#A98B56] animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-[var(--text-primary)]">{n.message}</p>
                    <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                      <Clock size={10} /> {n.createdAt?.seconds ? new Date(n.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!n.read && (
                    <button
                      onClick={() => handleMarkAsRead(n.id)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[#A98B56] hover:bg-[var(--card-bg)] transition-all cursor-pointer"
                      title="Mark as Read"
                    >
                      <CheckCheck size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                    title="Delete Notification"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-[var(--text-muted)] space-y-2">
            <Bell size={32} className="mx-auto opacity-40 text-[#A98B56]" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">No Notifications Yet</h3>
            <p className="text-xs">You're all caught up! You'll receive updates when new candidates are assigned or interviewed.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientNotifications;
