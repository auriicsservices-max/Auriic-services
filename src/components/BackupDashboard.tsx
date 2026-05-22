import React, { useState, useEffect } from 'react';
import { Download, Database, FileText, Clock, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function BackupDashboard() {
  const { isPrivileged, user } = useAuth();
  const [backups, setBackups] = useState<any[]>([]);

  const handleDownload = async () => {
      const token = await user?.getIdToken();
      if (!token) return;
      
      const response = await fetch('/api/backup/download/full', {
          headers: {
              'Authorization': `Bearer ${token}`
          }
      });
      
      if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `aurrum-backup-${new Date().toISOString().split('T')[0]}.zip`;
          document.body.appendChild(a);
          a.click();
          a.remove();
      } else {
          alert('Access Denied or Backup failed');
      }
  };

  if (!isPrivileged) {
    return <div className="p-8 text-center text-[var(--text-muted)]">Access Denied</div>;
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif text-[var(--text-primary)]">Backup & Export</h2>
        <div className="flex gap-2">
          <button onClick={handleDownload} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-all">
            <Download size={16} className="mr-2" />
            Download Now
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { name: 'Full Backup', type: 'Zip', icon: FileText },
          { name: 'Candidates Data', type: 'JSON', icon: Database },
          { name: 'User Data', type: 'JSON', icon: Database },
          { name: 'Activity Logs', type: 'JSON', icon: FileText },
          { name: 'CV Files', type: 'Zip', icon: FileText },
        ].map((item, i) => (
          <div key={i} className="bg-[var(--card-bg)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <item.icon size={20} />
              </div>
              <div>
                <h3 className="font-bold text-[var(--text-primary)]">{item.name}</h3>
                <p className="text-xs text-[var(--text-muted)]">{item.type}</p>
              </div>
            </div>
            
            <div className="border-t border-[var(--border-color)] pt-4 mt-auto">
                <div className="flex justify-between text-xs text-[var(--text-muted)] mb-2">
                    <p>Last Backup:</p>
                    <p>2026-05-22</p>
                </div>
                <button className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-lg text-xs font-bold transition-all">
                    Download
                </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
