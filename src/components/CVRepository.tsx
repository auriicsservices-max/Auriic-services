import React, { useState, useMemo } from 'react';
import { Search, FileText, Mail, Calendar, ExternalLink, Download } from 'lucide-react';

interface CVRepositoryProps {
  candidates: any[];
  onSelect?: (candidate: any) => void;
}

export default function CVRepository({ candidates, onSelect }: CVRepositoryProps) {
  const [search, setSearch] = useState('');

  const stats = useMemo(() => {
    const total = candidates.length;
    
    // Recent CVs (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recent = candidates.filter(c => new Date(c.createdAt) > sevenDaysAgo).length;
    
    // Unique emails
    const uniqueEmails = new Set(candidates.map(c => c.email?.toLowerCase()).filter(Boolean)).size;

    return { total, recent, uniqueEmails };
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    let list = [...candidates];
    
    // Sort by latest first
    list.sort((a, b) => {
      const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
      const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    if (!search) return list;
    const lower = search.toLowerCase();
    return list.filter(c => 
      c.fullName?.toLowerCase().includes(lower) || 
      c.skills?.some((s: string) => s.toLowerCase().includes(lower))
    );
  }, [candidates, search]);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--card-bg)] p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-300">
                <FileText size={28} />
            </div>
            <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest mb-1">Total CVs</p>
                <h3 className="text-3xl font-black text-[var(--text-primary)]">{stats.total}</h3>
            </div>
        </div>
        <div className="bg-[var(--card-bg)] p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/40 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-300">
                <FileText size={28} />
            </div>
            <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest mb-1">Recent (7d)</p>
                <h3 className="text-3xl font-black text-[var(--text-primary)]">{stats.recent}</h3>
            </div>
        </div>
        <div className="bg-[var(--card-bg)] p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900/40 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-300">
                <Mail size={28} />
            </div>
            <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest mb-1">Unique Emails</p>
                <h3 className="text-3xl font-black text-[var(--text-primary)]">{stats.uniqueEmails}</h3>
            </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-[var(--card-bg)] p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by Name or Skill..."
            className="w-full bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
          />
        </div>
      </div>
      
      {/* Grid of Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCandidates.map(c => (
          <div 
            key={c.id} 
            onClick={() => onSelect?.(c)}
            className="bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-[2rem] p-6 flex items-start gap-4 shadow-sm hover:border-indigo-300 transition-all cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <FileText size={32} />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-black text-[var(--text-primary)] truncate transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{c.fullName}</h4>
              <p className="text-xs text-[var(--text-muted)] truncate mb-2">{c.fileName || 'document.pdf'}</p>
              
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1">
                <Mail size={12} className="shrink-0" />
                <span className="truncate">{c.email || 'Not Provided'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Calendar size={12} className="shrink-0" />
                <span>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
              {(c.url || c.cid) && (
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => onSelect?.(c)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 text-[10px] font-black uppercase tracking-wider hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                    >
                        <ExternalLink size={12} />
                        View
                    </button>
                    <button 
                      onClick={() => onSelect?.(c)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                    >
                        <Download size={12} />
                        Get
                    </button>
                  </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
