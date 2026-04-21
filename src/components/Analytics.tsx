import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { TrendingUp, Users, Target, Briefcase } from 'lucide-react';

interface StatsProps {
  candidates: any[];
}

export default function Analytics({ candidates }: StatsProps) {
  // Process domain data
  const domainDataMap = candidates.reduce((acc: any, c) => {
    const domain = c.domain || 'Uncategorized';
    acc[domain] = (acc[domain] || 0) + 1;
    return acc;
  }, {});

  const domainChartData = Object.entries(domainDataMap).map(([name, value]) => ({ name, value }));

  // Process skills data (top 10)
  const skillsMap = candidates.reduce((acc: any, c) => {
    c.skills?.forEach((skill: string) => {
      const s = skill.trim().toUpperCase();
      acc[s] = (acc[s] || 0) + 1;
    });
    return acc;
  }, {});

  const topSkillsData = Object.entries(skillsMap)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
          <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
            <Users size={20} />
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest">Talent Pool</p>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{candidates.length}</h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
          <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
            <Target size={20} />
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest">Shortlisted</p>
          <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {candidates.filter(c => c.isShortlisted).length}
          </h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
          <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4">
            <Briefcase size={20} />
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest">Unique Domains</p>
          <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">
            {Object.keys(domainDataMap).length}
          </h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
          <div className="w-10 h-10 bg-indigo-900 dark:bg-indigo-600 rounded-xl flex items-center justify-center text-white mb-4">
            <TrendingUp size={20} />
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest">Avg Skills/CV</p>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            {(candidates.reduce((acc, c) => acc + (c.skills?.length || 0), 0) / (candidates.length || 1)).toFixed(1)}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Domain Distribution */}
        <section className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm min-h-[400px] flex flex-col transition-colors duration-300">
          <div className="mb-6">
            <h3 className="text-xl font-serif text-slate-800 dark:text-slate-100">Domain Distribution</h3>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500">Industry landscape of talent pool</p>
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
                    backgroundColor: 'var(--color-tooltip-bg)',
                    color: 'var(--color-tooltip-text)'
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-tooltip-text)' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Top Skills */}
        <section className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm min-h-[400px] flex flex-col transition-colors duration-300">
          <div className="mb-6">
            <h3 className="text-xl font-serif text-slate-800 dark:text-slate-100">In-Demand Skills</h3>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500">Most frequent technologies & tools</p>
          </div>
          <div className="flex-1 w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSkillsData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(79, 70, 229, 0.05)' }}
                  contentStyle={{ 
                    borderRadius: '1rem', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    backgroundColor: 'var(--color-tooltip-bg)',
                    color: 'var(--color-tooltip-text)'
                  }}
                  itemStyle={{ color: 'var(--color-tooltip-text)' }}
                />
                <Bar dataKey="count" fill="#4F46E5" radius={[0, 8, 8, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
