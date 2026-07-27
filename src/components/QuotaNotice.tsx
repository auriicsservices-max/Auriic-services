import React from 'react';
import { AlertTriangle, Clock, ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface QuotaNoticeProps {
  onRetry?: () => void;
}

export default function QuotaNotice({ onRetry }: QuotaNoticeProps) {
  const { setQuotaExceeded } = useAuth();

  const handleRetry = () => {
    setQuotaExceeded(false);
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-[var(--status-warning-bg)] border border-[var(--status-warning-text)]/30 rounded-[var(--radius-modal)] animate-in fade-in zoom-in duration-300">
      <div className="w-16 h-16 bg-[var(--status-warning-bg)] rounded-full flex items-center justify-center text-[var(--status-warning-text)] mb-6">
        <AlertTriangle size={32} />
      </div>
      
      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Database Quota Exceeded</h2>
      <p className="text-sm text-[var(--text-muted)] max-w-md mb-6 leading-relaxed">
        The application has reached its daily free tier limit for data reads. 
        Information will be temporarily unavailable until the quota resets (usually at midnight US Pacific Time).
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button 
          onClick={handleRetry}
          className="crm-btn-gold text-xs uppercase tracking-widest shadow-md transition-all active:scale-95"
        >
          <RefreshCw size={14} />
          Attempt Reconnect
        </button>
        
        <a 
          href="https://firebase.google.com/pricing#cloud-firestore" 
          target="_blank" 
          rel="noopener noreferrer"
          className="crm-btn-secondary text-xs uppercase tracking-widest"
        >
          View Limits
          <ExternalLink size={14} />
        </a>
      </div>

      <div className="mt-8 flex items-center gap-2 text-[var(--text-muted)]">
        <Clock size={14} />
        <span className="text-[10px] font-bold uppercase tracking-widest">Resets Daily</span>
      </div>
    </div>
  );
}
