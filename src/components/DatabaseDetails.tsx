import React, { useState } from 'react';
import { Download, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import firebaseConfig from '@/firebase-applet-config.json';

export default function DatabaseDetails() {
  const { role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (role !== 'developer') {
    return <div className="p-8 text-center text-[var(--text-muted)]">Access Denied. Developer access required.</div>;
  }

  const handleFixExperience = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const res = await fetch('/api/candidates/fix-experience', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || `Successfully fixed experience for candidates!`);
      } else {
        setMessage(data.error || 'Failed to fix candidate experience.');
      }
    } catch (err: any) {
      setMessage('Error connecting to fix endpoint: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuditAndReparse = async () => {
    try {
      setAuditLoading(true);
      setMessage(null);
      const res = await fetch('/api/candidates/audit-and-reparse', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || `Successfully audited and re-parsed candidate database!`);
      } else {
        setMessage(data.error || 'Failed to audit resumes.');
      }
    } catch (err: any) {
      setMessage('Error connecting to audit endpoint: ' + err.message);
    } finally {
      setAuditLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 pb-12">
      <h2 className="text-2xl font-serif text-[var(--text-primary)]">Database Details & Tools</h2>
      
      {/* Experience Fix Tool */}
      <div className="bg-[var(--card-bg)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm space-y-4">
        <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
          <RefreshCw size={18} className="text-[var(--primary-gold)]" />
          Resume Experience Re-Extraction & Correction Tool
        </h3>
        <p className="text-sm text-[var(--text-muted)]">
          Re-parses and calculates total professional experience from employment dates for all candidates currently showing &ldquo;0 Years&rdquo; or missing experience. Preserves existing parsed data and updates records.
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={handleFixExperience}
            disabled={loading}
            className="px-4 py-2 bg-[var(--primary-color)] hover:opacity-90 text-white rounded-xl font-medium text-sm flex items-center gap-2 disabled:opacity-50 transition-all"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {loading ? 'Re-extracting & Recalculating...' : 'Fix 0-Experience Resumes'}
          </button>
          {message && <span className="text-xs font-medium text-[var(--text-primary)] bg-[var(--card-bg)] p-2 rounded border border-[var(--border-color)]">{message}</span>}
        </div>
      </div>

      {/* Parser Quality Audit & Re-Parse Tool */}
      <div className="bg-[var(--card-bg)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm space-y-4">
        <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
          <ShieldCheck size={18} className="text-emerald-500" />
          Parser Quality Audit & Completeness Assurance
        </h3>
        <p className="text-sm text-[var(--text-muted)]">
          Audits all stored candidate resumes for missing fields, evaluates parsing quality confidence, and automatically re-parses records that require correction.
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={handleAuditAndReparse}
            disabled={auditLoading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm flex items-center gap-2 disabled:opacity-50 transition-all"
          >
            {auditLoading ? <RefreshCw size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            {auditLoading ? 'Auditing & Re-parsing...' : 'Audit & Re-Parse All Resumes'}
          </button>
        </div>
      </div>

      <div className="bg-[var(--card-bg)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm space-y-4">
        <h3 className="font-bold text-[var(--text-primary)]">Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-[var(--text-muted)]">
            <p><strong>Project ID:</strong> {firebaseConfig.projectId}</p>
            <p><strong>Firestore Database ID:</strong> {firebaseConfig.firestoreDatabaseId || '(default)'}</p>
            <p><strong>Region:</strong> {firebaseConfig.storageBucket ? 'Check GCP Project' : 'N/A'}</p>
        </div>
        <div className="border-t border-[var(--border-color)] pt-4 mt-4">
           <h4 className="font-bold text-[var(--text-primary)] mb-4">Database Backups</h4>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {[
               { label: 'Daily', period: 'Daily' },
               { label: 'Weekly', period: 'Weekly' },
               { label: 'Monthly', period: 'Monthly' },
             ].map((backup) => (
               <button
                 key={backup.period}
                 className="bg-[var(--card-bg)] p-4 rounded-xl border border-[var(--border-color)] hover:border-[var(--primary-color)] text-left transition-all"
                 onClick={() => alert(`Downloading ${backup.period} backup... (Not implemented)`)}
               >
                 <div className="flex items-center justify-between">
                   <span className="font-bold text-[var(--text-primary)]">{backup.label}</span>
                   <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600">
                     <Download size={16} />
                   </div>
                 </div>
                 <p className="text-xs text-[var(--text-muted)] mt-2">Click to download full DB backup</p>
               </button>
             ))}
           </div>
         </div>
      </div>
    </div>
  );
}
