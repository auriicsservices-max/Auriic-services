import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  MessageSquare, 
  Download, 
  Eye, 
  FileText, 
  Clock, 
  Sparkles, 
  User, 
  Search, 
  Filter, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Star, 
  HelpCircle, 
  Send, 
  Calendar,
  Briefcase,
  Award,
  Building,
  MapPin,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  History,
  Info,
  Zap,
  Activity,
  ArrowRight,
  ShieldCheck,
  Code
} from 'lucide-react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { logActivity } from '../../services/activityService';
import { createNotification } from '../../services/notificationService';
import { motion, AnimatePresence } from 'motion/react';
import LZString from 'lz-string';
import { evaluateBooleanSearch } from '../../utils/booleanSearch';
import { getStageConfig } from '../../lib/pipelineStages';
import { filterClientPortalCandidates, getAvailableClients } from '../../utils/clientUtils';
import { getSLAInfo, dispatchClientAction, ClientActionType } from '../../utils/clientActionService';
import { ClientSelectorBar } from './ClientSelectorBar';

interface ClientCandidateReviewProps {
  candidates: any[];
  user: any;
  role: string | null;
  fullTeamList?: any[];
  onSelectCandidate?: (candidate: any) => void;
  selectedClientId?: string;
  onSelectClient?: (clientId: string) => void;
}

export const ClientCandidateReview: React.FC<ClientCandidateReviewProps> = ({
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

  // Filters & Search State
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'accepted' | 'rejected' | 'discussion' | 'shortlisted'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBooleanGuide, setShowBooleanGuide] = useState(false);
  
  // Expanded card IDs for interaction timeline
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});

  // Action Modals State
  const [activeModal, setActiveModal] = useState<{
    type: 'accept' | 'reject' | 'discussion' | 'shortlist';
    candidate: any;
  } | null>(null);

  const [feedbackInput, setFeedbackInput] = useState('');
  const [rejectionReasonCategory, setRejectionReasonCategory] = useState<string>('Skill Mismatch');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Resume Preview State
  const [resumeTab, setResumeTab] = useState<'text' | 'details' | 'document'>('text');

  // Trigger brief Toast notification
  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Helper for status formatting and styling
  const getClientStatus = (candidate: any): { key: string; label: string; badgeStyle: string } => {
    const status = (candidate.clientStatus || '').toLowerCase();
    
    if (status.includes('accept')) {
      return {
        key: 'accepted',
        label: 'Accepted by Client',
        badgeStyle: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
      };
    }
    if (status.includes('reject')) {
      return {
        key: 'rejected',
        label: 'Rejected by Client',
        badgeStyle: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
      };
    }
    if (status.includes('discussion')) {
      return {
        key: 'discussion',
        label: 'Under Discussion',
        badgeStyle: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30'
      };
    }
    if (status.includes('shortlist')) {
      return {
        key: 'shortlisted',
        label: 'Shortlisted for Interview',
        badgeStyle: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
      };
    }
    if (status.includes('interview')) {
      return {
        key: 'interview',
        label: 'Interview Scheduled',
        badgeStyle: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30'
      };
    }

    // Check if candidate is explicitly assigned to this client
    const isAssignedToClient = Boolean(
      (user?.uid && (candidate.clientId === user.uid || candidate.assignedToClient === user.uid)) ||
      (user?.email && candidate.clientEmail === user.email) ||
      candidate.clientStatus === 'pending_review'
    );

    if (isAssignedToClient) {
      return {
        key: 'pending',
        label: 'Pending Client Review',
        badgeStyle: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
      };
    }

    // Candidate not assigned to client -> display actual pipeline stage or status
    const stageConfig = getStageConfig(candidate.pipelineStage || candidate.status);
    return {
      key: 'pipeline_stage',
      label: stageConfig.label || 'In Screening',
      badgeStyle: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
    };
  };

  // Filter candidates based on status tab and Boolean search query
  const filteredCandidates = useMemo(() => {
    return clientCandidates.filter(c => {
      const statusInfo = getClientStatus(c);
      if (activeTab === 'pending' && statusInfo.key !== 'pending') return false;
      if (activeTab === 'accepted' && statusInfo.key !== 'accepted') return false;
      if (activeTab === 'rejected' && statusInfo.key !== 'rejected') return false;
      if (activeTab === 'discussion' && statusInfo.key !== 'discussion') return false;
      if (activeTab === 'shortlisted' && statusInfo.key !== 'shortlisted') return false;

      if (searchQuery.trim()) {
        return evaluateBooleanSearch(c, searchQuery);
      }
      return true;
    });
  }, [clientCandidates, activeTab, searchQuery]);

  // Metrics Counters
  const metrics = useMemo(() => {
    let pending = 0;
    let accepted = 0;
    let rejected = 0;
    let discussion = 0;
    let shortlisted = 0;

    clientCandidates.forEach(c => {
      const info = getClientStatus(c);
      if (info.key === 'accepted') accepted++;
      else if (info.key === 'rejected') rejected++;
      else if (info.key === 'discussion') discussion++;
      else if (info.key === 'shortlisted') shortlisted++;
      else pending++;
    });

    return {
      total: clientCandidates.length,
      pending,
      accepted,
      rejected,
      discussion,
      shortlisted
    };
  }, [clientCandidates]);

  // Toggle card history expansion
  const toggleCardExpanded = (id: string) => {
    setExpandedCardIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Resume Download Handler
  const handleDownloadResume = async (candidate: any) => {
    // Track client action: download resume
    try {
      await dispatchClientAction({
        candidate,
        user,
        actionType: 'download_resume',
        fullTeamList
      });
    } catch (e) {
      console.warn('Failed to dispatch download action:', e);
    }

    const originalName = candidate.originalFileName || 'Resume';
    const finalUrl = candidate.cvUrl || candidate.url;
    const extension = (finalUrl || originalName || 'file.pdf').split('?')[0].split('.').pop()?.toLowerCase() || 'pdf';
    const fileName = `${candidate.fullName?.replace(/\s+/g, '_') || 'Candidate'}_CV.${extension}`;

    if (candidate.cvBase64) {
      try {
        const link = document.createElement('a');
        link.href = candidate.cvBase64;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      } catch (err) {
        console.error('Base64 download failed:', err);
      }
    }

    if (finalUrl) {
      try {
        const link = document.createElement('a');
        link.href = finalUrl;
        link.setAttribute('download', fileName);
        link.setAttribute('target', '_blank');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        window.open(finalUrl, '_blank');
      }
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
    } else {
      showToast('error', 'No downloadable CV document or text file found for this candidate.');
    }
  };

  // Submit Client Action (Accept, Reject, Under Discussion, Shortlist)
  const handleSubmitAction = async () => {
    if (!activeModal || !activeModal.candidate) return;

    const { candidate, type } = activeModal;
    setIsSubmitting(true);

    try {
      const actionTypeMap: Record<string, ClientActionType> = {
        accept: 'accept',
        reject: 'reject',
        discussion: 'add_feedback',
        shortlist: 'request_interview'
      };

      const actionType = actionTypeMap[type] || 'status_change';

      await dispatchClientAction({
        candidate,
        user,
        actionType,
        comments: feedbackInput.trim(),
        reasonCategory: type === 'reject' ? rejectionReasonCategory : '',
        fullTeamList
      });

      showToast('success', `Candidate action "${type.toUpperCase()}" submitted successfully!`);
      setActiveModal(null);
      setFeedbackInput('');
    } catch (err: any) {
      console.error('Error recording client candidate action:', err);
      showToast('error', `Failed to update candidate status: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date string
  const formatDate = (dateVal: any) => {
    if (!dateVal) return 'N/A';
    try {
      const d = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Toast Notification Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-[1200] px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-extrabold border ${
              toastMessage.type === 'success' 
                ? 'bg-emerald-600 text-white border-emerald-500' 
                : 'bg-rose-600 text-white border-rose-500'
            }`}
          >
            {toastMessage.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {onSelectClient && (
        <ClientSelectorBar
          availableClients={availableClients}
          selectedClientId={selectedClientId}
          onSelectClient={onSelectClient}
          role={role}
          totalClientCandidatesCount={clientCandidates.length}
        />
      )}

      {/* Header Title Section */}
      <div className="crm-card p-6 border-l-4 border-l-[#A98B56] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#A98B56]/10 text-[#A98B56]">
              <Sparkles size={20} />
            </span>
            <div>
              <h1 className="text-xl font-serif font-bold text-[var(--text-primary)]">Candidate Review Queue</h1>
              <p className="text-xs text-[var(--text-muted)] font-medium">Evaluate assigned profiles, accept/reject submissions, and provide direct feedback.</p>
            </div>
          </div>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 bg-[var(--bg-secondary)] p-1.5 rounded-2xl border border-[var(--border-color)]">
          {[
            { id: 'all', label: `All (${metrics.total})` },
            { id: 'pending', label: `Pending (${metrics.pending})`, color: 'text-amber-500' },
            { id: 'shortlisted', label: `Shortlisted (${metrics.shortlisted})`, color: 'text-purple-500' },
            { id: 'accepted', label: `Accepted (${metrics.accepted})`, color: 'text-emerald-500' },
            { id: 'discussion', label: `Discussion (${metrics.discussion})`, color: 'text-sky-500' },
            { id: 'rejected', label: `Rejected (${metrics.rejected})`, color: 'text-rose-500' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'crm-btn-gold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar & Boolean Controls */}
      <div className="crm-card p-5 space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex items-center bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#A98B56]/50 focus-within:border-[#A98B56] transition-all">
            <div className="pl-4 pr-2 text-[var(--text-muted)]">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by candidate name, skill, domain, or Boolean syntax (e.g. React AND Node NOT Python)..."
              className="flex-1 w-full bg-transparent border-none focus:outline-none py-3.5 text-xs font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="px-3 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={14} />
              </button>
            )}
            <button
              onClick={() => setShowBooleanGuide(!showBooleanGuide)}
              className="px-4 py-3.5 text-[10px] uppercase font-bold text-[#A98B56] hover:bg-[#A98B56]/10 flex items-center gap-1.5 transition-colors border-l border-[var(--border-color)] whitespace-nowrap"
            >
              <HelpCircle size={14} /> Boolean Syntax Guide
            </button>
          </div>
        </div>

        {/* Boolean Guide Drawer */}
        {showBooleanGuide && (
          <div className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-secondary)] space-y-2 animate-in fade-in duration-200">
            <h4 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Code size={14} className="text-[#A98B56]" /> Boolean Search Quick Syntax
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
              <div><span className="font-mono font-bold text-[#A98B56]">AND</span>: Evaluates candidates matching both terms (e.g., <code className="bg-black/10 px-1 rounded">React AND TypeScript</code>)</div>
              <div><span className="font-mono font-bold text-[#A98B56]">OR</span>: Matches candidates with either term (e.g., <code className="bg-black/10 px-1 rounded">Python OR Java</code>)</div>
              <div><span className="font-mono font-bold text-[#A98B56]">NOT</span>: Excludes candidates with term (e.g., <code className="bg-black/10 px-1 rounded">Frontend NOT Vue</code>)</div>
            </div>
          </div>
        )}
      </div>

      {/* Candidate Review Cards List */}
      <div className="space-y-6">
        {filteredCandidates.length > 0 ? (
          filteredCandidates.map((candidate) => {
            const statusInfo = getClientStatus(candidate);
            const isExpanded = !!expandedCardIds[candidate.id];
            const candidateText = candidate.rawResumeText || (candidate.compressedText ? LZString.decompressFromUTF16(candidate.compressedText) : '');

            return (
              <div
                key={candidate.id}
                className="crm-card p-6 space-y-5 border-l-4 transition-all duration-300 hover:border-l-[#A98B56]"
              >
                {/* Top Row: Identity, Domain, Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#004564] to-[#002D38] text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md">
                      {candidate.fullName ? candidate.fullName.substring(0, 2).toUpperCase() : 'CA'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-extrabold text-[var(--text-primary)] tracking-tight">
                          {candidate.fullName}
                        </h3>
                        {candidate.domainFocus && (
                          <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#A98B56]/10 text-[#A98B56] border border-[#A98B56]/20">
                            {candidate.domainFocus}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[var(--text-muted)] font-semibold mt-0.5">
                        {candidate.email || 'No email provided'} • Sourced {formatDate(candidate.createdAt)}
                      </p>

                      {candidate.locationInfo && (
                        <p className="text-[10px] font-bold text-[#A98B56] flex items-center gap-1 mt-1">
                          <MapPin size={11} /> {candidate.locationInfo.city || ''} {candidate.locationInfo.country || ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Review Status & SLA Badge */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {(() => {
                      const sla = getSLAInfo(candidate);
                      return (
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider ${sla.badgeBg}`}>
                          <Clock size={12} className={sla.indicatorColor} />
                          <span>SLA: {sla.label}</span>
                        </div>
                      );
                    })()}
                    <span className={`text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border ${statusInfo.badgeStyle}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                {/* Candidate Summary / Competencies */}
                <div className="space-y-3">
                  {candidate.summary && (
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium line-clamp-3">
                      {candidate.summary}
                    </p>
                  )}

                  {/* Skills Pills */}
                  {Array.isArray(candidate.skills) && candidate.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.skills.map((skill: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg text-[10px] font-bold uppercase tracking-wider"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons & Interactions Toggle */}
                <div className="pt-3 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">


                    <button
                      onClick={() => handleDownloadResume(candidate)}
                      className="px-3.5 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download size={14} className="text-emerald-500" /> Download CV
                    </button>

                    <button
                      onClick={() => toggleCardExpanded(candidate.id)}
                      className="px-3.5 py-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <History size={14} /> Feedback History ({Array.isArray(candidate.clientInteractions) ? candidate.clientInteractions.length : 0})
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {/* Action Decision Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setFeedbackInput('');
                        setActiveModal({ type: 'accept', candidate });
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ThumbsUp size={14} /> Accept
                    </button>

                    <button
                      onClick={() => {
                        setFeedbackInput('');
                        setActiveModal({ type: 'shortlist', candidate });
                      }}
                      className="px-4 py-2 crm-btn-gold rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Star size={14} /> Shortlist
                    </button>

                    <button
                      onClick={() => {
                        setFeedbackInput('');
                        setActiveModal({ type: 'discussion', candidate });
                      }}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare size={14} /> Discussion
                    </button>

                    <button
                      onClick={() => {
                        setFeedbackInput('');
                        setActiveModal({ type: 'reject', candidate });
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ThumbsDown size={14} /> Reject
                    </button>
                  </div>
                </div>

                {/* Expanded Feedback History Drawer */}
                {isExpanded && (
                  <div className="p-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] space-y-3 animate-in fade-in duration-200">
                    <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                      <History size={14} className="text-[#A98B56]" /> Activity & Review History
                    </h4>

                    {Array.isArray(candidate.clientInteractions) && candidate.clientInteractions.length > 0 ? (
                      <div className="space-y-2">
                        {candidate.clientInteractions.map((act: any, idx: number) => (
                          <div key={idx} className="p-3 bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] text-xs space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-muted)]">
                              <span className="text-[#A98B56]">{act.userName || 'Client Partner'} ({act.userRole || 'Client'})</span>
                              <span>{formatDate(act.timestamp)}</span>
                            </div>
                            <p className="font-semibold text-[var(--text-primary)]">{act.action}: "{act.feedback || 'No comment provided'}"</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--text-muted)] italic font-medium">No previous feedback entries recorded for this profile.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="crm-card p-12 text-center text-[var(--text-muted)] font-medium space-y-3">
            <Sparkles size={36} className="mx-auto text-[#A98B56] opacity-40" />
            <h3 className="text-lg font-serif font-bold text-[var(--text-primary)]">No Candidate Profiles Match Your Filter</h3>
            <p className="text-xs max-w-md mx-auto">
              There are currently no candidates matching the "{activeTab}" filter or search query. Try clearing filters or contacting your recruitment lead.
            </p>
          </div>
        )}
      </div>

      {/* Decision Modal (Accept / Reject / Discussion / Shortlist) */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[1100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] max-w-lg w-full rounded-[2rem] p-6 sm:p-8 shadow-2xl space-y-6 relative">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
              <h3 className="text-lg font-serif font-bold text-[var(--text-primary)] flex items-center gap-2">
                {activeModal.type === 'accept' && <ThumbsUp className="text-emerald-500" size={20} />}
                {activeModal.type === 'reject' && <ThumbsDown className="text-rose-500" size={20} />}
                {activeModal.type === 'shortlist' && <Star className="text-[#A98B56]" size={20} />}
                {activeModal.type === 'discussion' && <MessageSquare className="text-sky-500" size={20} />}
                
                {activeModal.type === 'accept' && 'Accept Candidate Submission'}
                {activeModal.type === 'reject' && 'Reject Candidate Profile'}
                {activeModal.type === 'shortlist' && 'Shortlist Candidate for Interview'}
                {activeModal.type === 'discussion' && 'Request Under Discussion'}
              </h3>

              <button onClick={() => setActiveModal(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs font-medium text-[var(--text-secondary)]">
              <p>
                Candidate: <strong className="text-[var(--text-primary)] font-bold">{activeModal.candidate.fullName}</strong>
              </p>

              {/* Rejection Category Selector */}
              {activeModal.type === 'reject' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Rejection Reason Category</label>
                  <select
                    value={rejectionReasonCategory}
                    onChange={(e) => setRejectionReasonCategory(e.target.value)}
                    className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="Skill Mismatch">Skill & Technical Mismatch</option>
                    <option value="Salary Expectation">Salary Expectation Out of Budget</option>
                    <option value="Experience Level">Insufficient Seniority / Experience</option>
                    <option value="Location / Remote Constraint">Location / Shift Constraint</option>
                    <option value="Culture Fit">Culture / Communication Fit</option>
                    <option value="Role Filled / Cancelled">Role Position Filled or Paused</option>
                    <option value="Other">Other Specific Reason</option>
                  </select>
                </div>
              )}

              {/* Feedback Text Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                  Client Feedback Notes & Instructions
                </label>
                <textarea
                  rows={4}
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  placeholder="Enter comments, interview availability, or feedback for the recruitment team..."
                  className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-xs font-medium text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-muted)] resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2.5 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-xs font-bold hover:bg-[var(--card-hover-bg)] cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmitAction}
                disabled={isSubmitting}
                className="px-5 py-2.5 crm-btn-gold text-xs font-black uppercase tracking-widest rounded-xl disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default ClientCandidateReview;
