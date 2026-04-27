import React from 'react';
import { AlertTriangle, Clock, ExternalLink } from 'lucide-react';

interface QuotaNoticeProps {
  onRetry?: () => void;
}

export default function QuotaNotice({ onRetry }: QuotaNoticeProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-[2.5rem] animate-in fade-in zoom-in duration-300">
      <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-500 mb-6">
        <AlertTriangle size={32} />
      </div>
      
      <h2 className="text-2xl font-serif text-slate-800 dark:text-slate-100 mb-2 italic">Database Quota Exceeded</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
        The application has reached its daily free tier limit for data reads. 
        Information will be temporarily unavailable until the quota resets.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-500 shadow-sm">
          <Clock size={14} />
          Resets in ~24 Hours
        </div>
        
        <a 
          href="https://firebase.google.com/pricing#cloud-firestore" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-amber-200 dark:shadow-none transition-all"
        >
          View Limits
          <ExternalLink size={14} />
        </a>
      </div>

      {onRetry && (
        <button 
          onClick={onRetry}
          className="mt-8 text-xs font-bold text-indigo-600 hover:text-indigo-700 underline decoration-2 underline-offset-4"
        >
          Try refreshing anyway
        </button>
      )}
    </div>
  );
}
