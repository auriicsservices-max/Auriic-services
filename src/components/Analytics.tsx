import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { TrendingUp, Users, Target, Briefcase, X, User, Activity, Search } from 'lucide-react';
import Select from 'react-select';
import CandidateModal from './CandidateModal';
import QuotaNotice from './QuotaNotice';
import { useAuth } from '../contexts/AuthContext';

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
}

export default function Analytics({ candidates, activityLogs = [], onShortlist, onUpdateFollowUp, onCompleteFollowUp, onUpdateNotes, onUpdateAssignee, onContact, teamMembers, role }: StatsProps) {
  const { quotaExceeded } = useAuth();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [skillSearch, setSkillSearch] = useState('');

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
  const actionDistribution = activityLogs.reduce((acc: any, log) => {
    const action = log.action || 'Unknown';
    acc[action] = (acc[action] || 0) + 1;
    return acc;
  }, {});

  const actionChartData = Object.entries(actionDistribution).map(([name, value]) => ({ name, value }));

  // Activity over time (Last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const activityTrends = last7Days.map(date => {
    const count = activityLogs.filter(log => {
      const timestamp = log.timestamp?.toDate ? log.timestamp.toDate().toISOString() : (log.timestamp || '');
      return typeof timestamp === 'string' && timestamp.startsWith(date);
    }).length;
    return { date: date.split('-').slice(1).join('/'), count };
  });

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

  // Detailed Activity Flow data
  const activityFlowData = last7Days.map(date => {
    const dailyLogs = activityLogs.filter(log => {
      const timestamp = log.timestamp?.toDate ? log.timestamp.toDate().toISOString() : (log.timestamp || '');
      return typeof timestamp === 'string' && timestamp.startsWith(date);
    });

    return {
      date: date.split('-').slice(1).join('/'),
      uploads: dailyLogs.filter(l => l.action?.toLowerCase().includes('upload')).length,
      parsing: dailyLogs.filter(l => l.action?.toLowerCase().includes('parse')).length,
      assignments: dailyLogs.filter(l => l.action?.toLowerCase().includes('assign')).length,
      shortlists: dailyLogs.filter(l => l.action?.toLowerCase().includes('shortlist')).length,
      notes: dailyLogs.filter(l => l.action?.toLowerCase().includes('note')).length,
    };
  });

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
          { label: 'Total Candidates', value: candidates.length, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
          { label: 'Shortlisted', value: candidates.filter(c => c.isShortlisted).length, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/40' },
          { label: 'Unique Domains', value: Object.keys(domainDataMap).length, icon: Briefcase, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/40' },
          { label: 'Total Actions', value: activityLogs.length, icon: Activity, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800' },
          { label: 'Avg Skills/CV', value: (candidates.reduce((acc, c) => acc + (c.skills?.length || 0), 0) / (candidates.length || 1)).toFixed(1), icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-900 dark:bg-indigo-600' },
        ].map((item, idx) => (
          <div key={idx} className="bg-[var(--card-bg)] p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm hover:shadow-md transition-all duration-300">
            <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center ${item.color} mb-4`}>
              <item.icon size={20} />
            </div>
            <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-widest">{item.label}</p>
            <h3 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{item.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Platform Pulse */}
        <section className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--border-color)] shadow-sm flex flex-col font-sans">
          <h3 className="text-xl font-serif text-[var(--text-primary)] italic mb-6">Platform Pulse</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityTrends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={chartTooltipStyle} itemStyle={itemStyle} />
                <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={4} dot={{ fill: '#4F46E5', strokeWidth: 2, r: 4, stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Workflow Dynamics */}
        <section className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--border-color)] shadow-sm flex flex-col font-sans">
          <h3 className="text-xl font-serif text-[var(--text-primary)] mb-6">Activity Flow</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityFlowData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={chartTooltipStyle} itemStyle={itemStyle} />
                <Legend />
                <Bar dataKey="uploads" stackId="a" fill="#4F46E5" />
                <Bar dataKey="parsing" stackId="a" fill="#10B981" />
                <Bar dataKey="assignments" stackId="a" fill="#F59E0B" />
                <Bar dataKey="shortlists" stackId="a" fill="#EF4444" />
                <Bar dataKey="notes" stackId="a" fill="#8B5CF6" />
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
          <div className="lg:col-span-1 flex flex-col gap-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">Domain Standings</p>
            <div className="flex flex-col gap-2.5 max-h-[350px] overflow-y-auto pr-1">
              {domainChartData.map(({ name, value }: any) => {
                const percentage = ((value / (candidates.length || 1)) * 100).toFixed(1);
                return (
                  <div key={name} className="flex items-center justify-between p-4 bg-[var(--sidebar-bg)] border border-[var(--border-color)]/60 rounded-2xl shadow-xs hover:border-indigo-400/50 transition-all">
                    <div className="flex flex-col min-w-0">
                      <span className="font-extrabold text-xs text-[var(--text-primary)] truncate">{name}</span>
                      <span className="text-[10px] font-medium text-[var(--text-muted)] mt-0.5">{percentage}% of candidates</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 rounded-xl text-xs font-black text-indigo-600 dark:text-indigo-400 shadow-sm">{value}</span>
                    </div>
                  </div>
                );
              })}
              {domainChartData.length === 0 && (
                <div className="text-center py-8 text-xs text-[var(--text-muted)] italic">No domains recorded yet.</div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 h-[350px] bg-[var(--sidebar-bg)] border border-[var(--border-color)]/40 p-4 rounded-3xl">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={domainChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--text-muted)', fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={chartTooltipStyle} itemStyle={itemStyle} cursor={{ fill: 'var(--border-color)', opacity: 0.1 }} />
                <Bar dataKey="value" name="Candidates" fill="#4f46e5" radius={[10, 10, 0, 0]} barSize={36} />
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
                <input type="text" placeholder="Search skills overview..." value={skillSearch} onChange={(e) => setSkillSearch(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-xs font-bold text-[var(--text-primary)] shadow-sm" />
                <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
                    {filteredSkills.map(({ name, count }: any) => (
                        <button key={name} title={`Skill: ${name} (${count} candidates)`} onClick={() => handleSkillClick(name)} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all border border-transparent hover:border-indigo-300 dark:hover:border-indigo-500">
                            <span className="font-bold text-xs truncate mr-2 text-[var(--text-primary)]">{name}</span>
                            <span className="px-2 py-1 bg-white dark:bg-slate-800 rounded-md text-[10px] font-bold text-indigo-600 shadow-sm">{count}</span>
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
                      <Bar dataKey="count" fill="#4F46E5" radius={[0, 10, 10, 0]} barSize={20} />
                    </BarChart>
                 </ResponsiveContainer>
            </div>
        </div>
      </section>
      
      {/* Skill Candidates Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] w-full max-w-2xl max-h-[80vh] rounded-[2rem] shadow-2xl flex flex-col p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-serif text-[var(--text-primary)]">Candidates with <span className="text-indigo-600">{selectedSkill}</span> ({filteredCandidates.length})</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full font-sans transition-colors duration-300"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto space-y-4 font-sans">
              {filteredCandidates.map(c => (
                <button key={c.id} onClick={() => setSelectedCandidate(c)} className="w-full p-4 border border-[var(--border-color)] rounded-xl flex items-center gap-4 hover:bg-[var(--sidebar-bg)] transition-all">
                  <div className="w-10 h-10 bg-[var(--sidebar-bg)] rounded-full flex items-center justify-center font-bold text-sm text-slate-500">{c.fullName.slice(0,2).toUpperCase()}</div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-sm">{c.fullName}</p>
                    <p className="text-xs text-slate-500">{c.domain}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedCandidate && (
        <CandidateModal 
          isOpen={true}
          candidate={selectedCandidate} 
          onClose={() => setSelectedCandidate(null)} 
          onShortlist={onShortlist} 
          onUpdateFollowUp={onUpdateFollowUp}
          onCompleteFollowUp={onCompleteFollowUp}
          onUpdateNotes={onUpdateNotes}
          onUpdateAssignee={onUpdateAssignee}
          onContact={onContact}
          teamMembers={teamMembers || {}}
        />
      )}
    </div>
  );
}
