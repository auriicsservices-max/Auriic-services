import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { TrendingUp, Users, Target, Briefcase, X, User, Activity } from 'lucide-react';
import CandidateModal from './CandidateModal';
import QuotaNotice from './QuotaNotice';
import { useAuth } from '../contexts/AuthContext';

interface StatsProps {
  candidates: any[];
  activityLogs?: any[];
  onShortlist: (id: string, currentStatus: boolean) => Promise<void>;
  onUpdateFollowUp: (id: string, note: string, date: string) => Promise<void>;
  onUpdateNotes: (id: string, notes: string) => Promise<void>;
  onUpdateAssignee: (id: string, userId: string) => Promise<void>;
  onContact: (userId: string) => void;
  teamMembers?: Record<string, string>;
  role?: string | null;
}

export default function Analytics({ candidates, activityLogs = [], onShortlist, onUpdateFollowUp, onUpdateNotes, onUpdateAssignee, onContact, teamMembers, role }: StatsProps) {
  const { quotaExceeded } = useAuth();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);

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
    const domain = c.domain || 'Uncategorized';
    acc[domain] = (acc[domain] || 0) + 1;
    return acc;
  }, {});

  const domainChartData = Object.entries(domainDataMap).map(([name, value]) => ({ name, value }));

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

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];

  const filteredCandidates = selectedSkill 
    ? candidates.filter(c => c.skills?.map((s: string) => s.trim().toUpperCase()).includes(selectedSkill))
    : [];

  const handleSkillClick = (skill: string) => {
    setSelectedSkill(skill);
    setShowModal(true);
  };

  return quotaExceeded ? (
    <div className="flex-1 flex items-center justify-center p-8">
      <QuotaNotice onRetry={() => window.location.reload()} />
    </div>
  ) : (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-[var(--text-primary)]">
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-[var(--card-bg)] p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm transition-colors duration-300 font-sans">
          <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
            <Users size={20} />
          </div>
          <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-widest">Talent Pool</p>
          <h3 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{candidates.length}</h3>
        </div>
        <div className="bg-[var(--card-bg)] p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm transition-colors duration-300 font-sans">
          <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
            <Target size={20} />
          </div>
          <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-widest">Shortlisted</p>
          <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {candidates.filter(c => c.isShortlisted).length}
          </h3>
        </div>
        <div className="bg-[var(--card-bg)] p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm transition-colors duration-300 font-sans">
          <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/40 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4">
            <Briefcase size={20} />
          </div>
          <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-widest">Unique Domains</p>
          <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">
            {Object.keys(domainDataMap).length}
          </h3>
        </div>
        <div className="bg-[var(--card-bg)] p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm transition-colors duration-300 font-sans">
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400 mb-4">
            <Activity size={20} />
          </div>
          <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-widest">Total Actions</p>
          <h3 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{activityLogs.length}</h3>
        </div>
        <div className="bg-[var(--card-bg)] p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm transition-colors duration-300 font-sans">
          <div className="w-10 h-10 bg-indigo-900 dark:bg-indigo-600 rounded-xl flex items-center justify-center text-white mb-4">
            <TrendingUp size={20} />
          </div>
          <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-widest">Avg Skills/CV</p>
          <h3 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            {(candidates.reduce((acc, c) => acc + (c.skills?.length || 0), 0) / (candidates.length || 1)).toFixed(1)}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recruiter Activity Trends */}
        <section className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--border-color)] shadow-sm min-h-[400px] flex flex-col transition-colors duration-300 font-sans">
          <div className="mb-6">
            <h3 className="text-xl font-serif text-[var(--text-primary)] italic">Platform Pulse</h3>
            <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">Activity volume over the last 7 days</p>
          </div>
          <div className="flex-1 w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityTrends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 'bold' }}
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '1rem', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--text-primary)'
                  }}
                />
                <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#4F46E5" 
                    strokeWidth={4} 
                    dot={{ fill: '#4F46E5', strokeWidth: 2, r: 4, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Action Breakdown */}
        <section className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--border-color)] shadow-sm min-h-[400px] flex flex-col transition-colors duration-300 font-sans">
          <div className="mb-6">
            <h3 className="text-xl font-serif text-[var(--text-primary)]">Workflow Dynamics</h3>
            <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">Composition of user actions</p>
          </div>
          <div className="flex-1 w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={actionChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {actionChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '1rem', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--text-primary)'
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Recruiter Contribution (Admin Only) */}
        {role === 'admin' && (
          <section className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--border-color)] shadow-sm min-h-[400px] flex flex-col transition-colors duration-300 font-sans">
            <div className="mb-6">
              <h3 className="text-xl font-serif text-[var(--text-primary)]">Team Contribution</h3>
              <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">CV counts per team member</p>
            </div>
            <div className="flex-1 w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recruiterChartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} hide={recruiterChartData.length > 5} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '1rem', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      backgroundColor: 'var(--card-bg)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Bar dataKey="count" fill="#10B981" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Domain Distribution */}
        <section className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--border-color)] shadow-sm min-h-[400px] flex flex-col transition-colors duration-300 font-sans">
          <div className="mb-6">
            <h3 className="text-xl font-serif text-[var(--text-primary)]">Domain Distribution</h3>
            <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">Industry landscape of talent pool</p>
          </div>
          <div className="flex-1 w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={domainChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {domainChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '1rem', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--text-primary)'
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>


        {/* Top Skills List */}
        <section className="bg-[var(--card-bg)] p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-[var(--border-color)] shadow-sm flex flex-col transition-colors duration-300 font-sans">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-serif text-[var(--text-primary)]">In-Demand Skills</h3>
              <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">Filter talent by expertise</p>
            </div>
            <select 
              onChange={(e) => e.target.value && handleSkillClick(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer transition-all hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm"
              value={selectedSkill || ''}
            >
              <option value="">Select Skill...</option>
              {allSkillsData.map(({ name }: any) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 custom-scrollbar">
            {allSkillsData.map(({ name, count }: any) => (
              <button 
                key={name}
                onClick={() => handleSkillClick(name)}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
              >
                <span className="font-bold text-[var(--text-primary)] uppercase tracking-wider text-[10px] truncate mr-2">{name}</span>
                <span className="px-2 py-1 bg-white dark:bg-slate-700 rounded-md text-[9px] font-bold text-indigo-600 dark:text-indigo-400 shadow-sm whitespace-nowrap">{count}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Skills Graph Section */}
      <section className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--border-color)] shadow-sm transition-colors duration-300 font-sans">
          <div className="mb-6">
            <h3 className="text-xl font-serif text-[var(--text-primary)]">Skills Distribution</h3>
            <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">Volume of talent by core competency</p>
          </div>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={allSkillsData.slice(0, 10)} layout="vertical">
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100} 
                  tick={{ fontSize: 10, fontWeight: 'bold', fill: 'var(--text-muted)' }} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ 
                    borderRadius: '1rem', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--text-primary)'
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#4F46E5" 
                  radius={[0, 10, 10, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
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
          onUpdateNotes={onUpdateNotes}
          onUpdateAssignee={onUpdateAssignee}
          onContact={onContact}
          teamMembers={teamMembers || {}}
        />
      )}
    </div>
  );
}