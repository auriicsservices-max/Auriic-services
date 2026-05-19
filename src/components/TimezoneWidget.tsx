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

  const tzConfig = {
    'America/New_York': { label: 'New York / US', abbr: 'EST' },
    'Asia/Kolkata': { label: 'Mumbai / India', abbr: 'IST' },
    'America/Los_Angeles': { label: 'Los Angeles / US', abbr: 'PST' },
    'GMT': { label: 'GMT / UTC', abbr: 'GMT' },
    'Europe/London': { label: 'London / UK', abbr: 'BST' }
  };
  
  const currentConfig = tzConfig[timezone];
  
  const displayTime = currentTime.toLocaleTimeString('en-GB', { 
    timeZone: timezone, 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
    hour12: true 
  }).toUpperCase();

  return (
    <div className="px-2 mb-2">
      <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
        <select 
          value={timezone}
          onChange={(e) => setTimezone(e.target.value as any)}
          className="w-full bg-transparent text-[10px] uppercase font-bold text-[var(--text-secondary)] focus:outline-none cursor-pointer"
        >
          {Object.entries(tzConfig).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
        <div className="text-xl font-mono font-bold mt-1 text-[var(--text-primary)]">
          {displayTime}
        </div>
      </div>
    </div>
  );
}
