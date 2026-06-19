import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useResumeProcessing } from '../../contexts/ResumeProcessingContext';

export const ResumeUpload = () => {
    const { addJob } = useResumeProcessing();

    const onDrop = useCallback((acceptedFiles: File[]) => {
      acceptedFiles.forEach(file => {
        const id = Math.random().toString(36).substring(7);
        addJob({
          id,
          filename: file.name,
          size: file.size,
          pages: 1, // Placeholder
          status: 'uploading',
          progress: 0,
          currentStep: 'Initializing upload...',
          estimatedTimeRemaining: 0,
          startTime: Date.now()
        });
        // Simulate upload/processing
      });
    }, [addJob]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    return (
        <div 
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'}`}
        >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
             {isDragActive ? 'Drop your resume here' : 'Drag & drop or click to upload resume'}
            </p>
        </div>
    );
};
