import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LogReview() {
  const [logs, setLogs] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const { role } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const allLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      if (role === 'admin') {
        setLogs(allLogs);
      } else {
        setLogs(allLogs.filter((log: any) => log.userRole === role));
      }
    });
  }, [role]);

  useEffect(() => {
    if (role === 'admin') {
      const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
        const mapping: Record<string, string> = {};
        snapshot.docs.forEach(doc => {
          mapping[doc.id] = doc.data().name || doc.data().email;
        });
        setUsersMap(mapping);
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

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
      <h2 className="text-3xl font-serif text-slate-800 dark:text-slate-100 mb-8">Activity Logs</h2>
      <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded-2xl">
        <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-500">
                <tr>
                    <th className="px-6 py-4">Timestamp</th>
                    {role === 'admin' && <th className="px-6 py-4">Team Member</th>}
                    <th className="px-6 py-4">User Action</th>
                    <th className="px-6 py-4">Role</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map(log => (
                    <tr key={log.id}>
                        <td className="px-6 py-4 text-xs font-mono text-slate-500">
                          {log.timestamp?.toDate 
                            ? log.timestamp.toDate().toLocaleString() 
                            : new Date(log.timestamp).toLocaleString()}
                        </td>
                        {role === 'admin' && (
                          <td className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-400">
                            {usersMap[log.userId] || 'System/AI'}
                          </td>
                        )}
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">{formatActionMessage(log.action, log.details)}</td>
                        <td className="px-6 py-4 text-xs font-bold uppercase text-indigo-600">{log.userRole}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}
