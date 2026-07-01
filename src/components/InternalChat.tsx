import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, limit, serverTimestamp, where, doc, setDoc, getDoc, updateDoc, writeBatch, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Send, User, Shield, MessageSquare, Clock, Search, FileText, Plus, Paperclip, X, Download, Check, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { logActivity } from '../services/activityService';
import QuotaNotice from './QuotaNotice';
import { createNotification } from '../lib/notifications';

interface InternalChatProps {
  teamMembers: any[];
  initialRecipientId?: string | null;
}

export default function InternalChat({ teamMembers, initialRecipientId }: InternalChatProps) {
  const { user, role, quotaExceeded, setQuotaExceeded, getUserDisplayName, getUserRole, getUserName } = useAuth();
  const [activePartnerId, setActivePartnerId] = useState<string | null>(initialRecipientId || null);

  useEffect(() => {
    if (initialRecipientId) {
      setActivePartnerId(initialRecipientId);
    }
  }, [initialRecipientId]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [fileAttachment, setFileAttachment] = useState<{ name: string; data: string; type: string } | null>(null);
  const [lastActivity, setLastActivity] = useState<Record<string, number>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Filter team members based on search
  const filteredUsers = useMemo(() => {
    return teamMembers.filter(u => 
      u.uid !== user?.uid && 
      (u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
       u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    ).sort((a, b) => (lastActivity[b.uid] || 0) - (lastActivity[a.uid] || 0));
  }, [teamMembers, searchQuery, lastActivity, user?.uid]);

  // Sync unread counts
  useEffect(() => {
    if (!user || quotaExceeded) return;

    // Aggressively simplified query to avoid ALL composite index requirements
    const q = query(
      collection(db, 'direct_messages'),
      where('participants', 'array-contains', user.uid),
      limit(500)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const counts: Record<string, number> = {};
      const activity: Record<string, number> = {};
      
      // Get current user's read cursors
      const currentUserData = teamMembers.find(t => t.uid === user.uid);
      const readCursors = currentUserData?.readCursors || {};
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const senderId = data.senderId;
        const recipientId = data.recipientId;
        const createdAt = data.createdAt?.toMillis() || 0;
        const otherId = senderId === user.uid ? recipientId : senderId;

        // Update activity
        if (createdAt > (activity[otherId] || 0)) {
            activity[otherId] = createdAt;
        }
        
        if (recipientId === user.uid && senderId !== activePartnerId) {
          const partnerReadCursor = readCursors[senderId];
          const lastRead = partnerReadCursor?.toMillis ? partnerReadCursor.toMillis() : 0;

          if (createdAt > lastRead) {
            counts[senderId] = (counts[senderId] || 0) + 1;
          }
        }
      });
      
      setUnreadCounts(counts);
      setLastActivity(activity);
    }, (err: any) => {
      console.error("Unread counts listener error:", err);
      if (err.code === 'resource-exhausted') setQuotaExceeded(true);
    });

    return () => unsubscribe();
  }, [user, activePartnerId, teamMembers]);

  // Update last read (Local cursors method for better permissions)
  useEffect(() => {
    if (activePartnerId && user) {
      const updateReadCursor = async () => {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await updateDoc(userDocRef, {
            [`readCursors.${activePartnerId}`]: serverTimestamp()
          });
        } catch (err) {
          console.error("Error updating read cursor:", err);
          // Fallback to localStorage if Firestore update fails
          localStorage.setItem(`lastRead_${user.uid}_${activePartnerId}`, Date.now().toString());
        }
      };

      updateReadCursor();
      
      setUnreadCounts(prev => {
        const next = { ...prev };
        delete next[activePartnerId];
        return next;
      });
    }
  }, [activePartnerId, user, messages.length]);

  // Typing indicator listener
  useEffect(() => {
    if (!activePartnerId || !user || quotaExceeded) {
      setIsPartnerTyping(false);
      return;
    }

    const convId = getConversationId(user.uid, activePartnerId);
    const typingRef = doc(db, 'typing_states', convId);
    
    const unsubscribe = onSnapshot(typingRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setIsPartnerTyping(!!data.typing?.[activePartnerId]);
      } else {
        setIsPartnerTyping(false);
      }
    }, (err: any) => {
      console.error("Typing indicator error:", err);
      if (err.code === 'resource-exhausted') setQuotaExceeded(true);
    });

    return () => unsubscribe();
  }, [activePartnerId, user]);

  const setTypingStatus = async (isTyping: boolean) => {
    if (!user || !activePartnerId) return;
    const convId = getConversationId(user.uid, activePartnerId);
    const typingRef = doc(db, 'typing_states', convId);
    
    try {
      await setDoc(typingRef, {
        typing: {
          [user.uid]: isTyping
        }
      }, { merge: true });
    } catch (err) {
      console.error("Error setting typing status:", err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Set typing to true
    setTypingStatus(true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    // Set timeout to set typing to false
    typingTimeoutRef.current = setTimeout(() => {
      setTypingStatus(false);
    }, 2000);
  };

  // Create a stable conversation ID for 1-on-1 chats
  const getConversationId = (id1: string, id2: string) => {
    return [id1, id2].sort().join('_');
  };

  useEffect(() => {
    if (!activePartnerId || !user || quotaExceeded) {
      setMessages([]);
      return;
    }

    setIsLoading(true);
    const convId = getConversationId(user.uid, activePartnerId);
    // Aggressively simplified query (only one where) to avoid all composite index requirements
    // We filter for conversationId locally to ensure we avoid "Missing Index" errors
    const q = query(
      collection(db, 'direct_messages'),
      where('participants', 'array-contains', user.uid),
      limit(200)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(msg => msg.conversationId === convId);
        
      // Sort locally
      msgs.sort((a, b) => {
        const t1 = a.createdAt?.toMillis() || 0;
        const t2 = b.createdAt?.toMillis() || 0;
        return t2 - t1;
      });
      setMessages(msgs);
      setIsLoading(false);
    }, (err: any) => {
      console.error("Chat sync error:", err);
      setIsLoading(false);
      if (err.code === 'resource-exhausted') setQuotaExceeded(true);
    });

    return () => unsubscribe();
  }, [activePartnerId, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !fileAttachment) || !user || !activePartnerId) return;

    try {
      const convId = getConversationId(user.uid, activePartnerId);
      await addDoc(collection(db, 'direct_messages'), {
        text: newMessage.trim(),
        senderId: user.uid,
        recipientId: activePartnerId,
        participants: [user.uid, activePartnerId],
        conversationId: convId,
        senderName: user.displayName || user.email?.split('@')[0] || 'Unknown',
        senderRole: role,
        file: fileAttachment,
        read: false,
        createdAt: serverTimestamp()
      });
      
      // Send notification
      await createNotification(
          activePartnerId,
          "New Message",
          `${user.displayName || 'Someone'} sent you a message`,
          "chat",
          { senderId: user.uid, conversationId: convId }
      );
      
      await logActivity(
          getUserDisplayName(),
          user?.uid || 'System',
          getUserRole(),
          "sent message",
          activePartner?.name || 'Partner',
          null,
          "Direct message sent",
          "Chats"
      );
      
      setNewMessage('');
      setFileAttachment(null);
      // Also update last read when sending
      localStorage.setItem(`lastRead_${user.uid}_${activePartnerId}`, Date.now().toString());
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setFileAttachment({
        name: file.name,
        type: file.type,
        data: event.target?.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const activePartner = teamMembers.find(u => u.uid === activePartnerId);

  return quotaExceeded ? (
    <div className="flex-1 flex items-center justify-center p-8">
      <QuotaNotice onRetry={() => window.location.reload()} />
    </div>
  ) : (
    <div className="flex h-[75vh] bg-[var(--card-bg)] rounded-[2.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden transition-all duration-300">
      {/* Sidebar - Users List */}
      <aside className="w-80 border-r border-[var(--border-color)] flex flex-col bg-[var(--sidebar-bg)] font-sans">
        <div className="p-6 border-b border-[var(--border-color)]">
          <h2 className="text-xl font-serif text-[var(--text-primary)] mb-4">Rectech Message Hub</h2>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-[var(--text-muted)]" size={16} />
            <input 
              type="text"
              placeholder="Search team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearching(true)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-bold text-[var(--text-primary)]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredUsers.length === 0 ? (
            <div className="py-10 text-center px-4">
              <User className="mx-auto text-[var(--text-muted)] opacity-20 mb-2" size={32} />
              <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">No members found</p>
            </div>
          ) : (
            filteredUsers.map(u => (
              <button 
                key={u.uid}
                onClick={() => setActivePartnerId(u.uid)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${activePartnerId === u.uid ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none' : 'hover:bg-[var(--bg-primary)] text-[var(--text-secondary)]'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold relative ${activePartnerId === u.uid ? 'bg-white/20' : 'bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-muted)]'}`}>
                  {u.name?.slice(0, 2).toUpperCase() || '??'}
                  {u.status === 'online' && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[var(--bg-primary)] rounded-full shadow-sm" />
                  )}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{u.name || u.email}</p>
                  <p className={`text-[8px] uppercase font-black tracking-tighter ${activePartnerId === u.uid ? 'text-indigo-200' : 'text-[var(--text-muted)]'}`}>{u.role}</p>
                </div>
                {unreadCounts[u.uid] > 0 && (
                  <div className="w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg animate-in zoom-in">
                    {unreadCounts[u.uid]}
                  </div>
                )}
                {u.role === 'admin' && <Shield size={12} className={activePartnerId === u.uid ? 'text-indigo-200' : 'text-amber-500'} />}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col bg-[var(--bg-primary)]">
        {!activePartnerId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6 animate-pulse">
              <MessageSquare size={40} />
            </div>
            <h3 className="text-2xl font-serif text-[var(--text-primary)] italic">Rectech Secure Channel</h3>
            <p className="text-sm text-[var(--text-muted)] mt-2 max-w-xs">Select a team member to begin a private intelligence transmission.</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <header className="px-8 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold relative">
                  {activePartner?.name?.slice(0, 2).toUpperCase()}
                  {activePartner?.status === 'online' && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[var(--bg-primary)] rounded-full shadow-sm" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-[var(--text-primary)]">{activePartner?.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${activePartner?.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-none">
                      {isPartnerTyping ? (
                        <span className="text-indigo-500 flex items-center gap-1">
                          typing<span className="animate-bounce">.</span><span className="animate-bounce delay-100">.</span><span className="animate-bounce delay-200">.</span>
                        </span>
                      ) : (
                        activePartner?.status === 'online' ? 'Active Session' : 'Offline'
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </header>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-8 space-y-6"
            >
              {isLoading && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <Clock className="animate-spin text-[var(--text-muted)]" size={24} />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-30 italic text-[var(--text-muted)] select-none">
                  <p>Silence is the best discipline. Send a signal.</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map((msg) => {
                    const isOwn = msg.senderId === user?.uid;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex flex-col gap-1 max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                          <div className={`p-4 rounded-3xl text-sm shadow-sm transition-all ${
                            isOwn 
                              ? 'bg-indigo-600 text-white rounded-tr-none' 
                              : 'bg-[var(--sidebar-bg)] text-[var(--text-primary)] rounded-tl-none border border-[var(--border-color)]'
                          }`}>
                            {msg.text && <p className="leading-relaxed">{msg.text}</p>}
                            
                            {msg.file && (
                              <div className={`mt-2 p-3 bg-white/10 rounded-2xl flex items-center gap-3 border border-white/10 ${isOwn ? 'text-white' : 'text-indigo-600'}`}>
                                <div className="w-8 h-8 bg-black/10 rounded-lg flex items-center justify-center">
                                  <FileText size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-bold truncate">{msg.file.name}</p>
                                  <p className="text-[8px] opacity-60 uppercase font-bold">Attachment</p>
                                </div>
                                <a 
                                  href={msg.file.data} 
                                  download={msg.file.name}
                                  className="p-1.5 hover:bg-black/10 rounded-lg transition-all"
                                >
                                  <Download size={14} />
                                </a>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 px-1 mt-0.5">
                            <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">
                              {formatTime(msg.createdAt)}
                            </span>
                            {isOwn && (
                              <div className="flex items-center">
                                {(() => {
                                  const partnerReadCursor = activePartner?.readCursors?.[user.uid];
                                  const lastRead = partnerReadCursor?.toMillis ? partnerReadCursor.toMillis() : 0;
                                  const createdAt = msg.createdAt?.toMillis() || 0;
                                  
                                  return createdAt <= lastRead && lastRead > 0 ? (
                                    <CheckCheck size={10} className="text-blue-500" />
                                  ) : (
                                    <Check size={10} className="text-[var(--text-muted)] opacity-50" />
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* Input */}
            <footer className="p-6 border-t border-[var(--border-color)]">
              <form onSubmit={handleSendMessage} className="space-y-4">
                {fileAttachment && (
                  <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 rounded-2xl animate-in fade-in zoom-in-95">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                        <FileText size={16} />
                      </div>
                      <p className="text-[10px] font-bold uppercase">{fileAttachment.name}</p>
                    </div>
                    <button type="button" onClick={() => setFileAttachment(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded-full transition-all">
                      <X size={14} />
                    </button>
                  </div>
                )}
                
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <input 
                      type="text"
                      value={newMessage}
                      onChange={handleInputChange}
                      placeholder="Type a secure message..."
                      className="w-full pl-12 pr-12 py-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 text-sm font-medium text-[var(--text-primary)] transition-all placeholder:text-[var(--text-muted)]"
                    />
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute left-3 top-3 p-2 text-[var(--text-muted)] hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all"
                    >
                      <Paperclip size={18} />
                    </button>
                    <button 
                      type="submit"
                      disabled={!newMessage.trim() && !fileAttachment}
                      className="absolute right-3 top-3 p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all disabled:opacity-50 active:scale-95"
                    >
                      <Send size={18} />
                    </button>
                    <input 
                      type="file" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>
              </form>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
