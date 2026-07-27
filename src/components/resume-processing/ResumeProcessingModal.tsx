import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Loader2 } from 'lucide-react';
import { ResumeProcessingJob } from '../../types/resume';

interface Props {
  job: ResumeProcessingJob;
  onClose: () => void;
}

export const ResumeProcessingModal: React.FC<Props> = ({ job, onClose }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[var(--radius-modal)] p-8 w-full max-w-lg shadow-xl relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><X size={20}/></button>
            <h3 className="text-xl font-bold mb-6 text-[var(--text-primary)]">Processing {job.filename}</h3>
            
            <div className="relative flex items-center justify-center h-48">
              <svg className="w-40 h-40 transform -rotate-90">
                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-[var(--bg-tertiary)]" />
                <motion.circle 
                  cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent"
                  className="text-[var(--primary-gold)]"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: job.progress / 100 }}
                  transition={{ duration: 0.5 }}
                />
              </svg>
              <div className="absolute text-2xl font-bold text-[var(--text-primary)]">{Math.round(job.progress)}%</div>
            </div>

            <p className="text-center mt-6 text-[var(--text-primary)] font-medium">{job.currentStep}</p>
            <p className="text-center text-sm text-[var(--text-muted)] mt-2">Estimated time: {job.estimatedTimeRemaining}s</p>
        </div>
    </motion.div>
  );
};
