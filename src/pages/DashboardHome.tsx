import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import TimezoneWidget from '../components/TimezoneWidget';
import { 
  FileText, 
  Users, 
  Clock, 
  Star, 
  TrendingUp, 
  Target, 
  Upload, 
  Activity, 
  Calendar, 
  Shield, 
  MapPin, 
  MessageSquare, 
  ChevronDown,
  ArrowUpRight,
  TrendingDown,
  Sparkles,
  ChevronRight,
  Bell
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTimezone } from '../contexts/TimezoneContext';
import { 
  ResponsiveContainer, 
  AreaChart,
  Area,
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';

// Helper to convert date to ISO YYYY-MM-DD string in specific timezone
const getDateStringInTimezone = (dateInput: Date | string | number, tz: string) => {
  const d = new Date(dateInput);
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(d);
    const month = parts.find(p => p.type === 'month')?.value || '01';
    const day = parts.find(p => p.type === 'day')?.value || '01';
    const year = parts.find(p => p.type === 'year')?.value || '1970';
    return `${year}-${month}-${day}`;
  } catch (error) {
    return d.toISOString().split('T')[0];
  }
};

// Map activity logs to specific categories required for Activity Trends Chart
const getActivityType = (log: any): string => {
  const action = (log.action || '').toLowerCase();
  const module = (log.module || '').toLowerCase();
  const purpose = (log.purpose || '').toLowerCase();

  if (action === 'uploaded cv' || action.includes('upload') || module.includes('upload')) {
    return 'CV Uploads';
  }
  if (module.includes('parsing') || action.includes('parse') || purpose.includes('parsing')) {
    return 'Resume Parsing';
  }
  if (action.includes('shortlist') || module.includes('shortlist')) {
    return 'Shortlists';
  }
  if (action.includes('follow-up') || action.includes('followup') || action.includes('reminder') || module.includes('follow-up')) {
    return 'Follow-ups';
  }
  if (action.includes('note') || action.includes('feedback') || purpose.includes('note') || purpose.includes('feedback')) {
    return 'Notes/Feedback';
  }
  if (action.includes('assign') || module.includes('assignment')) {
    return 'Assignments';
  }
  if (action.includes('message') || action.includes('chat') || module.includes('chat')) {
    return 'Chat Messages';
  }
  return 'Candidate Updates'; // default for notes/skills/personal update actions
};

export default function DashboardHome({ 
  candidates, 
  activityLogs = [], 
  teamMembers = {}, 
  fullTeamList = [] 
}: { 
  candidates: any[], 
  activityLogs: any[], 
  teamMembers: Record<string, string>, 
  fullTeamList?: any[] 
}) {
  const { user, role } = useAuth();
  const { formatDate, timezone } = useTimezone();
  const userName = user?.uid ? teamMembers[user.uid] || user?.email?.split('@')[0] : user?.email?.split('@')[0];
  
  // Date/range filters for Trends chart
  const [activeRange, setActiveRange] = useState<'7days' | '30days' | 'thisMonth' | 'custom'>('7days');
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().split('T')[0]);

  // KPI calculations
  const total = candidates.length;
  const newCVs = candidates.filter(c => new Date(c.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000).length;
  const processed = candidates.filter(c => c.notes || c.isShortlisted).length;
  const shortlisted = candidates.filter(c => c.isShortlisted).length;
  const followUps = candidates.filter(c => !!c.followUpDate).length;
  
  const quotes = [
    "Your dedication to finding the right talent changes lives.",
    "Small steps in recruitment lead to big impacts in careers.",
    "The right role for the right person is a work of art.",
    "Efficiency in parsing is efficiency in empowering talent."
  ];
  const quote = useMemo(() => quotes[Math.floor(Math.random() * quotes.length)], []);

  // 1. Filter activityLogs based on user's role and team configuration (Role Visibility)
  const visibleActivityLogs = useMemo(() => {
    return activityLogs.filter(log => {
      if (role === 'admin' || role === 'developer') {
        return true;
      }
      if (role === 'client') {
        const clientCandidateNames = new Set(candidates.map(c => (c.fullName || '').trim().toLowerCase()));
        return log.candidateName && clientCandidateNames.has(log.candidateName.trim().toLowerCase());
      }
      if (role === 'team_leader') {
        if (log.authorUid === user?.uid) return true;
        
        // Find if user is in this team leader's team
        const userObj = fullTeamList.find(u => u.uid === log.authorUid);
        return userObj && userObj.teamLeaderId === user?.uid;
      }
      // Recruiter sees own activities only
      return log.authorUid === user?.uid;
    });
  }, [activityLogs, role, user?.uid, fullTeamList, candidates]);

  // 2. Sort visible logs by timestamp DESC for the "Recent Activity" list
  const sortedRecentLogs = useMemo(() => {
    return [...visibleActivityLogs].sort((a, b) => {
      const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
      const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
      return timeB - timeA;
    });
  }, [visibleActivityLogs]);

  // Get module icon for cards
  const getLogIcon = (log: any) => {
    const actType = getActivityType(log);
    switch (actType) {
      case 'CV Uploads': return Upload;
      case 'Resume Parsing': return FileText;
      case 'Shortlists': return Star;
      case 'Follow-ups': return Clock;
      case 'Notes/Feedback': return FileText;
      case 'Assignments': return Users;
      case 'Chat Messages': return MessageSquare;
      default: return Activity;
    }
  };

  const getLogStyles = (log: any) => {
    const actType = getActivityType(log);
    switch (actType) {
      case 'CV Uploads': return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100/50 dark:border-emerald-900/30';
      case 'Resume Parsing': return 'bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 border-teal-100/50 dark:border-teal-900/30';
      case 'Shortlists': return 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100/50 dark:border-amber-900/30';
      case 'Follow-ups': return 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100/50 dark:border-rose-900/30';
      case 'Notes/Feedback': return 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100/50 dark:border-blue-900/30';
      case 'Assignments': return 'bg-fuchsia-50 dark:bg-fuchsia-950/30 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-100/50 dark:border-fuchsia-900/30';
      case 'Chat Messages': return 'bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border-violet-100/50 dark:border-violet-900/30';
      default: return 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-100/50 dark:border-indigo-900/30';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.trim().split(/\s+/).map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // 3. Activity Trends daily chart grouping
  const chartData = useMemo(() => {
    const dates: { dateStr: string; label: string }[] = [];
    const today = new Date();
    
    let start = new Date();
    let end = new Date();
    
    if (activeRange === '7days') {
      start.setDate(today.getDate() - 6);
    } else if (activeRange === '30days') {
      start.setDate(today.getDate() - 29);
    } else if (activeRange === 'thisMonth') {
      const tempStr = getDateStringInTimezone(today, timezone);
      const parts = tempStr.split('-');
      start = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
    } else if (activeRange === 'custom' && customStart && customEnd) {
      start = new Date(customStart + 'T00:00:00');
      end = new Date(customEnd + 'T23:59:59');
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const current = new Date(start);
    const maxSafeDays = 366; 
    let safety = 0;

    while (current <= end && safety < maxSafeDays) {
      const dateStr = getDateStringInTimezone(current, timezone);
      // Construct midday date object to safely format month/day label
      const parsed = new Date(dateStr + 'T12:00:00');
      const label = parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: timezone });
      
      dates.push({ dateStr, label });
      current.setDate(current.getDate() + 1);
      safety++;
    }

    // Map logs to generated dates
    return dates.map(({ dateStr, label }) => {
      // Find visible logs matching this day
      const logsOnDay = visibleActivityLogs.filter(log => {
        const timestamp = log.timestamp?.toDate ? log.timestamp.toDate() : (log.timestamp || null);
        if (!timestamp) return false;
        return getDateStringInTimezone(timestamp, timezone) === dateStr;
      });

      const dayCounts: Record<string, number> = {
        'CV Uploads': 0,
        'Resume Parsing': 0,
        'Shortlists': 0,
        'Follow-ups': 0,
        'Notes/Feedback': 0,
        'Assignments': 0,
        'Chat Messages': 0,
        'Candidate Updates': 0
      };

      logsOnDay.forEach(log => {
        const type = getActivityType(log);
        dayCounts[type] = (dayCounts[type] || 0) + 1;
      });

      return {
        date: label,
        fullNameStr: dateStr,
        ...dayCounts
      };
    });
  }, [visibleActivityLogs, activeRange, customStart, customEnd, timezone]);

  // Determine if there is any data in the plotted period
  const totalActivityInPeriod = useMemo(() => {
    return chartData.reduce((acc, curr) => {
      return acc + 
        (curr['CV Uploads'] || 0) + 
        (curr['Resume Parsing'] || 0) + 
        (curr['Shortlists'] || 0) + 
        (curr['Follow-ups'] || 0) + 
        (curr['Notes/Feedback'] || 0) + 
        (curr['Assignments'] || 0) + 
        (curr['Chat Messages'] || 0) + 
        (curr['Candidate Updates'] || 0);
    }, 0);
  }, [chartData]);

  // Custom Recharts Tooltip showing active counts nicely
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const activeItems = payload.filter((p: any) => (p.value || 0) > 0);
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-xl space-y-2.5 max-w-sm">
          <p className="text-[10px] font-black text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-1.5 w-full flex items-center gap-1.5 uppercase tracking-wider">
            <Calendar size={12} className="text-indigo-500" /> {label}
          </p>
          <div className="space-y-1">
            {activeItems.length > 0 ? (
              activeItems.map((p: any) => (
                <div key={p.name} className="flex items-center gap-6 text-xs justify-between">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-500 dark:text-slate-450 text-[11px]">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    {p.name}:
                  </span>
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-xs">{p.value}</span>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-slate-400 italic">No actions registered</p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="dashboard-home-container" className="space-y-6 sm:space-y-8 text-[var(--text-primary)]">
      {/* Timezone Widget */}
      <TimezoneWidget />

      {/* Welcome & Quote Banner with high-contrast luxury styling */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-r from-blue-2d38 via-blue-4564 to-blue-3649 rounded-[2rem] p-8 text-white border border-gold-bc9b/20 shadow-xl flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-8 -top-8 w-48 h-48 bg-gold-a98b/10 rounded-full blur-3xl group-hover:bg-gold-a98b/15 transition-all duration-700" />
          <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-gold-bc9b/10 rounded-full blur-3xl group-hover:bg-gold-bc9b/15 transition-all duration-700" />
          
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-2 text-gold-bc9b font-extrabold text-[10px] uppercase tracking-[0.2em] bg-gold-a98b/10 px-3 py-1 rounded-full border border-gold-a98b/25 w-fit">
              <Sparkles size={11} className="text-gold-a98b animate-pulse" />
              <span>Talent Operations Intelligence</span>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-none bg-gradient-to-r from-white via-gold-bc9b to-gold-a98b bg-clip-text text-transparent">
                Welcome back, {userName}!
              </h1>
              <p className="text-slate-200/90 text-xs sm:text-sm font-medium max-w-lg">
                Your high-performance recruitment database is parsed, indexed, and synchronized. Let's make stellar hires today.
              </p>
            </div>
          </div>
          
          <div className="relative z-10 flex items-center gap-4 mt-8 pt-4 border-t border-white/5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gold-bc9b bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
              <Clock size={12} className="text-gold-a98b" />
              <span>{formatDate(new Date())}</span>
            </div>
            <div className="text-[10px] text-white/45 font-semibold uppercase tracking-wider">
              System State: Active
            </div>
          </div>
        </div>
        
        <div className="bg-[var(--card-bg)] p-8 rounded-[2rem] border border-[var(--border-color)] shadow-sm flex flex-col justify-between relative card-hover-effect">
          <div>
            <span className="inline-flex items-center justify-center p-2 rounded-xl bg-gold-bc9b/10 dark:bg-gold-a98b/20 text-gold-a98b mb-6">
              <Sparkles size={16} />
            </span>
            <h4 className="text-[10px] uppercase font-black text-[var(--text-muted)] tracking-[0.15em] mb-2">Daily Inspiration</h4>
            <p className="font-serif italic text-base sm:text-lg text-[var(--text-primary)] leading-relaxed">
              "{quote}"
            </p>
          </div>
          <p className="text-[10px] text-gold-a98b font-bold uppercase tracking-wider mt-6">
            Talent Insights Advisor
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Index', value: total, icon: Users, color: 'text-blue-5472', bg: 'bg-blue-5472/10', border: 'border-blue-5472/20' },
          { label: 'New (24h)', value: newCVs, icon: FileText, color: 'text-gold-a98b', bg: 'bg-gold-a98b/10', border: 'border-gold-a98b/20' },
          { label: 'Processed', value: processed, icon: Target, color: 'text-gold-bc9b', bg: 'bg-gold-bc9b/10', border: 'border-gold-bc9b/20' },
          { label: 'Shortlisted', value: shortlisted, icon: Star, color: 'text-gold-9b7e', bg: 'bg-gold-9b7e/10', border: 'border-gold-9b7e/20' },
          { label: 'Follow-ups', value: followUps, icon: Clock, color: 'text-blue-3e51', bg: 'bg-blue-3e51/10', border: 'border-blue-3e51/20' },
        ].map((card, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="bg-[var(--card-bg)] p-5 rounded-[2rem] border border-[var(--border-color)] shadow-[var(--card-shadow)] card-hover-effect"
          >
            <div className={`w-10 h-10 bg-[var(--bg-secondary)] rounded-2xl flex items-center justify-center text-[var(--brand-color)] mb-4 shadow-sm`}>
              <card.icon size={18} />
            </div>
            <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-wider mb-1">{card.label}</p>
            <h3 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">{card.value}</h3>
          </motion.div>
        ))}
      </div>
      
      {/* Activity and Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:gap-8">

        {/* Activity Trends Chart Card */}
        <div className="bg-[var(--card-bg)] p-6 sm:p-8 rounded-[2rem] border border-[var(--border-color)] shadow-sm flex flex-col min-h-[480px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-900">
            <h2 className="text-base sm:text-lg font-black uppercase tracking-wider flex items-center gap-2.5 text-slate-900 dark:text-white">
              <span className="p-1.5 rounded-lg bg-gold-bc9b/15 text-gold-a98b">
                <TrendingUp size={16} />
              </span>
              Productivity Analytics
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <select 
                value={activeRange} 
                onChange={(e) => setActiveRange(e.target.value as any)} 
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-[var(--border-color)] text-xs font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-a98b cursor-pointer text-slate-700 dark:text-slate-300"
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="thisMonth">This Month</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>
          </div>

          {/* Conditional Custom Date pickers */}
          {activeRange === 'custom' && (
            <div className="flex flex-wrap gap-4 items-center bg-slate-50 dark:bg-slate-900/45 p-4 rounded-2xl border border-[var(--border-color)] mb-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex flex-col min-w-[120px]">
                <label className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider mb-1">Start Date</label>
                <input 
                  type="date" 
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  max={customEnd}
                  className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-2.5 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-gold-a98b font-bold"
                />
              </div>
              <div className="flex flex-col min-w-[120px]">
                <label className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider mb-1">End Date</label>
                <input 
                  type="date" 
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  min={customStart}
                  className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-2.5 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-gold-a98b font-bold"
                />
              </div>
            </div>
          )}

          {/* Chart Content */}
          <div className="h-[300px] w-full flex-1 mt-2">
            {totalActivityInPeriod > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.03} />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} fontWeight="bold" tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} fontWeight="bold" tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: 20 }}
                  />
                  <Line type="monotone" name="CV Uploads" dataKey="CV Uploads" stroke="#BC9B66" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                  <Line type="monotone" name="Resume Parsing" dataKey="Resume Parsing" stroke="#A98B56" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                  <Line type="monotone" name="Candidate Updates" dataKey="Candidate Updates" stroke="#004564" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                  <Line type="monotone" name="Assignments" dataKey="Assignments" stroke="#005472" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                  <Line type="monotone" name="Follow-ups" dataKey="Follow-ups" stroke="#9B7E50" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                  <Line type="monotone" name="Shortlists" dataKey="Shortlists" stroke="#A08151" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                  <Line type="monotone" name="Notes/Feedback" dataKey="Notes/Feedback" stroke="#003E51" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                  <Line type="monotone" name="Chat Messages" dataKey="Chat Messages" stroke="#003649" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-color)] rounded-[2rem] bg-slate-50/50 dark:bg-slate-900/10 px-4 py-12 text-center">
                <TrendingUp size={32} className="text-slate-400 opacity-20 mb-3 animate-pulse" />
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">No activity data registered</p>
                <p className="text-[10px] text-slate-400/80 max-w-[240px] mt-1.5 font-medium">
                  We did not detect actions matching your filters. Try selecting a broader reporting timeline.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
