import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Eye, 
  Download, 
  Filter, 
  X, 
  User, 
  Briefcase, 
  MapPin, 
  Info,
  Building,
  CheckCircle2
} from 'lucide-react';
import LZString from 'lz-string';
import { dispatchClientAction } from '../../utils/clientActionService';


import { filterClientPortalCandidates, getAvailableClients } from '../../utils/clientUtils';
import { ClientSelectorBar } from './ClientSelectorBar';

interface ClientCvRepositoryProps {
  candidates: any[];
  user: any;
  role: string | null;
  onSelectCandidate?: (candidate: any) => void;
  selectedClientId?: string;
  onSelectClient?: (clientId: string) => void;
  fullTeamList?: any[];
}

export const ClientCvRepository: React.FC<ClientCvRepositoryProps> = ({
  candidates,
  user,
  role,
  onSelectCandidate,
  selectedClientId = 'all',
  onSelectClient,
  fullTeamList = []
}) => {
  // Available clients for selector
  const availableClients = useMemo(() => {
    return getAvailableClients(candidates, fullTeamList);
  }, [candidates, fullTeamList]);

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

  // Filter assigned client candidates
  const clientCandidates = useMemo(() => {
    return filterClientPortalCandidates(candidates, user, role, selectedClientId);
  }, [candidates, user, role, selectedClientId]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');

  // Domains list
  const domains = useMemo(() => {
    const set = new Set<string>();
    clientCandidates.forEach(c => {
      if (c.domainFocus) set.add(c.domainFocus);
    });
    return Array.from(set);
  }, [clientCandidates]);

  // Boolean search implementation
  const filteredCandidates = useMemo(() => {
    let result = clientCandidates;

    if (selectedDomain !== 'all') {
      result = result.filter(c => c.domainFocus === selectedDomain);
    }

    if (!searchQuery.trim()) return result;

    const query = searchQuery.trim();
    // Parse Boolean operators: AND, OR, NOT
    return result.filter(candidate => {
      const text = [
        candidate.fullName || '',
        candidate.email || '',
        candidate.domainFocus || '',
        candidate.summary || '',
        candidate.rawResumeText || '',
        Array.isArray(candidate.skills) ? candidate.skills.join(' ') : ''
      ].join(' ').toLowerCase();

      // Check for AND, OR, NOT clauses
      if (query.includes(' AND ')) {
        const terms = query.split(' AND ').map(t => t.trim().toLowerCase());
        return terms.every(t => text.includes(t));
      }
      if (query.includes(' OR ')) {
        const terms = query.split(' OR ').map(t => t.trim().toLowerCase());
        return terms.some(t => text.includes(t));
      }
      if (query.includes(' NOT ')) {
        const [inc, exc] = query.split(' NOT ').map(t => t.trim().toLowerCase());
        return text.includes(inc) && !text.includes(exc);
      }

      return text.includes(query.toLowerCase());
    });
  }, [clientCandidates, searchQuery, selectedDomain]);

  // Download Resume
  const handleDownload = async (candidate: any) => {
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

      {/* Header Banner */}
      <div className="crm-card p-6 border-l-4 border-l-[#A98B56] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#A98B56]/10 text-[#A98B56] rounded-2xl">
            <FileText size={22} />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-[var(--text-primary)]">Client CV Repository</h1>
            <p className="text-xs text-[var(--text-muted)] font-medium">Read-only library of parsed candidate resumes shared with your organization.</p>
          </div>
        </div>

        <div className="px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-xl text-xs font-bold flex items-center gap-1.5">
          <Info size={14} /> Read-Only Access
        </div>
      </div>

      {/* Filter & Boolean Search Bar */}
      <div className="crm-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex items-center bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#A98B56]/50 focus-within:border-[#A98B56] transition-all w-full md:w-auto flex-1">
            <div className="pl-4 pr-2 text-[var(--text-muted)]">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Boolean Search (e.g., React AND Node NOT Python)..."
              className="w-full bg-transparent border-none focus:outline-none py-3.5 text-xs font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="px-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Domain Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <Filter size={14} className="text-[var(--text-muted)]" />
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
            >
              <option value="all">All Domains ({domains.length})</option>
              {domains.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-2 pt-1 font-medium">
          <span>Supports Boolean operators: <strong className="text-[#A98B56]">AND</strong>, <strong className="text-[#A98B56]">OR</strong>, <strong className="text-[#A98B56]">NOT</strong></span>
          <span>•</span>
          <span>Showing {filteredCandidates.length} Resumes</span>
        </div>
      </div>

      {/* CV Grid */}
      {filteredCandidates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCandidates.map((candidate) => (
            <div
              key={candidate.id}
              className="crm-card p-6 space-y-4 hover:border-[#A98B56] transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] bg-[var(--bg-secondary)] px-2.5 py-1.5 rounded-xl border border-[var(--border-color)]">
                  <span className="flex items-center gap-1 text-[var(--text-muted)] font-bold">
                    <Building size={12} className="text-[#A98B56]" /> Assigned Client:
                  </span>
                  <span className="text-[var(--text-primary)] font-extrabold truncate max-w-[145px]" title={getAssignedClientName(candidate)}>
                    {getAssignedClientName(candidate)}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#004564] to-[#002D38] text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {candidate.fullName ? candidate.fullName.substring(0, 2).toUpperCase() : 'CV'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">{candidate.fullName}</h3>
                      <p className="text-xs text-[var(--text-muted)]">{candidate.email || 'No email provided'}</p>
                    </div>
                  </div>

                  {candidate.domainFocus && (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-[#A98B56]/10 text-[#A98B56] border border-[#A98B56]/20">
                      {candidate.domainFocus}
                    </span>
                  )}
                </div>

                {candidate.summary && (
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-3 leading-relaxed bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--border-color)] font-medium">
                    {candidate.summary}
                  </p>
                )}

                {Array.isArray(candidate.skills) && candidate.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {candidate.skills.slice(0, 4).map((s: string, idx: number) => (
                      <span key={idx} className="px-2 py-0.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded text-[9px] font-bold uppercase">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[var(--border-color)]">
                <button
                  onClick={() => handleDownload(candidate)}
                  className="w-full py-2 crm-btn-gold text-xs font-black uppercase rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download size={13} /> Download Resume
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="crm-card p-12 text-center text-[var(--text-muted)] font-medium space-y-3">
          <FileText size={36} className="mx-auto text-[#A98B56] opacity-40" />
          <h3 className="text-lg font-serif font-bold text-[var(--text-primary)]">No Resumes Match Search Criteria</h3>
          <p className="text-xs max-w-md mx-auto">Try clearing your search query or choosing a different domain filter.</p>
        </div>
      )}

    </div>
  );
};

export default ClientCvRepository;
