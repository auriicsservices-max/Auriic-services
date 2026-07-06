import React, { useState, useMemo } from 'react';
import { Search, FileText, Mail, Calendar, ExternalLink, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import Select from 'react-select';
import { Pagination } from './Pagination';

interface CVRepositoryProps {
  candidates: any[];
  onSelect?: (candidate: any) => void;
}

const DOMAIN_OPTIONS = [
  { value: 'IT / Software', label: 'IT / Software' },
  { value: 'AI / Machine Learning', label: 'AI / Machine Learning' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'HR', label: 'HR' },
  { value: 'Operations', label: 'Operations' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Design', label: 'Design' },
  { value: 'Project Management', label: 'Project Management' },
  { value: 'Others', label: 'Others' },
  { value: 'Unknown Domain', label: 'Unknown Domain' }
];

export default function CVRepository({ candidates, onSelect }: CVRepositoryProps) {
  const [search, setSearch] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<any[]>([]);
  const [isMultiDomain, setIsMultiDomain] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedDomains, rowsPerPage]);

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

  const customSelectStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: 'var(--bg-primary)',
      borderColor: 'var(--border-color)',
      borderRadius: '1rem',
      padding: '0.15rem',
      boxShadow: 'none',
      cursor: 'pointer',
      minHeight: '42px',
      '&:hover': {
        borderColor: 'var(--indigo-500)',
      },
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#4F46E5' : state.isFocused ? 'var(--sidebar-bg)' : 'var(--bg-primary)',
      color: state.isSelected ? 'white' : 'var(--text-primary)',
      fontSize: '0.75rem',
      cursor: 'pointer',
    }),
    menu: (provided: any) => ({ ...provided, backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', borderRadius: '1rem', overflow: 'hidden', zIndex: 10 }),
    input: (provided: any) => ({ ...provided, color: 'var(--text-primary)' }),
    placeholder: (provided: any) => ({ ...provided, color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold' }),
    singleValue: (provided: any) => ({ ...provided, color: 'var(--text-primary)', fontSize: '0.75rem', fontWeight: 'bold' }),
    multiValue: (provided: any) => ({
      ...provided,
      backgroundColor: 'var(--sidebar-bg)',
      borderRadius: '0.5rem',
      border: '1px solid var(--border-color)',
    }),
    multiValueLabel: (provided: any) => ({
      ...provided,
      color: 'var(--text-primary)',
      fontSize: '0.75rem',
    }),
    multiValueRemove: (provided: any) => ({
      ...provided,
      color: 'var(--text-muted)',
      ':hover': {
        backgroundColor: 'var(--bg-primary)',
        color: '#EF4444',
      },
    }),
  };

  const evaluateBooleanSearch = (candidate: any, searchString: string) => {
    const tokens = searchString.toLowerCase().split(/\s+/);
    const fullName = (candidate.fullName || '').toLowerCase();
    const skills = (candidate.skills || []).map((s: string) => s.toLowerCase());

    const matchesTerm = (term: string) => 
      fullName.includes(term) || skills.some((s: string) => s.includes(term));

    let i = 0;
    let result = true;
    let operator = 'AND'; // Default operator

    while (i < tokens.length) {
      let token = tokens[i];
      
      if (token === 'and' || token === 'or' || token === 'not') {
        operator = token.toUpperCase();
        i++;
        continue;
      }

      const match = matchesTerm(token);

      if (operator === 'AND') {
        result = result && match;
      } else if (operator === 'OR') {
        result = result || match;
      } else if (operator === 'NOT') {
        result = result && !match;
      }
      
      i++;
    }
    return result;
  };

  const filteredCandidates = useMemo(() => {
    let list = [...candidates];
    
    // Sort by latest first
    list.sort((a, b) => {
      const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
      const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    if (selectedDomains.length > 0) {
      list = list.filter(c => {
        const d = (c.domainFocus || c.domain || '').trim();
        const candDom = (!d) ? 'Unknown Domain' : (d === 'IT' ? 'IT / Software' : d === 'Other' ? 'Others' : d);
        return selectedDomains.some(sel => sel.value === candDom);
      });
    }

    if (!search) return list;
    return list.filter(c => evaluateBooleanSearch(c, search));
  }, [candidates, search, selectedDomains]);

  const paginatedCandidates = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredCandidates.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredCandidates, currentPage, rowsPerPage]);

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
      <div className="bg-[var(--card-bg)] p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm flex flex-col gap-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search (Name, Skill, AND, OR, NOT)..."
              className="w-full bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="flex flex-col justify-center">
            <Select 
              options={DOMAIN_OPTIONS}
              value={isMultiDomain ? selectedDomains : (selectedDomains[0] || null)}
              onChange={(selected) => {
                if (!selected) {
                  setSelectedDomains([]);
                } else if (Array.isArray(selected)) {
                  setSelectedDomains(selected);
                } else {
                  setSelectedDomains([selected]);
                }
              }}
              isMulti={isMultiDomain}
              placeholder="Filter by Domain Focus..."
              styles={customSelectStyles}
              isSearchable
            />
          </div>
        </div>

        {/* Filter Badges and Single/Multi toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[var(--border-color)]/50">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Mode:</span>
            <button
              onClick={() => {
                setIsMultiDomain(!isMultiDomain);
                setSelectedDomains([]); // Clear selections on toggle to prevent array/object conflicts
              }}
              className="px-3 py-1.5 bg-[var(--sidebar-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-xl text-xs font-bold hover:bg-[var(--bg-primary)] hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer"
            >
              {isMultiDomain ? 'Switch to Single Select' : 'Switch to Multi Select'}
            </button>
          </div>

          {selectedDomains.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Active Domains:</span>
              {selectedDomains.map((dom) => (
                <span
                  key={dom.value}
                  className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900 text-[10px] font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  {dom.label}
                  <button
                    onClick={() => setSelectedDomains(selectedDomains.filter(d => d.value !== dom.value))}
                    className="text-indigo-400 hover:text-red-500 font-extrabold focus:outline-none"
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                onClick={() => setSelectedDomains([])}
                className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Grid of Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedCandidates.map(c => {
          const d = (c.domainFocus || c.domain || '').trim();
          const normalizedDom = (!d) ? 'Unknown Domain' : (d === 'IT' ? 'IT / Software' : d === 'Other' ? 'Others' : d);

          return (
            <div 
              key={c.id} 
              onClick={() => onSelect?.(c)}
              className="bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-[2rem] p-6 flex flex-col gap-4 shadow-sm hover:border-indigo-300 transition-all cursor-pointer group justify-between"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <FileText size={32} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-[var(--text-primary)] truncate transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400 leading-tight mb-1">{c.fullName}</h4>
                  
                  <div className="mb-2">
                    <span className="inline-block px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-105/30 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-wider rounded-md">
                      {normalizedDom}
                    </span>
                  </div>
                  
                  <p className="text-xs text-[var(--text-muted)] truncate mb-2">{c.fileName || 'document.pdf'}</p>
                </div>
              </div>

              <div className="border-t border-[var(--border-color)]/50 pt-3 flex items-center justify-between mt-auto">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] min-w-0">
                    <Mail size={12} className="shrink-0 text-indigo-500" />
                    <span className="truncate">{c.email || 'Not Provided'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    <Calendar size={12} className="shrink-0 text-indigo-500" />
                    <span>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>

                <div className="flex gap-1.5 shrink-0 pl-2" onClick={(e) => e.stopPropagation()}>
                  {(c.url || c.cid || c.cvBase64) && (
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => onSelect?.(c)}
                          className="flex items-center justify-center p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                          title="View Candidate Detail"
                        >
                            <ExternalLink size={14} />
                        </button>
                        <button 
                          onClick={() => {
                            const fileName = `${c.fullName?.replace(/\s+/g, '_') || 'Candidate'}_CV`;
                            if (c.cvBase64) {
                              const link = document.createElement('a');
                              link.href = c.cvBase64;
                              link.setAttribute('download', `${fileName}.pdf`);
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            } else {
                              const finalUrl = c.url;
                              if (finalUrl) {
                                const link = document.createElement('a');
                                link.href = finalUrl;
                                  link.setAttribute('download', fileName);
                                  link.setAttribute('target', '_blank');
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                              } else {
                                onSelect?.(c);
                              }
                            }
                          }}
                          className="flex items-center justify-center p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                          title="Download CV"
                        >
                            <Download size={14} />
                        </button>
                      </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCandidates.length > 20 && (
        <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
          <Pagination
            page={currentPage}
            rowsPerPage={rowsPerPage}
            totalCount={filteredCandidates.length}
            onPageChange={() => {}}
            onRowsPerPageChange={(rows) => setRowsPerPage(rows)}
            setPage={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
