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
            className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-slate-900 shadow-xl z-50 p-6 border-l border-gray-200 dark:border-gray-800"
        >
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">Processing Queue ({jobs.length})</h3>
                <button onClick={onClose}><X size={20}/></button>
            </div>
            <div className="space-y-4">
                {jobs.map(job => (
                    <div key={job.id} className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                        <p className="font-medium text-sm truncate">{job.filename}</p>
                        <div className="w-full bg-gray-200 h-2 rounded-full mt-2">
                            <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${job.progress}%` }}></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{job.currentStep}</p>
                    </div>
                ))}
            </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
