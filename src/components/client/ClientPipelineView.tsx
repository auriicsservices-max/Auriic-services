import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  Search, 
  Eye, 
  Download, 
  User, 
  MapPin, 
  Briefcase, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  X, 
  Sparkles, 
  Info, 
  Calendar,
  Send,
  MessageSquare,
  Star,
  Trophy,
  UserX,
  Lock,
  Filter,
  Grid,
  List,
  Copy,
  Check,
  Building,
  Award,
  ChevronRight,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import LZString from 'lz-string';
import { getSLAInfo, dispatchClientAction } from '../../utils/clientActionService';
import { getStageLabel } from '../../lib/pipelineStages';
import { filterClientPortalCandidates, getAvailableClients } from '../../utils/clientUtils';
import { ClientSelectorBar } from './ClientSelectorBar';


interface ClientPipelineViewProps {
  candidates?: any[];
  user: any;
  role: string | null;
  onSelectCandidate?: (candidate: any) => void;
  selectedClientId?: string;
  onSelectClient?: (clientId: string) => void;
  fullTeamList?: any[];
}

export const ClientPipelineView: React.FC<ClientPipelineViewProps> = ({
  candidates = [],
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
  const clientCandidates = useMemo(() => {
    return filterClientPortalCandidates(candidates, user, role, selectedClientId);
  }, [candidates, user, role, selectedClientId]);

  // State controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStageTab, setSelectedStageTab] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [selectedCandidateForDetails, setSelectedCandidateForDetails] = useState<any | null>(null);

  const [copiedText, setCopiedText] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Define the 6 standardized read-only pipeline stages
  const pipelineStages = [
    {
      id: 'submitted',
      title: 'Submitted for Review',
      shortTitle: 'Submitted',
      icon: Send,
      color: 'border-blue-500/40 text-blue-600 dark:text-blue-400',
      headerBg: 'bg-blue-500/10 dark:bg-blue-500/20',
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
      dotColor: 'bg-blue-500',
      description: 'Candidates presented by recruiters awaiting client feedback'
    },
    {
      id: 'discussion',
      title: 'Under Discussion',
      shortTitle: 'Discussion',
      icon: MessageSquare,
      color: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
      headerBg: 'bg-amber-500/10 dark:bg-amber-500/20',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      dotColor: 'bg-amber-500',
      description: 'Active discussion and candidate evaluation in progress'
    },
    {
      id: 'shortlisted',
      title: 'Shortlisted for Interview',
      shortTitle: 'Shortlisted',
      icon: Star,
      color: 'border-purple-500/40 text-purple-600 dark:text-purple-400',
      headerBg: 'bg-purple-500/10 dark:bg-purple-500/20',
      badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
      dotColor: 'bg-purple-500',
      description: 'Approved candidates advancing to formal interviews'
    },
    {
      id: 'interview',
      title: 'Interview Scheduled',
      shortTitle: 'Interview',
      icon: Calendar,
      color: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
      headerBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      dotColor: 'bg-emerald-500',
      description: 'Interviews confirmed or actively taking place'
    },
    {
      id: 'accepted',
      title: 'Offer / Accepted',
      shortTitle: 'Accepted',
      icon: Trophy,
      color: 'border-teal-500/40 text-teal-600 dark:text-teal-400',
      headerBg: 'bg-teal-500/10 dark:bg-teal-500/20',
      badgeColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30',
      dotColor: 'bg-teal-500',
      description: 'Candidates with extended or accepted offers'
    },
    {
      id: 'rejected',
      title: 'Not Moving Forward',
      shortTitle: 'Passed',
      icon: UserX,
      color: 'border-rose-500/40 text-rose-600 dark:text-rose-400',
      headerBg: 'bg-rose-500/10 dark:bg-rose-500/20',
      badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
      dotColor: 'bg-rose-500',
      description: 'Candidates archived or not selected for this position'
    }
  ];

  // Group and search candidates into pipeline categories
  const categorizedCandidates = useMemo(() => {
    const search = searchQuery.toLowerCase().trim();
    
    const filtered = clientCandidates.filter(c => {
      if (!search) return true;
      const name = (c.fullName || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const skills = Array.isArray(c.skills) ? c.skills.join(' ').toLowerCase() : '';
      const domain = (c.domainFocus || c.jobTitle || c.currentTitle || '').toLowerCase();
      const location = (c.location || '').toLowerCase();
      const recruiter = (c.recruiterName || c.assignedRecruiter || '').toLowerCase();
      
      return name.includes(search) || 
             email.includes(search) || 
             skills.includes(search) || 
             domain.includes(search) ||
             location.includes(search) ||
             recruiter.includes(search);
    });

    const groups: Record<string, any[]> = {
      submitted: [],
      discussion: [],
      shortlisted: [],
      interview: [],
      accepted: [],
      rejected: []
    };

    filtered.forEach(candidate => {
      const stage = (candidate.pipelineStage || candidate.status || '').toLowerCase();
      const clientStatus = (candidate.clientStatus || '').toLowerCase();

      if (clientStatus === 'rejected' || stage.includes('reject') || stage.includes('archived')) {
        groups.rejected.push(candidate);
      } else if (clientStatus === 'accepted' || stage.includes('offer') || stage.includes('hired') || stage.includes('placed')) {
        groups.accepted.push(candidate);
      } else if (stage.includes('interview') || clientStatus === 'interview_scheduled') {
        groups.interview.push(candidate);
      } else if (clientStatus === 'shortlisted' || stage.includes('shortlist')) {
        groups.shortlisted.push(candidate);
      } else if (clientStatus === 'under_discussion' || clientStatus === 'discussion') {
        groups.discussion.push(candidate);
      } else {
        groups.submitted.push(candidate);
      }
    });

    return groups;
  }, [clientCandidates, searchQuery]);

  // Overall counts for summary pills
  const totalCount = clientCandidates.length;
  const submittedCount = categorizedCandidates.submitted.length;
  const discussionCount = categorizedCandidates.discussion.length;
  const shortlistedCount = categorizedCandidates.shortlisted.length;
  const interviewCount = categorizedCandidates.interview.length;
  const acceptedCount = categorizedCandidates.accepted.length;
  const rejectedCount = categorizedCandidates.rejected.length;

  // CV Download helper
  const handleDownloadCV = async (candidate: any) => {
    if (!candidate) return;
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



  // Helper to get formatted text for resume
  const getResumeText = (candidate: any) => {
    if (!candidate) return '';
    if (candidate.rawResumeText) return candidate.rawResumeText;
    if (candidate.compressedText) {
      return LZString.decompressFromUTF16(candidate.compressedText) || '';
    }
    if (candidate.summary) return candidate.summary;
    return 'No plain text resume content available for this candidate.';
  };

  const handleCopyResumeText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {onSelectClient && (
        <ClientSelectorBar
          availableClients={availableClients}
          selectedClientId={selectedClientId}
          onSelectClient={onSelectClient}
          role={role}
          totalClientCandidatesCount={clientCandidates.length}
        />
      )}

      {/* Top Banner Header */}
      <div className="crm-card p-6 border-l-4 border-l-[#A98B56] relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-gradient-to-br from-[#004564] to-[#002D38] text-white rounded-2xl shadow-md border border-[#A98B56]/30">
              <Layers size={26} className="text-[#A98B56]" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-[var(--text-primary)]">
                  Candidate Pipeline Tracker
                </h1>
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Lock size={12} /> Read-Only View
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] font-medium max-w-2xl leading-relaxed">
                Monitor real-time candidate progression through your recruitment funnel. Updated live as your dedicated recruitment team advances submissions.
              </p>
            </div>
          </div>

          {/* Search & View Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Search Input */}
            <div className="relative min-w-[240px] sm:w-64">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A98B56]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidate, role, skill..."
                className="w-full pl-9 pr-8 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:border-[#A98B56] rounded-xl text-xs font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:outline-none"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Layout Toggle */}
            <div className="flex items-center p-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shrink-0">
              <button
                onClick={() => setViewMode('board')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'board' 
                    ? 'bg-[#004564] text-white shadow-xs' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                title="Board View"
              >
                <Grid size={14} /> <span className="hidden sm:inline">Board</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'list' 
                    ? 'bg-[#004564] text-white shadow-xs' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                title="List View"
              >
                <List size={14} /> <span className="hidden sm:inline">List</span>
              </button>
            </div>
          </div>
        </div>

        {/* Pipeline Summary Metrics Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-5 mt-5 border-t border-[var(--border-color)]">
          <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
              <Send size={16} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Submitted</p>
              <p className="text-base font-extrabold text-[var(--text-primary)]">{submittedCount}</p>
            </div>
          </div>

          <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
              <MessageSquare size={16} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Discussion</p>
              <p className="text-base font-extrabold text-[var(--text-primary)]">{discussionCount}</p>
            </div>
          </div>

          <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
              <Star size={16} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Shortlisted</p>
              <p className="text-base font-extrabold text-[var(--text-primary)]">{shortlistedCount}</p>
            </div>
          </div>

          <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
              <Calendar size={16} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Interviews</p>
              <p className="text-base font-extrabold text-[var(--text-primary)]">{interviewCount}</p>
            </div>
          </div>

          <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] flex items-center gap-3">
            <div className="p-2 bg-teal-500/10 text-teal-500 rounded-lg">
              <Trophy size={16} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Offers/Hired</p>
              <p className="text-base font-extrabold text-[var(--text-primary)]">{acceptedCount}</p>
            </div>
          </div>

          <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 text-rose-500 rounded-lg">
              <UserX size={16} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Passed</p>
              <p className="text-base font-extrabold text-[var(--text-primary)]">{rejectedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stage Tab Navigation for Mobile & Fast Filtering */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        <button
          onClick={() => setSelectedStageTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border ${
            selectedStageTab === 'all'
              ? 'bg-[#004564] text-white border-[#004564] shadow-xs'
              : 'bg-[var(--card-bg)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[#A98B56]'
          }`}
        >
          All Stages <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">{totalCount}</span>
        </button>

        {pipelineStages.map((stage) => {
          const StageIcon = stage.icon;
          const count = (categorizedCandidates[stage.id] || []).length;
          const isSelected = selectedStageTab === stage.id;
          return (
            <button
              key={stage.id}
              onClick={() => setSelectedStageTab(stage.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer border ${
                isSelected
                  ? 'bg-[#A98B56] text-white border-[#A98B56] shadow-xs'
                  : 'bg-[var(--card-bg)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[#A98B56]'
              }`}
            >
              <StageIcon size={14} />
              <span>{stage.shortTitle}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                isSelected ? 'bg-white/25 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* BOARD VIEW (KANBAN) */}
      {viewMode === 'board' ? (
        <div className="flex items-start gap-4 overflow-x-auto pb-6 custom-scrollbar scroll-smooth min-h-[600px]">
          {pipelineStages
            .filter((col) => selectedStageTab === 'all' || selectedStageTab === col.id)
            .map((col) => {
              const StageIcon = col.icon;
              const items = categorizedCandidates[col.id] || [];

              return (
                <div
                  key={col.id}
                  className="w-80 sm:w-84 shrink-0 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl flex flex-col max-h-[780px] shadow-sm relative group/column"
                >
                  {/* Sticky Column Header */}
                  <div className="sticky top-0 z-10 p-4 bg-[var(--card-bg)] rounded-t-2xl border-b border-[var(--border-color)] space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-xl ${col.headerBg}`}>
                          <StageIcon size={16} className={col.color.split(' ')[1]} />
                        </div>
                        <h3 className="text-xs font-extrabold text-[var(--text-primary)] uppercase tracking-wider">
                          {col.title}
                        </h3>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${col.badgeColor}`}>
                        {items.length}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] line-clamp-1">{col.description}</p>
                  </div>

                  {/* Candidate Cards Scrollable Area */}
                  <div className="p-3 overflow-y-auto space-y-3 custom-scrollbar flex-1 min-h-[420px]">
                    {items.length > 0 ? (
                      items.map((candidate) => {
                        const recruiter = candidate.recruiterName || candidate.assignedRecruiter || 'Aurrum Recruiter';
                        const dateStr = candidate.clientActionTimestamp 
                          ? new Date(candidate.clientActionTimestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                          : candidate.createdAt?.seconds 
                            ? new Date(candidate.createdAt.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                            : 'Active';

                        return (
                          <div
                            key={candidate.id}
                            onClick={() => onSelectCandidate ? onSelectCandidate(candidate) : setSelectedCandidateForDetails(candidate)}
                            className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[#A98B56] hover:shadow-md transition-all cursor-pointer group space-y-3 relative"
                          >
                            {/* Candidate Identity Bar */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {candidate.photoUrl || candidate.avatar ? (
                                  <img 
                                    src={candidate.photoUrl || candidate.avatar} 
                                    alt={candidate.fullName} 
                                    className="w-9 h-9 rounded-xl object-cover shrink-0 border border-[#A98B56]/30"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#004564] to-[#002D38] text-white font-black text-xs flex items-center justify-center shrink-0 border border-[#A98B56]/40 shadow-xs">
                                    {candidate.fullName ? candidate.fullName.substring(0, 2).toUpperCase() : 'CA'}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[#A98B56] transition-colors truncate">
                                    {candidate.fullName}
                                  </h4>
                                  <p className="text-[10px] text-[var(--text-muted)] font-medium truncate">
                                    {candidate.desiredRole || candidate.domainFocus || candidate.currentTitle || 'Candidate'}
                                  </p>
                                </div>
                              </div>

                              {/* Stage Pill */}
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0 border ${col.badgeColor}`}>
                                {col.shortTitle}
                              </span>
                            </div>

                            {/* Info Badges */}
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-[var(--text-secondary)] pt-1">
                              {candidate.location && (
                                <div className="flex items-center gap-1 truncate text-[var(--text-muted)]">
                                  <MapPin size={11} className="shrink-0 text-[#A98B56]" />
                                  <span className="truncate">{candidate.location}</span>
                                </div>
                              )}
                              {(candidate.experience || candidate.totalExperience) && (
                                <div className="flex items-center gap-1 truncate text-[var(--text-muted)]">
                                  <Briefcase size={11} className="shrink-0 text-[#A98B56]" />
                                  <span className="truncate">{candidate.experience || candidate.totalExperience} Yrs Exp</span>
                                </div>
                              )}
                            </div>

                            {/* Skills Tags */}
                            {Array.isArray(candidate.skills) && candidate.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {candidate.skills.slice(0, 3).map((skill: string, idx: number) => (
                                  <span 
                                    key={idx} 
                                    className="px-2 py-0.5 bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-md text-[9px] font-bold"
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {candidate.skills.length > 3 && (
                                  <span className="px-1.5 py-0.5 bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-muted)] rounded-md text-[9px] font-bold">
                                    +{candidate.skills.length - 3}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Card SLA & Footer */}
                            {(() => {
                              const sla = getSLAInfo(candidate);
                              return (
                                <div className="flex items-center justify-between gap-1 pt-2">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-extrabold uppercase ${sla.badgeBg}`}>
                                    <Clock size={10} className={sla.indicatorColor} />
                                    <span>{sla.label}</span>
                                  </span>
                                  <span className="text-[9px] font-semibold text-[var(--text-muted)]">
                                    Assigned: {dateStr}
                                  </span>
                                </div>
                              );
                            })()}

                            {/* Card Action Buttons */}
                            <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-end text-[10px] text-[var(--text-muted)]">
                              {/* Quick Action Buttons */}
                              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => setSelectedCandidateForDetails(candidate)}
                                  className="p-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-primary)] hover:text-[#A98B56] hover:border-[#A98B56] transition-all cursor-pointer"
                                  title="View Candidate Details"
                                >
                                  <Eye size={12} />
                                </button>
                                <button
                                  onClick={() => handleDownloadCV(candidate)}
                                  className="p-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-primary)] hover:text-emerald-500 hover:border-emerald-500 transition-all cursor-pointer"
                                  title="Download Resume"
                                >
                                  <Download size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="h-48 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-[var(--border-color)] rounded-xl space-y-2">
                        <div className={`p-3 rounded-full ${col.headerBg}`}>
                          <StageIcon size={20} className={col.color.split(' ')[1]} />
                        </div>
                        <p className="text-xs font-bold text-[var(--text-primary)]">No Candidates</p>
                        <p className="text-[10px] text-[var(--text-muted)]">No candidates currently in this stage.</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        /* LIST VIEW (COMPACT TABLE/ROW VIEW) */
        <div className="crm-card p-6 space-y-4">
          <div className="overflow-x-auto">
            <table className="crm-table w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-black">
                  <th className="pb-3 px-3">Candidate</th>
                  <th className="pb-3 px-3">Pipeline Stage</th>
                  <th className="pb-3 px-3">Role / Focus</th>
                  <th className="pb-3 px-3">Location & Exp</th>
                  <th className="pb-3 px-3">Key Skills</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] text-xs">
                {pipelineStages
                  .filter((stage) => selectedStageTab === 'all' || selectedStageTab === stage.id)
                  .flatMap((stage) => (categorizedCandidates[stage.id] || []).map((candidate) => ({ candidate, stage })))
                  .map(({ candidate, stage }) => {
                    const StageIcon = stage.icon;
                    return (
                      <tr 
                        key={candidate.id}
                        className="hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer group"
                        onClick={() => onSelectCandidate ? onSelectCandidate(candidate) : setSelectedCandidateForDetails(candidate)}
                      >
                        {/* Name & Email */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#004564] to-[#002D38] text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {candidate.fullName ? candidate.fullName.substring(0, 2).toUpperCase() : 'CA'}
                            </div>
                            <div>
                              <p className="font-bold text-[var(--text-primary)] group-hover:text-[#A98B56] transition-colors">
                                {candidate.fullName}
                              </p>
                              <p className="text-[10px] text-[var(--text-muted)]">{candidate.email || 'No email'}</p>
                            </div>
                          </div>
                        </td>

                        {/* Pipeline Stage Badge */}
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${stage.badgeColor}`}>
                            <StageIcon size={12} /> {stage.title}
                          </span>
                        </td>

                        {/* Role */}
                        <td className="py-3 px-3 text-[var(--text-primary)] font-medium">
                          {candidate.desiredRole || candidate.domainFocus || candidate.jobTitle || 'General Candidate'}
                        </td>

                        {/* Location & Experience */}
                        <td className="py-3 px-3 text-[var(--text-muted)] text-[11px]">
                          <div>{candidate.location || 'Location N/A'}</div>
                          {candidate.experience && (
                            <div className="text-[10px] font-semibold text-[#A98B56]">{candidate.experience} Yrs Exp</div>
                          )}
                        </td>

                        {/* Skills */}
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {Array.isArray(candidate.skills) && candidate.skills.slice(0, 3).map((skill: string, i: number) => (
                              <span key={i} className="px-1.5 py-0.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded text-[9px] font-bold">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedCandidateForDetails(candidate)}
                              className="px-2.5 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[#A98B56] text-[var(--text-primary)] rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Eye size={12} /> Details
                            </button>

                            <button
                              onClick={() => handleDownloadCV(candidate)}
                              className="p-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-emerald-500 text-emerald-500 rounded-lg transition-all cursor-pointer"
                              title="Download CV"
                            >
                              <Download size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CANDIDATE DETAILS MODAL */}
      {selectedCandidateForDetails && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[1100] flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] max-w-2xl w-full rounded-[2rem] p-6 shadow-2xl space-y-6 relative my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#004564] to-[#002D38] text-white flex items-center justify-center font-black text-base border border-[#A98B56]/40 shadow-sm">
                  {selectedCandidateForDetails.fullName ? selectedCandidateForDetails.fullName.substring(0, 2).toUpperCase() : 'CA'}
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-[var(--text-primary)]">
                    {selectedCandidateForDetails.fullName}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] font-medium">
                    {selectedCandidateForDetails.desiredRole || selectedCandidateForDetails.domainFocus || 'Candidate Details'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCandidateForDetails(null)} 
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Pipeline Stage</span>
                <span className="text-xs font-extrabold text-[var(--text-primary)]">
                  {selectedCandidateForDetails.pipelineStage || 'Submitted'}
                </span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Client Status</span>
                <span className="text-xs font-extrabold text-[#A98B56]">
                  {selectedCandidateForDetails.clientStatus 
                    ? selectedCandidateForDetails.clientStatus 
                    : (selectedCandidateForDetails.clientId === user?.uid || selectedCandidateForDetails.assignedToClient === user?.uid || selectedCandidateForDetails.clientEmail === user?.email)
                      ? 'Pending Review' 
                      : (selectedCandidateForDetails.pipelineStage ? getStageLabel(selectedCandidateForDetails.pipelineStage) : 'Recruiter Screening')}
                </span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Location</span>
                <span className="text-xs font-extrabold text-[var(--text-primary)]">
                  {selectedCandidateForDetails.location || 'Location N/A'}
                </span>
              </div>
            </div>

            {/* Candidate Summary / Recruiter Notes */}
            {selectedCandidateForDetails.summary && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#A98B56]" /> Professional Summary
                </h4>
                <p className="text-xs leading-relaxed text-[var(--text-secondary)] bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--border-color)]">
                  {selectedCandidateForDetails.summary}
                </p>
              </div>
            )}

            {/* Skills */}
            {Array.isArray(selectedCandidateForDetails.skills) && selectedCandidateForDetails.skills.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Key Technical Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCandidateForDetails.skills.map((skill: string, idx: number) => (
                    <span key={idx} className="px-2.5 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg text-xs font-semibold">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Latest Feedback */}
            {selectedCandidateForDetails.clientFeedback && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Latest Client Feedback</h4>
                <div className="p-4 bg-[#A98B56]/10 border border-[#A98B56]/20 rounded-xl text-xs font-medium text-[var(--text-primary)] italic">
                  "{selectedCandidateForDetails.clientFeedback}"
                </div>
              </div>
            )}

            {/* Modal Action Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
              <div>
                <button
                  onClick={() => handleDownloadCV(selectedCandidateForDetails)}
                  className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl text-xs font-bold flex items-center gap-1.5 hover:border-emerald-500 transition-all cursor-pointer"
                >
                  <Download size={14} className="text-emerald-500" /> Download Original CV
                </button>
              </div>

              <button
                onClick={() => setSelectedCandidateForDetails(null)}
                className="px-5 py-2 crm-btn-gold text-xs font-black uppercase rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ClientPipelineView;
