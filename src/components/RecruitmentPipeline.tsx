import React, { useState, useMemo } from 'react';
import { 
  Briefcase, 
  Clock, 
  User, 
  Building, 
  Calendar, 
  Search, 
  Filter, 
  CheckCircle2, 
  ChevronRight, 
  Sliders, 
  AlertCircle, 
  Eye, 
  Edit2, 
  Check, 
  X, 
  Plus, 
  ArrowRight,
  Sparkles,
  Award
} from 'lucide-react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { logActivity } from '../services/activityService';
import { createNotification, formatNotificationMessage } from '../services/notificationService';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

interface Props {
  candidates: any[];
  onSelect: (candidate: any) => void;
  role: string | null;
  teamMembers?: Record<string, string>;
  fullTeamList?: any[];
}

// Stage configuration defining the workflow columns
export interface Stage {
  id: string;
  label: string;
  parentStage: 'cv_upload' | 'screening' | 'interview_stage' | 'offer_received' | 'offer_accepted_declined' | 'joining' | 'invoice_generated';
  parentLabel: string;
  color: string; // border and icon text color
  bgColor: string; // light theme bg color
  darkBgColor: string; // dark theme bg color
  accentColor: string; // badge/pill bg color
  darkAccentColor: string; // dark badge/pill bg color
}

export const STAGES: Stage[] = [
  {
    id: 'cv_upload',
    label: 'CV Upload',
    parentStage: 'cv_upload',
    parentLabel: 'Inflow',
    color: 'text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700',
    bgColor: 'bg-slate-50/60',
    darkBgColor: 'dark:bg-slate-900/40',
    accentColor: 'bg-slate-100 text-slate-800',
    darkAccentColor: 'dark:bg-slate-800 dark:text-slate-200'
  },
  {
    id: 'telephone_screening',
    label: 'Telephone Screening',
    parentStage: 'screening',
    parentLabel: 'Screening',
    color: 'text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-800',
    bgColor: 'bg-sky-50/40',
    darkBgColor: 'dark:bg-sky-950/20',
    accentColor: 'bg-sky-100 text-sky-800',
    darkAccentColor: 'dark:bg-sky-900/40 dark:text-sky-200'
  },
  {
    id: 'video_screening',
    label: 'Video Screening',
    parentStage: 'screening',
    parentLabel: 'Screening',
    color: 'text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800',
    bgColor: 'bg-indigo-50/40',
    darkBgColor: 'dark:bg-indigo-950/20',
    accentColor: 'bg-indigo-100 text-indigo-800',
    darkAccentColor: 'dark:bg-indigo-900/40 dark:text-indigo-200'
  },
  {
    id: 'technical_screening',
    label: 'Technical Screening',
    parentStage: 'interview_stage',
    parentLabel: 'Interviews',
    color: 'text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-800',
    bgColor: 'bg-purple-50/40',
    darkBgColor: 'dark:bg-purple-950/20',
    accentColor: 'bg-purple-100 text-purple-800',
    darkAccentColor: 'dark:bg-purple-900/40 dark:text-purple-200'
  },
  {
    id: 'assessment',
    label: 'Assessment',
    parentStage: 'interview_stage',
    parentLabel: 'Interviews',
    color: 'text-violet-600 dark:text-violet-400 border-violet-300 dark:border-violet-800',
    bgColor: 'bg-violet-50/40',
    darkBgColor: 'dark:bg-violet-950/20',
    accentColor: 'bg-violet-100 text-violet-800',
    darkAccentColor: 'dark:bg-violet-900/40 dark:text-violet-200'
  },
  {
    id: 'client_interview_round_1',
    label: 'Client Interview R1',
    parentStage: 'interview_stage',
    parentLabel: 'Interviews',
    color: 'text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-300 dark:border-fuchsia-800',
    bgColor: 'bg-fuchsia-50/40',
    darkBgColor: 'dark:bg-fuchsia-950/20',
    accentColor: 'bg-fuchsia-100 text-fuchsia-800',
    darkAccentColor: 'dark:bg-fuchsia-900/40 dark:text-fuchsia-200'
  },
  {
    id: 'client_interview_round_2',
    label: 'Client Interview R2',
    parentStage: 'interview_stage',
    parentLabel: 'Interviews',
    color: 'text-pink-600 dark:text-pink-400 border-pink-300 dark:border-pink-800',
    bgColor: 'bg-pink-50/40',
    darkBgColor: 'dark:bg-pink-950/20',
    accentColor: 'bg-pink-100 text-pink-800',
    darkAccentColor: 'dark:bg-pink-900/40 dark:text-pink-200'
  },
  {
    id: 'final_interview',
    label: 'Final Interview',
    parentStage: 'interview_stage',
    parentLabel: 'Interviews',
    color: 'text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800',
    bgColor: 'bg-rose-50/40',
    darkBgColor: 'dark:bg-rose-950/20',
    accentColor: 'bg-rose-100 text-rose-800',
    darkAccentColor: 'dark:bg-rose-900/40 dark:text-rose-200'
  },
  {
    id: 'offer_received',
    label: 'Offer Received',
    parentStage: 'offer_received',
    parentLabel: 'Offer',
    color: 'text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800',
    bgColor: 'bg-amber-50/40',
    darkBgColor: 'dark:bg-amber-950/20',
    accentColor: 'bg-amber-100 text-amber-800',
    darkAccentColor: 'dark:bg-amber-900/40 dark:text-amber-200'
  },
  {
    id: 'offer_accepted_declined',
    label: 'Offer Accepted/Declined',
    parentStage: 'offer_accepted_declined',
    parentLabel: 'Offer Decision',
    color: 'text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-800',
    bgColor: 'bg-orange-50/40',
    darkBgColor: 'dark:bg-orange-950/20',
    accentColor: 'bg-orange-100 text-orange-800',
    darkAccentColor: 'dark:bg-orange-900/40 dark:text-orange-200'
  },
  {
    id: 'joining',
    label: 'Joining',
    parentStage: 'joining',
    parentLabel: 'Placement',
    color: 'text-gold-a98b dark:text-gold-bc9b border-gold-bc9b/30 dark:border-gold-bc9b/20',
    bgColor: 'bg-gold-bc9b/5',
    darkBgColor: 'dark:bg-gold-a98b/10',
    accentColor: 'bg-gold-bc9b/10 text-gold-8c6e',
    darkAccentColor: 'dark:bg-gold-a98b/20 dark:text-gold-bc9b'
  },
  {
    id: 'invoice_generated',
    label: 'Invoice Generated',
    parentStage: 'invoice_generated',
    parentLabel: 'Invoice',
    color: 'text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800',
    bgColor: 'bg-emerald-50/40',
    darkBgColor: 'dark:bg-emerald-950/20',
    accentColor: 'bg-emerald-100 text-emerald-800',
    darkAccentColor: 'dark:bg-emerald-900/40 dark:text-emerald-200'
  }
];

export function RecruitmentPipeline({ candidates, onSelect, role, teamMembers = {}, fullTeamList = [] }: Props) {
  const { user, getUserDisplayName, getUserRole } = useAuth();
  const navigate = useNavigate();
  
  // Local state for dragging feedback
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isUpdatingStage, setIsUpdatingStage] = useState<string | null>(null);

  // Celebration state
  const [celebration, setCelebration] = useState<{
    isOpen: boolean;
    candidateName: string;
    stageId: string;
    stageLabel: string;
    client: string;
    position: string;
  } | null>(null);

  // Confetti particles memo
  const particles = useMemo(() => {
    if (!celebration) return [];
    return Array.from({ length: 65 }).map((_, i) => ({
      id: i,
      x: Math.random() * 120 - 60, // relative position horizontal spread %
      y: Math.random() * -120 - 60, // initial y above
      rotation: Math.random() * 360,
      scale: Math.random() * 0.7 + 0.3,
      color: [
        '#F43F5E', // rose
        '#3B82F6', // blue
        '#10B981', // emerald
        '#F59E0B', // amber
        '#8B5CF6', // violet
        '#EC4899', // pink
        '#14B8A6'  // teal
      ][Math.floor(Math.random() * 7)],
      shape: Math.random() > 0.5 ? 'circle' : 'square',
      delay: Math.random() * 0.4
    }));
  }, [celebration]);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedRecruiter, setSelectedRecruiter] = useState('all');
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');

  // Inline details editing modal state
  const [editingCandidate, setEditingCandidate] = useState<any | null>(null);
  const [editFields, setEditFields] = useState({
    position: '',
    client: '',
    clientId: '',
    stage: '',
    recruiter: '',
    nextAction: '',
    priority: 'medium',
    followUpDate: ''
  });
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  // Extracted unique values for filter dropdowns
  const uniqueClients = useMemo(() => {
    const clients = candidates
      .map(c => c.client?.trim())
      .filter((v): v is string => typeof v === 'string' && v.length > 0);
    return ['all', ...Array.from(new Set(clients))];
  }, [candidates]);

  const uniqueRecruiters = useMemo(() => {
    const recruiters = candidates
      .map(c => c.recruiter?.trim())
      .filter((v): v is string => typeof v === 'string' && v.length > 0);
    return ['all', ...Array.from(new Set(recruiters))];
  }, [candidates]);

  const uniquePositions = useMemo(() => {
    const positions = candidates
      .map(c => (c.position || c.domainFocus || c.domain)?.trim())
      .filter((v): v is string => typeof v === 'string' && v.length > 0);
    return ['all', ...Array.from(new Set(positions))];
  }, [candidates]);

  // Standardized helper to read a candidate's pipeline stage (handles default)
  const getCandidateStage = (candidate: any): string => {
    return candidate.pipelineStage || 'cv_upload';
  };

  // Filter and process candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      // Search text matches Name, Position/Domain, or Skills
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        c.fullName?.toLowerCase().includes(searchLower) ||
        (c.position || c.domainFocus || c.domain || '').toLowerCase().includes(searchLower) ||
        (c.skills || []).some((s: string) => s.toLowerCase().includes(searchLower));

      // Dropdown filters
      const matchesClient = selectedClient === 'all' || 
        c.client?.trim() === selectedClient;
      
      const matchesRecruiter = selectedRecruiter === 'all' || 
        c.recruiter?.trim() === selectedRecruiter;

      const matchesPosition = selectedPosition === 'all' || 
        (c.position || c.domainFocus || c.domain || '').trim() === selectedPosition;

      const matchesPriority = selectedPriority === 'all' || 
        (c.priority || 'medium') === selectedPriority;

      return matchesSearch && matchesClient && matchesRecruiter && matchesPosition && matchesPriority;
    });
  }, [candidates, searchQuery, selectedClient, selectedRecruiter, selectedPosition, selectedPriority]);

  // Group candidates by stage
  const candidatesByStage = useMemo(() => {
    const groups: Record<string, any[]> = {};
    STAGES.forEach(stage => {
      groups[stage.id] = [];
    });
    filteredCandidates.forEach(c => {
      const st = getCandidateStage(c);
      if (groups[st]) {
        groups[st].push(c);
      } else {
        // Fallback or unassigned stage defaults to CV Upload
        groups['cv_upload'].push(c);
      }
    });
    return groups;
  }, [filteredCandidates]);

  // Handle HTML5 drag and drop events
  const handleDragStart = (e: React.DragEvent, candidateId: string) => {
    setDraggingId(candidateId);
    e.dataTransfer.setData('text/plain', candidateId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (dragOverStage !== stageId) {
      setDragOverStage(stageId);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDragOverStage(null);
    const candidateId = e.dataTransfer.getData('text/plain') || draggingId;
    if (!candidateId) return;

    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;

    const currentStageId = getCandidateStage(candidate);
    if (currentStageId === targetStageId) return;

    await moveCandidateStage(candidateId, targetStageId);
  };

  // Perform firestore update and notifications for moving stage
  const moveCandidateStage = async (candidateId: string, targetStageId: string) => {
    setIsUpdatingStage(candidateId);
    try {
      const candidate = candidates.find(c => c.id === candidateId);
      if (!candidate) return;

      const currentStageId = getCandidateStage(candidate);
      const currentStageName = STAGES.find(s => s.id === currentStageId)?.label || 'CV Upload';
      const targetStageName = STAGES.find(s => s.id === targetStageId)?.label || targetStageId;

      const timestamp = new Date().toISOString();
      const author = getUserDisplayName() || user?.email || 'Recruiter';
      
      // Build pipeline log entry
      const historyEntry = {
        fromStage: currentStageId,
        fromStageLabel: currentStageName,
        toStage: targetStageId,
        toStageLabel: targetStageName,
        timestamp,
        updatedBy: user?.uid || 'System',
        userName: author
      };

      const candidateRef = doc(db, 'candidates', candidateId);
      
      // Update Candidate document with new stage & append to internal notes log for visual timeline sync
      const existingLogs = candidate.internalNotesLog || [];
      const noteContent = `🔄 Pipeline stage changed from [${currentStageName}] to [${targetStageName}]`;
      const updatedLogs = [...existingLogs, {
        author,
        timestamp,
        noteContent,
        candidateName: candidate.fullName || 'Candidate',
        type: 'stage_transition'
      }];

      await updateDoc(candidateRef, {
        pipelineStage: targetStageId,
        stageHistory: arrayUnion(historyEntry),
        internalNotesLog: updatedLogs,
        updatedAt: timestamp
      });

      // Dispatch real-time notification
      const notificationMsg = formatNotificationMessage(
        author,
        getUserRole() || 'recruiter',
        `Moved candidate ${candidate.fullName} to [${targetStageName}] stage`
      );
      await createNotification(
        notificationMsg,
        user?.uid || 'system',
        author,
        getUserRole() || 'recruiter',
        'all',
        candidateId
      );

      // Log activity in global feed
      await logActivity(
        author,
        user?.uid || 'System',
        getUserRole() || 'recruiter',
        'pipeline_transition',
        candidate.fullName,
        null,
        `Shifted from ${currentStageName} to ${targetStageName}`,
        'Pipeline'
      );

      console.log(`[Pipeline] Candidate ${candidateId} successfully moved to ${targetStageId}`);
      if (['offer_received', 'joining', 'invoice_generated'].includes(targetStageId)) {
        setCelebration({
          isOpen: true,
          candidateName: candidate.fullName || 'Candidate',
          stageId: targetStageId,
          stageLabel: targetStageName,
          client: candidate.client || 'Client Partner',
          position: candidate.position || candidate.domainFocus || candidate.domain || 'Target Role'
        });
      }
    } catch (err) {
      console.error('[Pipeline] Error updating stage:', err);
    } finally {
      setIsUpdatingStage(null);
    }
  };

  // Open candidate details editor
  const openDetailsEditor = (candidate: any) => {
    setEditingCandidate(candidate);
    setEditFields({
      position: candidate.position || candidate.domainFocus || candidate.domain || '',
      client: candidate.client || '',
      clientId: candidate.clientId || '',
      stage: candidate.pipelineStage || 'cv_upload',
      recruiter: candidate.recruiter || getUserDisplayName() || '',
      nextAction: candidate.nextAction || '',
      priority: candidate.priority || 'medium',
      followUpDate: candidate.followUpDate || ''
    });
  };

  // Save candidate inline details
  const saveCandidateDetails = async () => {
    if (!editingCandidate) return;
    setIsSavingDetails(true);
    try {
      const candidateRef = doc(db, 'candidates', editingCandidate.id);
      const timestamp = new Date().toISOString();
      const author = getUserDisplayName() || user?.email || 'Recruiter';

      const updateData: any = {
        position: editFields.position.trim(),
        client: editFields.client.trim(),
        clientId: editFields.clientId || null,
        pipelineStage: editFields.stage,
        recruiter: editFields.recruiter.trim(),
        nextAction: editFields.nextAction.trim(),
        priority: editFields.priority,
        followUpDate: editFields.followUpDate,
        updatedAt: timestamp
      };

      // Add a followUpNote if date changed
      if (editFields.followUpDate && editFields.followUpDate !== editingCandidate.followUpDate) {
        updateData.followUpNote = editFields.nextAction || 'Pipeline updated reminder';
        updateData.followUpUpdatedBy = user?.uid;
      }

      // Check if stage changed
      const oldStageId = getCandidateStage(editingCandidate);
      const newStageId = editFields.stage;
      if (oldStageId !== newStageId) {
        updateData.pipelineStageChangedAt = timestamp;
        
        // Trigger celebration check
        if (['offer_received', 'joining', 'invoice_generated'].includes(newStageId)) {
          const stageObj = STAGES.find(s => s.id === newStageId);
          setCelebration({
            isOpen: true,
            candidateName: editingCandidate.fullName || 'Candidate',
            stageId: newStageId,
            stageLabel: stageObj?.label || newStageId,
            client: editFields.client.trim() || editingCandidate.client || 'Client Partner',
            position: editFields.position.trim() || 'Target Role'
          });
        }
      }

      await updateDoc(candidateRef, updateData);

      await logActivity(
        author,
        user?.uid || 'System',
        getUserRole() || 'recruiter',
        'pipeline_card_updated',
        editingCandidate.fullName,
        null,
        `Updated position, client, stage, priority, and next action details`,
        'Pipeline'
      );

      setEditingCandidate(null);
    } catch (err) {
      console.error('[Pipeline] Error saving candidate pipeline details:', err);
    } finally {
      setIsSavingDetails(false);
    }
  };

  // Stage Parent Group header helper
  const getParentStageHeaderSpan = (parentStage: string) => {
    switch (parentStage) {
      case 'screening': return 2;
      case 'interview_stage': return 5;
      default: return 1;
    }
  };

  const parentStagesList = [
    { id: 'cv_upload', label: 'Inflow', colSpan: 1, color: 'border-slate-300 bg-slate-100/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
    { id: 'screening', label: 'Screening Round', colSpan: 2, color: 'border-sky-300 bg-sky-100/80 text-sky-700 dark:bg-sky-950/40 dark:text-sky-350 dark:border-sky-900' },
    { id: 'interview_stage', label: 'Interview Process', colSpan: 5, color: 'border-purple-300 bg-purple-100/80 text-purple-700 dark:bg-purple-950/40 dark:text-purple-350 dark:border-purple-900' },
    { id: 'offer_received', label: 'Offer Sent', colSpan: 1, color: 'border-amber-300 bg-amber-100/80 text-amber-700 dark:bg-amber-950/40 dark:text-amber-350 dark:border-amber-900' },
    { id: 'offer_accepted_declined', label: 'Closing Choice', colSpan: 1, color: 'border-orange-300 bg-orange-100/80 text-orange-700 dark:bg-orange-950/40 dark:text-orange-350 dark:border-orange-900' },
    { id: 'joining', label: 'Placement', colSpan: 1, color: 'border-gold-bc9b bg-gold-bc9b/10 text-gold-a98b dark:bg-gold-bc9b/5 dark:text-gold-bc9b dark:border-gold-a98b/40' },
    { id: 'invoice_generated', label: 'Billing/Invoice', colSpan: 1, color: 'border-emerald-300 bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-350 dark:border-emerald-900' }
  ];

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Search & Filters Controls */}
      <div className="bg-[var(--card-bg)] p-5 rounded-[2rem] border border-[var(--border-color)] shadow-sm flex flex-col gap-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Sliders size={18} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)] tracking-tight">Recruitment Pipeline Matrix</h3>
              <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest">Search, filter and orchestrate candidate positions</p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-secondary)]">
              Total candidates: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{filteredCandidates.length}</span>
            </span>
            <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/20 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400">
              Placed & Billed: <span className="font-extrabold">{candidates.filter(c => getCandidateStage(c) === 'invoice_generated' || getCandidateStage(c) === 'joining').length}</span>
            </span>
          </div>
        </div>

        {/* Real Dynamic Filtering Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-1.5 border-t border-[var(--border-color)]/50">
          
          {/* Search Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1">
              <Search size={10} /> Search Candidate
            </label>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 border border-[var(--border-color)] rounded-xl px-3 py-2 w-full focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:border-indigo-500/50 transition-all duration-300">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, skills, role..."
                className="bg-transparent border-none focus:outline-none text-xs flex-1 text-[var(--text-primary)] font-semibold"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-red-500">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Client Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1">
              <Building size={10} /> Client Partner
            </label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
            >
              <option value="all">All Clients ({uniqueClients.length - 1})</option>
              {uniqueClients.filter(c => c !== 'all').map(client => (
                <option key={client} value={client}>{client}</option>
              ))}
            </select>
          </div>

          {/* Recruiter Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1">
              <User size={10} /> Recruiter
            </label>
            <select
              value={selectedRecruiter}
              onChange={(e) => setSelectedRecruiter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
            >
              <option value="all">All Recruiters ({uniqueRecruiters.length - 1})</option>
              {uniqueRecruiters.filter(r => r !== 'all').map(recruiter => (
                <option key={recruiter} value={recruiter}>{recruiter}</option>
              ))}
            </select>
          </div>

          {/* Position Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1">
              <Briefcase size={10} /> Target Position
            </label>
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
            >
              <option value="all">All Positions ({uniquePositions.length - 1})</option>
              {uniquePositions.filter(p => p !== 'all').map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1">
              <AlertCircle size={10} /> Candidate Priority
            </label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
            >
              <option value="all">All Priorities</option>
              <option value="high">🔴 High Priority</option>
              <option value="medium">🟡 Medium Priority</option>
              <option value="low">🔵 Low Priority</option>
            </select>
          </div>

        </div>

        {/* Clear active filter buttons if active */}
        {(searchQuery || selectedClient !== 'all' || selectedRecruiter !== 'all' || selectedPosition !== 'all' || selectedPriority !== 'all') && (
          <div className="flex items-center gap-2 pt-1 border-t border-[var(--border-color)]/30">
            <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-wider">Active Filters:</span>
            <button 
              onClick={() => {
                setSearchQuery('');
                setSelectedClient('all');
                setSelectedRecruiter('all');
                setSelectedPosition('all');
                setSelectedPriority('all');
              }}
              className="text-[10px] font-black text-rose-500 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/20 px-3 py-1 rounded-lg transition-all border border-rose-100 dark:border-rose-900/30 uppercase tracking-widest cursor-pointer"
            >
              Reset Filters ×
            </button>
          </div>
        )}
      </div>

      {/* Main Kanban Board Container (Scrollable Horizontal Grid) */}
      <div className="flex flex-col w-full overflow-hidden border border-[var(--border-color)] bg-slate-50/20 dark:bg-slate-950/10 rounded-[2.5rem] p-4 sm:p-6 shadow-inner">
        
        {/* Parent Stage Group Titles Row */}
        <div className="flex gap-4 select-none pb-3 border-b border-[var(--border-color)]/40 overflow-x-auto whitespace-nowrap scrollbar-thin">
          <div className="flex gap-4 min-w-[2100px]">
            {parentStagesList.map(parent => {
              // Calculate column width depending on count of sub stages
              const colWidth = parent.colSpan === 5 ? 'w-[1464px]' : parent.colSpan === 2 ? 'w-[576px]' : 'w-[280px]';
              return (
                <div 
                  key={parent.id} 
                  className={`px-4 py-2 border-b-2 rounded-t-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5 ${parent.color} ${colWidth} transition-all`}
                >
                  <Sparkles size={11} className="opacity-75" />
                  {parent.label}
                  <span className="text-[9px] font-semibold opacity-80">({parent.colSpan} stage{parent.colSpan > 1 ? 's' : ''})</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Columns Grid Row */}
        <div className="flex gap-4 overflow-x-auto pt-4 scrollbar-thin pb-4 min-h-[640px]">
          <div className="flex gap-4 min-w-[2100px]">
            {STAGES.map(stage => {
              const columnCandidates = candidatesByStage[stage.id] || [];
              const isDragOver = dragOverStage === stage.id;
              
              return (
                <div
                  key={stage.id}
                  onDragOver={(e) => handleDragOver(e, stage.id)}
                  onDrop={(e) => handleDrop(e, stage.id)}
                  className={`w-[280px] shrink-0 rounded-3xl p-3 border-2 transition-all flex flex-col gap-3 min-h-[580px] ${stage.bgColor} ${stage.darkBgColor} ${
                    isDragOver 
                      ? 'border-indigo-500 scale-[1.01] bg-indigo-50/35 dark:bg-indigo-950/20 ring-4 ring-indigo-500/10 border-dashed' 
                      : 'border-[var(--border-color)]/80'
                  }`}
                >
                  
                  {/* Stage Header */}
                  <div className="flex flex-col gap-1 border-b border-[var(--border-color)]/50 pb-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-wider truncate text-[var(--text-primary)]`}>
                        {stage.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${stage.accentColor} ${stage.darkAccentColor}`}>
                        {columnCandidates.length}
                      </span>
                    </div>
                    <span className="text-[8px] text-[var(--text-muted)] uppercase tracking-widest font-bold">
                      {stage.parentLabel}
                    </span>
                  </div>

                  {/* Candidate List inside Column */}
                  <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto scrollbar-thin max-h-[520px] pr-0.5">
                    {columnCandidates.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)] border border-dashed border-[var(--border-color)]/50 rounded-2xl bg-white/20 dark:bg-black/10">
                        <AlertCircle size={24} className="opacity-20 mb-2" />
                        <span className="text-[9px] uppercase font-black tracking-wider text-center px-4">No candidates</span>
                      </div>
                    ) : (
                      columnCandidates.map(candidate => {
                        const isFollowUpDue = candidate.followUpDate && new Date(candidate.followUpDate).toISOString().split('T')[0] <= new Date().toISOString().split('T')[0];
                        const isHighPriority = candidate.priority === 'high';
                        const isLowPriority = candidate.priority === 'low';
                        const isUpdating = isUpdatingStage === candidate.id;

                        // Avatar helper
                        const initials = (candidate.fullName || 'Anonymous')
                          .split(/\s+/)
                          .map((n: string) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase();

                        return (
                          <div
                            key={candidate.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, candidate.id)}
                            onDragEnd={handleDragEnd}
                            className={`bg-[var(--card-bg)] border border-[var(--border-color)]/80 hover:border-indigo-400 dark:hover:border-indigo-500 p-4.5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col gap-3 group relative cursor-grab active:cursor-grabbing ${
                              draggingId === candidate.id ? 'opacity-35 border-dashed border-slate-400' : ''
                            } ${isUpdating ? 'pointer-events-none opacity-50' : ''}`}
                          >
                            {/* Loading State Overlay */}
                            {isUpdating && (
                              <div className="absolute inset-0 bg-white/30 dark:bg-black/30 flex items-center justify-center rounded-2xl z-20">
                                <span className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                              </div>
                            )}

                            {/* Priority Indicator Dot/Badge */}
                            <div className="flex items-center justify-between gap-2">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                isHighPriority 
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-450 border border-rose-100 dark:border-rose-900/30' 
                                  : isLowPriority 
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-450 border border-blue-100 dark:border-blue-900/30'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-450 border border-amber-100 dark:border-amber-900/30'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isHighPriority ? 'bg-rose-600' : isLowPriority ? 'bg-blue-600' : 'bg-amber-500'}`} />
                                {candidate.priority || 'medium'}
                              </span>

                              {/* Match percentage if score exists */}
                              {candidate.matchScore !== undefined && (
                                <span className="px-1.5 py-0.5 text-[8px] font-black rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100/10">
                                  Match: {candidate.matchScore}%
                                </span>
                              )}
                            </div>

                            {/* Candidate Identity */}
                            <div className="flex items-start gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center font-extrabold text-[10px] text-[var(--text-primary)] border border-[var(--border-color)] shrink-0 select-none">
                                {initials}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-extrabold text-[var(--text-primary)] group-hover:text-[var(--brand-color)] transition-colors tracking-tight truncate leading-tight">
                                  {candidate.fullName}
                                </h4>
                                <span className="text-[9px] text-[var(--text-muted)] font-bold truncate block mt-0.5">
                                  {candidate.position || candidate.domainFocus || candidate.domain || 'Unspecified Role'}
                                </span>
                              </div>
                            </div>

                            {/* Meta fields: Recruiter */}
                            <div className="flex items-center gap-1 border-t border-[var(--border-color)] pt-2.5 mt-1">
                                <User size={11} className="text-[var(--text-muted)] shrink-0" />
                                <span className="text-[9px] font-semibold text-[var(--text-secondary)] truncate">
                                  {candidate.recruiter || 'Internal Agent'}
                                </span>
                            </div>

                            {/* Follow-up date / Next Action details */}
                            {(candidate.followUpDate || candidate.nextAction) && (
                              <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-2.5 flex flex-col gap-1.5 border border-[var(--border-color)]/30">
                                {candidate.followUpDate && (
                                  <div className="flex items-center gap-1.5">
                                    <Calendar size={11} className={`shrink-0 ${isFollowUpDue ? 'text-rose-500' : 'text-slate-400'}`} />
                                    <span className={`text-[9px] font-black tracking-tight ${isFollowUpDue ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--text-secondary)]'}`}>
                                      {candidate.followUpDate}
                                    </span>
                                  </div>
                                )}
                                {candidate.nextAction && (
                                  <p className="text-[9px] font-bold text-[var(--text-muted)] italic leading-snug break-words">
                                    "{candidate.nextAction}"
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Stage Selector Dropdown */}
                            <div className="flex flex-col gap-1 border-t border-[var(--border-color)]/30 pt-2.5">
                              <label className="text-[8px] font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
                                <ArrowRight size={8} className="text-indigo-500 animate-pulse" /> Change Stage:
                              </label>
                              <div className="relative">
                                <select
                                  value={getCandidateStage(candidate)}
                                  onChange={(e) => moveCandidateStage(candidate.id, e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-[var(--border-color)] text-[10px] font-bold text-[var(--text-secondary)] rounded-xl px-2.5 py-1.5 appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer pr-7 text-left leading-tight"
                                >
                                  {STAGES.map(s => (
                                    <option key={s.id} value={s.id}>
                                      {s.label}
                                    </option>
                                  ))}
                                </select>
                                <div className="absolute right-2 top-2 pointer-events-none text-slate-400 dark:text-slate-500">
                                  <ChevronRight size={10} className="rotate-90" />
                                </div>
                              </div>
                            </div>

                            {/* Hover Controls (View & Edit Pipeline details) */}
                            <div className="flex gap-1.5 pt-1 border-t border-[var(--border-color)]/30 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => navigate(`/candidate/${candidate.id}`)}
                                className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer"
                              >
                                <Eye size={10} /> Profile
                              </button>
                              <button
                                onClick={() => openDetailsEditor(candidate)}
                                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer"
                                title="Edit pipeline properties"
                              >
                                <Edit2 size={10} />
                              </button>
                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>
                  
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Edit Candidate Pipeline Properties Modal */}
      <AnimatePresence>
        {editingCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingCandidate(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[var(--card-bg)] border border-[var(--border-color)] w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="flex items-center justify-between gap-4 mb-4.5">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-gold-bc9b/10 dark:bg-gold-a98b/20 rounded-xl flex items-center justify-center text-gold-a98b">
                    <Award size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[var(--text-primary)]">Configure Card</h3>
                    <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Configure pipeline identity attributes</p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingCandidate(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="py-2.5 border-y border-[var(--border-color)]/50 flex items-center gap-2 mb-4">
                <span className="text-[10px] font-black uppercase text-[var(--text-muted)]">Target Candidate:</span>
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{editingCandidate.fullName}</span>
              </div>

              {/* Form fields */}
              <div className="flex flex-col gap-4.5">
                
                {/* Assigned Client Partner Dropdown */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Assigned Client Partner User</label>
                  <select
                    value={editFields.clientId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedClientObj = fullTeamList.find((u: any) => u.id === selectedId);
                      setEditFields(prev => ({
                        ...prev,
                        clientId: selectedId,
                        client: selectedClientObj ? (selectedClientObj.name || selectedClientObj.company || selectedClientObj.email) : prev.client
                      }));
                    }}
                    className="bg-slate-50 dark:bg-slate-900 border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">No Client User Assigned</option>
                    {fullTeamList && fullTeamList.filter((u: any) => u.role === 'client').map((client: any) => (
                      <option key={client.id} value={client.id}>
                        {client.name || client.email}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Client Partner Name (text field) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Client Partner Name / Company</label>
                  <input
                    type="text"
                    value={editFields.client}
                    onChange={(e) => setEditFields(prev => ({ ...prev, client: e.target.value }))}
                    placeholder="e.g. Acme Corporation, Meta, Stripe"
                    className="bg-slate-50 dark:bg-slate-900 border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                  />
                </div>

                {/* Pipeline Stage Dropdown */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Pipeline Stage</label>
                  <select
                    value={editFields.stage}
                    onChange={(e) => setEditFields(prev => ({ ...prev, stage: e.target.value }))}
                    className="bg-slate-50 dark:bg-slate-900 border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 cursor-pointer"
                  >
                    {STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Position */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Target Role / Position</label>
                  <input
                    type="text"
                    value={editFields.position}
                    onChange={(e) => setEditFields(prev => ({ ...prev, position: e.target.value }))}
                    placeholder="e.g. Senior Software Engineer"
                    className="bg-slate-50 dark:bg-slate-900 border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                  />
                </div>

                {/* Recruiter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Recruiter Owner</label>
                  <input
                    type="text"
                    value={editFields.recruiter}
                    onChange={(e) => setEditFields(prev => ({ ...prev, recruiter: e.target.value }))}
                    placeholder="e.g. Darren Wala"
                    className="bg-slate-50 dark:bg-slate-900 border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  {/* Priority */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Priority</label>
                    <select
                      value={editFields.priority}
                      onChange={(e) => setEditFields(prev => ({ ...prev, priority: e.target.value }))}
                      className="bg-slate-50 dark:bg-slate-900 border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                    >
                      <option value="high">🔴 High</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="low">🔵 Low</option>
                    </select>
                  </div>

                  {/* Follow-up date */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Follow-Up Date</label>
                    <input
                      type="date"
                      value={editFields.followUpDate}
                      onChange={(e) => setEditFields(prev => ({ ...prev, followUpDate: e.target.value }))}
                      className="bg-slate-50 dark:bg-slate-900 border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Next Action / Follow-up notes */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Next Action / Follow-Up Note</label>
                  <textarea
                    value={editFields.nextAction}
                    onChange={(e) => setEditFields(prev => ({ ...prev, nextAction: e.target.value }))}
                    placeholder="e.g. Arrange 30min video screening with Director"
                    rows={2}
                    className="bg-slate-50 dark:bg-slate-900 border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-xs font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 resize-none"
                  />
                </div>

              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 mt-6 border-t border-[var(--border-color)]/50 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingCandidate(null)}
                  className="px-4 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingDetails}
                  onClick={saveCandidateDetails}
                  className="px-5 py-2 bg-[var(--primary-color)] hover:opacity-90 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingDetails ? (
                    <>
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      Save Details
                    </>
                  )}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Celebration Milestones Appreciator Modal Overlay */}
      <AnimatePresence>
        {celebration && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
            {/* Dark Backdrop with glowing overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCelebration(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            
            {/* Confetti Explosion Particles */}
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ 
                  x: '50vw', 
                  y: '100vh', 
                  scale: 0, 
                  rotate: 0,
                  opacity: 1 
                }}
                animate={{
                  x: `calc(50vw + ${p.x}vw)`,
                  y: '120vh',
                  scale: p.scale,
                  rotate: p.rotation + 1080,
                  opacity: [1, 1, 0.6, 0]
                }}
                transition={{
                  duration: Math.random() * 2.5 + 2.5,
                  delay: p.delay,
                  ease: [0.1, 0.8, 0.3, 1]
                }}
                className="fixed z-[101] pointer-events-none"
                style={{
                  backgroundColor: p.color,
                  width: p.shape === 'circle' ? '12px' : '10px',
                  height: '12px',
                  borderRadius: p.shape === 'circle' ? '50%' : '2px',
                }}
              />
            ))}

            {/* Celebrate Container */}
            <motion.div
              initial={{ scale: 0.85, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.85, y: 50, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 120 }}
              className="bg-[var(--card-bg)] border-2 border-indigo-500/30 w-full max-w-lg rounded-[3rem] p-8 shadow-[0_20px_50px_rgba(99,102,241,0.2)] relative z-[102] text-center overflow-hidden flex flex-col items-center gap-6"
            >
              {/* Decorative Glowing Radial Backdrops */}
              <div className="absolute -top-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              
              {/* Animated Icon with Glow */}
              <motion.div 
                initial={{ rotate: -15, scale: 0.8 }}
                animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: 1 }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
                className="w-20 h-20 rounded-[2rem] bg-gradient-to-tr from-amber-500 to-yellow-300 dark:from-amber-600 dark:to-yellow-400 flex items-center justify-center text-white shadow-[0_10px_25px_rgba(245,158,11,0.4)] relative"
              >
                <Award size={44} className="animate-pulse" />
                
                {/* Sparkling Stars around Icon */}
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute -top-2 -right-2 text-yellow-400"
                >
                  <Sparkles size={16} />
                </motion.div>
              </motion.div>

              {/* Celebration Badge/Title */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/20 px-3 py-1 rounded-full">
                  🎉 Pipeline Milestone Reached
                </span>
                <h2 className="text-3xl font-black tracking-tight text-[var(--text-primary)] mt-1">
                  {celebration.stageId === 'offer_received' && 'Offer Received!'}
                  {celebration.stageId === 'joining' && 'Candidate Joined!'}
                  {celebration.stageId === 'invoice_generated' && 'Invoice Generated!'}
                </h2>
                <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider mt-0.5">
                  Congratulations! Let's celebrate this placement success
                </p>
              </div>

              {/* Detail Box */}
              <div className="w-full bg-slate-50 dark:bg-slate-900/60 border border-[var(--border-color)]/60 rounded-[2rem] p-6 flex flex-col gap-4 text-left shadow-inner relative">
                
                {/* Candidate and Position */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-sm uppercase">
                    {(celebration.candidateName || 'C').slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-[var(--text-primary)] tracking-tight">
                      {celebration.candidateName}
                    </h4>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {celebration.position}
                    </p>
                  </div>
                </div>

                {/* Client Detail */}
                <div className="grid grid-cols-2 gap-4 pt-3.5 border-t border-[var(--border-color)]/50 text-xs">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Client Partner</span>
                    <span className="font-bold text-[var(--text-primary)] flex items-center gap-1">
                      <Building size={12} className="text-slate-400" /> {celebration.client}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Current Status</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={12} /> {celebration.stageLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Beautiful Appreciation / Motivation text */}
              <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed max-w-sm italic">
                {celebration.stageId === 'offer_received' && `Outstanding work securing the offer for ${celebration.candidateName}! We are one step closer to finalizing this placement.`}
                {celebration.stageId === 'joining' && `Fantastic news! ${celebration.candidateName} has officially joined ${celebration.client}. Kudos to the recruiting team! 🚀`}
                {celebration.stageId === 'invoice_generated' && `Revenue secured! The invoice for ${celebration.candidateName}'s placement has been generated. Brilliant job! 💼💰`}
              </p>

              {/* Awesome Button */}
              <button
                onClick={() => setCelebration(null)}
                className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-2xl shadow-lg hover:shadow-indigo-500/20 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 uppercase tracking-widest"
              >
                Awesome! Continue
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
