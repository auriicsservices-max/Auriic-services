import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  variant = 'danger'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertTriangle className="text-red-600" size={24} />,
          bg: 'bg-red-50 dark:bg-red-900/20',
          button: 'bg-red-600 hover:bg-red-700 text-white'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="text-amber-600" size={24} />,
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          button: 'bg-amber-600 hover:bg-amber-700 text-white'
        };
      case 'info':
      default:
        return {
          icon: <AlertTriangle className="text-[var(--primary-gold)]" size={24} />,
          bg: 'bg-[var(--bg-secondary)]',
          button: 'crm-btn-gold'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-primary)] w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 transition-colors duration-300">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div className={`w-12 h-12 ${styles.bg} border border-[var(--border-color)] rounded-2xl flex items-center justify-center mb-4`}>
              {styles.icon}
            </div>
            <button onClick={onCancel} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-full transition-all">
              <X size={20} />
            </button>
          </div>
          
          <h3 className="text-xl font-serif text-[var(--text-primary)] mb-2">{title}</h3>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-8">
            {message}
          </p>
          
          <div className="flex gap-3">
            <button 
              onClick={onCancel}
              className="crm-btn-secondary flex-1 text-xs"
            >
              {cancelText}
            </button>
            <button 
              onClick={() => {
                onConfirm();
                onCancel();
              }}
              className={`flex-1 ${styles.button} rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg transition-all active:scale-95 py-3`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
