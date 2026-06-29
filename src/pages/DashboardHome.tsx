import React, { useMemo, useState } from 'react';
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
  ChevronDown 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTimezone } from '../contexts/TimezoneContext';
import { 
  ResponsiveContainer, 
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
      if (role === 'team_leader') {
        if (log.authorUid === user?.uid) return true;
        
        // Find if user is in this team leader's team
        const userObj = fullTeamList.find(u => u.uid === log.authorUid);
        return userObj && userObj.teamLeaderId === user?.uid;
      }
      // Recruiter sees own activities only
      return log.authorUid === user?.uid;
    });
  }, [activityLogs, role, user?.uid, fullTeamList]);

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
      case 'CV Uploads': return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30';
      case 'Resume Parsing': return 'bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900/30';
      case 'Shortlists': return 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30';
      case 'Follow-ups': return 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30';
      case 'Notes/Feedback': return 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30';
      case 'Assignments': return 'bg-fuchsia-50 dark:bg-fuchsia-950/20 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-100 dark:border-fuchsia-900/30';
      case 'Chat Messages': return 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900/30';
      default: return 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30';
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
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] px-4 py-3 rounded-2xl shadow-xl space-y-2 max-w-sm">
          <p className="text-xs font-black text-[var(--text-primary)] border-b border-[var(--border-color)] pb-1 w-full flex items-center gap-1.5 uppercase tracking-wider">
            <Calendar size={12} className="text-indigo-500" /> {label}
          </p>
          <div className="space-y-1">
            {activeItems.length > 0 ? (
              activeItems.map((p: any) => (
                <div key={p.name} className="flex items-center gap-6 text-xs justify-between">
                  <span className="flex items-center gap-1.5 font-medium text-[var(--text-muted)]">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    {p.name}:
                  </span>
                  <span className="font-mono font-black text-indigo-500">{p.value}</span>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-[var(--text-muted)] italic">No actions registered</p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="dashboard-home-container" className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-[var(--text-primary)]">
      {/* Timezone Widget */}
      <TimezoneWidget />

      {/* Welcome & Quote */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        <div className="md:col-span-2 bg-gradient-to-br from-[var(--accent-teal)] to-[var(--accent-purple)] rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col justify-center relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Welcome back, {userName}!</h1>
              <div className="flex items-center gap-4">
                <p className="text-white/80 text-sm max-w-lg mb-0">Let's build a stronger team today.</p>
                <div className="h-4 w-[1px] bg-white/20 hidden sm:block" />
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/90 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                  <Clock size={10} />
                  {formatDate(new Date())}
                </div>
              </div>
            </div>
        </div>
        <div className="bg-[var(--card-bg)] p-6 sm:p-8 rounded-3xl border border-[var(--border-color)] shadow-sm flex flex-col justify-center">
            <h4 className="text-[10px] uppercase font-black text-[var(--text-muted)] tracking-widest mb-3">Daily Insight</h4>
            <p className="font-serif italic text-base sm:text-lg text-[var(--text-primary)]">"{quote}"</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
            { label: 'Total', value: total, icon: Users, color: 'text-[var(--accent-teal)]', bg: 'bg-[var(--accent-teal)]/10' },
            { label: 'New (24h)', value: newCVs, icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'Processed', value: processed, icon: Target, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Shortlisted', value: shortlisted, icon: Star, color: 'text-[var(--accent-purple)]', bg: 'bg-[var(--accent-purple)]/10' },
            { label: 'Follow-ups', value: followUps, icon: Clock, color: 'text-rose-500', bg: 'bg-rose-500/10' },
        ].map((card, i) => (
            <div key={i} className="bg-[var(--card-bg)] p-4 sm:p-5 rounded-2xl border border-[var(--border-color)] shadow-sm">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 ${card.bg} rounded-xl flex items-center justify-center ${card.color} mb-3`}>
                <card.icon size={18} />
            </div>
            <p className="text-[9px] sm:text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider mb-0.5">{card.label}</p>
            <h3 className="text-xl sm:text-2xl font-black text-[var(--text-primary)]">{card.value}</h3>
            </div>
        ))}
      </div>
      
      {/* Activity and Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Recent Activity Card */}
        <div className="bg-[var(--card-bg)] p-6 sm:p-8 rounded-3xl border border-[var(--border-color)] shadow-sm flex flex-col min-h-[460px]">
          <h2 className="text-lg sm:text-xl font-bold mb-6 flex items-center gap-2">
            <Activity size={20} className="text-[var(--accent-teal)]" /> Recent Activity
          </h2>
          <div className="space-y-4 flex-1 overflow-y-auto max-h-[450px] pr-2">
            {sortedRecentLogs.length > 0 ? (
              sortedRecentLogs.slice(0, 15).map((log: any) => {
                const Icon = getLogIcon(log);
                const styleClasses = getLogStyles(log);
                return (
                  <div key={log.id} className="flex gap-4 p-4 rounded-2xl bg-[var(--sidebar-bg)]/30 border border-[var(--border-color)] group hover:bg-[var(--sidebar-bg)]/50 transition-all duration-300">
                    <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 shadow-sm ${styleClasses}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <div>
                          <span className="font-bold text-sm text-[var(--text-primary)] truncate max-w-[140px] inline-block">{log.author}</span>
                          <span className="text-[9px] text-[var(--text-muted)] ml-2 bg-[var(--sidebar-bg)] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border border-[var(--border-color)]">
                            {log.role || 'Recruiter'}
                          </span>
                        </div>
                        <span className="text-[9px] text-[var(--text-muted)] font-mono shrink-0 flex items-center gap-1">
                          <Clock size={9} /> {formatDate(log.timestamp?.toDate ? log.timestamp.toDate() : (log.timestamp || ''))}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] flex-wrap">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400 capitalize">{log.action || 'Applied change'}</span>
                        <span className="text-[var(--text-muted)]">•</span>
                        <span className="font-black text-[var(--text-secondary)]">{log.candidateName || 'Candidate'}</span>
                      </div>
                      {log.purpose && (
                        <p className="text-xs text-[var(--text-muted)] italic font-sans break-words bg-[var(--card-bg)]/50 px-2.5 py-1.5 rounded-xl border border-[var(--border-color)]/50 mt-1">
                          "{log.purpose}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                <Activity size={32} className="text-[var(--text-muted)] opacity-25 mb-3" />
                <span className="text-sm font-bold text-[var(--text-muted)]">No recent activity yet</span>
              </div>
            )}
          </div>
        </div>

        {/* Activity Trends Chart Card */}
        <div className="bg-[var(--card-bg)] p-6 sm:p-8 rounded-3xl border border-[var(--border-color)] shadow-sm flex flex-col min-h-[460px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <TrendingUp size={20} className="text-[var(--accent-purple)]" /> Activity Trends
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <select 
                value={activeRange} 
                onChange={(e) => setActiveRange(e.target.value as any)} 
                className="px-3 py-1.5 bg-[var(--sidebar-bg)] border border-[var(--border-color)] text-xs font-bold rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
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
            <div className="flex flex-wrap gap-4 items-center bg-[var(--sidebar-bg)]/40 p-4 rounded-2xl border border-[var(--border-color)] mb-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex flex-col min-w-[120px]">
                <label className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider mb-1">Start Date</label>
                <input 
                  type="date" 
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  max={customEnd}
                  className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-2.5 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-col min-w-[120px]">
                <label className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider mb-1">End Date</label>
                <input 
                  type="date" 
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  min={customStart}
                  className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-2.5 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Chart Content */}
          <div className="h-[300px] w-full flex-1">
            {totalActivityInPeriod > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.06} />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 9, fontWeight: 'bold', paddingTop: 15 }}
                  />
                  <Line type="monotone" name="CV Uploads" dataKey="CV Uploads" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  <Line type="monotone" name="Resume Parsing" dataKey="Resume Parsing" stroke="#14b8a6" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  <Line type="monotone" name="Candidate Updates" dataKey="Candidate Updates" stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  <Line type="monotone" name="Assignments" dataKey="Assignments" stroke="#d946ef" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  <Line type="monotone" name="Follow-ups" dataKey="Follow-ups" stroke="#f43f5e" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  <Line type="monotone" name="Shortlists" dataKey="Shortlists" stroke="#f59e0b" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  <Line type="monotone" name="Notes/Feedback" dataKey="Notes/Feedback" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  <Line type="monotone" name="Chat Messages" dataKey="Chat Messages" stroke="#8b5cf6" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-color)] rounded-3xl bg-[var(--sidebar-bg)]/20 px-4 py-12 text-center">
                <TrendingUp size={32} className="text-[var(--text-muted)] opacity-20 mb-3" />
                <p className="text-sm font-bold text-[var(--text-muted)]">No activity data available</p>
                <p className="text-[10px] text-[var(--text-muted)]/70 max-w-[240px] mt-1">
                  We elements do not match logs in this reporting timeline. Try switching your date range filter.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
