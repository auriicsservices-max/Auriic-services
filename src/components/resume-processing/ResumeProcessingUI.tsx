import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Loader2, AlertCircle, FileText, Clock } from 'lucide-react';
import { ResumeProcessingJob } from '../../types/resume';

interface Props {
  jobs: ResumeProcessingJob[];
  onClose: () => void;
}

const STEPS = [
  'Uploading File',
  'Extracting PDF Text',
  'Detecting Candidate Information',
  'Extracting Skills & Experience',
  'Detecting Location & Domain Focus',
  'AI Analysis Running',
  'Saving Candidate Data',
  'Background Indexing',
  'Completed'
];

export const ResumeProcessingUI: React.FC<Props> = ({ jobs, onClose }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[var(--radius-modal)] p-8 w-full max-w-4xl shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors"><X size={20}/></button>
        
        <h2 className="text-2xl font-bold mb-8 text-[var(--text-primary)]">Resume Processing</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
          {jobs.map((job) => (
            <div key={job.id} className="bg-[var(--bg-primary)] rounded-2xl p-6 border border-[var(--border-color)]">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <FileText className="text-[var(--primary-gold)]" />
                        <span className="font-semibold text-[var(--text-primary)] truncate max-w-[150px]">{job.filename}</span>
                    </div>
                    <span className="text-2xl font-bold text-[var(--text-primary)]">{Math.round(job.progress)}%</span>
                </div>
                
                <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-2 mb-4 overflow-hidden">
                    <motion.div 
                        className="bg-[var(--gold-gradient)] h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${job.progress}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
                
                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-2">
                    <Loader2 className="animate-spin text-[var(--accent-color)]" size={14}/>
                    {job.currentStep || 'Initializing...'}
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <Clock size={12}/>
                    ETA: {job.estimatedTimeRemaining}s
                </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};
