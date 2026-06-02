import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface BulkUploadProps {
  onUpload: (files: File[]) => void;
  isProcessing: boolean;
}

export default function BulkUpload({ onUpload, isProcessing }: BulkUploadProps) {
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

      <div
        {...getRootProps()}
        className={`relative group border-2 border-dashed rounded-[2rem] p-12 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer ${
          isDragActive 
            ? 'border-indigo-500 bg-indigo-950/20' 
            : 'border-[var(--border-color)] bg-[var(--card-bg)] hover:border-indigo-500/50 hover:bg-slate-900/50'
        }`}
      >
        <input {...getInputProps()} />
        <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isDragActive ? 'bg-indigo-500/20' : 'bg-slate-800'}`}>
          <Upload className={`w-10 h-10 ${isDragActive ? 'text-indigo-400' : 'text-slate-400'}`} />
        </div>
        <div className="text-center">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Click or drag files here</h3>
            <p className="text-xs text-[var(--text-muted)]">Support for PDF, DOCX, TXT • Max size 1MB per file</p>
        </div>
      </div>

      {isProcessing && (
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-500/10 flex items-center justify-center text-slate-500 animate-pulse">
                      <FileText size={24} />
                  </div>
                  <div>
                      <h4 className="font-bold text-[var(--text-primary)]">Parsing CVs</h4>
                      <p className="text-xs text-[var(--text-muted)]">Our AI is extracting candidate data...</p>
                  </div>
              </div>
              <div className="text-slate-500 font-black text-xl">Processing...</div>
          </div>
      )}

    </div>
  );
}
