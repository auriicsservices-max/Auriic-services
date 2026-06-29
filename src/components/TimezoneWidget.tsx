import React, { useState, useEffect } from 'react';

// Configuration for timezones
const TZ_DATA = [
  { id: 'Asia/Kolkata', label: 'Mumbai / India', abbr: 'IST', offset: '+05:30' },
  { id: 'Europe/London', label: 'London / UK', abbr: 'GMT/BST', offset: 'variable' },
  { id: 'America/New_York', label: 'New York / US', abbr: 'EST/EDT', offset: 'variable' },
  { id: 'America/Los_Angeles', label: 'Los Angeles / US', abbr: 'PST/PDT', offset: 'variable' },
];

function formatTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function isWorkingHours(date: Date, timeZone: string) {
    const hours = parseInt(new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', hour12: false }).format(date));
    const day = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' }).format(date);
    return hours >= 9 && hours < 18 && day !== 'Saturday' && day !== 'Sunday';
}

function getRelativeDay(date: Date, timeZoneIST: string, timeZoneLocal: string) {
    const dIST = new Date(date.toLocaleString('en-US', { timeZone: timeZoneIST }));
    const dLocal = new Date(date.toLocaleString('en-US', { timeZone: timeZoneLocal }));
    
    dIST.setHours(0,0,0,0);
    dLocal.setHours(0,0,0,0);
    
    const diff = (dLocal.getTime() - dIST.getTime()) / (1000 * 60 * 60 * 24);
    
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    return `${diff > 0 ? '+' : ''}${diff} days`;
}

function getTimeDifference(date: Date, timeZoneLocal: string) {
    const now = new Date();
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const localTime = new Date(now.toLocaleString('en-US', { timeZone: timeZoneLocal }));
    
    const diffInMs = localTime.getTime() - istTime.getTime();
    const diffInHours = Math.round(diffInMs / (1000 * 60));
    
    const h = Math.floor(Math.abs(diffInHours) / 60);
    const m = Math.abs(diffInHours) % 60;
    
    const sign = diffInHours >= 0 ? '+' : '-';
    return `${sign}${h}h ${m}m`;
}

export default function TimezoneWidget() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">World Clock</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TZ_DATA.map((tz) => {
          const working = isWorkingHours(now, tz.id);
          return (
            <div key={tz.id} className="relative p-3 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <div className={`absolute top-2 right-2 h-2 w-2 rounded-full ${working ? 'bg-green-500' : 'bg-gray-400'}`} />
              <div className="text-[10px] uppercase font-bold text-slate-500">{tz.label} ({tz.abbr})</div>
              <div className="text-xl font-mono font-bold text-slate-900 dark:text-white mt-1">
                {formatTime(now, tz.id)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                  {tz.id !== 'Asia/Kolkata' ? getTimeDifference(now, tz.id) : 'Reference'}
              </div>
              <div className="text-[10px] font-medium text-slate-600 dark:text-slate-300 mt-1">
                 {getRelativeDay(now, 'Asia/Kolkata', tz.id)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
