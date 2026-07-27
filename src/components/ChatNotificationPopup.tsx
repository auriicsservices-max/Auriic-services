import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageSquare } from 'lucide-react';

export default function ChatNotificationPopup({ message, senderRole, senderName, senderInitials, onClose, onClick }: { 
  message: any, 
  senderRole: string,
  senderName: string,
  senderInitials: string,
  onClose: () => void, 
  onClick: () => void 
}) {
  if (!message) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="fixed bottom-6 right-6 z-[100] w-80 bg-[var(--card-bg)] text-[var(--text-primary)] rounded-2xl p-4 shadow-2xl border border-[var(--border-color)] cursor-pointer"
        onClick={onClick}
      >
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-2 right-2 p-1 text-[var(--text-muted)] hover:text-red-500 transition-colors">
          <X size={14} />
        </button>
        <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center text-xs font-bold text-[var(--primary-gold)]">
                {senderInitials}
            </div>
            <div>
                <h4 className="font-bold text-xs">{senderName} <span className="font-normal text-[var(--text-muted)]">({senderRole})</span></h4>
                <p className="text-[9px] text-[var(--text-muted)] uppercase font-medium">New Message</p>
            </div>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mb-3 line-clamp-2 px-1">{message.text || '...'}</p>
        <div className="flex justify-between items-center text-[9px] text-[var(--text-muted)] mt-2 px-1 border-t border-[var(--border-color)] pt-2">
            <span>Status: Unread</span>
            <span>{new Date(message.createdAt?.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
