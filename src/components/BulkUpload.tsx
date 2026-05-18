import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle2, AlertCircle, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BulkUploadProps {
  onUpload: (files: File[]) => void;
  isProcessing: boolean;
  parsedCandidates: any[];
  onUpdateCandidate: (index: number, updatedCandidate: any) => void;
  onFinalize: (results: any[]) => void;
}

export default function BulkUpload({ onUpload, isProcessing, parsedCandidates, onUpdateCandidate, onFinalize }: BulkUploadProps) {
  const [expandedCandidates, setExpandedCandidates] = useState<Set<number>>(new Set());
  const [isFinishing, setIsFinishing] = useState(false);

  const handleFinalize = async () => {
    setIsFinishing(true);
    await onFinalize(parsedCandidates);
    setIsFinishing(false);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    onUpload(acceptedFiles);
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
        'application/pdf': ['.pdf'], 
        'application/msword': ['.doc'], 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        'text/csv': ['.csv'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        'text/plain': ['.txt'] 
    },
    multiple: true,
  } as any);

  const toggleExpand = (index: number) => {
    const next = new Set(expandedCandidates);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setExpandedCandidates(next);
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto p-4 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">CV Parsing</h2>
        <p className="text-[var(--text-muted)] text-sm">Upload multiple CVs to parse and extract candidate data efficiently. Supported: PDF, DOCX, CSV, XLSX, TXT.</p>
      </div>

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
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Upload CVs</h3>
            <p className="text-xs text-[var(--text-muted)]">Drag & drop or Click to select</p>
        </div>
      </div>

      {isProcessing && (
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl p-6 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 animate-pulse">
                    <FileText size={24} />
                </div>
                <div>
                    <h4 className="font-bold text-[var(--text-primary)]">Parsing CVs</h4>
                    <p className="text-xs text-[var(--text-muted)]">System is extracting and normalizing candidate data...</p>
                </div>
            </div>
            <div className="text-indigo-500 font-black text-sm uppercase tracking-widest animate-pulse">Analyzing...</div>
        </div>
      )}

      {parsedCandidates.length > 0 && (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-[var(--text-primary)]">Preview Results</h3>
                <button 
                    onClick={handleFinalize}
                    disabled={isFinishing || isProcessing}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-100 transition-all active:scale-95"
                >
                    {isFinishing ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                    {isFinishing ? 'Saving...' : 'Finalize & Save to Repository'}
                </button>
            </div>
            {parsedCandidates.map((c, i) => (
                <div key={i} className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleExpand(i)}>
                        <div>
                            <h4 className="font-bold text-[var(--text-primary)]">{c.fullName || 'Unknown Candidate'}</h4>
                            <p className="text-xs text-[var(--text-muted)]">{c.email || 'No Email'}</p>
                        </div>
                        {expandedCandidates.has(i) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                    <AnimatePresence>
                        {expandedCandidates.has(i) && (
                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                <div className="mt-4 pt-4 border-t border-[var(--border-color)] grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <p className="font-bold text-[var(--text-muted)] uppercase">Full Name</p>
                                        <input 
                                            value={c.fullName} 
                                            onChange={(e) => onUpdateCandidate(i, { ...c, fullName: e.target.value })}
                                            className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] p-1 rounded mt-1 text-[var(--text-primary)]"
                                        />
                                    </div>
                                    <div>
                                        <p className="font-bold text-[var(--text-muted)] uppercase">Domain Focus</p>
                                        <input 
                                            value={c.domainFocus} 
                                            onChange={(e) => onUpdateCandidate(i, { ...c, domainFocus: e.target.value })}
                                            className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] p-1 rounded mt-1 text-[var(--text-primary)]"
                                        />
                                    </div>
                                    <div><p className="font-bold text-[var(--text-muted)] uppercase">Follow Up</p><p>{c.followUpDate || 'None'}</p></div>
                                    <div className="col-span-2"><p className="font-bold text-[var(--text-muted)] uppercase">Skills</p><p>{c.skills?.join(', ') || 'None'}</p></div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ))}
        </div>
      )}
    </div>
  );
}
