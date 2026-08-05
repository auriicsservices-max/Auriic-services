import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Sparkles, 
  Star, 
  MapPin, 
  Grid, 
  List, 
  ChevronRight, 
  ChevronLeft, 
  Code, 
  HelpCircle, 
  X,
  ExternalLink,
  Briefcase,
  Building
} from 'lucide-react';
import Select from 'react-select';
import LZString from 'lz-string';
import { evaluateBooleanSearch } from '../../utils/booleanSearch';
import { DOMAIN_OPTIONS, getNormalizedDomain } from '../../pages/Dashboard';
import { getStageConfig } from '../../lib/pipelineStages';
import { filterClientPortalCandidates, getAvailableClients } from '../../utils/clientUtils';
import { dispatchClientAction } from '../../utils/clientActionService';
import { ClientSelectorBar } from './ClientSelectorBar';


interface ClientAssignedCandidatesProps {
  candidates: any[];
  user: any;
  role: string | null;
  fullTeamList?: any[];
  onSelectCandidate?: (candidate: any) => void;
  selectedClientId?: string;
  onSelectClient?: (clientId: string) => void;
}

export const ClientAssignedCandidates: React.FC<ClientAssignedCandidatesProps> = ({
  candidates,
  user,
  role,
  fullTeamList = [],
  onSelectCandidate,
  selectedClientId = 'all',
  onSelectClient
}) => {
  // Available clients for selector
  const availableClients = useMemo(() => {
    return getAvailableClients(candidates, fullTeamList);
  }, [candidates, fullTeamList]);

  // Filter candidates specifically assigned to client / client-wise
  const clientCandidates = useMemo(() => {
    return filterClientPortalCandidates(candidates, user, role, selectedClientId);
  }, [candidates, user, role, selectedClientId]);

  // View Mode: Table vs Grid
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected' | 'discussion' | 'shortlisted'>('all');
  const [selectedDomains, setSelectedDomains] = useState<any[]>([]);
  const [showBooleanGuide, setShowBooleanGuide] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);



  // Helper for status badge styling
  const getClientStatus = (candidate: any) => {
    const status = (candidate.clientStatus || '').toLowerCase();
    if (status.includes('accept')) {
      return { key: 'accepted', label: 'Accepted', badgeStyle: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' };
    }
    if (status.includes('reject')) {
      return { key: 'rejected', label: 'Rejected', badgeStyle: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' };
    }
    if (status.includes('discussion')) {
      return { key: 'discussion', label: 'Discussion', badgeStyle: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30' };
    }
    if (status.includes('shortlist')) {
      return { key: 'shortlisted', label: 'Shortlisted', badgeStyle: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' };
    }
    if (status.includes('interview')) {
      return { key: 'interview', label: 'Interview Scheduled', badgeStyle: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30' };
    }

    const isAssignedToClient = Boolean(
      (user?.uid && (candidate.clientId === user.uid || candidate.assignedToClient === user.uid)) ||
      (user?.email && candidate.clientEmail === user.email) ||
      candidate.clientStatus === 'pending_review'
    );

    if (isAssignedToClient) {
      return { key: 'pending', label: 'Pending Review', badgeStyle: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' };
    }

    const stageConfig = getStageConfig(candidate.pipelineStage || candidate.status);
    return { key: 'pipeline_stage', label: stageConfig.label || 'In Screening', badgeStyle: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' };
  };

  // Helper to get assigned client display name
  const getAssignedClientName = (candidate: any) => {
    if (!candidate) return 'Unassigned';
    if (candidate.clientName) return candidate.clientName;
    const clientId = candidate.clientId || candidate.assignedToClient;
    if (clientId && fullTeamList && fullTeamList.length > 0) {
      const clientUser = fullTeamList.find((u: any) => (u.uid === clientId || u.id === clientId || u.email === clientId));
      if (clientUser) {
        return clientUser.displayName || clientUser.name || clientUser.email || 'Client';
      }
    }
    if (candidate.clientEmail) return candidate.clientEmail;
    if (clientId) return `Client (${String(clientId).slice(0, 8)})`;
    return 'Unassigned Client';
  };

  // Filtered Candidates computation
  const filteredCandidates = useMemo(() => {
    return clientCandidates.filter(c => {
      // 1. Status Filter
      const statusKey = getClientStatus(c).key;
      if (statusFilter !== 'all' && statusFilter !== statusKey) return false;

      // 2. Domain Filter
      if (selectedDomains.length > 0) {
        const candidateDom = getNormalizedDomain(c);
        const match = selectedDomains.some(d => d.value === candidateDom || d.label === candidateDom);
        if (!match) return false;
      }

      // 3. Boolean Search Engine
      if (searchQuery.trim()) {
        return evaluateBooleanSearch(c, searchQuery);
      }

      return true;
    });
  }, [clientCandidates, statusFilter, selectedDomains, searchQuery]);

  // Paginated records
  const paginatedCandidates = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredCandidates.slice(start, start + rowsPerPage);
  }, [filteredCandidates, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredCandidates.length / rowsPerPage) || 1;

  // Download Resume
  const handleDownloadResume = async (candidate: any) => {
    try {
      await dispatchClientAction({ candidate, user, actionType: 'download_resume', fullTeamList });
    } catch (e) { console.warn(e); }

    const originalName = candidate.originalFileName || 'Resume';
    const finalUrl = candidate.cvUrl || candidate.url;
    const extension = (finalUrl || originalName || 'file.pdf').split('?')[0].split('.').pop()?.toLowerCase() || 'pdf';
    const fileName = `${candidate.fullName?.replace(/\s+/g, '_') || 'Candidate'}_CV.${extension}`;

    if (candidate.cvBase64) {
      const link = document.createElement('a');
      link.href = candidate.cvBase64;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (finalUrl) {
      window.open(finalUrl, '_blank');
    } else if (candidate.compressedText || candidate.rawResumeText) {
      let text = candidate.rawResumeText || '';
      if (!text && candidate.compressedText) {
        text = LZString.decompressFromUTF16(candidate.compressedText) || '';
      }
      const blob = new Blob([text || 'No resume text available'], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `${candidate.fullName?.replace(/\s+/g, '_') || 'Candidate'}_Resume.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };



  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {onSelectClient && (
        <ClientSelectorBar
          availableClients={availableClients}
          selectedClientId={selectedClientId}
          onSelectClient={onSelectClient}
          role={role}
          totalClientCandidatesCount={clientCandidates.length}
        />
      )}

      {/* Title & Stats Banner */}
      <div className="crm-card p-6 border-l-4 border-l-[#A98B56] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#A98B56]/10 text-[#A98B56] rounded-2xl">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-[var(--text-primary)]">Assigned Candidates Directory</h1>
            <p className="text-xs text-[var(--text-muted)] font-medium">Search, filter, and inspect all talent profiles assigned to your account.</p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'table' ? 'crm-btn-gold shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <List size={16} /> Table View
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'grid' ? 'crm-btn-gold shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Grid size={16} /> Card Grid
            </button>
          </div>
        </div>
      </div>

      {/* Boolean Search Engine & Filters Cockpit */}
      <div className="crm-card p-6 space-y-4">
        {/* Boolean Input */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider flex items-center gap-1.5">
            <Search size={12} className="text-[#A98B56]" /> Boolean Search Expression Engine
          </label>
          <div className="relative flex items-center bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#A98B56]/50 focus-within:border-[#A98B56] transition-all">
            <div className="pl-4 pr-2 text-[var(--text-muted)]">
              <Search size={14} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="e.g. React AND Node NOT Java..."
              className="flex-1 w-full bg-transparent border-none focus:outline-none py-3 text-xs font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="px-3 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={14} />
              </button>
            )}
            <button
              onClick={() => setShowBooleanGuide(!showBooleanGuide)}
              className="px-4 py-3 text-[10px] uppercase font-bold text-[#A98B56] hover:bg-[#A98B56]/10 flex items-center gap-1.5 transition-colors border-l border-[var(--border-color)]"
            >
              <HelpCircle size={12} /> Syntax Help
            </button>
          </div>
        </div>

        {/* Syntax Drawer */}
        {showBooleanGuide && (
          <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-secondary)] space-y-1">
            <div className="font-bold text-[var(--text-primary)] flex items-center gap-2 text-[11px]">
              <Code size={12} className="text-[#A98B56]" /> Boolean Syntax Examples
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">
              Use AND, OR, NOT and quotes for exact phrase match (e.g., <code className="bg-black/10 px-1 rounded font-mono">"Senior Engineer" AND (React OR Vue) NOT Angular</code>).
            </p>
          </div>
        )}

        {/* Status Filters & Domain Select */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-[var(--border-color)]">
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase font-black text-[var(--text-muted)] mr-1">Status:</span>
            {[
              { id: 'all', label: `All (${clientCandidates.length})` },
              { id: 'pending', label: 'Pending', color: 'text-amber-500' },
              { id: 'shortlisted', label: 'Shortlisted', color: 'text-purple-500' },
              { id: 'accepted', label: 'Accepted', color: 'text-emerald-500' },
              { id: 'discussion', label: 'Discussion', color: 'text-sky-500' },
              { id: 'rejected', label: 'Rejected', color: 'text-rose-500' },
            ].map(pill => (
              <button
                key={pill.id}
                onClick={() => { setStatusFilter(pill.id as any); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === pill.id
                    ? 'crm-btn-gold shadow-sm'
                    : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)]'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Domain Multi Select */}
          <div className="w-full sm:w-64">
            <Select
              options={DOMAIN_OPTIONS}
              isMulti
              value={selectedDomains}
              onChange={(selected) => {
                setSelectedDomains(selected ? Array.from(selected) : []);
                setCurrentPage(1);
              }}
              placeholder="Filter by Domain Focus..."
              styles={{
                control: (provided: any) => ({
                  ...provided,
                  backgroundColor: 'var(--card-bg)',
                  borderColor: 'var(--border-color)',
                  borderRadius: '0.75rem',
                  minHeight: '38px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }),
                menu: (provided: any) => ({
                  ...provided,
                  backgroundColor: 'var(--card-bg)',
                  borderColor: 'var(--border-color)',
                  zIndex: 20
                }),
                option: (provided: any, state: any) => ({
                  ...provided,
                  backgroundColor: state.isSelected ? '#004564' : state.isFocused ? 'var(--card-hover-bg)' : 'var(--card-bg)',
                  color: state.isSelected ? '#FFFFFF' : 'var(--text-primary)',
                  fontSize: '11px',
                  fontWeight: '600'
                }),
                multiValue: (provided: any) => ({
                  ...provided,
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border-color)'
                }),
                multiValueLabel: (provided: any) => ({
                  ...provided,
                  color: 'var(--text-primary)',
                  fontSize: '10px',
                  fontWeight: 'bold'
                })
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Candidate Content View */}
      {viewMode === 'table' ? (
        /* Data Table View */
        <div className="crm-card p-0 overflow-hidden border border-[var(--border-color)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[10px] uppercase font-black text-[var(--text-muted)] tracking-wider">
                <tr>
                  <th className="px-6 py-4">Candidate Identity</th>
                  <th className="px-6 py-4">Domain Focus</th>
                  <th className="px-6 py-4">Assigned Client</th>
                  <th className="px-6 py-4">Core Competencies</th>
                  <th className="px-6 py-4">Review Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs font-semibold text-[var(--text-secondary)] divide-y divide-[var(--border-color)]">
                {paginatedCandidates.length > 0 ? (
                  paginatedCandidates.map((c) => {
                    const status = getClientStatus(c);
                    return (
                      <tr 
                        key={c.id} 
                        onClick={() => onSelectCandidate && onSelectCandidate(c)}
                        className="hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#004564] to-[#002D38] text-white font-black text-xs flex items-center justify-center shrink-0">
                              {c.fullName ? c.fullName.substring(0, 2).toUpperCase() : 'CA'}
                            </div>
                            <div>
                              <div className="font-extrabold text-[var(--text-primary)] group-hover:text-[#A98B56] transition-colors">
                                {c.fullName}
                              </div>
                              <div className="text-[10px] text-[var(--text-muted)]">
                                {c.email || 'No email provided'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[#A98B56] rounded-lg text-[10px] font-bold uppercase">
                            {getNormalizedDomain(c)}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                            <Building size={13} className="text-[#A98B56]" />
                            <span className="truncate max-w-[150px]" title={getAssignedClientName(c)}>
                              {getAssignedClientName(c)}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {Array.isArray(c.skills) && c.skills.slice(0, 3).map((s: string, idx: number) => (
                              <span key={idx} className="px-2 py-0.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded text-[9px] font-bold uppercase">
                                {s}
                              </span>
                            ))}
                            {Array.isArray(c.skills) && c.skills.length > 3 && (
                              <span className="text-[9px] text-[var(--text-muted)] font-bold self-center">
                                +{c.skills.length - 3}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${status.badgeStyle}`}>
                            {status.label}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>


                          <button
                            onClick={() => handleDownloadResume(c)}
                            className="p-1.5 bg-[var(--bg-secondary)] hover:bg-[var(--card-hover-bg)] text-emerald-600 rounded-xl border border-[var(--border-color)] transition-all"
                            title="Download CV"
                          >
                            <Download size={13} />
                          </button>

                          <button
                            onClick={() => onSelectCandidate && onSelectCandidate(c)}
                            className="px-3 py-1.5 crm-btn-gold text-[10px] font-black uppercase rounded-xl"
                          >
                            Profile
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-[var(--text-muted)] font-medium italic">
                      <Users size={32} className="mx-auto mb-2 opacity-30 text-[#A98B56]" />
                      No assigned candidates match your search expression or filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Bar */}
          <div className="p-4 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-[var(--text-secondary)]">
            <div>
              Showing <span className="text-[#A98B56] font-mono">{Math.min((currentPage - 1) * rowsPerPage + 1, filteredCandidates.length)}</span>–<span className="text-[#A98B56] font-mono">{Math.min(currentPage * rowsPerPage, filteredCandidates.length)}</span> of <span className="text-[#A98B56] font-mono">{filteredCandidates.length}</span> assigned candidates
            </div>

            <div className="flex items-center gap-3">
              <select
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2.5 py-1.5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl text-xs font-bold focus:outline-none"
              >
                {[10, 20, 50, 100].map(r => (
                  <option key={r} value={r}>{r} rows per page</option>
                ))}
              </select>

              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl disabled:opacity-40 hover:bg-[var(--card-hover-bg)]"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl disabled:opacity-40 hover:bg-[var(--card-hover-bg)]"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-3 py-1.5 text-xs font-mono font-bold text-[#A98B56]">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl disabled:opacity-40 hover:bg-[var(--card-hover-bg)]"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl disabled:opacity-40 hover:bg-[var(--card-hover-bg)]"
                >
                  Last
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedCandidates.map((c) => {
            const status = getClientStatus(c);
            return (
              <div
                key={c.id}
                onClick={() => onSelectCandidate && onSelectCandidate(c)}
                className="crm-card p-6 flex flex-col justify-between space-y-4 hover:border-[#A98B56] transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#004564] to-[#002D38] text-white font-black text-sm flex items-center justify-center shrink-0">
                      {c.fullName ? c.fullName.substring(0, 2).toUpperCase() : 'CA'}
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-[var(--text-primary)] group-hover:text-[#A98B56] transition-colors">
                        {c.fullName}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] font-medium">
                        {c.email || 'No contact email'}
                      </p>
                    </div>
                  </div>

                  <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${status.badgeStyle}`}>
                    {status.label}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px] bg-[var(--bg-secondary)] px-2.5 py-1.5 rounded-xl border border-[var(--border-color)]">
                    <span className="flex items-center gap-1 text-[var(--text-muted)] font-bold">
                      <Building size={12} className="text-[#A98B56]" /> Assigned Client:
                    </span>
                    <span className="text-[var(--text-primary)] font-extrabold truncate max-w-[145px]" title={getAssignedClientName(c)}>
                      {getAssignedClientName(c)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-semibold">
                    <span>Domain:</span>
                    <span className="text-[#A98B56] font-bold">{getNormalizedDomain(c)}</span>
                  </div>

                  {c.summary && (
                    <p className="text-xs text-[var(--text-secondary)] font-medium line-clamp-2 leading-relaxed">
                      {c.summary}
                    </p>
                  )}

                  {Array.isArray(c.skills) && c.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {c.skills.slice(0, 4).map((s: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded text-[9px] font-bold uppercase">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onSelectCandidate && onSelectCandidate(c)}
                    className="w-full py-2 crm-btn-gold text-[10px] font-black uppercase rounded-xl"
                  >
                    Full Profile
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}


    </div>
  );
};

export default ClientAssignedCandidates;
