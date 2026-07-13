import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl text-[var(--sidebar-text-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-item-hover-text)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 flex items-center justify-center"
      aria-label="Toggle Theme"
    >
      {theme === 'light' ? (
        <Moon size={18} className="text-amber-600 fill-amber-500/10" />
      ) : (
        <Sun size={18} className="text-amber-400 fill-amber-400/20" />
      )}
    </button>
  );
}
