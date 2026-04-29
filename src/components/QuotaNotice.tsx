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
    <div className="flex flex-col items-center justify-center p-8 text-center bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-[2.5rem] animate-in fade-in zoom-in duration-300">
      <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-500 mb-6">
        <AlertTriangle size={32} />
      </div>
      
      <h2 className="text-2xl font-serif text-slate-800 dark:text-slate-100 mb-2 italic">Database Quota Exceeded</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
        The application has reached its daily free tier limit for data reads. 
        Information will be temporarily unavailable until the quota resets (usually at midnight US Pacific Time).
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button 
          onClick={handleRetry}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
        >
          <RefreshCw size={14} className="animate-spin-hover" />
          Attempt Reconnect
        </button>
        
        <a 
          href="https://firebase.google.com/pricing#cloud-firestore" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-amber-600 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
        >
          View Limits
          <ExternalLink size={14} />
        </a>
      </div>

      <div className="mt-8 flex items-center gap-2 text-slate-400">
        <Clock size={14} />
        <span className="text-[10px] font-bold uppercase tracking-widest">Resets Daily</span>
      </div>
    </div>
  );
}
