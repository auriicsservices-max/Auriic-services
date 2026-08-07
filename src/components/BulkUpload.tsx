import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface BulkUploadProps {
  onUpload: (files: File[]) => void;
  isProcessing: boolean;
  uploadProgress: { total: number, processed: number, skipped: number, failed: number };
  skippedFiles: string[];
  role?: string;
  fullTeamList?: any[];
  selectedUploaderId?: string;
  onUploaderChange?: (uploaderId: string) => void;
}

export default function BulkUpload({ onUpload, isProcessing, uploadProgress, skippedFiles, role, fullTeamList = [], selectedUploaderId, onUploaderChange }: BulkUploadProps) {
  const [largeFilesWarn, setLargeFilesWarn] = useState<string[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const tooLarge = acceptedFiles.filter(f => f.size > 1 * 1024 * 1024);
    if (tooLarge.length > 0) {
      setLargeFilesWarn(tooLarge.map(f => f.name));
    } else {
      setLargeFilesWarn([]);
    }
    onUpload(acceptedFiles);
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
        'application/pdf': ['.pdf'], 
        'application/msword': ['.doc'], 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 
        'text/plain': ['.txt'] 
    },
    multiple: true,
  } as any);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">Bulk Upload CVs</h2>
        <p className="text-[var(--text-muted)] text-sm">Drag and drop multiple CVs to parse and add them to your pipeline.</p>
      </div>

      {role === 'developer' && (
        <div className="crm-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[2rem] shadow-sm">
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">Developer Upload Attribution</span>
            <span className="text-[11px] text-[var(--text-muted)]">Select recruiter attribution ("uploadedBy") for this upload batch.</span>
          </div>
          <select
            value={selectedUploaderId || ''}
            onChange={(e) => onUploaderChange?.(e.target.value)}
            className="crm-input text-xs py-2 px-3 font-bold min-w-[220px]"
          >
            {fullTeamList.map(member => (
              <option key={member.id || member.uid} value={member.id || member.uid}>
                {member.name || member.email} ({member.role || 'recruiter'})
              </option>
            ))}
          </select>
        </div>
      )}

      {largeFilesWarn.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-6 rounded-3xl flex items-start gap-3.5 text-amber-800 dark:text-amber-200 animate-in fade-in zoom-in-95 duration-200">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
          <div className="text-xs space-y-1 flex-1">
            <p className="font-black">The following resumes exceed the 1MB limit and will be skipped:</p>
            <ul className="list-disc pl-4 space-y-0.5 mt-1 font-medium">
              {largeFilesWarn.map(name => (
                <li key={name} className="font-mono text-[11px] truncate max-w-lg">{name}</li>
              ))}
            </ul>
          </div>
          <button onClick={() => setLargeFilesWarn([])} className="p-1 text-amber-500 hover:text-amber-700 dark:hover:text-amber-300">
            <X size={14} />
          </button>
        </div>
      )}

      {skippedFiles.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-6 rounded-3xl flex items-start gap-3.5 text-amber-800 dark:text-amber-200 animate-in fade-in zoom-in-95 duration-200">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
          <div className="text-xs space-y-1 flex-1">
            <p className="font-black">The following resumes were skipped:</p>
            <ul className="list-disc pl-4 space-y-0.5 mt-1 font-medium">
              {skippedFiles.map(name => (
                <li key={name} className="font-mono text-[11px] truncate max-w-lg">{name} - Duplicate Resume - Skipped</li>
              ))}
            </ul>
          </div>
          <button onClick={() => {}} className="p-1 text-amber-500 hover:text-amber-700 dark:hover:text-amber-300">
            <X size={14} />
          </button>
        </div>
      )}

      <div
        {...getRootProps()}
        className={`relative group border-2 border-dashed rounded-[2rem] p-12 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer ${
          isDragActive 
            ? 'border-[var(--primary-gold)] bg-[var(--bg-secondary)] ring-4 ring-[var(--primary-gold)]/20' 
            : 'border-[var(--border-color)] bg-[var(--card-bg)] hover:border-[var(--primary-gold)] hover:bg-[var(--card-hover-bg)] shadow-sm'
        }`}
      >
        <input {...getInputProps()} />
        <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isDragActive ? 'bg-[var(--primary-gold)]/20 text-[var(--primary-gold)]' : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--primary-gold)] shadow-sm'}`}>
          <Upload className={`w-10 h-10 ${isDragActive ? 'text-[var(--primary-gold)]' : 'text-[var(--text-muted)] group-hover:text-[var(--primary-gold)] transition-colors'}`} />
        </div>
        <div className="text-center">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Click or drag files here</h3>
            <p className="text-xs text-[var(--text-muted)] font-medium">Support for PDF, DOCX, TXT • Max size 1MB per file</p>
        </div>
      </div>

      {isProcessing && (
          <div className="crm-card p-6 flex flex-col gap-4 shadow-sm">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--primary-gold)] animate-pulse shadow-sm">
                          <FileText size={24} />
                      </div>
                      <div>
                          <h4 className="font-bold text-[var(--text-primary)]">Parsing CVs</h4>
                          <p className="text-xs text-[var(--text-muted)] font-medium">Our AI is extracting candidate data ({uploadProgress.processed} / {uploadProgress.total})...</p>
                      </div>
                  </div>
                  <div className="text-[var(--primary-gold)] font-black text-sm uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary-gold)] animate-ping" />
                    Processing...
                  </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[var(--border-color)]">
                <div className="text-center">
                    <p className="text-2xl font-black text-emerald-600">{uploadProgress.processed - uploadProgress.skipped - uploadProgress.failed}</p>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Imported</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-black text-amber-600">{uploadProgress.skipped}</p>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Skipped</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-black text-rose-600">{uploadProgress.failed}</p>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Failed</p>
                </div>
              </div>
          </div>
      )}

    </div>
  );
}
