import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  collapsed?: boolean;
  className?: string;
  variant?: 'sidebar' | 'header' | 'compact';
}

export default function ThemeToggle({
  collapsed = false,
  className = '',
  variant = 'sidebar',
}: ThemeToggleProps) {
  const { theme, toggleTheme, setTheme } = useTheme();

  // Collapsed Sidebar mode (compact icon button)
  if (collapsed) {
    return (
      <button
        onClick={toggleTheme}
        type="button"
        title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 border border-[var(--sidebar-border)] bg-[#00222B]/80 hover:bg-[#003649] hover:border-[#A98B56]/50 text-white cursor-pointer group shadow-xs focus:outline-none focus:ring-2 focus:ring-[#A98B56]/40 ${className}`}
        aria-label="Toggle Theme"
      >
        <motion.div
          key={theme}
          initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex items-center justify-center"
        >
          {theme === 'dark' ? (
            <Sun size={18} className="text-[#BC9B66] group-hover:scale-110 transition-transform duration-300" />
          ) : (
            <Moon size={18} className="text-[#BC9B66] group-hover:scale-110 transition-transform duration-300" />
          )}
        </motion.div>
      </button>
    );
  }

  // Header or standalone compact variant
  if (variant === 'header' || variant === 'compact') {
    return (
      <div
        className={`relative inline-flex items-center p-1 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-2xs transition-colors duration-200 ${className}`}
      >
        {/* Sliding Highlight Indicator */}
        <motion.div
          className="absolute top-1 bottom-1 rounded-lg bg-[var(--card-bg)] border border-[var(--primary-gold)]/40 shadow-xs z-0"
          initial={false}
          animate={{
            left: theme === 'light' ? '0.25rem' : 'calc(50% + 0.125rem)',
            width: 'calc(50% - 0.375rem)',
          }}
          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
        />

        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`relative z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors duration-200 cursor-pointer focus:outline-none ${
            theme === 'light' ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
          title="Switch to Light Theme"
        >
          <Sun size={14} className={theme === 'light' ? 'text-[#A98B56]' : 'text-[var(--text-muted)]'} />
          <span className="text-[11px] font-extrabold uppercase tracking-wider">Light</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`relative z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors duration-200 cursor-pointer focus:outline-none ${
            theme === 'dark' ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
          title="Switch to Dark Theme"
        >
          <Moon size={14} className={theme === 'dark' ? 'text-[#A98B56]' : 'text-[var(--text-muted)]'} />
          <span className="text-[11px] font-extrabold uppercase tracking-wider">Dark</span>
        </button>
      </div>
    );
  }

  // Expanded Sidebar Segmented Control (Default)
  return (
    <div
      className={`w-full relative flex items-center p-1 rounded-xl bg-[#00222B]/90 border border-white/10 shadow-xs ${className}`}
    >
      {/* Sliding Active Highlight Pill */}
      <motion.div
        className="absolute top-1 bottom-1 rounded-lg bg-gradient-to-r from-[#004564] to-[#005472] border border-[#A98B56]/50 shadow-sm z-0"
        initial={false}
        animate={{
          left: theme === 'light' ? '0.25rem' : 'calc(50% + 0.125rem)',
          width: 'calc(50% - 0.375rem)',
        }}
        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
      />

      {/* Light Mode Option */}
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors duration-200 cursor-pointer focus:outline-none ${
          theme === 'light' ? 'text-white' : 'text-[#A9C2CE] hover:text-white'
        }`}
      >
        <Sun
          size={15}
          className={`shrink-0 transition-all duration-300 ${
            theme === 'light' ? 'text-[#BC9B66] scale-110' : 'text-[#A9C2CE]'
          }`}
        />
        <span className="text-[11px] font-bold uppercase tracking-wider">Light</span>
      </button>

      {/* Dark Mode Option */}
      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors duration-200 cursor-pointer focus:outline-none ${
          theme === 'dark' ? 'text-white' : 'text-[#A9C2CE] hover:text-white'
        }`}
      >
        <Moon
          size={15}
          className={`shrink-0 transition-all duration-300 ${
            theme === 'dark' ? 'text-[#BC9B66] scale-110' : 'text-[#A9C2CE]'
          }`}
        />
        <span className="text-[11px] font-bold uppercase tracking-wider">Dark</span>
      </button>
    </div>
  );
}
