import React, { useMemo } from 'react';
import { FileText, Users, Clock, Star, TrendingUp, Target, Upload, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

export default function DashboardHome({ candidates, activityLogs, teamMembers }: { candidates: any[], activityLogs: any[], teamMembers: Record<string, string> }) {
  const { user } = useAuth();
  const userName = user?.uid ? teamMembers[user.uid] || user?.email?.split('@')[0] : user?.email?.split('@')[0];
  
  const total = candidates.length;
  const newCVs = candidates.filter(c => new Date(c.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000).length;
  const processed = candidates.filter(c => c.notes || c.isShortlisted).length;
  
  const quotes = [
    "Your dedication to finding the right talent changes lives.",
    "Small steps in recruitment lead to big impacts in careers.",
    "The right role for the right person is a work of art.",
    "Efficiency in parsing is efficiency in empowering talent."
  ];
  const quote = useMemo(() => quotes[Math.floor(Math.random() * quotes.length)], []);

  // Simplified chart data
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
    }).reverse();
    return last7Days.map(date => ({ 
        date: date.split('-').slice(1).join('/'),
        count: activityLogs.filter(log => (log.timestamp?.toDate ? log.timestamp.toDate().toISOString() : log.timestamp)?.startsWith(date)).length 
    }));
  }, [activityLogs]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans text-[var(--text-primary)]">
      {/* Welcome & Quote */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-[2.5rem] p-8 text-white shadow-xl flex flex-col justify-between">
            <div className="flex flex-col justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Welcome back, {userName}!</h1>
                <p className="text-indigo-200 text-sm max-w-lg mb-6">Let's build a stronger team today.</p>
              </div>
            </div>
        </div>
        <div className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--border-color)] shadow-sm flex flex-col justify-center">
            <h4 className="text-[10px] uppercase font-black text-[var(--text-muted)] tracking-widest mb-4">Daily Insight</h4>
            <p className="font-serif italic text-lg text-[var(--text-primary)]">"{quote}"</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--card-bg)] p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-300 mb-4">
             <Users size={24} />
          </div>
          <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-widest mb-1">Total Candidates</p>
          <h3 className="text-3xl font-bold tracking-tight">{total}</h3>
        </div>
        <div className="bg-[var(--card-bg)] p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/40 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-300 mb-4">
             <FileText size={24} />
          </div>
          <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-widest mb-1">New CVs (24h)</p>
          <h3 className="text-3xl font-bold tracking-tight">{newCVs}</h3>
        </div>
        <div className="bg-[var(--card-bg)] p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/40 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-300 mb-4">
             <Target size={24} />
          </div>
          <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-widest mb-1">Processed CVs</p>
          <h3 className="text-3xl font-bold tracking-tight">{processed}</h3>
        </div>
      </div>
      
      {/* Activity and Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[var(--card-bg)] p-8 rounded-[2rem] border border-[var(--border-color)] shadow-sm">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Activity size={20} className='text-indigo-600'/> Recent Activity</h2>
          <div className="space-y-4">
               {activityLogs.slice(0, 5).map((log: any) => (
                   <div key={log.id} className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--sidebar-bg)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                       <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500">
                           {log.action?.slice(0, 1).toUpperCase()}
                       </div>
                       <div className="flex-1">
                           <p className="text-sm font-bold text-[var(--text-primary)]">{log.action}</p>
                           <p className="text-[10px] text-[var(--text-muted)] font-mono">{new Date(log.timestamp?.toDate ? log.timestamp.toDate() : log.timestamp).toLocaleString()}</p>
                       </div>
                   </div>
               ))}
          </div>
        </div>
        <div className="bg-[var(--card-bg)] p-8 rounded-[2rem] border border-[var(--border-color)] shadow-sm">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><TrendingUp size={20} className='text-emerald-600'/> Activity Trends</h2>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" hide />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
