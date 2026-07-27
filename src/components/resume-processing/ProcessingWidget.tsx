import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, X, Loader2 } from 'lucide-react';

interface Job {
  id: string;
  filename: string;
  progress: number;
  currentStep: string;
}

interface Props {
  jobs: Job[];
}

const STEPS = [
  'Uploading File',
  'Extracting PDF Text',
  'Detecting Candidate Information',
  'AI Analysis Running',
  'Saving Candidate Data',
  'Completed'
];

const getGradualProgress = (step: string): number => {
  const index = STEPS.indexOf(step);
  if (index === -1) return 0;
  const mappings = [10, 30, 50, 70, 88, 100];
  return mappings[index] || 100;
};

export const ProcessingWidget: React.FC<Props> = ({ jobs }) => {
  const [minimized, setMinimized] = useState(false);
  if (jobs.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
      <AnimatePresence>
        {!minimized && jobs.map((job) => {
          const gradualProgress = getGradualProgress(job.currentStep);
          return (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="w-80 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-4 shadow-xl"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3 truncate">
                  <FileText className="text-[var(--primary-gold)] shrink-0" size={18} />
                  <span className="font-semibold text-[var(--text-primary)] text-sm truncate">{job.filename}</span>
                </div>
                <button onClick={() => setMinimized(true)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={16}/></button>
              </div>

              <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 w-full bg-[var(--bg-tertiary)] rounded-full h-1.5 overflow-hidden">
                      <motion.div
                          className="bg-[var(--gold-gradient)] h-1.5 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${gradualProgress}%` }}
                          transition={{ duration: 0.3 }}
                      />
                  </div>
                  <span className="text-xs font-bold text-[var(--text-primary)] w-10 text-right">{gradualProgress}%</span>
              </div>

              <p className="text-xs text-[var(--text-muted)] mb-2 truncate">{job.currentStep}</p>
              
              <div className="flex items-center gap-2 text-xs text-[var(--accent-color)] font-medium">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Processing...</span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {minimized && (
          <button 
            onClick={() => setMinimized(false)}
            className="crm-btn-gold rounded-full p-3 shadow-lg"
          >
              <FileText size={20} />
          </button>
      )}
    </div>
  );
};
export default ProcessingWidget;
