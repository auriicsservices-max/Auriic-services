import React from 'react';
import { Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import firebaseConfig from '@/firebase-applet-config.json';

export default function DatabaseDetails() {
  const { role } = useAuth();

  if (role !== 'developer') {
    return <div className="p-8 text-center text-[var(--text-muted)]">Access Denied. Developer access required.</div>;
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 pb-12">
      <h2 className="text-2xl font-serif text-[var(--text-primary)]">Database Details</h2>
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
