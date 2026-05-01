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
  const shortlisted = candidates.filter(c => c.isShortlisted).length;
  const followUps = candidates.filter(c => !!c.followUpDate).length;
  
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
    <div id="dashboard-home-container" className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-[var(--text-primary)]">
      {/* Welcome & Quote */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        <div className="md:col-span-2 bg-gradient-to-br from-[var(--accent-teal)] to-[var(--accent-purple)] rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col justify-center">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Welcome back, {userName}!</h1>
            <p className="text-white/80 text-sm max-w-lg mb-0">Let's build a stronger team today.</p>
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
      
      {/* Activity and Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <div className="bg-[var(--card-bg)] p-6 sm:p-8 rounded-3xl border border-[var(--border-color)] shadow-sm">
          <h2 className="text-lg sm:text-xl font-bold mb-6 flex items-center gap-2"><Activity size={20} className='text-[var(--accent-teal)]'/> Recent Activity</h2>
          <div className="space-y-4">
               {activityLogs.slice(0, 5).map((log: any) => (
                   <div key={log.id} className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-secondary)] transition-colors">
                       <div className="w-8 h-8 rounded-full bg-[var(--border-color)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)]">
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
        <div className="bg-[var(--card-bg)] p-6 sm:p-8 rounded-3xl border border-[var(--border-color)] shadow-sm">
          <h2 className="text-lg sm:text-xl font-bold mb-6 flex items-center gap-2"><TrendingUp size={20} className='text-[var(--accent-purple)]'/> Activity Trends</h2>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" hide />
                <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                <Line type="monotone" dataKey="count" stroke="var(--accent-purple)" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
