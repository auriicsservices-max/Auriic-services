import React, { useState, useMemo } from 'react';
import { 
  Star, 
  Search, 
  Eye, 
  Download, 
  Calendar, 
  Clock, 
  MessageSquare, 
  User, 
  FileText, 
  CheckCircle2, 
  X, 
  Sparkles, 
  History, 
  MapPin, 
  Building,
  Briefcase
} from 'lucide-react';
import LZString from 'lz-string';

import { filterClientPortalCandidates, getAvailableClients } from '../../utils/clientUtils';
import { ClientSelectorBar } from './ClientSelectorBar';

interface ClientShortlistProps {
  candidates: any[];
  user: any;
  role: string | null;
  onSelectCandidate?: (candidate: any) => void;
  selectedClientId?: string;
  onSelectClient?: (clientId: string) => void;
  fullTeamList?: any[];
}

export const ClientShortlist: React.FC<ClientShortlistProps> = ({
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

  // Filter candidates specifically assigned to client / client-wise
  const shortlistedCandidates = useMemo(() => {
    const assigned = filterClientPortalCandidates(candidates, user, role, selectedClientId);

    return assigned.filter((c: any) => {
      const status = (c.clientStatus || c.status || '').toLowerCase();
      const stage = (c.pipelineStage || '').toLowerCase();
      return status.includes('accept') || status.includes('shortlist') || stage.includes('accept') || stage.includes('shortlist');
    });
  }, [candidates, user, role, selectedClientId]);

  const [searchQuery, setSearchQuery] = useState('');

  // Filter by search query
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return shortlistedCandidates;
    const q = searchQuery.toLowerCase();
    return shortlistedCandidates.filter((c: any) => {
      const name = (c.fullName || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const skills = Array.isArray(c.skills) ? c.skills.join(' ').toLowerCase() : '';
      return name.includes(q) || email.includes(q) || skills.includes(q);
    });
  }, [shortlistedCandidates, searchQuery]);

  // Download CV helper
  const handleDownload = (candidate: any) => {
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
          totalClientCandidatesCount={shortlistedCandidates.length}
        />
      )}

      {/* Title Header */}
      <div className="crm-card p-6 border-l-4 border-l-[#A98B56] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#A98B56]/10 text-[#A98B56] rounded-2xl">
            <Star size={22} />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-[var(--text-primary)]">Shortlisted & Accepted Talent</h1>
            <p className="text-xs text-[var(--text-muted)] font-medium">Approved candidates progressing through interviews and active evaluation.</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 w-full md:w-72">
          <Search size={14} className="text-[#A98B56]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shortlisted candidate..."
            className="w-full bg-transparent border-none focus:outline-none text-xs font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Grid of Shortlisted Candidates */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((candidate) => {
            const isAccepted = (candidate.clientStatus || '').toLowerCase().includes('accept');
            return (
              <div
                key={candidate.id}
                className="crm-card p-6 space-y-4 border-t-4 border-t-[#A98B56] hover:border-[#A98B56] transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#004564] to-[#002D38] text-white font-black text-sm flex items-center justify-center shrink-0">
                        {candidate.fullName ? candidate.fullName.substring(0, 2).toUpperCase() : 'CA'}
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-[var(--text-primary)]">
                          {candidate.fullName}
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] font-medium">
                          {candidate.email || 'No email provided'}
                        </p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                      isAccepted 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                    }`}>
                      {isAccepted ? 'Accepted' : 'Shortlisted'}
                    </span>
                  </div>

                  {/* Interview Status & Recruiter Update */}
                  <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[var(--text-muted)] flex items-center gap-1">
                        <Calendar size={12} className="text-[#A98B56]" /> Interview Status:
                      </span>
                      <span className="font-extrabold text-[var(--text-primary)]">
                        {candidate.interviewStatus || candidate.pipelineStage || 'Shortlisted'}
                      </span>
                    </div>

                    {candidate.clientFeedback && (
                      <p className="text-[11px] text-[var(--text-secondary)] italic font-medium pt-1 border-t border-[var(--border-color)]">
                        Client Note: "{candidate.clientFeedback}"
                      </p>
                    )}
                  </div>

                  {/* Skills */}
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

                {/* Footer Action Bar */}
                <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleDownload(candidate)}
                    className="px-3 py-1.5 bg-[var(--bg-secondary)] hover:bg-[var(--card-hover-bg)] text-emerald-600 rounded-xl border border-[var(--border-color)] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Download size={13} /> Download
                  </button>

                  <button
                    onClick={() => onSelectCandidate && onSelectCandidate(candidate)}
                    className="px-3 py-1.5 crm-btn-gold text-xs font-black uppercase rounded-xl cursor-pointer"
                  >
                    Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="crm-card p-12 text-center text-[var(--text-muted)] font-medium space-y-3">
          <Star size={36} className="mx-auto text-[#A98B56] opacity-40" />
          <h3 className="text-lg font-serif font-bold text-[var(--text-primary)]">No Shortlisted Candidates Yet</h3>
          <p className="text-xs max-w-md mx-auto">
            Candidates you accept or shortlist during the Candidate Review process will automatically appear in this dedicated pipeline list.
          </p>
        </div>
      )}

    </div>
  );
};

export default ClientShortlist;
