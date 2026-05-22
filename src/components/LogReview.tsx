import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTimezone } from '../contexts/TimezoneContext';
import QuotaNotice from './QuotaNotice';

export default function LogReview() {
  const [logs, setLogs] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const { role, quotaExceeded, setQuotaExceeded } = useAuth();
  const { formatDate } = useTimezone();

  useEffect(() => {
    const q = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const allLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      if (role === 'admin' || role === 'developer') {
        setLogs(allLogs);
      } else {
        setLogs(allLogs.filter((log: any) => log.userRole === role));
      }
    }, (err: any) => {
      console.error("Logs update error:", err);
      if (err.code === 'resource-exhausted') setQuotaExceeded(true);
    });
  }, [role]);

  useEffect(() => {
    if (role === 'admin' || role === 'developer') {
      const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
        const mapping: Record<string, string> = {};
        snapshot.docs.forEach(doc => {
          mapping[doc.id] = doc.data().name || doc.data().email;
        });
        setUsersMap(mapping);
      }, (err: any) => {
        console.error("Users mapping error:", err);
        if (err.code === 'resource-exhausted') setQuotaExceeded(true);
      });
      return unsub;
    }
  }, [role]);

  const formatActionMessage = (action: string, details: any) => {
    switch (action) {
      case 'Shortlist Toggle':
        return `Candidate ${details.status ? 'added to' : 'removed from'} short list`;
      case 'Follow-up Update':
        return 'Updated candidate follow-up information';
      case 'Notes Update':
        return 'Updated candidate internal notes';
      default:
        return action;
    }
  };

  return quotaExceeded ? (
    <div className="flex-1 flex items-center justify-center p-8">
      <QuotaNotice onRetry={() => window.location.reload()} />
    </div>
  ) : (
    <div className="bg-[var(--card-bg)] p-8 rounded-[2rem] border border-[var(--border-color)] shadow-sm transition-colors duration-300">
      <h2 className="text-3xl font-serif text-[var(--text-primary)] mb-8">Activity Logs</h2>
      <div className="overflow-hidden border border-[var(--border-color)] rounded-2xl">
        <table className="w-full text-left border-collapse">
            <thead className="bg-[var(--sidebar-bg)] text-[10px] uppercase font-bold text-[var(--text-muted)]">
                <tr>
                    <th className="px-6 py-4">Timestamp</th>
                    {(role === 'admin' || role === 'developer') && <th className="px-6 py-4">Team Member</th>}
                    <th className="px-6 py-4">User Action</th>
                    <th className="px-6 py-4">Role</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
                {logs.map(log => (
                    <tr key={log.id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 transition-colors">
                        <td className="px-6 py-4 text-xs font-mono text-[var(--text-muted)]">{formatDate(log.timestamp)}</td>
                        {(role === 'admin' || role === 'developer') && (
                          <td className="px-6 py-4 text-xs font-bold text-[var(--text-secondary)]">
                            {usersMap[log.userId] || 'System/AI'}
                          </td>
                        )}
                        <td className="px-6 py-4 text-sm font-bold text-[var(--text-primary)]">{formatActionMessage(log.action, log.details)}</td>
                        <td className="px-6 py-4 text-xs font-bold uppercase text-indigo-600">{log.userRole}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}
