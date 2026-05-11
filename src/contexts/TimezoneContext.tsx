import React, { createContext, useContext, useState } from 'react';

type Timezone = 'Europe/London' | 'Asia/Kolkata';

interface TimezoneContextType {
  timezone: Timezone;
  setTimezone: (tz: Timezone) => void;
  formatDate: (date: Date | string | number) => string;
}

const TimezoneContext = createContext<TimezoneContextType>({
  timezone: 'Europe/London',
  setTimezone: () => {},
  formatDate: (d) => new Date(d).toLocaleString(),
});

export function TimezoneProvider({ children }: { children: React.ReactNode }) {
  const [timezone, setTimezone] = useState<Timezone>('Europe/London');

  const formatDate = (date: Date | string | number) => {
    const d = new Date(date);
    return d.toLocaleString('en-GB', {
      timeZone: timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }) + (timezone === 'Europe/London' ? ' (BST)' : ' (IST)');
  };

  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone, formatDate }}>
      {children}
    </TimezoneContext.Provider>
  );
}

export const useTimezone = () => useContext(TimezoneContext);
