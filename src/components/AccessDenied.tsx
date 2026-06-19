import React, { useState } from 'react';
import { ShieldAlert, Copy, Check, Lock, Mail, RefreshCw } from 'lucide-react';

interface AccessDeniedProps {
  userIp: string;
  onRetry: () => void;
}

export default function AccessDenied({ userIp, onRetry }: AccessDeniedProps) {
  const [copied, setCopied] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const timestamp = new Date().toISOString();
  const infoString = `Request details:\nIP Address: ${userIp || 'Unknown'}\nTimestamp: ${timestamp}\nPlatform: Aurrum CRM Gatekeeper V4`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(infoString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard copy failed block:', err);
    }
  };

  const handleRetryClick = async () => {
    setIsRetrying(true);
    await onRetry();
    setTimeout(() => setIsRetrying(false), 800);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 font-sans select-none transition-colors duration-300">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-300">
        
        {/* Top Accent Strip */}
        <div className="h-2 bg-gradient-to-r from-red-500 via-amber-500 to-red-600 w-full" />
        
        <div className="p-8">
          {/* Main Icon Indicator */}
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-red-50 dark:bg-red-950/40 rounded-full border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 animate-pulse">
              <ShieldAlert size={48} strokeWidth={1.5} id="gatekeeper-error-icon" />
            </div>
          </div>

          {/* Title Headers */}
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-2xl font-serif text-slate-900 dark:text-slate-50 tracking-tight font-medium">
              Access Restricted
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Your connection has been blocked by our automated IP security policies. Only registered client networks can access the CRM control center.
            </p>
          </div>

          {/* Security details section */}
          <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 p-5 space-y-4 mb-8">
            <div className="flex items-center justify-between text-xs font-mono border-b border-slate-100 dark:border-slate-800/80 pb-2">
              <span className="text-slate-400 dark:text-slate-500 uppercase tracking-widest">Gatekeeper Status</span>
              <span className="text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                <Lock size={12} /> BLOCKED
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <dt className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium mb-1">Your Detected IP Address</dt>
                <dd className="text-sm font-mono text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-3 py-2 rounded border border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
                  <span>{userIp || 'Detecting...'}</span>
                  <button 
                    onClick={handleCopy}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    title="Copy request details"
                    id="copy-ip-info-btn"
                  >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium mb-1">Timestamp (UTC)</dt>
                <dd className="text-xs font-mono text-slate-500 dark:text-slate-400 px-3 py-1 bg-slate-100/50 dark:bg-slate-900/50 rounded">
                  {timestamp}
                </dd>
              </div>
            </div>
          </div>

          {/* Guidelines / Action Buttons */}
          <div className="space-y-4">
            <button 
              onClick={handleRetryClick}
              disabled={isRetrying}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 cursor-pointer shadow-sm active:scale-[0.98]"
              id="retry-ip-auth-btn"
            >
              <RefreshCw size={16} className={isRetrying ? 'animate-spin' : ''} />
              {isRetrying ? 'Verifying Network...' : 'Re-verify My Address'}
            </button>

            <div className="flex items-center justify-between gap-4 text-xs text-slate-400 dark:text-slate-500 px-1 pt-2">
              <span className="flex items-center gap-1">
                <Mail size={12} />
                Contact System Lead
              </span>
              <a 
                href="mailto:support@aurrum.co" 
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                support@aurrum.co
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
