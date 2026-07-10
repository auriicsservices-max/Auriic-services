import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Save, Shield, Settings, Info, AlertTriangle, Lock, CheckCircle2, Image, Upload, Trash2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function SystemSettings() {
  const { role } = useAuth();
  const [limit, setLimit] = useState<number>(20);
  const [fileSizeLimit, setFileSizeLimit] = useState<number>(5);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [totalCvCount, setTotalCvCount] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isAdmin = role === 'admin' || role === 'developer';

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'global');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setLimit(docSnap.data().bulkUploadLimit || 20);
          setFileSizeLimit(docSnap.data().fileSizeCap || docSnap.data().fileSizeLimit || 5);
          setLogoUrl(docSnap.data().logoUrl || '');
        }

        const allCandidatesQuery = query(collection(db, 'candidates'));
        const allCandidatesSnapshot = await getDocs(allCandidatesQuery);
        const activeCandidatesCount = allCandidatesSnapshot.docs.filter(doc => !doc.data().isArchived).length;
        setTotalCvCount(activeCandidatesCount);
      } catch (err: any) {
        console.error("Error fetching settings:", err);
        const errMsg = err instanceof Error ? err.message : String(err);
        setMessage({ type: 'error', text: `Failed to fetch settings: ${errMsg}` });
      }
    };
    fetchSettings();
  }, []);

  const processFile = (file: File) => {
    setUploadError(null);
    if (!file) return;

    // Validate type (must be image)
    if (!file.type.startsWith('image/')) {
      setUploadError("Only image files (PNG, JPG, SVG, WebP, etc.) are supported.");
      return;
    }

    // Validate size (500KB cap for smooth base64 Firestore document storage)
    const maxSize = 500 * 1024; // 500 KB
    if (file.size > maxSize) {
      setUploadError("Image is too large. Logo must be under 500KB to ensure high-performance loading.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setLogoUrl(event.target.result as string);
      }
    };
    reader.onerror = () => {
      setUploadError("Failed to read file.");
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSave = async () => {
    if (!isAdmin) return;
    
    setIsSaving(true);
    setMessage(null);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        bulkUploadLimit: limit,
        fileSizeLimit: fileSizeLimit,
        logoUrl: logoUrl.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setMessage({ type: 'success', text: 'Settings updated successfully!' });
    } catch (err: any) {
      console.error("Error saving settings:", err);
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
          {/* Total CV Count */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 flex items-center justify-between">
            <div>
                <h4 className="font-bold text-indigo-900 dark:text-indigo-200">Total CVs Uploaded</h4>
                <p className="text-xs text-indigo-700 dark:text-indigo-300">Total number of candidates currently in the system.</p>
            </div>
            <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{totalCvCount}</div>
          </div>

          {/* Upload Restriction Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Settings size={18} className="text-indigo-500" /> Bulk Upload Limit
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Set the maximum number of CVs a recruiter can upload in a single batch.
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
            </div>
          </div>

          {/* File Size Limit Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-[var(--border-color)]">
            <div className="space-y-2">
              <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Settings size={18} className="text-indigo-500" /> Resume File Size Cap
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Applies strict size verification. If a recruiter drops/uploads a candidate's CV file larger than this limit (MB).
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/30 p-6 rounded-2xl border border-dashed border-[var(--border-color)] flex flex-col justify-center">
              <div className="relative">
                <input
                  type="number"
                  value={fileSizeLimit}
                  onChange={(e) => setFileSizeLimit(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-lg font-black text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-center"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-[var(--text-muted)]">MB</span>
              </div>
            </div>
          </div>

          {/* Gemini API Key Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-[var(--border-color)]">
            <div className="space-y-2">
              <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Settings size={18} className="text-indigo-500" /> Resume Parsing Engine
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Currently using Gemini API for advanced resume parsing.
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/30 p-6 rounded-2xl border border-dashed border-[var(--border-color)] flex flex-col justify-center items-center">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <CheckCircle2 size={18} />
                    <span className="text-sm font-black">Gemini API Key Configured</span>
                </div>
            </div>
          </div>

          {/* Global Logo Configuration Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-[var(--border-color)]">
            <div className="space-y-2">
              <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Image size={18} className="text-indigo-500" /> Global Invoice Logo
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Upload your company logo or provide a custom image URL. This logo will dynamically appear on all generated statement lists, pdfs, and invoices.
              </p>
            </div>
            <div className="space-y-4">
              {/* Drag and Drop Upload Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`p-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                  isDragging 
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20' 
                    : 'border-[var(--border-color)] hover:border-indigo-400 bg-slate-50 dark:bg-slate-900/30'
                }`}
                onClick={() => document.getElementById('logo-upload-input')?.click()}
              >
                <input
                  id="logo-upload-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload size={24} className={`mb-2 text-indigo-500 ${isDragging ? 'animate-bounce' : ''}`} />
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Drag & drop company logo here
                </span>
                <span className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                  or click to browse files (PNG, JPG, SVG, WebP up to 500KB)
                </span>
              </div>

              {uploadError && (
                <div className="flex items-center gap-2 text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-100 dark:border-rose-900/40">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="relative">
                <label className="block text-[10px] font-black uppercase text-[var(--text-muted)] mb-1">Or Logo Image URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://example.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => {
                      setLogoUrl(e.target.value);
                      setUploadError(null);
                    }}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 border border-[var(--border-color)] rounded-xl text-[var(--text-muted)] hover:text-rose-500 transition-all"
                      title="Clear logo"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              
              {logoUrl.trim() && (
                <div className="pt-2 flex flex-col items-center gap-1.5 border-t border-[var(--border-color)]">
                  <span className="text-[10px] font-black uppercase text-[var(--text-muted)]">Live Preview</span>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-[var(--border-color)] max-w-full flex items-center justify-center">
                    <img 
                      src={logoUrl} 
                      alt="Logo preview" 
                      className="max-h-12 max-w-[200px] object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://aurrum.co/wp-content/uploads/2026/05/Rectech-Logo.svg';
                      }}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl flex gap-3 border border-indigo-100 dark:border-indigo-800/50">
            <Info size={18} className="text-indigo-600 shrink-0" />
            <div className="text-[11px] text-indigo-800 dark:text-indigo-200 font-medium space-y-1">
              <p>When a recruiter exceeds the batch limit, they will see a customized toast message:</p>
              <p className="italic font-bold">"Batch rejected: You can only upload up to {limit} CVs at once to ensure processing quality."</p>
              <p className="mt-1">When any individual file is larger than 1MB, they will see an instant error block detailing rejected files.</p>
            </div>
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
