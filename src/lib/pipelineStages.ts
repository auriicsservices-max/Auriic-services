export interface Stage {
  id: string;
  label: string;
  parentStage: 'cv_upload' | 'screening' | 'interview_stage' | 'offer_received' | 'offer_accepted_declined' | 'joining' | 'invoice_generated';
  parentLabel: string;
  color: string;           // Header text and border styling
  bgColor: string;         // Light theme column / card background
  darkBgColor: string;     // Dark theme column / card background
  accentColor: string;     // Light theme badge/pill background & text
  darkAccentColor: string; // Dark theme badge/pill background & text
  badgeClass: string;      // Unified theme-adaptable badge class
  dotClass: string;        // Stage color indicator dot
  hexColorLight: string;   // Hex color for Light theme charts
  hexColorDark: string;    // Hex color for Dark theme charts
}

export interface ParentStageHeader {
  id: string;
  label: string;
  colSpan: number;
  color: string;
}

export const PARENT_STAGES: ParentStageHeader[] = [
  { 
    id: 'cv_upload', 
    label: 'Inflow', 
    colSpan: 1, 
    color: 'border-[#004564]/30 text-[#004564] dark:text-sky-300 dark:border-sky-500/30 bg-[#004564]/5 dark:bg-[#002D38]/60' 
  },
  { 
    id: 'screening', 
    label: 'Screening', 
    colSpan: 2, 
    color: 'border-sky-300 text-sky-800 dark:text-sky-300 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950/30' 
  },
  { 
    id: 'interview_stage', 
    label: 'Interviews', 
    colSpan: 5, 
    color: 'border-purple-300 text-purple-800 dark:text-purple-300 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-950/30' 
  },
  { 
    id: 'offer_received', 
    label: 'Offer', 
    colSpan: 1, 
    color: 'border-amber-300 text-amber-800 dark:text-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30' 
  },
  { 
    id: 'offer_accepted_declined', 
    label: 'Offer Decision', 
    colSpan: 1, 
    color: 'border-orange-300 text-orange-800 dark:text-orange-300 dark:border-orange-800 bg-orange-50/60 dark:bg-orange-950/30' 
  },
  { 
    id: 'joining', 
    label: 'Placement', 
    colSpan: 1, 
    color: 'border-[#A98B56]/30 text-[#8C6E42] dark:text-[#BC9B66] dark:border-[#A98B56]/40 bg-[#A98B56]/10 dark:bg-[#A98B56]/20' 
  },
  { 
    id: 'invoice_generated', 
    label: 'Invoice', 
    colSpan: 1, 
    color: 'border-emerald-300 text-emerald-800 dark:text-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30' 
  },
];

export const STAGES: Stage[] = [
  {
    id: 'cv_upload',
    label: 'CV Upload',
    parentStage: 'cv_upload',
    parentLabel: 'Inflow',
    color: 'text-[#004564] dark:text-sky-300 border-[#004564]/30 dark:border-sky-500/30',
    bgColor: 'bg-[#004564]/5',
    darkBgColor: 'dark:bg-[#002D38]/60',
    accentColor: 'bg-[#004564]/10 text-[#004564] border border-[#004564]/20',
    darkAccentColor: 'dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30',
    badgeClass: 'bg-[#004564]/10 text-[#004564] border border-[#004564]/20 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30 font-bold px-2.5 py-0.5 rounded-full text-xs inline-flex items-center gap-1.5',
    dotClass: 'bg-[#004564] dark:bg-sky-400',
    hexColorLight: '#004564',
    hexColorDark: '#38BDF8',
  },
  {
    id: 'telephone_screening',
    label: 'Telephone Screening',
    parentStage: 'screening',
    parentLabel: 'Screening',
    color: 'text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800',
    bgColor: 'bg-sky-50/50',
    darkBgColor: 'dark:bg-sky-950/30',
    accentColor: 'bg-sky-100 text-sky-800 border border-sky-200',
    darkAccentColor: 'dark:bg-sky-900/40 dark:text-sky-200 dark:border-sky-700/50',
    badgeClass: 'bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:border-sky-700/50 font-bold px-2.5 py-0.5 rounded-full text-xs inline-flex items-center gap-1.5',
    dotClass: 'bg-sky-500 dark:bg-sky-400',
    hexColorLight: '#0284C7',
    hexColorDark: '#38BDF8',
  },
  {
    id: 'video_screening',
    label: 'Video Screening',
    parentStage: 'screening',
    parentLabel: 'Screening',
    color: 'text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800',
    bgColor: 'bg-teal-50/50',
    darkBgColor: 'dark:bg-teal-950/30',
    accentColor: 'bg-teal-100 text-teal-800 border border-teal-200',
    darkAccentColor: 'dark:bg-teal-900/40 dark:text-teal-200 dark:border-teal-700/50',
    badgeClass: 'bg-teal-100 text-teal-800 border border-teal-200 dark:bg-teal-900/40 dark:text-teal-200 dark:border-teal-700/50 font-bold px-2.5 py-0.5 rounded-full text-xs inline-flex items-center gap-1.5',
    dotClass: 'bg-teal-500 dark:bg-teal-400',
    hexColorLight: '#0D9488',
    hexColorDark: '#2DD4BF',
  },
  {
    id: 'technical_screening',
    label: 'Technical Screening',
    parentStage: 'interview_stage',
    parentLabel: 'Interviews',
    color: 'text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    bgColor: 'bg-indigo-50/50',
    darkBgColor: 'dark:bg-indigo-950/30',
    accentColor: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    darkAccentColor: 'dark:bg-indigo-900/40 dark:text-indigo-200 dark:border-indigo-700/50',
    badgeClass: 'bg-indigo-100 text-indigo-800 border border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-200 dark:border-indigo-700/50 font-bold px-2.5 py-0.5 rounded-full text-xs inline-flex items-center gap-1.5',
    dotClass: 'bg-indigo-500 dark:bg-indigo-400',
    hexColorLight: '#4F46E5',
    hexColorDark: '#818CF8',
  },
  {
    id: 'assessment',
    label: 'Assessment',
    parentStage: 'interview_stage',
    parentLabel: 'Interviews',
    color: 'text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    bgColor: 'bg-purple-50/50',
    darkBgColor: 'dark:bg-purple-950/30',
    accentColor: 'bg-purple-100 text-purple-800 border border-purple-200',
    darkAccentColor: 'dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-700/50',
    badgeClass: 'bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-700/50 font-bold px-2.5 py-0.5 rounded-full text-xs inline-flex items-center gap-1.5',
    dotClass: 'bg-purple-500 dark:bg-purple-400',
    hexColorLight: '#7E22CE',
    hexColorDark: '#C084FC',
  },
  {
    id: 'client_interview_round_1',
    label: 'Client Interview R1',
    parentStage: 'interview_stage',
    parentLabel: 'Interviews',
    color: 'text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-300 dark:border-fuchsia-800',
    bgColor: 'bg-fuchsia-50/50',
    darkBgColor: 'dark:bg-fuchsia-950/30',
    accentColor: 'bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200',
    darkAccentColor: 'dark:bg-fuchsia-900/40 dark:text-fuchsia-200 dark:border-fuchsia-700/50',
    badgeClass: 'bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200 dark:bg-fuchsia-900/40 dark:text-fuchsia-200 dark:border-fuchsia-700/50 font-bold px-2.5 py-0.5 rounded-full text-xs inline-flex items-center gap-1.5',
    dotClass: 'bg-fuchsia-500 dark:bg-fuchsia-400',
    hexColorLight: '#A21CAF',
    hexColorDark: '#E879F9',
  },
  {
    id: 'client_interview_round_2',
    label: 'Client Interview R2',
    parentStage: 'interview_stage',
    parentLabel: 'Interviews',
    color: 'text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-800',
    bgColor: 'bg-pink-50/50',
    darkBgColor: 'dark:bg-pink-950/30',
    accentColor: 'bg-pink-100 text-pink-800 border border-pink-200',
    darkAccentColor: 'dark:bg-pink-900/40 dark:text-pink-200 dark:border-pink-700/50',
    badgeClass: 'bg-pink-100 text-pink-800 border border-pink-200 dark:bg-pink-900/40 dark:text-pink-200 dark:border-pink-700/50 font-bold px-2.5 py-0.5 rounded-full text-xs inline-flex items-center gap-1.5',
    dotClass: 'bg-pink-500 dark:bg-pink-400',
    hexColorLight: '#BE185D',
    hexColorDark: '#F472B6',
  },
  {
    id: 'final_interview',
    label: 'Final Interview',
    parentStage: 'interview_stage',
    parentLabel: 'Interviews',
    color: 'text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    bgColor: 'bg-rose-50/50',
    darkBgColor: 'dark:bg-rose-950/30',
    accentColor: 'bg-rose-100 text-rose-800 border border-rose-200',
    darkAccentColor: 'dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-700/50',
    badgeClass: 'bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-700/50 font-bold px-2.5 py-0.5 rounded-full text-xs inline-flex items-center gap-1.5',
    dotClass: 'bg-rose-500 dark:bg-rose-400',
    hexColorLight: '#BE123C',
    hexColorDark: '#FB7185',
  },
  {
    id: 'offer_received',
    label: 'Offer Received',
    parentStage: 'offer_received',
    parentLabel: 'Offer',
    color: 'text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    bgColor: 'bg-amber-50/50',
    darkBgColor: 'dark:bg-amber-950/30',
    accentColor: 'bg-amber-100 text-amber-800 border border-amber-200',
    darkAccentColor: 'dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700/50',
    badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700/50 font-bold px-2.5 py-0.5 rounded-full text-xs inline-flex items-center gap-1.5',
    dotClass: 'bg-amber-500 dark:bg-amber-400',
    hexColorLight: '#B45309',
    hexColorDark: '#FBBF24',
  },
  {
    id: 'offer_accepted_declined',
    label: 'Offer Accepted/Declined',
    parentStage: 'offer_accepted_declined',
    parentLabel: 'Offer Decision',
    color: 'text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800',
    bgColor: 'bg-orange-50/50',
    darkBgColor: 'dark:bg-orange-950/30',
    accentColor: 'bg-orange-100 text-orange-800 border border-orange-200',
    darkAccentColor: 'dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-700/50',
    badgeClass: 'bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-700/50 font-bold px-2.5 py-0.5 rounded-full text-xs inline-flex items-center gap-1.5',
    dotClass: 'bg-orange-500 dark:bg-orange-400',
    hexColorLight: '#C2410C',
    hexColorDark: '#FB923C',
  },
  {
    id: 'joining',
    label: 'Joining',
    parentStage: 'joining',
    parentLabel: 'Placement',
    color: 'text-[#8C6E42] dark:text-[#BC9B66] border-[#A98B56]/30 dark:border-[#A98B56]/40',
    bgColor: 'bg-[#A98B56]/10',
    darkBgColor: 'dark:bg-[#A98B56]/20',
    accentColor: 'bg-[#A98B56]/15 text-[#8C6E42] border border-[#A98B56]/30',
    darkAccentColor: 'dark:bg-[#A98B56]/30 dark:text-[#BC9B66] dark:border-[#A98B56]/50',
    badgeClass: 'bg-[#A98B56]/15 text-[#8C6E42] border border-[#A98B56]/30 dark:bg-[#A98B56]/30 dark:text-[#BC9B66] dark:border-[#A98B56]/50 font-bold px-2.5 py-0.5 rounded-full text-xs inline-flex items-center gap-1.5',
    dotClass: 'bg-[#A98B56] dark:bg-[#BC9B66]',
    hexColorLight: '#A98B56',
    hexColorDark: '#BC9B66',
  },
  {
    id: 'invoice_generated',
    label: 'Invoice Generated',
    parentStage: 'invoice_generated',
    parentLabel: 'Invoice',
    color: 'text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    bgColor: 'bg-emerald-50/50',
    darkBgColor: 'dark:bg-emerald-950/30',
    accentColor: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    darkAccentColor: 'dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700/50',
    badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700/50 font-bold px-2.5 py-0.5 rounded-full text-xs inline-flex items-center gap-1.5',
    dotClass: 'bg-emerald-500 dark:bg-emerald-400',
    hexColorLight: '#047857',
    hexColorDark: '#34D399',
  },
];

export function getStageConfig(stageId?: string): Stage {
  if (!stageId) return STAGES[0];
  const found = STAGES.find(s => s.id === stageId || s.id.toLowerCase() === stageId.toLowerCase());
  if (found) return found;

  // Fallback for custom or legacy status string
  const cleanId = stageId.toLowerCase().replace(/\s+/g, '_');
  const matched = STAGES.find(s => s.id === cleanId || cleanId.includes(s.id));
  return matched || {
    id: stageId,
    label: stageId.replace(/_/g, ' '),
    parentStage: 'screening',
    parentLabel: 'Stage',
    color: 'text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    bgColor: 'bg-slate-50/50',
    darkBgColor: 'dark:bg-slate-900/30',
    accentColor: 'bg-slate-100 text-slate-800 border border-slate-200',
    darkAccentColor: 'dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    badgeClass: 'bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 font-bold px-2.5 py-0.5 rounded-full text-xs inline-flex items-center gap-1.5',
    dotClass: 'bg-slate-500 dark:bg-slate-400',
    hexColorLight: '#64748B',
    hexColorDark: '#94A3B8',
  };
}

export function getStageLabel(stageId?: string): string {
  return getStageConfig(stageId).label;
}

export function getStageBadgeClass(stageId?: string): string {
  return getStageConfig(stageId).badgeClass;
}

export function getStageHexColor(stageId?: string, isDark: boolean = false): string {
  const config = getStageConfig(stageId);
  return isDark ? config.hexColorDark : config.hexColorLight;
}
