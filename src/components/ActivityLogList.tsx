import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Search, Filter, Clock } from 'lucide-react';

export default function ActivityLogList({ role }: { role: string | null }) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');

  useEffect(() => {
    let q;
    const activitiesRef = collection(db, 'activity_logs');
    
    if (role === 'admin') {
      q = query(activitiesRef, orderBy('timestamp', 'desc'), limit(100));
    } else if (role === 'team_leader') {
      q = query(activitiesRef, orderBy('timestamp', 'desc'), limit(100));
    } else {
      q = query(activitiesRef, where('author', '==', user?.displayName || user?.email || 'Unknown'), orderBy('timestamp', 'desc'), limit(100));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [role, user]);

  const filteredLogs = logs.filter(l => 
    ((l.candidateName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (l.author || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
    (moduleFilter === 'All' || l.module === moduleFilter)
  );

  const formatTimestamp = (timestamp: any) => {
     if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : (timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp));
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });
  };

  return (
    <div className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--border-color)]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-serif text-[var(--text-primary)] italic">Activity Timeline</h3>
        <div className="flex gap-4">
            <div className="relative">
                <Search className="absolute left-3 top-2.5 text-[var(--text-muted)]" size={16} />
                <input 
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/10 transition-all font-bold"
                />
            </div>
            <select 
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-xs font-bold"
            >
              <option value="All">All Modules</option>
              <option value="Candidate Assignment">Candidate Assignment</option>
              <option value="Follow-Up">Follow-Up</option>
              <option value="Shortlist">Shortlist</option>
              <option value="CV Parsing">CV Parsing</option>
              <option value="Chats">Chats</option>
            </select>
        </div>
      </div>
      <div className="space-y-4">
        {filteredLogs.map(log => (
            <div key={log.id} className="p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] flex flex-col gap-2 text-xs transition-all hover:border-[var(--indigo-500)]">
                <div className="flex justify-between items-start text-[10px]">
                    <p className="font-bold text-[var(--text-primary)]">
                        {log.author} ({log.role}) → {log.action} → {log.candidateName} {log.affectedUser ? `→ ${log.affectedUser}` : ''}
                    </p>
                    <p className="text-[var(--text-muted)] italic flex items-center gap-1">
                        <Clock size={10} /> {formatTimestamp(log.timestamp)}
                    </p>
                </div>
                <div className="flex gap-4 text-[10px] text-[var(--text-muted)]">
                    <p><span className="font-bold text-[var(--text-primary)]">Purpose:</span> {log.purpose}</p>
                    <p><span className="font-bold text-[var(--text-primary)]">Module:</span> {log.module}</p>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}
