import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageSquare } from 'lucide-react';

export default function ChatNotificationPopup({ message, onClose, onClick }: { message: any, onClose: () => void, onClick: () => void }) {
  if (!message) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-6 right-6 z-[100] w-80 bg-[var(--card-bg)] text-[var(--text-primary)] rounded-2xl p-4 shadow-xl border border-[var(--border-color)] cursor-pointer"
        onClick={onClick}
      >
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-2 right-2 p-1 text-[var(--text-muted)] hover:text-red-500 transition-colors">
          <X size={14} />
        </button>
        <div className="flex items-center gap-3 mb-2">
            <MessageSquare size={16} className="text-indigo-500" />
            <h4 className="font-bold text-xs">New Message from {message.senderName}</h4>
        </div>
        <p className="text-[10px] text-[var(--text-secondary)] truncate">{message.text}</p>
        <p className="text-[8px] text-[var(--text-muted)] mt-2">{new Date(message.createdAt?.toDate()).toLocaleTimeString()}</p>
      </motion.div>
    </AnimatePresence>
  );
}
