import React from 'react';
import { Search, Bell, MessageSquare } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import { useAuth } from '../../contexts/AuthContext';

export default function Header() {
  const { user, userProfile } = useAuth();

  return (
    <header className="h-20 bg-[var(--card-bg)] border-b border-[var(--border-color)] px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs transition-colors duration-200">
      <div className="relative w-96">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] shrink-0" size={18} />
        <input 
          type="text" 
          placeholder="Search candidates, CVs, jobs..." 
          className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[var(--primary-gold)] focus:border-[var(--primary-gold)] outline-none transition-all"
        />
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle variant="header" />
        <button 
          title="Notifications"
          className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:border-[var(--primary-gold)] hover:text-[var(--primary-gold)] relative transition-all cursor-pointer"
        >
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        </button>
        <button 
          title="Internal Messages"
          className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:border-[var(--primary-gold)] hover:text-[var(--primary-gold)] transition-all cursor-pointer"
        >
          <MessageSquare size={18} />
        </button>
        {userProfile?.photoURL ? (
          <img src={userProfile.photoURL} alt="Profile" className="w-9 h-9 rounded-xl object-cover shadow-sm border border-[var(--border-color)]" />
        ) : (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#004564] to-[#005472] text-white flex items-center justify-center font-bold text-sm shadow-sm border border-[var(--border-color)]">
            {userProfile?.name ? userProfile.name.substring(0, 2).toUpperCase() : (user?.email ? user.email.substring(0, 2).toUpperCase() : 'AU')}
          </div>
        )}
      </div>
    </header>
  );
}

