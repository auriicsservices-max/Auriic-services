import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick?: () => void;
  fallbackUrl?: string;
  label?: string;
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({ 
  onClick, 
  fallbackUrl, 
  label = 'Back',
  className = ''
}) => {
  const handleBack = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
    } else if (fallbackUrl) {
      window.location.href = fallbackUrl;
    } else {
      window.location.href = '/';
    }
  };

  return (
    <button
      onClick={handleBack}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--card-hover-bg)] transition-colors shadow-sm ${className}`}
      title="Return to previous page"
      aria-label="Back"
    >
      <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
      <span>{label}</span>
    </button>
  );
};
