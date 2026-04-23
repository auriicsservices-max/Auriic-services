import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, limit, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Send, User, Shield, MessageSquare, Clock } from 'lucide-react';

export default function InternalChat() {
  const { user, role } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      await addDoc(collection(db, 'messages'), {
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: user.displayName || user.email?.split('@')[0] || 'Unknown',
        senderRole: role,
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[70vh] bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-300">
      {/* Header */}
      <header className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 dark:shadow-none">
            <MessageSquare size={20} />
          </div>
          <div>
            <h2 className="text-xl font-serif text-slate-800 dark:text-slate-100">Team Intelligence</h2>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500">Real-time internal communication</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-wider animate-pulse">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Live
        </div>
      </header>

      {/* Messages area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-slate-600">
              <Clock className="animate-spin" size={24} />
              <p className="text-xs font-medium italic">Streaming intelligence...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-12">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center text-slate-200 dark:text-slate-800 mb-6 border-2 border-dashed border-slate-200 dark:border-slate-800">
              <MessageSquare size={32} />
            </div>
            <h3 className="text-lg font-serif text-slate-400 dark:text-slate-600">No signals detected yet</h3>
            <p className="text-sm text-slate-400 dark:text-slate-700 max-w-xs mt-2 italic">Be the first to share an update with the team.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg) => {
              const isOwn = msg.senderId === user?.uid;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  <div className={`flex gap-3 max-w-[80%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-[10px] font-bold shadow-sm transition-all ${
                      msg.senderRole === 'admin' 
                        ? 'bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800' 
                        : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                    }`}>
                      {msg.senderName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="space-y-1">
                      <div className={`flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                          {msg.senderName}
                        </span>
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                          msg.senderRole === 'admin' 
                            ? 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-500' 
                            : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-500'
                        }`}>
                          {msg.senderRole}
                        </span>
                      </div>
                      <div className={`p-4 rounded-2xl text-sm shadow-sm transition-colors duration-300 ${
                        isOwn 
                          ? 'bg-indigo-600 text-white rounded-tr-none' 
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-800'
                      }`}>
                        {msg.text}
                      </div>
                      <p className={`text-[9px] font-medium text-slate-400 dark:text-slate-600 ${isOwn ? 'text-right' : 'text-left'}`}>
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input section */}
      <footer className="p-6 border-t border-slate-100 dark:border-slate-800">
        <form onSubmit={handleSendMessage} className="flex gap-4">
          <div className="relative flex-1">
            <input 
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Transmit team update..."
              className="w-full pl-6 pr-12 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 text-sm italic text-slate-800 dark:text-slate-100 transition-all placeholder:text-slate-400"
            />
            <button 
              type="submit"
              disabled={!newMessage.trim()}
              className="absolute right-3 top-3 p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all disabled:opacity-50 active:scale-95"
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
}
