import React, { createContext, useContext, useState } from 'react';

type Timezone = 'America/New_York' | 'Asia/Kolkata' | 'America/Los_Angeles' | 'GMT' | 'Europe/London';

interface TimezoneContextType {
  timezone: Timezone;
  setTimezone: (tz: Timezone) => void;
  formatDate: (date: Date | string | number) => string;
}

const TimezoneContext = createContext<TimezoneContextType>({
  timezone: 'GMT',
  setTimezone: () => {},
  formatDate: (d) => new Date(d).toLocaleString(),
});

export function TimezoneProvider({ children }: { children: React.ReactNode }) {
  const [timezone, setTimezone] = useState<Timezone>('GMT');

  const formatDate = (date: Date | string | number) => {
    const d = new Date(date);
    const formatted = d.toLocaleString('en-GB', {
      timeZone: timezone,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    
    const tzAbbr: Record<Timezone, string> = {
      'America/New_York': 'EST',
      'Asia/Kolkata': 'IST',
      'America/Los_Angeles': 'PST',
      'GMT': 'GMT',
      'Europe/London': 'BST'
    };
    
    return formatted.replace(/am/i, 'AM').replace(/pm/i, 'PM') + ` (${tzAbbr[timezone]})`;
  };

  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone, formatDate }}>
      {children}
    </TimezoneContext.Provider>
  );
}

export const useTimezone = () => useContext(TimezoneContext);
