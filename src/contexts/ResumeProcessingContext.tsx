import React, { createContext, useContext, useState, useCallback } from 'react';
import { ResumeProcessingJob } from '../types/resume';

interface ResumeProcessingContextType {
  jobs: ResumeProcessingJob[];
  addJob: (job: ResumeProcessingJob) => void;
  updateJob: (id: string, updates: Partial<ResumeProcessingJob>) => void;
  removeJob: (id: string) => void;
  processingCount: number;
}

const ResumeProcessingContext = createContext<ResumeProcessingContextType | undefined>(undefined);

export const ResumeProcessingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<ResumeProcessingJob[]>([]);

  const addJob = useCallback((job: ResumeProcessingJob) => {
    setJobs((prev) => [...prev, job]);
  }, []);

  const updateJob = useCallback((id: string, updates: Partial<ResumeProcessingJob>) => {
    setJobs((prev) => prev.map((job) => job.id === id ? { ...job, ...updates } : job));
  }, []);

  const removeJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((job) => job.id !== id));
  }, []);

  const processingCount = jobs.filter(j => j.status !== 'completed' && j.status !== 'failed').length;

  return (
    <ResumeProcessingContext.Provider value={{ jobs, addJob, updateJob, removeJob, processingCount }}>
      {children}
    </ResumeProcessingContext.Provider>
  );
};

export const useResumeProcessing = () => {
  const context = useContext(ResumeProcessingContext);
  if (!context) throw new Error('useResumeProcessing must be used within ResumeProcessingProvider');
  return context;
};
