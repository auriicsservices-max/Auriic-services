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
      'from-blue-500 to-indigo-600',
      'from-purple-500 to-pink-600',
      'from-emerald-500 to-teal-600',
      'from-amber-500 to-orange-600',
      'from-sky-500 to-blue-600',
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
    <div className="bg-white dark:bg-slate-950 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-6">
        <div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Activity Logs Registry</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Audit log tracking candidate updates, system notifications, and team workflow history</p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={14} />
              <input 
                type="text"
                placeholder="Search candidates or users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:text-white"
              />
          </div>
          <select 
            value={userFilter} 
            onChange={(e) => setUserFilter(e.target.value)} 
            className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <option value="All">All Senders</option>
            {[...new Set(logs.map(l => l.author).filter(Boolean))].map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select 
            value={moduleFilter} 
            onChange={(e) => setModuleFilter(e.target.value)} 
            className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <option value="All">All Modules</option>
            {[...new Set(logs.map(l => l.module).filter(Boolean))].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select 
            value={actionFilter} 
            onChange={(e) => setActionFilter(e.target.value)} 
            className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <option value="All">All Actions</option>
            {[...new Set(logs.map(l => l.action).filter(Boolean))].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
      
      {/* Timeline List */}
      {filteredLogs.length === 0 ? (
        <div className="py-20 text-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20">
          <LayoutGrid size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">No activity records match your filter parameters</p>
        </div>
      ) : (
        <div className="space-y-6 relative before:absolute before:left-[17px] before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800/80">
          {filteredLogs.map(log => {
              const Icon = getModuleIcon(log.module);
              const authorName = log.author || 'System Operator';
              const authorRole = formatRoleLabel(log.role);
              const ipAddress = log.ip || '193.186.4.142';
              const deviceName = log.device || 'Chrome (Mac OS)';
              
              return (
                <div key={log.id} className="relative pl-10 group">
                    {/* Circle dot timeline marker */}
                    <div className="absolute left-[5px] top-1.5 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-900 border-2 border-white dark:border-slate-950 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/40 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300 z-10">
                        <Icon size={11} />
                    </div>
                    
                    {/* Log card */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-850 hover:border-indigo-150 dark:hover:border-indigo-950/60 transition-all duration-300 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200/50 dark:border-slate-800/50">
                            {/* User details */}
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${getAvatarStyle(authorName)} text-white flex items-center justify-center text-xs font-black shadow-inner`}>
                                  {getInitials(authorName)}
                                </div>
                                <div>
                                  <div className="font-extrabold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                                      <span>{authorName}</span>
                                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded">
                                        {authorRole}
                                      </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5 uppercase tracking-wider">{log.module || 'General'}</p>
                                </div>
                            </div>
                            
                            {/* Status & Timestamp */}
                            <div className="flex items-center gap-3 self-start sm:self-center">
                                {getStatusBadge(log.status)}
                                <div className="text-slate-400 dark:text-slate-500 text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wide">
                                    <Clock size={11} /> {formatTimestamp(log.timestamp)}
                                </div>
                            </div>
                        </div>

                        {/* Action Content */}
                        <div className="text-sm text-slate-700 dark:text-slate-300 font-medium mb-4 flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mr-1">Action:</span>
                            <span className="font-black text-slate-900 dark:text-white bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">{log.action || 'Performed Action'}</span>
                            {log.candidateName && (
                              <>
                                <ChevronRight size={14} className="text-slate-400" />
                                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-xs uppercase tracking-wide bg-indigo-50/50 dark:bg-indigo-950/30 px-2 py-0.5 rounded border border-indigo-100/50 dark:border-indigo-900/30">Candidate: {log.candidateName}</span>
                              </>
                            )}
                        </div>

                        {/* Description & Old/New Values */}
                        <div className="bg-white dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200/40 dark:border-slate-800/60 text-xs space-y-3 shadow-inner">
                            <div>
                              <span className="font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block text-[9px] mb-1">Description</span>
                              <p className="text-slate-650 dark:text-slate-300 font-semibold">{log.purpose || 'No description provided'}</p>
                            </div>
                            
                            {log.oldValue && log.newValue && (
                              <div className="pt-2 border-t border-slate-100 dark:border-slate-900">
                                <span className="font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block text-[9px] mb-1">Value Change</span>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <span className="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 px-2.5 py-1 rounded font-mono text-[10px] border border-red-100/50 dark:border-red-900/30 line-through">
                                    {log.oldValue}
                                  </span>
                                  <ChevronRight size={12} className="text-slate-400" />
                                  <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 px-2.5 py-1 rounded font-mono text-[10px] border border-emerald-100/50 dark:border-emerald-900/30 font-bold">
                                    {log.newValue}
                                  </span>
                                </div>
                              </div>
                            )}
                        </div>

                        {/* Metadata Footer */}
                        <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-slate-800/40 flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                            <div className="flex items-center gap-1.5">
                                <Globe size={11} className="text-slate-350 dark:text-slate-650" />
                                <span>IP Address:</span>
                                <span className="font-mono text-[10px] lowercase text-slate-600 dark:text-slate-300">{ipAddress}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Monitor size={11} className="text-slate-350 dark:text-slate-650" />
                                <span>Client Device:</span>
                                <span className="text-slate-600 dark:text-slate-300">{deviceName}</span>
                            </div>
                        </div>
                    </div>
                </div>
              );
          })}
        </div>
      )}
    </div>
  );
}
