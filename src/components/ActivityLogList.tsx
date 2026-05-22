import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Search, Clock, User, Filter, LayoutGrid, FileText, Star, MessageSquare, Bell, Users, ChevronRight } from 'lucide-react';

export default function ActivityLogList({ role }: { role: string | null }) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('All');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');

  useEffect(() => {
    let q;
    const activitiesRef = collection(db, 'activity_logs');
    
    // Sort by timestamp DESC to get latest first
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
      (moduleFilter === 'All' || l.module === moduleFilter) &&
      (actionFilter === 'All' || l.action === actionFilter)
    );
  }, [logs, searchTerm, userFilter, moduleFilter, actionFilter]);

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : (timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp));
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });
  };
  
  const getModuleIcon = (module: string) => {
    switch(module) {
        case 'CV Parsing': return FileText;
        case 'Candidate Assignment': return Users;
        case 'Shortlist': return Star;
        case 'Follow-Up': return Clock;
        case 'Chats': return MessageSquare;
        case 'Notifications': return Bell;
        default: return LayoutGrid;
    }
  };

  const getInitials = (name?: string) => (name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Activity Timeline</h3>
        <div className="flex flex-wrap gap-2">
            <input 
              type="text"
              placeholder="Search activity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold w-40"
            />
            <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold">
              <option value="All">All Users</option>
              {[...new Set(logs.map(l => l.author).filter(Boolean))].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
        </div>
      </div>
      
      <div className="space-y-6">
        {filteredLogs.map(log => {
            const Icon = getModuleIcon(log.module);
            return (
              <div key={log.id} className="relative pl-10 pb-6 border-l border-slate-200 dark:border-slate-800 last:border-0 last:pb-0">
                  <div className="absolute left-[-12px] top-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-300">
                      <Icon size={12} />
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
                      <div className="flex justify-between items-start mb-2">
                          <p className="font-bold text-slate-900 dark:text-white text-sm">
                              {log.author} <span className="font-normal text-slate-500 text-xs">({log.role})</span>
                          </p>
                          <p className="text-slate-400 text-[10px] font-medium flex items-center gap-1">
                              <Clock size={10} /> {formatTimestamp(log.timestamp)}
                          </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 mb-2">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">{log.action}</span>
                          <ChevronRight size={14} className="text-slate-400" />
                          <span className="font-semibold">{log.candidateName}</span>
                          {log.receiver && (
                              <>
                                <ChevronRight size={14} className="text-slate-400" />
                                <span className="text-slate-500 text-xs">{log.receiver}</span>
                              </>
                          )}
                      </div>
                      <div className="text-xs text-slate-500">
                          <p><strong className="text-slate-700 dark:text-slate-400">Purpose:</strong> {log.purpose}</p>
                          <p className="mt-1"><strong className="text-slate-700 dark:text-slate-400">Module:</strong> {log.module}</p>
                      </div>
                  </div>
              </div>
            );
        })}
      </div>
    </div>
  );
}
