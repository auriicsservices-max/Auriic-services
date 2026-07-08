import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTimezone } from '../contexts/TimezoneContext';
import { Search, Clock, User, Filter, LayoutGrid, FileText, Star, MessageSquare, Bell, Users, ChevronRight, AlertCircle, CheckCircle2, AlertTriangle, Monitor, Globe } from 'lucide-react';

export default function ActivityLogList({ role }: { role: string | null }) {
  const { user } = useAuth();
  const { formatDate } = useTimezone();
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
    if (role === 'admin' || role === 'developer' || role === 'team_leader') {
      q = query(activitiesRef, orderBy('timestamp', 'desc'), limit(100));
    } else {
      q = query(activitiesRef, where('authorUid', '==', user?.uid), limit(100));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const parsedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sortedLogs = parsedLogs.sort((a: any, b: any) => {
        const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : new Date(a.timestamp || 0).getTime();
        const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : new Date(b.timestamp || 0).getTime();
        return timeB - timeA;
      });
      setLogs(sortedLogs);
    });

    return () => unsubscribe();
  }, [role, user]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => 
      ((l.candidateName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (l.author || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.purpose || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.action || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
      (userFilter === 'All' || l.author === userFilter) &&
      (moduleFilter === 'All' || l.module === moduleFilter) &&
      (actionFilter === 'All' || l.action === actionFilter)
    );
  }, [logs, searchTerm, userFilter, moduleFilter, actionFilter]);

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : (timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp));
    return formatDate(date);
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

  const getStatusBadge = (status?: string) => {
    const s = status || 'Success';
    switch(s) {
        case 'Failed':
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200/50 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/30">
              <AlertCircle size={10} />
              Failed
            </span>
          );
        case 'Warning':
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30">
              <AlertTriangle size={10} />
              Warning
            </span>
          );
        default:
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30">
              <CheckCircle2 size={10} />
              Success
            </span>
          );
    }
  };

  const getInitials = (name?: string) => (name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  // Generate modern gradient avatar based on name
  const getAvatarStyle = (name?: string) => {
    const colors = [
      'from-blue-5472 to-blue-4564',
      'from-blue-3e51 to-blue-3649',
      'from-gold-bc9b to-gold-a98b',
      'from-gold-a98b to-gold-9b7e',
      'from-blue-5472 to-gold-bc9b',
    ];
    const index = (name || '').charCodeAt(0) % colors.length;
    return colors[index];
  };

  const formatRoleLabel = (roleStr?: string) => {
    if (!roleStr) return 'Recruiter';
    return roleStr
      .replace('_', ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="bg-[var(--card-bg)] p-8 rounded-3xl border border-[var(--border-color)] shadow-[var(--card-shadow)] transition-colors duration-300">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-6">
        <div>
          <h3 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Activity Stream</h3>
          <p className="text-sm text-[var(--text-muted)] mt-1">Real-time team workflow and system audit history</p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3.5 top-3 text-[var(--text-muted)]" size={16} />
              <input 
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm w-full sm:w-64 focus:ring-2 focus:ring-[var(--brand-color)] outline-none transition-all"
              />
          </div>
          <select 
            value={userFilter} 
            onChange={(e) => setUserFilter(e.target.value)} 
            className="px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm font-medium focus:ring-2 focus:ring-[var(--brand-color)] text-[var(--text-secondary)] cursor-pointer"
          >
            <option value="All">All Senders</option>
            {[...new Set(logs.map(l => l.author).filter(Boolean))].map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
      
      {/* Timeline List */}
      {filteredLogs.length === 0 ? (
        <div className="py-20 text-center text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--bg-secondary)]/50">
          <LayoutGrid size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">No activity records found.</p>
        </div>
      ) : (
        <div className="space-y-6 relative before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-0.5 before:bg-[var(--border-color)]">
          {filteredLogs.map(log => {
              const Icon = getModuleIcon(log.module);
              const authorName = log.author || 'System';
              
              return (
                <div key={log.id} className="relative pl-12 group">
                    {/* Circle dot timeline marker */}
                    <div className="absolute left-2 top-0 w-6 h-6 rounded-full bg-[var(--card-bg)] border-2 border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] group-hover:border-[var(--brand-color)] group-hover:text-[var(--brand-color)] transition-colors duration-300 z-10">
                        <Icon size={12} />
                    </div>
                    
                    {/* Log card */}
                    <div className="p-6 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] hover:border-[var(--accent-color)]/50 transition-all duration-300 shadow-sm">
                        <div className="flex items-center justify-between gap-4 mb-4">
                             <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${getAvatarStyle(authorName)} text-white flex items-center justify-center font-bold text-sm shadow-inner`}>
                                  {getInitials(authorName)}
                                </div>
                                <div>
                                  <div className="font-semibold text-[var(--text-primary)]">{authorName}</div>
                                  <div className="text-xs text-[var(--text-muted)]">{log.module}</div>
                                </div>
                             </div>
                             
                             <div className="text-xs text-[var(--text-muted)] font-medium">
                                 {formatTimestamp(log.timestamp)}
                             </div>
                        </div>

                        <div className="text-sm text-[var(--text-secondary)] font-medium mb-2">
                           {log.action} <span className="text-[var(--text-primary)] font-semibold">{log.candidateName}</span>
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">{log.purpose}</div>
                    </div>
                </div>
              );
          })}
        </div>
      )}
    </div>
  );
}
