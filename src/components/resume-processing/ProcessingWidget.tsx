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
              className="w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-xl"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3 truncate">
                  <FileText className="text-indigo-500 shrink-0" size={18} />
                  <span className="font-semibold text-slate-900 dark:text-white text-sm truncate">{job.filename}</span>
                </div>
                <button onClick={() => setMinimized(true)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={16}/></button>
              </div>

              <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                      <motion.div
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${gradualProgress}%` }}
                          transition={{ duration: 0.3 }}
                      />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white w-10 text-right">{gradualProgress}%</span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 truncate">{job.currentStep}</p>
              
              <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
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
            className="bg-indigo-600 text-white rounded-full p-3 shadow-lg hover:bg-indigo-700 transition-colors"
          >
              <FileText size={20} />
          </button>
      )}
    </div>
  );
};
export default ProcessingWidget;
