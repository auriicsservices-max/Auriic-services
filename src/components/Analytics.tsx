import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { TrendingUp, Users, Target, Briefcase, X, User, Activity, Search } from 'lucide-react';
import Select from 'react-select';
import CandidateModal from './CandidateModal';
import QuotaNotice from './QuotaNotice';
import { useAuth } from '../contexts/AuthContext';
import { useTimezone } from '../contexts/TimezoneContext';

interface StatsProps {
  candidates: any[];
  activityLogs?: any[];
  onShortlist: (id: string, currentStatus: boolean) => Promise<void>;
  onUpdateFollowUp: (id: string, note: string, date: string) => Promise<void>;
  onCompleteFollowUp: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => Promise<void>;
  onUpdateAssignee: (id: string, userId: string) => Promise<void>;
  onContact: (userId: string) => void;
  teamMembers?: Record<string, string>;
  role?: string | null;
  fullTeamList?: any[];
}

export default function Analytics({ 
  candidates, 
  activityLogs = [], 
  onShortlist, 
  onUpdateFollowUp, 
  onCompleteFollowUp, 
  onUpdateNotes, 
  onUpdateAssignee, 
  onContact, 
  teamMembers, 
  role,
  fullTeamList = []
}: StatsProps) {
  const navigate = useNavigate();
  const { quotaExceeded, user } = useAuth();
  const { timezone } = useTimezone();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [skillSearch, setSkillSearch] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [domainSearch, setDomainSearch] = useState('');

  // 1. Filter activityLogs based on user's role and team configuration (Role Visibility)
  const visibleActivityLogs = useMemo(() => {
    return activityLogs.filter(log => {
      if (role === 'admin' || role === 'developer') {
        return true;
      }
      if (role === 'team_leader') {
        if (log.authorUid === user?.uid) return true;
        const userObj = fullTeamList.find(u => u.uid === log.authorUid);
        return userObj && userObj.teamLeaderId === user?.uid;
      }
      return log.authorUid === user?.uid;
    });
  }, [activityLogs, role, user?.uid, fullTeamList]);

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

  const last7DaysInTimezone = useMemo(() => {
    const dates: { dateStr: string; label: string }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const current = new Date();
      current.setDate(today.getDate() - i);
      const dateStr = getDateStringInTimezone(current, timezone);
      const parsed = new Date(dateStr + 'T12:00:00');
      const label = parsed.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', timeZone: timezone });
      dates.push({ dateStr, label });
    }
    return dates;
  }, [timezone]);

  const activityTypeMap = (log: any): string => {
    const action = (log.action || '').toLowerCase();
    const module = (log.module || '').toLowerCase();
    const purpose = (log.purpose || '').toLowerCase();

    if (action === 'uploaded cv' || action.includes('upload') || module.includes('upload')) {
       return 'uploads';
    }
    if (module.includes('parsing') || action.includes('parse') || purpose.includes('parsing')) {
       return 'parsing';
    }
    if (action.includes('shortlist') || module.includes('shortlist')) {
       return 'shortlists';
    }
    if (action.includes('follow-up') || action.includes('followup') || action.includes('reminder') || module.includes('follow-up')) {
       return 'followUps';
    }
    if (action.includes('note') || action.includes('feedback') || purpose.includes('note') || purpose.includes('feedback')) {
       return 'notesFeedback';
    }
    if (action.includes('assign') || module.includes('assignment')) {
       return 'assignments';
    }
    if (action.includes('message') || action.includes('chat') || module.includes('chat')) {
       return 'chatMessages';
    }
    return 'updates';
  };

  const activityFlowData = useMemo(() => {
    return last7DaysInTimezone.map(({ dateStr, label }) => {
      const dailyLogs = visibleActivityLogs.filter(log => {
        const timestamp = log.timestamp?.toDate ? log.timestamp.toDate() : (log.timestamp || null);
        if (!timestamp) return false;
        return getDateStringInTimezone(timestamp, timezone) === dateStr;
      });

      const counts: Record<string, number> = {
        uploads: 0,
        parsing: 0,
        assignments: 0,
        shortlists: 0,
        notesFeedback: 0,
        followUps: 0,
        chatMessages: 0,
        updates: 0,
      };

      dailyLogs.forEach(log => {
        const key = activityTypeMap(log);
        counts[key] = (counts[key] || 0) + 1;
      });

      return {
        date: label,
        fullNameStr: dateStr,
        ...counts
      };
    });
  }, [visibleActivityLogs, last7DaysInTimezone, timezone]);

  // Process recruiter contribution data
  const recruiterData = candidates.reduce((acc: any, c) => {
    const uploaderId = c.uploadedBy || 'System';
    const name = teamMembers?.[uploaderId] || uploaderId;
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  const recruiterChartData = Object.entries(recruiterData)
    .sort((a: any, b: any) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  // Process activity data
  const actionDistribution = visibleActivityLogs.reduce((acc: any, log) => {
    const action = log.action || 'Unknown';
    acc[action] = (acc[action] || 0) + 1;
    return acc;
  }, {});

  const actionChartData = Object.entries(actionDistribution).map(([name, value]) => ({ name, value }));

  // Process domain data
  const domainDataMap = candidates.reduce((acc: any, c) => {
    let d = (c.domainFocus || c.domain || '').trim();
    const domain = (!d) ? 'Unknown Domain' : (d === 'IT' ? 'IT / Software' : d === 'Other' ? 'Others' : d);
    acc[domain] = (acc[domain] || 0) + 1;
    return acc;
  }, {});

  const domainChartData = Object.entries(domainDataMap)
    .sort((a: any, b: any) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const getCandidateDomainNormalized = (c: any) => {
    let d = (c.domainFocus || c.domain || '').trim();
    return (!d) ? 'Unknown Domain' : (d === 'IT' ? 'IT / Software' : d === 'Other' ? 'Others' : d);
  };

  const domainCandidates = useMemo(() => {
    if (!selectedDomain) return [];
    return candidates.filter(c => getCandidateDomainNormalized(c) === selectedDomain);
  }, [candidates, selectedDomain]);

  const domainOptions = useMemo(() => {
    return domainChartData.map((d: any) => ({ value: d.name, label: d.name }));
  }, [domainChartData]);

  const handleDomainClick = (domain: string) => {
    setSelectedDomain(domain);
    setShowDomainModal(true);
  };

  const filteredDomainStandings = useMemo(() => {
    return domainChartData.filter(({ name }) => name.toLowerCase().includes(domainSearch.toLowerCase()));
  }, [domainChartData, domainSearch]);

  // Shortlist conversion data
  const shortlistedCount = candidates.filter(c => c.isShortlisted).length;
  const shortlistChartData = [
    { name: 'Shortlisted', value: shortlistedCount },
    { name: 'Under Review', value: candidates.length - shortlistedCount }
  ];

  // Process skills data (all)
  const skillsMap = candidates.reduce((acc: any, c) => {
    c.skills?.forEach((skill: string) => {
      const s = skill.trim().toUpperCase();
      acc[s] = (acc[s] || 0) + 1;
    });
    return acc;
  }, {});

  const allSkillsData = Object.entries(skillsMap)
    .sort((a: any, b: any) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const filteredCandidates = selectedSkill 
    ? candidates.filter(c => c.skills?.map((s: string) => s.trim().toUpperCase()).includes(selectedSkill))
    : [];

  const handleSkillClick = (skill: string) => {
    setSelectedSkill(skill);
    setShowModal(true);
  };

  const skillOptions = allSkillsData.map((s: any) => ({ value: s.name, label: s.name }));

  const customSelectStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: 'var(--bg-primary)',
      borderColor: 'var(--border-color)',
      borderRadius: '0.75rem',
      padding: '0.25rem',
      boxShadow: 'none',
      cursor: 'pointer',
      '&:hover': {
        borderColor: 'var(--indigo-500)',
      },
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isFocused ? 'var(--sidebar-bg)' : 'var(--bg-primary)',
      color: 'var(--text-primary)',
      fontSize: '0.75rem',
      cursor: 'pointer',
    }),
    menu: (provided: any) => ({ ...provided, backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', borderRadius: '1rem', overflow: 'hidden' }),
    input: (provided: any) => ({ ...provided, color: 'var(--text-primary)' }),
    singleValue: (provided: any) => ({ ...provided, color: 'var(--text-primary)' }),
  };

  const filteredSkills = allSkillsData.filter(({ name }) => name.toLowerCase().includes(skillSearch.toLowerCase()));

  const chartTooltipStyle = { 
    borderRadius: '0.75rem', 
    border: '1px solid var(--border-color)', 
    backgroundColor: 'var(--bg-primary)', 
    color: 'var(--text-primary)',
    fontSize: '0.875rem',
    padding: '0.75rem',
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.2)'
  };
  const itemStyle = { color: 'var(--text-primary)', fontWeight: 'bold' };

  return quotaExceeded ? (
    <div className="flex-1 flex items-center justify-center p-8">
      <QuotaNotice onRetry={() => window.location.reload()} />
    </div>
  ) : (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 text-[var(--text-primary)] pb-12">
      <div className="flex items-center justify-between">
         <h2 className="text-3xl font-serif text-[var(--text-primary)]">Talent Insights</h2>
         <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">Real-time candidate analytics</p>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {[
          { label: 'Total Candidates', value: candidates.length, icon: Users, color: 'text-[#004564] dark:text-[#A98B56]', bg: 'bg-[var(--bg-secondary)]' },
          { label: 'Shortlisted', value: candidates.filter(c => c.isShortlisted).length, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
          { label: 'Unique Domains', value: Object.keys(domainDataMap).length, icon: Briefcase, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40' },
          { label: 'Total Actions', value: activityLogs.length, icon: Activity, color: 'text-[var(--text-secondary)]', bg: 'bg-[var(--bg-secondary)]' },
          { label: 'Avg Skills/CV', value: (candidates.reduce((acc, c) => acc + (c.skills?.length || 0), 0) / (candidates.length || 1)).toFixed(1), icon: TrendingUp, color: 'text-[#A98B56]', bg: 'bg-[var(--bg-secondary)]' },
        ].map((item, idx) => (
          <div key={idx} className="bg-[var(--card-bg)] p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm hover:shadow-md transition-all duration-300">
            <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center ${item.color} mb-4 border border-[var(--border-color)]`}>
              <item.icon size={20} />
            </div>
            <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-widest">{item.label}</p>
            <h3 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{item.value}</h3>
          </div>
        ))}
      </div>

      <div className="w-full">
        {/* Workflow Dynamics / Activity Flow */}
        <section className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--border-color)] shadow-sm flex flex-col font-sans">
          <h3 className="text-xl font-serif text-[var(--text-primary)] mb-6">Activity Flow (Last 7 Days)</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.3} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} itemStyle={itemStyle} />
                <Legend 
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 10, fontWeight: 'bold', paddingTop: 15 }}
                />
                <Bar name="CV Uploads" dataKey="uploads" stackId="a" fill="#CFB57B" />
                <Bar name="Resume Parsing" dataKey="parsing" stackId="a" fill="#BC9B66" />
                <Bar name="Candidate Updates" dataKey="updates" stackId="a" fill="#A98B56" />
                <Bar name="Assignments" dataKey="assignments" stackId="a" fill="#9B7E50" />
                <Bar name="Follow-ups" dataKey="followUps" stackId="a" fill="#8C6E42" />
                <Bar name="Shortlists" dataKey="shortlists" stackId="a" fill="#A08151" />
                <Bar name="Notes/Feedback" dataKey="notesFeedback" stackId="a" fill="#5B4527" />
                <Bar name="Chat Messages" dataKey="chatMessages" stackId="a" fill="#3B2C18" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Domain Distribution Analysis */}
      <section className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--border-color)] shadow-sm flex flex-col font-sans">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-serif text-[var(--text-primary)]">Domain Distribution</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">Candidate count and breakdown by industry focus</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-indigo-600 rounded-full inline-block" />
            <span className="text-xs font-bold text-[var(--text-secondary)]">Parsed Domains</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">Search & Filterwise</p>
              <Select 
                options={domainOptions} 
                onChange={(opt) => opt && handleDomainClick(opt.value)} 
                styles={customSelectStyles} 
                placeholder="Search and view domain..." 
                isClearable 
              />
              <input 
                type="text" 
                placeholder="Filter standings roster..." 
                value={domainSearch} 
                onChange={(e) => setDomainSearch(e.target.value)} 
                className="crm-input text-xs" 
              />
            </div>
            
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">Domain Standings</p>
            <div className="flex flex-col gap-2.5 max-h-[290px] overflow-y-auto pr-1">
              {filteredDomainStandings.map(({ name, value }: any) => {
                const percentage = ((value / (candidates.length || 1)) * 100).toFixed(1);
                return (
                  <button 
                    key={name} 
                    onClick={() => handleDomainClick(name)} 
                    className="flex items-center justify-between p-4 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-xs hover:border-[var(--primary-gold)] hover:bg-[var(--card-hover-bg)] transition-all text-left w-full cursor-pointer"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-extrabold text-xs text-[var(--text-primary)] truncate">{name}</span>
                      <span className="text-[10px] font-medium text-[var(--text-muted)] mt-0.5">{percentage}% of candidates</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-3 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-xs font-black text-[var(--primary-gold)] shadow-xs">{value}</span>
                    </div>
                  </button>
                );
              })}
              {filteredDomainStandings.length === 0 && (
                <div className="text-center py-8 text-xs text-[var(--text-muted)] italic">No matching domains found.</div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 h-[380px] bg-[var(--sidebar-bg)] border border-[var(--border-color)]/40 p-4 rounded-3xl">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={domainChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--text-muted)', fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={chartTooltipStyle} itemStyle={itemStyle} cursor={{ fill: 'var(--border-color)', opacity: 0.1 }} />
                <Bar dataKey="value" name="Candidates" fill="#A98B56" radius={[10, 10, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Skills Analysis */}
      <section className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--border-color)] shadow-sm flex flex-col font-sans">
        <h3 className="text-xl font-serif text-[var(--text-primary)] mb-6">Talent Skillscape</h3>                
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
                <Select options={skillOptions} onChange={(opt) => opt && handleSkillClick(opt.value)} styles={customSelectStyles} placeholder="Search skill..." isClearable />
                <input type="text" placeholder="Search skills overview..." value={skillSearch} onChange={(e) => setSkillSearch(e.target.value)} className="crm-input text-xs" />
                <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
                    {filteredSkills.map(({ name, count }: any) => (
                        <button key={name} title={`Skill: ${name} (${count} candidates)`} onClick={() => handleSkillClick(name)} className="flex items-center justify-between p-3 bg-[var(--card-bg)] rounded-xl hover:bg-[var(--card-hover-bg)] transition-all border border-[var(--border-color)] hover:border-[var(--primary-gold)] cursor-pointer">
                            <span className="font-bold text-xs truncate mr-2 text-[var(--text-primary)]">{name}</span>
                            <span className="px-2 py-1 bg-[var(--bg-secondary)] rounded-md text-[10px] font-bold text-[var(--primary-gold)] border border-[var(--border-color)]">{count}</span>
                        </button>
                    ))}
                </div>
            </div>
            <div className="lg:col-span-2 h-[600px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={allSkillsData} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={chartTooltipStyle} itemStyle={itemStyle} />
                      <Bar dataKey="count" fill="#A98B56" radius={[0, 10, 10, 0]} barSize={20} />
                    </BarChart>
                 </ResponsiveContainer>
            </div>
        </div>
      </section>
      
      {/* Skill Candidates Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--border-color)] w-full max-w-2xl max-h-[80vh] rounded-[2rem] shadow-2xl flex flex-col p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-serif text-[var(--text-primary)]">Candidates with <span className="text-[var(--primary-gold)] font-bold">{selectedSkill}</span> ({filteredCandidates.length})</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-[var(--card-hover-bg)] rounded-full font-sans transition-colors duration-300 cursor-pointer"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto space-y-4 font-sans">
              {filteredCandidates.map(c => (
                <button 
                  key={c.id} 
                  onClick={() => {
                    navigate(`/candidate/${c.id}`);
                    setShowModal(false);
                  }} 
                  className="w-full p-4 border border-[var(--border-color)] rounded-xl flex items-center gap-4 hover:bg-[var(--card-hover-bg)] transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-full flex items-center justify-center font-bold text-sm text-[var(--primary-gold)]">{c.fullName.slice(0,2).toUpperCase()}</div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-sm text-[var(--text-primary)]">{c.fullName}</p>
                    <p className="text-xs text-[var(--text-muted)]">{c.domain}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Domain Candidates Modal */}
      {showDomainModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--border-color)] w-full max-w-2xl max-h-[80vh] rounded-[2rem] shadow-2xl flex flex-col p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-serif text-[var(--text-primary)]">Candidates in <span className="text-[var(--primary-gold)] font-bold">{selectedDomain}</span> ({domainCandidates.length})</h2>
              <button 
                onClick={() => setShowDomainModal(false)} 
                className="p-2 hover:bg-[var(--card-hover-bg)] rounded-full font-sans transition-colors duration-300 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto space-y-4 font-sans">
              {domainCandidates.map(c => (
                <button 
                  key={c.id} 
                  onClick={() => {
                    navigate(`/candidate/${c.id}`);
                    setShowDomainModal(false);
                  }} 
                  className="w-full p-4 border border-[var(--border-color)] rounded-xl flex items-center gap-4 hover:bg-[var(--sidebar-bg)] transition-all"
                >
                  <div className="w-10 h-10 bg-[var(--sidebar-bg)] rounded-full flex items-center justify-center font-bold text-sm text-white">
                    {c.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-sm text-[var(--text-primary)]">{c.fullName}</p>
                    <p className="text-xs text-[#334155]">{c.domainFocus || c.domain || 'N/A'}</p>
                  </div>
                </button>
              ))}
              {domainCandidates.length === 0 && (
                <div className="text-center py-12 text-sm text-[var(--text-muted)] italic">No candidates matched.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
