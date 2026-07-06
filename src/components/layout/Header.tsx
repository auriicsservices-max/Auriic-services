import React from 'react';
import { Search, Bell, MessageSquare, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 bg-[var(--card-bg)] border-b border-[var(--border-color)] px-8 flex items-center justify-between sticky top-0 z-10">
      <div className="relative w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
        <input 
          type="text" 
          placeholder="Search candidates, jobs..." 
          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[var(--brand-color)] outline-none"
        />
      </div>

      <div className="flex items-center gap-4">
        <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-[var(--bg-secondary)]">
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button className="p-2 rounded-xl hover:bg-[var(--bg-secondary)] relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--danger-color)] rounded-full"></span>
        </button>
        <button className="p-2 rounded-xl hover:bg-[var(--bg-secondary)]">
          <MessageSquare size={20} />
        </button>
        <div className="w-8 h-8 rounded-full bg-[var(--brand-color)] text-white flex items-center justify-center font-bold text-sm">A</div>
      </div>
    </header>
  );
}
