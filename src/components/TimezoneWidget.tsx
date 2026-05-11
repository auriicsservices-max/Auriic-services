import React, { useState, useEffect } from 'react';
import { useTimezone } from '../contexts/TimezoneContext';
import { Clock } from 'lucide-react';

export default function TimezoneWidget() {
  const { timezone, setTimezone } = useTimezone();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const tzLabel = timezone === 'Europe/London' ? 'London / UK' : 'Mumbai / India';
  const tzAbbr = timezone === 'Europe/London' ? 'BST' : 'IST';
  const displayTime = currentTime.toLocaleTimeString('en-GB', { 
    timeZone: timezone, 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
    hour12: true 
  }).toUpperCase();

  return (
    <div className="px-4 mb-2">
      <div 
        onClick={() => setTimezone(timezone === 'Europe/London' ? 'Asia/Kolkata' : 'Europe/London')}
        className="cursor-pointer group p-4 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-indigo-500/50 transition-all duration-300 shadow-sm overflow-hidden relative"
      >
        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
          <Clock size={48} className="text-indigo-600" />
        </div>
        
        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              {tzLabel}
            </span>
          </div>
          <div className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-black border border-indigo-500/20">
            {tzAbbr}
          </div>
        </div>

        <div className="text-2xl font-black tracking-tighter text-[var(--text-primary)] font-mono leading-none relative z-10">
          {displayTime}
        </div>

        <div className="mt-4 flex items-center justify-between text-[8px] font-bold uppercase tracking-widest text-[var(--text-muted)] relative z-10">
          <div className="flex items-center gap-1">
            <Clock size={10} />
            {new Intl.DateTimeFormat('en-GB', { 
              timeZone: timezone, 
              day: 'numeric', 
              month: 'short', 
              year: 'numeric' 
            }).format(currentTime)}
          </div>
          <span className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
            Tap to Switch
          </span>
        </div>
      </div>
    </div>
  );
}
