import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useResumeProcessing } from '../../contexts/ResumeProcessingContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ResumeProcessingDrawer: React.FC<Props> = ({ isOpen, onClose }) => {
  const { jobs } = useResumeProcessing();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed right-0 top-0 h-full w-80 bg-[var(--card-bg)] shadow-xl z-50 p-6 border-l border-[var(--border-color)]"
            >
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-[var(--text-primary)]">Processing Queue ({jobs.length})</h3>
                <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><X size={20}/></button>
            </div>
            <div className="space-y-4">
                {jobs.map(job => (
                    <div key={job.id} className="p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl">
                        <p className="font-medium text-sm truncate text-[var(--text-primary)]">{job.filename}</p>
                        <div className="w-full bg-[var(--bg-tertiary)] h-2 rounded-full mt-2 overflow-hidden">
                            <div className="bg-[var(--primary-gold)] h-2 rounded-full transition-all duration-300" style={{ width: `${job.progress}%` }}></div>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-1">{job.currentStep}</p>
                    </div>
                ))}
            </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
