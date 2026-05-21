import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Search, Clock, User, Filter } from 'lucide-react';

export default function ActivityLogList({ role }: { role: string | null }) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');

  useEffect(() => {
    let q;
    const activitiesRef = collection(db, 'activity_logs');
    
    // Default sorting is already createdAt/timestamp DESC in the query
    if (role === 'admin') {
      q = query(activitiesRef, orderBy('timestamp', 'desc'), limit(100));
    } else if (role === 'team_leader') {
      q = query(activitiesRef, orderBy('timestamp', 'desc'), limit(100));
    } else {
      q = query(activitiesRef, where('authorUid', '==', user?.uid), orderBy('timestamp', 'desc'), limit(100));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [role, user]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => 
      ((l.candidateName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (l.author || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.purpose || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
      (userFilter === 'All' || l.author === userFilter) &&
      (roleFilter === 'All' || l.role === roleFilter) &&
      (moduleFilter === 'All' || l.module === moduleFilter) &&
      (actionFilter === 'All' || l.action === actionFilter)
    );
  }, [logs, searchTerm, userFilter, roleFilter, moduleFilter, actionFilter]);

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : (timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp));
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });
  };
  
  const getInitials = (name?: string) => (name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--border-color)]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-serif text-[var(--text-primary)] italic">Activity Timeline</h3>
        <div className="flex flex-wrap gap-2">
            <input 
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-xs font-bold w-40"
            />
            <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-xs font-bold">
              <option value="All">All Users</option>
              {[...new Set(logs.map(l => l.author).filter(Boolean))].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-xs font-bold">
              <option value="All">All Modules</option>
              <option value="Candidate Assignment">Candidate Assignment</option>
              <option value="Follow-Up">Follow-Up</option>
              <option value="Shortlist">Shortlist</option>
              <option value="CV Parsing">CV Parsing</option>
              <option value="Chats">Chats</option>
              <option value="Notes">Notes</option>
            </select>
        </div>
      </div>
      
      <div className="space-y-4">
        {filteredLogs.map(log => (
            <div key={log.id} className="p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] flex items-start gap-4 text-xs transition-all hover:border-[var(--indigo-500)]">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
                    {getInitials(log.author)}
                </div>
                <div className="flex-grow space-y-1">
                    <div className="flex justify-between items-center">
                        <p className="font-bold text-[var(--text-primary)]">{log.author} <span className="font-normal text-[var(--text-muted)]">({log.role})</span></p>
                        <p className="text-[var(--text-muted)] italic flex items-center gap-1 text-[10px]">
                            <Clock size={10} /> {formatTimestamp(log.timestamp)}
                        </p>
                    </div>
                    <p className="text-[var(--text-primary)]"><span className="font-bold">{log.action}</span> - {log.candidateName}</p>
                    <div className="flex gap-4 text-[10px] text-[var(--text-muted)]">
                        <p><span className="font-bold text-[var(--text-secondary)]">Purpose:</span> {log.purpose}</p>
                        <p><span className="font-bold text-[var(--text-secondary)]">Module:</span> {log.module}</p>
                    </div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}
