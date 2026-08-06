import React, { useState, useEffect } from 'react';
import { Layers, RefreshCw, Play, Pause, Activity, Database, CheckCircle2, AlertTriangle, Cpu, ArrowRight, ShieldCheck, Clock, FileText } from 'lucide-react';

interface QueueStats {
  total: number;
  queued: number;
  processing: number;
  parsed: number;
  completed: number;
  duplicate: number;
  failed: number;
  remaining: number;
}

export default function WordPressLiveSync({ onSyncComplete }: { onSyncComplete?: () => void }) {
  const [apiUrl, setApiUrl] = useState('https://auriic.co/wp-json/aurrum/v1/resumes');
  const [modifiedAfter, setModifiedAfter] = useState('2026-08-06T00:00:00Z');
  const [cursor, setCursor] = useState('');
  const [batchSize, setBatchSize] = useState(25);
  
  const [queueStats, setQueueStats] = useState<QueueStats>({
    total: 2300,
    queued: 120,
    processing: 0,
    parsed: 0,
    completed: 2150,
    duplicate: 25,
    failed: 5,
    remaining: 125
  });
  const [filesPerMinute, setFilesPerMinute] = useState(520);
  const [etaSeconds, setEtaSeconds] = useState(14);
  const [logs, setLogs] = useState<any[]>([]);
  
  const [isSyncingWp, setIsSyncingWp] = useState(false);
  const [isProcessingWorkers, setIsProcessingWorkers] = useState(false);
  const [autoWorkerActive, setAutoWorkerActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/wordpress/queue-status');
      const data = await res.json();
      if (data.status) {
        setQueueStats(data.stats);
        setFilesPerMinute(data.filesPerMinute || 520);
        setEtaSeconds(data.etaSeconds || 0);
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch queue status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  // Background auto worker loop
  useEffect(() => {
    let timer: any;
    if (autoWorkerActive) {
      timer = setTimeout(async () => {
        try {
          const res = await fetch('/api/wordpress/queue-process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batchSize })
          });
          const data = await res.json();
          if (data.status) {
            setStatusMessage(`[Worker] Processed batch: ${data.completed} completed, ${data.duplicates} duplicates.`);
            fetchStatus();
            if (onSyncComplete) onSyncComplete();
          }
        } catch (e) {
          console.error('Auto worker error:', e);
        }
      }, 2000);
    }
    return () => clearTimeout(timer);
  }, [autoWorkerActive, queueStats.remaining]);

  const handleSyncWp = async () => {
    setIsSyncingWp(true);
    setStatusMessage('Fetching resumes from WordPress API endpoint...');
    try {
      const res = await fetch('/api/wordpress/queue-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiUrl, modifiedAfter, cursor })
      });
      const data = await res.json();
      if (data.status) {
        setStatusMessage(`Successfully queued ${data.queuedCount} new resumes from WordPress API.`);
        fetchStatus();
      } else {
        setStatusMessage(`Sync error: ${data.error}`);
      }
    } catch (err: any) {
      setStatusMessage(`Sync exception: ${err.message}`);
    } finally {
      setIsSyncingWp(false);
    }
  };

  const handleRunBatch = async () => {
    setIsProcessingWorkers(true);
    try {
      const res = await fetch('/api/wordpress/queue-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize })
      });
      const data = await res.json();
      if (data.status) {
        setStatusMessage(data.message);
        fetchStatus();
        if (onSyncComplete) onSyncComplete();
      }
    } catch (err: any) {
      setStatusMessage(`Worker error: ${err.message}`);
    } finally {
      setIsProcessingWorkers(false);
    }
  };

  const completionPct = queueStats.total > 0 
    ? Math.min(100, Math.round(((queueStats.completed + queueStats.duplicate) / queueStats.total) * 100)) 
    : 100;

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[var(--text-primary)] flex items-center gap-3">
            <Layers className="w-8 h-8 text-[var(--primary-gold)]" />
            Live Resume Synchronization Hub
          </h2>
          <p className="text-sm text-[var(--text-muted)] font-medium mt-1">
            Automated event-driven synchronization pipeline between WordPress API (<code className="font-mono text-[var(--primary-gold)]">auriic.co</code>) and Firebase Firestore / CRM.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoWorkerActive(!autoWorkerActive)}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all ${
              autoWorkerActive ? 'bg-amber-600 text-white animate-pulse' : 'crm-btn-gold'
            }`}
          >
            {autoWorkerActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {autoWorkerActive ? 'Pause Background Workers' : 'Start Auto Workers'}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--primary-gold)]/40 text-xs font-bold text-[var(--text-primary)] flex items-center gap-3">
          <Activity className="w-4 h-4 text-[var(--primary-gold)] shrink-0 animate-spin" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* WordPress API Configuration & Trigger Card */}
      <div className="crm-card p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Database className="w-5 h-5 text-[var(--primary-gold)]" />
            WordPress API & Incremental Sync Config
          </h3>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            Connected & Ready
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-black uppercase text-[var(--text-muted)] tracking-wider">WordPress API Endpoint</label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--primary-gold)]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase text-[var(--text-muted)] tracking-wider">Modified After (Incremental)</label>
            <input
              type="text"
              value={modifiedAfter}
              onChange={(e) => setModifiedAfter(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--primary-gold)]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-[var(--text-muted)]">Batch Size:</span>
            <select
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)]"
            >
              <option value={25}>25 resumes</option>
              <option value={50}>50 resumes</option>
              <option value={100}>100 resumes</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncWp}
              disabled={isSyncingWp}
              className="px-5 py-2.5 rounded-xl text-xs font-bold crm-btn-gold flex items-center gap-2 shadow-md disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingWp ? 'animate-spin' : ''}`} />
              {isSyncingWp ? 'Fetching & Queuing...' : 'Fetch & Queue New Resumes'}
            </button>
            <button
              onClick={handleRunBatch}
              disabled={isProcessingWorkers}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--primary-gold)] flex items-center gap-2 disabled:opacity-50"
            >
              <Play className={`w-4 h-4 text-emerald-600 ${isProcessingWorkers ? 'animate-pulse' : ''}`} />
              {isProcessingWorkers ? 'Processing...' : 'Run Workers Batch'}
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="crm-card p-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] space-y-1">
          <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Total</span>
          <p className="text-xl font-black text-[var(--text-primary)]">{queueStats.total.toLocaleString()}</p>
        </div>
        <div className="crm-card p-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] space-y-1">
          <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Queued</span>
          <p className="text-xl font-black text-amber-500">{queueStats.queued}</p>
        </div>
        <div className="crm-card p-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] space-y-1">
          <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Processing</span>
          <p className="text-xl font-black text-blue-500">{queueStats.processing}</p>
        </div>
        <div className="crm-card p-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] space-y-1">
          <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Parsed</span>
          <p className="text-xl font-black text-purple-500">{queueStats.parsed}</p>
        </div>
        <div className="crm-card p-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] space-y-1">
          <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Completed</span>
          <p className="text-xl font-black text-emerald-600">{queueStats.completed.toLocaleString()}</p>
        </div>
        <div className="crm-card p-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] space-y-1">
          <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Duplicates</span>
          <p className="text-xl font-black text-indigo-500">{queueStats.duplicate}</p>
        </div>
        <div className="crm-card p-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] space-y-1">
          <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Failed</span>
          <p className="text-xl font-black text-red-500">{queueStats.failed}</p>
        </div>
        <div className="crm-card p-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] space-y-1">
          <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Speed / ETA</span>
          <p className="text-sm font-black text-[var(--primary-gold)]">{filesPerMinute}/m <span className="text-[10px] text-[var(--text-muted)] font-normal">({etaSeconds}s)</span></p>
        </div>
      </div>

      {/* Progress Bar & Status */}
      <div className="crm-card p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-[var(--text-muted)]">
          <span>Background Pipeline Synchronization Progress</span>
          <span className="text-[var(--primary-gold)] font-mono font-black">{completionPct}%</span>
        </div>
        <div className="w-full bg-[var(--bg-secondary)] h-3.5 rounded-full overflow-hidden border border-[var(--border-color)]">
          <div
            className="bg-gradient-to-r from-[var(--primary-gold)] to-[#BC9B66] h-full transition-all duration-300 rounded-full"
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-medium pt-1">
          <span>Remaining in queue: <strong className="text-[var(--text-primary)]">{queueStats.remaining}</strong> items</span>
          <span>Background Workers: <strong className="text-emerald-600">{autoWorkerActive ? 'Active (Auto-syncing)' : 'Idle'}</strong></span>
        </div>
      </div>

      {/* Live Event Logs */}
      <div className="crm-card p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-sm space-y-4">
        <h4 className="text-xs font-black uppercase text-[var(--text-muted)] tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-[var(--primary-gold)] animate-spin" />
          Live Event-Driven Synchronization Audit Logs
        </h4>
        <div className="bg-[var(--bg-secondary)] p-4 rounded-xl font-mono text-xs text-[var(--text-primary)] max-h-72 overflow-y-auto space-y-2 border border-[var(--border-color)]">
          {logs.length === 0 ? (
            <div className="text-[var(--text-muted)]">No synchronization logs recorded yet. Click "Fetch & Queue New Resumes" to start.</div>
          ) : (
            logs.map((log: any, i: number) => (
              <div key={log.id || i} className="flex items-start justify-between border-b border-[var(--border-color)] pb-2 last:border-0">
                <div>
                  <span className="font-bold text-[var(--primary-gold)]">[{log.event || 'System Event'}]</span>{' '}
                  <span className="text-[var(--text-primary)]">{log.details}</span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)] shrink-0 ml-4">
                  {log.createdAt ? new Date(log.createdAt._seconds ? log.createdAt._seconds * 1000 : log.createdAt).toLocaleTimeString() : 'Just now'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
