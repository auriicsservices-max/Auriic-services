import React, { useState, useEffect } from 'react';
import { Folder, FileText, CheckCircle2, Play, RefreshCw, Check, ArrowRight, ShieldCheck, Database, Layers } from 'lucide-react';

interface ResumeFile {
  index: number;
  fileName: string;
  isSynced: boolean;
  fileUrl: string;
}

export default function LocalResumeSync({ onSyncComplete }: { onSyncComplete?: () => void }) {
  const [files, setFiles] = useState<ResumeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingFile, setSyncingFile] = useState<string | null>(null);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [autoSyncing, setAutoSyncing] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bulk-resumes/files');
      const data = await res.json();
      if (data.status) {
        setFiles(data.files || []);
      }
    } catch (err) {
      console.error('Failed to load local resumes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const syncSingleFile = async (fileName: string) => {
    setSyncingFile(fileName);
    try {
      const res = await fetch('/api/bulk-resumes/sync-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName })
      });
      const data = await res.json();
      if (data.status) {
        setFiles(prev => prev.map(f => f.fileName === fileName ? { ...f, isSynced: true } : f));
        setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] ✅ ${data.message}`, ...prev]);
        if (onSyncComplete) onSyncComplete();
      } else {
        setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] ❌ Failed ${fileName}: ${data.error}`, ...prev]);
      }
    } catch (err: any) {
      setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] ❌ Error ${fileName}: ${err.message}`, ...prev]);
    } finally {
      setSyncingFile(null);
    }
  };

  const syncNextUnsynced = async () => {
    const nextFile = files.find(f => !f.isSynced);
    if (!nextFile) {
      setAutoSyncing(false);
      return;
    }
    await syncSingleFile(nextFile.fileName);
  };

  useEffect(() => {
    let timer: any;
    if (autoSyncing) {
      const nextFile = files.find(f => !f.isSynced);
      if (nextFile) {
        timer = setTimeout(() => {
          syncNextUnsynced();
        }, 500);
      } else {
        setAutoSyncing(false);
      }
    }
    return () => clearTimeout(timer);
  }, [autoSyncing, files]);

  const totalFiles = files.length;
  const syncedCount = files.filter(f => f.isSynced).length;
  const progressPercent = totalFiles > 0 ? Math.round((syncedCount / totalFiles) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">Local Resumes Synchronizer (bulk_resumes/Heena)</h2>
          <p className="text-sm text-[var(--text-muted)] font-medium mt-1">
            Inspect and synchronize each local resume file one by one into the Aurrum CRM Firestore database (<code className="bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded font-mono text-xs text-[var(--primary-gold)]">aurrum-production</code>).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchFiles}
            className="px-4 py-2.5 rounded-xl text-sm font-bold bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] flex items-center gap-2 hover:border-[var(--primary-gold)] transition-all"
          >
            <RefreshCw className="w-4 h-4 text-[var(--primary-gold)]" />
            Refresh Files
          </button>
          <button
            onClick={() => setAutoSyncing(!autoSyncing)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md transition-all ${
              autoSyncing ? 'bg-amber-600 text-white hover:bg-amber-700' : 'crm-btn-gold'
            }`}
          >
            <Play className={`w-4 h-4 ${autoSyncing ? 'animate-pulse' : ''}`} />
            {autoSyncing ? 'Pause Auto-Sync' : 'Auto-Sync One by One'}
          </button>
        </div>
      </div>

      {/* Progress Card */}
      <div className="crm-card p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[var(--primary-gold)]/10 text-[var(--primary-gold)]">
              <Folder className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">Synchronization Queue Progress</h3>
              <p className="text-xs text-[var(--text-muted)] font-medium">Folder: <span className="font-mono text-[var(--text-primary)]">/bulk_resumes/Heena/</span></p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-[var(--primary-gold)]">{syncedCount} / {totalFiles}</span>
            <span className="text-xs text-[var(--text-muted)] block font-bold">Resumes Synchronized</span>
          </div>
        </div>

        <div className="w-full bg-[var(--bg-secondary)] h-3 rounded-full overflow-hidden border border-[var(--border-color)]">
          <div
            className="bg-gradient-to-r from-[var(--primary-gold)] to-[#BC9B66] h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* File List Table */}
      <div className="crm-card rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-sm bg-[var(--card-bg)]">
        <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-secondary)]/50">
          <span className="text-xs font-black uppercase text-[var(--text-muted)] tracking-wider">File Name & Path</span>
          <span className="text-xs font-black uppercase text-[var(--text-muted)] tracking-wider">Sync Status & Action</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[var(--text-muted)] font-bold">Scanning bulk_resumes/Heena folder...</div>
        ) : files.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-muted)] font-bold">No resume files found in bulk_resumes/Heena.</div>
        ) : (
          <div className="divide-y divide-[var(--border-color)] max-h-[500px] overflow-y-auto">
            {files.map((file) => (
              <div key={file.index} className="px-6 py-4 flex items-center justify-between hover:bg-[var(--card-hover-bg)] transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${file.isSynced ? 'bg-emerald-500/10 text-emerald-600' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'}`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{file.fileName}</p>
                    <p className="text-xs text-[var(--text-muted)] font-mono">Index #{file.index} • /bulk_resumes/Heena/{file.fileName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {file.isSynced ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Synced to CRM
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      Pending Sync
                    </span>
                  )}

                  <button
                    onClick={() => syncSingleFile(file.fileName)}
                    disabled={syncingFile === file.fileName || file.isSynced}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                      file.isSynced
                        ? 'bg-[var(--bg-secondary)] text-[var(--text-muted)] opacity-60 cursor-not-allowed'
                        : syncingFile === file.fileName
                        ? 'bg-[var(--primary-gold)]/50 text-white cursor-wait'
                        : 'crm-btn-gold shadow-sm'
                    }`}
                  >
                    {syncingFile === file.fileName ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Syncing...
                      </>
                    ) : file.isSynced ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Synchronized
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-3.5 h-3.5" />
                        Sync File
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Logs */}
      {syncLogs.length > 0 && (
        <div className="crm-card p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-sm space-y-3">
          <h4 className="text-xs font-black uppercase text-[var(--text-muted)] tracking-wider">Live Synchronization Activity</h4>
          <div className="bg-[var(--bg-secondary)] p-4 rounded-xl font-mono text-xs text-[var(--text-primary)] max-h-48 overflow-y-auto space-y-1 border border-[var(--border-color)]">
            {syncLogs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
