import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Clock, 
  UserCheck, 
  Calendar, 
  Eye, 
  Download, 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  ExternalLink,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  Sparkles
} from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getSLAInfo } from '../utils/clientActionService';

interface NotificationCenterProps {
  user: any;
  role: string;
  onSelectCandidate?: (candidateId: string) => void;
  candidates?: any[];
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  user,
  role,
  onSelectCandidate,
  candidates = []
}) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'client_action' | 'interview'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user?.uid) return;

    // Fetch notifications where recipientId is user.uid OR 'all' OR 'recruiter' OR 'admin'
    const recipientIds = [user.uid, 'all'];
    if (role === 'admin' || role === 'developer') recipientIds.push('admin');
    if (role === 'recruiter') recipientIds.push('recruiter');

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', 'in', recipientIds)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => {
        const tA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || a.dateTime || 0).getTime();
        const tB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || b.dateTime || 0).getTime();
        return tB - tA;
      });
      setNotifications(list);
      setLoading(false);
    }, (err) => {
      console.warn("NotificationCenter subscription error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.uid, role]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const unreadList = notifications.filter(n => !n.read);
      if (unreadList.length === 0) return;

      const batch = writeBatch(db);
      unreadList.forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  // Filtered Notifications
  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'unread' && n.read) return false;
    if (activeFilter === 'client_action' && n.type !== 'client_action' && !n.title?.toLowerCase().includes('client')) return false;
    if (activeFilter === 'interview' && !n.title?.toLowerCase().includes('interview')) return false;

    if (searchQuery.trim()) {
      const queryStr = searchQuery.toLowerCase();
      const matchText = (n.text || n.message || '').toLowerCase();
      const matchTitle = (n.title || '').toLowerCase();
      const matchCandidate = (n.candidateName || '').toLowerCase();
      const matchClient = (n.clientName || '').toLowerCase();
      return matchText.includes(queryStr) || matchTitle.includes(queryStr) || matchCandidate.includes(queryStr) || matchClient.includes(queryStr);
    }

    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const getActionIcon = (notification: any) => {
    const text = (notification.text || notification.message || notification.title || '').toLowerCase();
    if (text.includes('accept')) return <ThumbsUp size={16} className="text-emerald-500" />;
    if (text.includes('reject')) return <ThumbsDown size={16} className="text-rose-500" />;
    if (text.includes('download')) return <Download size={16} className="text-emerald-500" />;
    if (text.includes('viewed resume') || text.includes('view')) return <Eye size={16} className="text-sky-500" />;
    if (text.includes('feedback') || text.includes('comment') || text.includes('discussion')) return <MessageSquare size={16} className="text-amber-500" />;
    if (text.includes('interview')) return <Calendar size={16} className="text-purple-500" />;
    return <Bell size={16} className="text-[#A98B56]" />;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Banner */}
      <div className="crm-card p-6 border-l-4 border-l-[#A98B56] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg.A98B56/10 bg-[#A98B56]/10 text-[#A98B56] rounded-2xl relative">
            <Bell size={24} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce shadow-sm">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-[var(--text-primary)] flex items-center gap-2">
              Notification & SLA Activity Center
            </h1>
            <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">
              Real-time audit alerts for client actions, resume views/downloads, candidates updates, and SLA status.
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[#A98B56] text-[var(--text-primary)] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start md:self-auto shadow-xs"
          >
            <CheckCheck size={14} className="text-[#A98B56]" /> Mark All as Read ({unreadCount})
          </button>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="crm-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: `All Alerts (${notifications.length})` },
              { id: 'unread', label: `Unread (${unreadCount})` },
              { id: 'client_action', label: 'Client Actions' },
              { id: 'interview', label: 'Interviews' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === tab.id
                    ? 'crm-btn-gold shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-1.5 w-full sm:w-64">
            <Search size={14} className="text-[#A98B56]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              className="w-full bg-transparent border-none focus:outline-none text-xs font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>
        </div>
      </div>

      {/* Notification List */}
      <div className="crm-card p-6">
        {loading ? (
          <div className="py-12 text-center text-[var(--text-muted)] text-xs font-medium">Loading notifications...</div>
        ) : filteredNotifications.length > 0 ? (
          <div className="space-y-3">
            {filteredNotifications.map((n) => {
              const candId = n.relatedCandidateId || n.candidateId;
              const candObj = candId ? candidates.find(c => c.id === candId) : null;
              const sla = candObj ? getSLAInfo(candObj) : null;

              return (
                <div
                  key={n.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    !n.read 
                      ? 'bg-[#A98B56]/5 border-[#A98B56]/40 shadow-xs' 
                      : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                      !n.read ? 'bg-[#A98B56]/15 border border-[#A98B56]/30' : 'bg-[var(--card-bg)] border border-[var(--border-color)]'
                    }`}>
                      {getActionIcon(n)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs font-extrabold text-[var(--text-primary)]">
                          {n.title || 'Client Action Notification'}
                        </h3>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-[#A98B56] animate-ping" />
                        )}
                        {sla && (
                          <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black uppercase ${sla.badgeBg}`}>
                            SLA: {sla.label}
                          </span>
                        )}
                      </div>

                      <p className="text-xs leading-relaxed text-[var(--text-primary)] font-medium">
                        {n.text || n.message}
                      </p>

                      <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)] pt-0.5">
                        <span className="flex items-center gap-1 font-semibold">
                          <Clock size={11} />
                          {n.createdAt?.seconds 
                            ? new Date(n.createdAt.seconds * 1000).toLocaleString() 
                            : (n.dateTime ? new Date(n.dateTime).toLocaleString() : 'Recent')}
                        </span>
                        {n.clientName && (
                          <span>Client: <strong className="text-[var(--text-primary)]">{n.clientName}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Right Side */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border-color)] w-full sm:w-auto justify-between sm:justify-end">
                    {candId && onSelectCandidate && (
                      <button
                        onClick={() => {
                          if (!n.read) handleMarkAsRead(n.id);
                          onSelectCandidate(candId);
                        }}
                        className="px-3 py-1.5 bg-[var(--card-bg)] border border-[var(--border-color)] hover:border-[#A98B56] text-[var(--text-primary)] hover:text-[#A98B56] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <ExternalLink size={12} /> View Profile
                      </button>
                    )}

                    <div className="flex items-center gap-1">
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
                        title="Delete Alert"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center text-[var(--text-muted)] space-y-2">
            <Bell size={36} className="mx-auto opacity-30 text-[#A98B56]" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">No Notifications Found</h3>
            <p className="text-xs">You're all caught up! Updates for client actions and candidate reviews will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
