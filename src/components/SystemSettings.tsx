import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Save, Shield, Settings, Info, AlertTriangle, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function SystemSettings() {
  const { role } = useAuth();
  const [limit, setLimit] = useState<number>(20);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const isAdmin = role === 'admin' || role === 'developer';

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'global');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setLimit(docSnap.data().bulkUploadLimit || 20);
        }
      } catch (err: any) {
        console.error("Error fetching settings:", err);
        const errMsg = err instanceof Error ? err.message : String(err);
        setMessage({ type: 'error', text: `Failed to fetch settings: ${errMsg}` });
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!isAdmin) return;
    
    setIsSaving(true);
    setMessage(null);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        bulkUploadLimit: limit,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setMessage({ type: 'success', text: 'Settings updated successfully!' });
    } catch (err: any) {
      console.error("Error saving settings:", err);
      // Format error to show it in the UI if we get missing permissions
      const errMsg = err instanceof Error ? err.message : String(err);
      setMessage({ type: 'error', text: `Failed to update settings: ${errMsg}` });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-[2rem] p-8 shadow-xl">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[var(--border-color)]">
          <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-600">
            <Shield size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[var(--text-primary)]">System Control</h2>
            <p className="text-sm text-[var(--text-secondary)] font-medium">Global restrictions and administrative configurations</p>
          </div>
        </div>

        {!isAdmin && (
          <div className="mb-8 bg-rose-50 dark:bg-rose-900/20 p-6 rounded-2xl border border-rose-100 dark:border-rose-900/50 flex gap-4">
            <Lock className="text-rose-500 shrink-0" size={24} />
            <div>
              <h4 className="font-bold text-rose-900 dark:text-rose-200">Restricted Access</h4>
              <p className="text-xs text-rose-700 dark:text-rose-300">You do not have administrative privileges to modify system settings. Please contact your system administrator.</p>
            </div>
          </div>
        )}

        <div className={`space-y-8 ${!isAdmin ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Upload Restriction Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Settings size={18} className="text-indigo-500" /> Bulk Upload Limit
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Set the maximum number of CVs a recruiter can upload in a single batch. This helps prevent system strain and maintains data quality.
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/30 p-6 rounded-2xl border border-dashed border-[var(--border-color)] flex flex-col justify-center">
              <div className="relative">
                <input
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-lg font-black text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-center"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-[var(--text-muted)]">Files</span>
              </div>
              <p className="mt-4 text-[10px] text-center font-bold text-amber-500 uppercase tracking-widest flex items-center justify-center gap-1">
                <AlertTriangle size={10} /> Recruiter restriction active
              </p>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl flex gap-3 border border-indigo-100 dark:border-indigo-800/50">
            <Info size={18} className="text-indigo-600 shrink-0" />
            <p className="text-[11px] text-indigo-800 dark:text-indigo-200 font-medium">
              When a recruiter exceeds this limit, they will see a customized message: <br/>
              <span className="italic block mt-1">"Batch rejected: You can only upload up to {limit} CVs at once to ensure processing quality."</span>
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="mt-12 flex items-center justify-between pt-8 border-t border-[var(--border-color)]">
            {message && (
              <p className={`text-xs font-bold ${message.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
                {message.text}
              </p>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="ml-auto flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
            >
              {isSaving ? 'Updating...' : 'Save Settings'}
              <Save size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
