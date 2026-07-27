import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Save, Shield, Settings, Info, AlertTriangle, Lock, CheckCircle2, Image, Upload, Trash2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function SystemSettings() {
  const { role } = useAuth();
  const [limit, setLimit] = useState<number>(20);
  const [fileSizeLimit, setFileSizeLimit] = useState<number>(5);
  const [logoUrlLight, setLogoUrlLight] = useState<string>('');
  const [logoUrlDark, setLogoUrlDark] = useState<string>('');
  const [totalCvCount, setTotalCvCount] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isDraggingLight, setIsDraggingLight] = useState(false);
  const [isDraggingDark, setIsDraggingDark] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isAdmin = role === 'admin' || role === 'developer';

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'global');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setLimit(data.bulkUploadLimit || 20);
          setFileSizeLimit(data.fileSizeCap || data.fileSizeLimit || 5);
          setLogoUrlLight(data.logoUrlLight || data.logoUrl || '');
          setLogoUrlDark(data.logoUrlDark || data.logoUrl || '');
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

  const processFile = (file: File, type: 'light' | 'dark') => {
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
        if (type === 'light') {
          setLogoUrlLight(event.target.result as string);
        } else {
          setLogoUrlDark(event.target.result as string);
        }
      }
    };
    reader.onerror = () => {
      setUploadError("Failed to read file.");
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'light' | 'dark') => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file, type);
    }
  };

  const handleDragOver = (e: React.DragEvent, type: 'light' | 'dark') => {
    e.preventDefault();
    if (type === 'light') {
      setIsDraggingLight(true);
    } else {
      setIsDraggingDark(true);
    }
  };

  const handleDragLeave = (type: 'light' | 'dark') => {
    if (type === 'light') {
      setIsDraggingLight(false);
    } else {
      setIsDraggingDark(false);
    }
  };

  const handleDrop = (e: React.DragEvent, type: 'light' | 'dark') => {
    e.preventDefault();
    if (type === 'light') {
      setIsDraggingLight(false);
    } else {
      setIsDraggingDark(false);
    }
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file, type);
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
        logoUrlLight: logoUrlLight.trim(),
        logoUrlDark: logoUrlDark.trim(),
        // Save the light one to the legacy logoUrl property for backwards compatibility if needed
        logoUrl: logoUrlLight.trim() || logoUrlDark.trim(),
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
    <div className="max-w-4xl mx-auto py-6">
      <div className="crm-card p-8 space-y-8">
        <div className="flex items-center gap-4 pb-6 border-b border-[var(--border-color)]">
          <div className="w-12 h-12 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl flex items-center justify-center text-[var(--primary-gold)] shadow-sm">
            <Shield size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[var(--text-primary)]">System Control</h2>
            <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">Global Restrictions & Administrative Configurations</p>
          </div>
        </div>

        {!isAdmin && (
          <div className="crm-badge-error p-6 rounded-2xl flex gap-4 border border-[var(--border-color)]">
            <Lock className="text-rose-500 shrink-0" size={24} />
            <div>
              <h4 className="font-bold text-rose-900 dark:text-rose-200">Restricted Access</h4>
              <p className="text-xs text-rose-700 dark:text-rose-300">You do not have administrative privileges to modify system settings. Please contact your system administrator.</p>
            </div>
          </div>
        )}

        <div className={`space-y-8 ${!isAdmin ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Total CV Count */}
          <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between shadow-sm">
            <div>
              <h4 className="font-bold text-[var(--text-primary)] text-sm">Total Active Candidate CVs</h4>
              <p className="text-xs text-[var(--text-muted)] font-medium">Total number of candidates currently indexed in the active CRM database.</p>
            </div>
            <div className="text-3xl font-black text-[var(--primary-gold)] font-mono">{totalCvCount}</div>
          </div>

          {/* Upload Restriction Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <h3 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
                <Settings size={18} className="text-[var(--primary-gold)]" /> Bulk Upload Batch Limit
              </h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed font-medium">
                Set the maximum number of candidate CVs a recruiter can upload in a single drag-and-drop batch.
              </p>
            </div>
            <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl border border-dashed border-[var(--border-color)] flex flex-col justify-center">
              <div className="relative">
                <input
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(Math.max(1, parseInt(e.target.value) || 1))}
                  className="crm-input text-lg font-black text-[var(--primary-gold)] text-center py-3"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-[var(--text-muted)]">Files</span>
              </div>
            </div>
          </div>

          {/* File Size Limit Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-[var(--border-color)]">
            <div className="space-y-2">
              <h3 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
                <Settings size={18} className="text-[var(--primary-gold)]" /> Resume File Size Cap
              </h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed font-medium">
                Applies strict size verification. Rejects any individual CV file dropped or uploaded above this limit.
              </p>
            </div>
            <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl border border-dashed border-[var(--border-color)] flex flex-col justify-center">
              <div className="relative">
                <input
                  type="number"
                  value={fileSizeLimit}
                  onChange={(e) => setFileSizeLimit(Math.max(1, parseInt(e.target.value) || 1))}
                  className="crm-input text-lg font-black text-[var(--primary-gold)] text-center py-3"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-[var(--text-muted)]">MB</span>
              </div>
            </div>
          </div>

          {/* Gemini API Key Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-[var(--border-color)]">
            <div className="space-y-2">
              <h3 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
                <Settings size={18} className="text-[var(--primary-gold)]" /> Resume Parsing Engine
              </h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed font-medium">
                Waterfall parsing engine utilizing Gemini 3.5 Flash for instant structured data extraction.
              </p>
            </div>
            <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl border border-dashed border-[var(--border-color)] flex flex-col justify-center items-center">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={18} />
                <span className="text-sm font-black">Gemini AI Parser Operational</span>
              </div>
            </div>
          </div>

          {/* Global Branding & Logo Configuration Section */}
          <div className="pt-8 border-t border-[var(--border-color)]">
            <div className="mb-6">
              <h3 className="font-bold text-[var(--text-primary)] text-base flex items-center gap-2">
                <Image size={20} className="text-[var(--primary-gold)]" /> Global CRM Branding
              </h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed font-medium mt-1">
                Manage your enterprise corporate identity. Upload distinct logos for Light and Dark themes. These are rendered automatically across the sidebar, login, invoices, PDFs, and all system views.
              </p>
            </div>

            {uploadError && (
              <div className="flex items-center gap-2 text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-100 dark:border-rose-900/40 mb-6">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Light Theme Logo Card */}
              <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                  <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Light Theme Logo</span>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold uppercase">Bright Backgrounds</span>
                </div>

                {/* Drag and Drop Upload Zone */}
                <div
                  onDragOver={(e) => handleDragOver(e, 'light')}
                  onDragLeave={() => handleDragLeave('light')}
                  onDrop={(e) => handleDrop(e, 'light')}
                  className={`p-5 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                    isDraggingLight 
                      ? 'border-[var(--primary-gold)] bg-[var(--card-bg)] shadow-inner' 
                      : 'border-[var(--border-color)] hover:border-[var(--primary-gold)] bg-[var(--card-bg)]'
                  }`}
                  onClick={() => document.getElementById('logo-light-upload-input')?.click()}
                >
                  <input
                    id="logo-light-upload-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'light')}
                    className="hidden"
                  />
                  <Upload size={20} className={`mb-2 text-[var(--primary-gold)] ${isDraggingLight ? 'animate-bounce' : ''}`} />
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Drag & drop Light Logo here
                  </span>
                  <span className="text-[9px] text-[var(--text-muted)] mt-0.5">
                    or click to browse files (max 500KB)
                  </span>
                </div>

                <div className="relative">
                  <label className="block text-[9px] font-black uppercase text-[var(--text-muted)] mb-1">Or Light Logo URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://example.com/logo-light.png"
                      value={logoUrlLight}
                      onChange={(e) => {
                        setLogoUrlLight(e.target.value);
                        setUploadError(null);
                      }}
                      className="crm-input flex-1 text-xs"
                    />
                    {logoUrlLight && (
                      <button
                        type="button"
                        onClick={() => setLogoUrlLight('')}
                        className="p-2.5 crm-btn-secondary hover:text-rose-500"
                        title="Clear Light Logo"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {logoUrlLight.trim() && (
                  <div className="pt-3 border-t border-[var(--border-color)] flex flex-col items-center gap-2">
                    <span className="text-[9px] font-black uppercase text-[var(--text-muted)]">Light Theme Preview (White Canvas)</span>
                    <div className="w-full p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-center min-h-[72px]">
                      <img 
                        src={logoUrlLight} 
                        alt="Light Logo Preview" 
                        className="max-h-12 max-w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://aurrum.co/wp-content/uploads/2026/05/Rectech-Logo.svg';
                        }}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Dark Theme Logo Card */}
              <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                  <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Dark Theme Logo</span>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-extrabold uppercase">Dark Backgrounds</span>
                </div>

                {/* Drag and Drop Upload Zone */}
                <div
                  onDragOver={(e) => handleDragOver(e, 'dark')}
                  onDragLeave={() => handleDragLeave('dark')}
                  onDrop={(e) => handleDrop(e, 'dark')}
                  className={`p-5 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                    isDraggingDark 
                      ? 'border-[var(--primary-gold)] bg-[var(--card-bg)] shadow-inner' 
                      : 'border-[var(--border-color)] hover:border-[var(--primary-gold)] bg-[var(--card-bg)]'
                  }`}
                  onClick={() => document.getElementById('logo-dark-upload-input')?.click()}
                >
                  <input
                    id="logo-dark-upload-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'dark')}
                    className="hidden"
                  />
                  <Upload size={20} className={`mb-2 text-[var(--primary-gold)] ${isDraggingDark ? 'animate-bounce' : ''}`} />
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Drag & drop Dark Logo here
                  </span>
                  <span className="text-[9px] text-[var(--text-muted)] mt-0.5">
                    or click to browse files (max 500KB)
                  </span>
                </div>

                <div className="relative">
                  <label className="block text-[9px] font-black uppercase text-[var(--text-muted)] mb-1">Or Dark Logo URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://example.com/logo-dark.png"
                      value={logoUrlDark}
                      onChange={(e) => {
                        setLogoUrlDark(e.target.value);
                        setUploadError(null);
                      }}
                      className="crm-input flex-1 text-xs"
                    />
                    {logoUrlDark && (
                      <button
                        type="button"
                        onClick={() => setLogoUrlDark('')}
                        className="p-2.5 crm-btn-secondary hover:text-rose-500"
                        title="Clear Dark Logo"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {logoUrlDark.trim() && (
                  <div className="pt-3 border-t border-[var(--border-color)] flex flex-col items-center gap-2">
                    <span className="text-[9px] font-black uppercase text-[var(--text-muted)]">Dark Theme Preview (Navy Canvas)</span>
                    <div className="w-full p-4 bg-[#002D38] rounded-xl border border-slate-800 flex items-center justify-center min-h-[72px]">
                      <img 
                        src={logoUrlDark} 
                        alt="Dark Logo Preview" 
                        className="max-h-12 max-w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://aurrum.co/wp-content/uploads/2026/05/Rectech-white-logo.svg';
                        }}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex gap-3">
            <Info size={18} className="text-[var(--primary-gold)] shrink-0" />
            <div className="text-[11px] text-[var(--text-secondary)] font-medium space-y-1">
              <p>When a recruiter exceeds the batch limit, they will see a customized toast message:</p>
              <p className="italic font-bold text-[var(--text-primary)]">"Batch rejected: You can only upload up to {limit} CVs at once to ensure processing quality."</p>
              <p className="mt-1 text-[var(--text-muted)]">When any individual file is larger than {fileSizeLimit}MB, they will see an instant error block detailing rejected files.</p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="mt-8 flex items-center justify-between pt-6 border-t border-[var(--border-color)]">
            {message && (
              <p className={`text-xs font-bold ${message.type === 'success' ? 'text-emerald-600' : 'text-rose-500'}`}>
                {message.text}
              </p>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="crm-btn-gold ml-auto flex items-center gap-2 px-8 py-3 text-xs uppercase tracking-wider font-extrabold"
            >
              {isSaving ? 'Updating...' : 'Save System Settings'}
              <Save size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
