import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, query, getDocs } from 'firebase/firestore';
import { Save, Shield, Settings, Info, AlertTriangle, Lock, CheckCircle2, Image, Upload, Trash2, Layout, LogIn, FileText, Sparkles, RefreshCw, Cpu, Activity, Zap, Layers, Key, Clock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LogoUploaderProps {
  id: string;
  title: string;
  badge: string;
  badgeColor: string;
  value: string;
  onChange: (val: string) => void;
  bgMode: 'light' | 'dark';
  defaultFallback: string;
  onUploadError: (err: string | null) => void;
}

function LogoUploader({
  id,
  title,
  badge,
  badgeColor,
  value,
  onChange,
  bgMode,
  defaultFallback,
  onUploadError,
}: LogoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    onUploadError(null);
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onUploadError("Only image files (PNG, JPG, SVG, WebP, etc.) are supported.");
      return;
    }

    const maxSize = 500 * 1024; // 500 KB limit for Base64 storage
    if (file.size > maxSize) {
      onUploadError("Image is too large. Logo must be under 500KB for optimum performance.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onChange(event.target.result as string);
      }
    };
    reader.onerror = () => {
      onUploadError("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
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
    if (file) processFile(file);
  };

  return (
    <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-4 shadow-2xs">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
        <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">{title}</span>
        <span className={`text-[9px] px-2 py-0.5 rounded font-extrabold uppercase ${badgeColor}`}>
          {badge}
        </span>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-4 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
          isDragging 
            ? 'border-[var(--primary-gold)] bg-[var(--card-bg)] shadow-inner' 
            : 'border-[var(--border-color)] hover:border-[var(--primary-gold)] bg-[var(--card-bg)]'
        }`}
        onClick={() => document.getElementById(`upload-input-${id}`)?.click()}
      >
        <input
          id={`upload-input-${id}`}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <Upload size={18} className={`mb-1.5 text-[var(--primary-gold)] ${isDragging ? 'animate-bounce' : ''}`} />
        <span className="text-xs font-bold text-[var(--text-primary)]">
          Upload Logo
        </span>
        <span className="text-[9px] text-[var(--text-muted)] mt-0.5">
          Drag & drop or click to upload (Max 500KB)
        </span>
      </div>

      <div className="relative">
        <label className="block text-[9px] font-black uppercase text-[var(--text-muted)] mb-1">Image URL</label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="https://example.com/logo.png"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              onUploadError(null);
            }}
            className="crm-input flex-1 text-xs"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-2.5 crm-btn-secondary hover:text-rose-500 shrink-0"
              title="Clear Logo"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-[var(--border-color)] flex flex-col items-center gap-2">
        <span className="text-[9px] font-black uppercase text-[var(--text-muted)]">
          Live Canvas Preview ({bgMode === 'light' ? 'Light Background' : 'Dark Background'})
        </span>
        <div 
          className={`w-full p-3 rounded-xl border flex items-center justify-center min-h-[64px] ${
            bgMode === 'light' 
              ? 'bg-white border-slate-200' 
              : 'bg-[#002D38] border-slate-800'
          }`}
        >
          <img 
            src={value.trim() || defaultFallback} 
            alt="Logo Preview" 
            className="max-h-10 max-w-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = defaultFallback;
            }}
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </div>
  );
}

export default function SystemSettings() {
  const { role } = useAuth();
  const [limit, setLimit] = useState<number>(20);
  const [fileSizeLimit, setFileSizeLimit] = useState<number>(5);
  
  // General System, Sidebar & Header Logos
  const [logoUrlLight, setLogoUrlLight] = useState<string>('');
  const [logoUrlDark, setLogoUrlDark] = useState<string>('');
  
  // Login UI Logos
  const [loginLogoLight, setLoginLogoLight] = useState<string>('');
  const [loginLogoDark, setLoginLogoDark] = useState<string>('');

  // Invoice Logos
  const [invoiceLogoLight, setInvoiceLogoLight] = useState<string>('');
  const [invoiceLogoDark, setInvoiceLogoDark] = useState<string>('');

  const [totalCvCount, setTotalCvCount] = useState<number>(0);

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);


  // Gemini API Quota & Status State
  const [geminiStatus, setGeminiStatus] = useState<any>(null);
  const [isLoadingGeminiStatus, setIsLoadingGeminiStatus] = useState<boolean>(false);

  const isAdmin = role === 'admin' || role === 'developer';

  const defaultLightSvg = 'https://aurrum.co/wp-content/uploads/2026/05/Rectech-Logo.svg';
  const defaultDarkSvg = 'https://aurrum.co/wp-content/uploads/2026/05/Rectech-white-logo.svg';

  const fetchGeminiStatus = async () => {
    setIsLoadingGeminiStatus(true);
    try {
      const res = await fetch('/api/gemini/status');
      if (res.ok) {
        const data = await res.json();
        setGeminiStatus(data);
      }
    } catch (err) {
      console.warn('Failed to fetch Gemini status:', err);
    } finally {
      setIsLoadingGeminiStatus(false);
    }
  };

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
          
          setLoginLogoLight(data.loginLogoLight || '');
          setLoginLogoDark(data.loginLogoDark || '');
          
          setInvoiceLogoLight(data.invoiceLogoLight || '');
          setInvoiceLogoDark(data.invoiceLogoDark || '');
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
    fetchGeminiStatus();
  }, []);

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
        loginLogoLight: loginLogoLight.trim(),
        loginLogoDark: loginLogoDark.trim(),
        invoiceLogoLight: invoiceLogoLight.trim(),
        invoiceLogoDark: invoiceLogoDark.trim(),
        logoUrl: logoUrlLight.trim() || logoUrlDark.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setMessage({ type: 'success', text: 'System settings & logo configurations updated successfully!' });
    } catch (err: any) {
      console.error("Error saving settings:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setMessage({ type: 'error', text: `Failed to update settings: ${errMsg}` });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-8">
      <div className="crm-card p-8 space-y-8">
        <div className="flex items-center gap-4 pb-6 border-b border-[var(--border-color)]">
          <div className="w-12 h-12 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl flex items-center justify-center text-[var(--primary-gold)] shadow-sm">
            <Shield size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[var(--text-primary)]">System Control & Brand Identity</h2>
            <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">Global System Restrictions, Login UI & Invoice Logo Customization</p>
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

          {/* ================= GEMINI AI ENGINE & QUOTA STATUS ================= */}
          <div className="pt-8 border-t border-[var(--border-color)] space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-[var(--text-primary)] text-lg flex items-center gap-2">
                  <Sparkles size={22} className="text-[var(--primary-gold)]" /> Gemini AI Engine & Quota Status
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed font-medium mt-0.5">
                  Live connection metrics, active model stack, API key status, and Google AI Studio quota limits.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchGeminiStatus}
                disabled={isLoadingGeminiStatus}
                className="crm-btn-secondary text-xs px-4 py-2 font-bold flex items-center gap-2 shrink-0 hover:border-[var(--primary-gold)] transition-colors cursor-pointer"
              >
                <RefreshCw size={14} className={isLoadingGeminiStatus ? 'animate-spin text-[var(--primary-gold)]' : ''} />
                <span>{isLoadingGeminiStatus ? 'Testing Live Ping...' : 'Refresh Quota Status'}</span>
              </button>
            </div>

            {geminiStatus ? (
              <div className="space-y-6 bg-[var(--bg-primary)] p-6 rounded-2xl border border-[var(--border-color)] shadow-xs">
                {/* Top Header Status Card */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)] flex items-center justify-center text-[var(--primary-gold)] shrink-0 shadow-xs">
                      <Cpu size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-[var(--text-primary)]">Google Gemini AI Engine</span>
                        {geminiStatus.status === 'online' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Operational / Live
                          </span>
                        ) : geminiStatus.status === 'rate_limited' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <AlertTriangle size={12} />
                            Rate Limited (429 Quota Exceeded)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <AlertTriangle size={12} />
                            Key Missing / Error
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] font-medium mt-0.5">
                        {geminiStatus.tier || 'Google AI Studio Tier'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono font-bold">
                    {geminiStatus.maskedKey && (
                      <div className="flex items-center gap-1.5 bg-[var(--card-bg)] px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)]">
                        <Key size={13} className="text-[var(--primary-gold)]" />
                        <span>{geminiStatus.maskedKey}</span>
                      </div>
                    )}
                    {typeof geminiStatus.latencyMs === 'number' && (
                      <div className="flex items-center gap-1.5 bg-[var(--card-bg)] px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-emerald-600 dark:text-emerald-400">
                        <Activity size={13} />
                        <span>{geminiStatus.latencyMs} ms</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Model Stack */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider">Primary AI Model</span>
                      <div className="font-black text-xs text-[var(--text-primary)] font-mono flex items-center gap-1.5">
                        <Zap size={14} className="text-[var(--primary-gold)]" />
                        {geminiStatus.primaryModel || 'gemini-2.5-flash'}
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                      Active Default
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider">Fallback AI Model</span>
                      <div className="font-black text-xs text-[var(--text-primary)] font-mono flex items-center gap-1.5">
                        <Layers size={14} className="text-[var(--primary-gold)]" />
                        {geminiStatus.fallbackModel || 'gemini-3.1-pro-preview'}
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold text-[var(--primary-gold)] bg-[var(--primary-gold)]/10 px-2.5 py-1 rounded-md border border-[var(--primary-gold)]/20">
                      Auto Fallback
                    </span>
                  </div>
                </div>

                {/* Quota Limits Grid */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
                    <Activity size={14} className="text-[var(--primary-gold)]" />
                    API Rate Limits & Quota Thresholds
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Requests Per Minute */}
                    <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[var(--text-muted)]">RPM (Req / Min)</span>
                        <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                          {geminiStatus.quotaLimits?.requestsPerMinute?.currentUsage || 'Active'}
                        </span>
                      </div>
                      <div className="text-sm font-black text-[var(--text-primary)] font-mono">
                        {geminiStatus.quotaLimits?.requestsPerMinute?.limit || '1,000 RPM / 15 RPM'}
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] leading-tight font-medium">
                        Max requests per minute window.
                      </p>
                    </div>

                    {/* Tokens Per Minute */}
                    <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[var(--text-muted)]">TPM (Tokens / Min)</span>
                        <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                          {geminiStatus.quotaLimits?.tokensPerMinute?.currentUsage || 'Active'}
                        </span>
                      </div>
                      <div className="text-sm font-black text-[var(--text-primary)] font-mono">
                        {geminiStatus.quotaLimits?.tokensPerMinute?.limit || '4,000,000 TPM / 1,000,000 TPM'}
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] leading-tight font-medium">
                        Token volume processing capacity.
                      </p>
                    </div>

                    {/* Requests Per Day */}
                    <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[var(--text-muted)]">RPD (Req / Day)</span>
                        <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                          {geminiStatus.quotaLimits?.requestsPerDay?.currentUsage || 'Active'}
                        </span>
                      </div>
                      <div className="text-sm font-black text-[var(--text-primary)] font-mono">
                        {geminiStatus.quotaLimits?.requestsPerDay?.limit || 'Unlimited / 1,500 RPD'}
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] leading-tight font-medium">
                        Daily total request limit threshold.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Capabilities List */}
                <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
                  <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                    Active Gemini Engine Capabilities
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                    {(geminiStatus.features || [
                      'Waterfall AI CV Resume Structured Extraction',
                      'Multimodal Document OCR Parsing',
                      'Natural Language Talent Search Filter Engine',
                      'Schema Strict JSON Validation'
                    ]).map((feat: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)]">
                Fetching Gemini API Quota Status...
              </div>
            )}
          </div>

          {/* ================= GLOBAL BRANDING & LOGO SETTINGS ================= */}
          <div className="pt-8 border-t border-[var(--border-color)] space-y-8">
            <div>
              <h3 className="font-bold text-[var(--text-primary)] text-lg flex items-center gap-2">
                <Image size={22} className="text-[var(--primary-gold)]" /> Enterprise Brand Logos Configuration
              </h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed font-medium mt-1">
                Customize distinct logos for each module view across both Light (White) and Dark themes. Upload high-res images or provide direct URLs.
              </p>
            </div>

            {uploadError && (
              <div className="flex items-center gap-2 text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/20 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/40">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* 1. System, Header & Sidebar Logos */}
            <div className="space-y-4 bg-[var(--bg-primary)] p-6 rounded-2xl border border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <Layout size={18} className="text-[var(--primary-gold)]" />
                <h4 className="font-extrabold text-sm text-[var(--text-primary)]">1. System, Header & Sidebar Logos</h4>
              </div>
              <p className="text-xs text-[var(--text-muted)] font-medium">
                Logos used for navigation sidebars, top header bar, and general app interface across the platform.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <LogoUploader
                  id="sys-light"
                  title="System Light Theme Logo"
                  badge="White Canvas"
                  badgeColor="bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  value={logoUrlLight}
                  onChange={setLogoUrlLight}
                  bgMode="light"
                  defaultFallback={defaultLightSvg}
                  onUploadError={setUploadError}
                />
                <LogoUploader
                  id="sys-dark"
                  title="System Dark Theme Logo"
                  badge="Dark Canvas"
                  badgeColor="bg-indigo-500/10 text-indigo-400"
                  value={logoUrlDark}
                  onChange={setLogoUrlDark}
                  bgMode="dark"
                  defaultFallback={defaultDarkSvg}
                  onUploadError={setUploadError}
                />
              </div>
            </div>

            {/* 2. Login UI Logos */}
            <div className="space-y-4 bg-[var(--bg-primary)] p-6 rounded-2xl border border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <LogIn size={18} className="text-[var(--primary-gold)]" />
                <h4 className="font-extrabold text-sm text-[var(--text-primary)]">2. Login UI Page Logos</h4>
              </div>
              <p className="text-xs text-[var(--text-muted)] font-medium">
                Logo displayed prominently on the Authentication / Login screen for recruiters and admins. (Leaves blank to fallback to System logo).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <LogoUploader
                  id="login-light"
                  title="Login UI Light Theme Logo"
                  badge="White Login Card"
                  badgeColor="bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  value={loginLogoLight}
                  onChange={setLoginLogoLight}
                  bgMode="light"
                  defaultFallback={logoUrlLight || defaultLightSvg}
                  onUploadError={setUploadError}
                />
                <LogoUploader
                  id="login-dark"
                  title="Login UI Dark Theme Logo"
                  badge="Dark Login Card"
                  badgeColor="bg-indigo-500/10 text-indigo-400"
                  value={loginLogoDark}
                  onChange={setLoginLogoDark}
                  bgMode="dark"
                  defaultFallback={logoUrlDark || defaultDarkSvg}
                  onUploadError={setUploadError}
                />
              </div>
            </div>

            {/* 3. Invoice Logos */}
            <div className="space-y-4 bg-[var(--bg-primary)] p-6 rounded-2xl border border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[var(--primary-gold)]" />
                <h4 className="font-extrabold text-sm text-[var(--text-primary)]">3. Invoice & PDF Branding Logos</h4>
              </div>
              <p className="text-xs text-[var(--text-muted)] font-medium">
                Logo embedded on client invoices, payment previews, and downloadable PDF documents for both Light and Dark theme displays.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <LogoUploader
                  id="invoice-light"
                  title="Invoice Light Theme / Paper Logo"
                  badge="White Paper PDF"
                  badgeColor="bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  value={invoiceLogoLight}
                  onChange={setInvoiceLogoLight}
                  bgMode="light"
                  defaultFallback={logoUrlLight || defaultLightSvg}
                  onUploadError={setUploadError}
                />
                <LogoUploader
                  id="invoice-dark"
                  title="Invoice Dark Theme Logo"
                  badge="Digital Dark View"
                  badgeColor="bg-indigo-500/10 text-indigo-400"
                  value={invoiceLogoDark}
                  onChange={setInvoiceLogoDark}
                  bgMode="dark"
                  defaultFallback={logoUrlDark || defaultDarkSvg}
                  onUploadError={setUploadError}
                />
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex gap-3">
            <Info size={18} className="text-[var(--primary-gold)] shrink-0" />
            <div className="text-[11px] text-[var(--text-secondary)] font-medium space-y-1">
              <p>When custom module logos (Login or Invoice) are left blank, the system automatically falls back to the main System Light/Dark Theme logo.</p>
              <p className="mt-1 text-[var(--text-muted)]">All uploaded logo images are stored efficiently in Firestore and updated live across all active user sessions instantly.</p>
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
              className="crm-btn-gold ml-auto flex items-center gap-2 px-8 py-3 text-xs uppercase tracking-wider font-extrabold cursor-pointer hover:scale-105 transition-all"
            >
              {isSaving ? 'Updating...' : 'Save All Settings & Logos'}
              <Save size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
