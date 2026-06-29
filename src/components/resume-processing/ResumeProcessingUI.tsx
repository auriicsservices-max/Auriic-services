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
        className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-3xl p-8 w-full max-w-4xl shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"><X size={20}/></button>
        
        <h2 className="text-2xl font-bold mb-8 text-slate-900 dark:text-white">Resume Processing</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[60vh]">
          {jobs.map((job) => (
            <div key={job.id} className="bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <FileText className="text-indigo-500" />
                        <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[150px]">{job.filename}</span>
                    </div>
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">{Math.round(job.progress)}%</span>
                </div>
                
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-4">
                    <motion.div 
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${job.progress}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
                
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-2">
                    <Loader2 className="animate-spin" size={14}/>
                    {job.currentStep || 'Initializing...'}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
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
