import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth, db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, orderBy, updateDoc, doc, deleteDoc, where, getDocs, limit, getDocFromServer, QuerySnapshot } from 'firebase/firestore';
import { useDropzone } from 'react-dropzone';
import { extractTextFromPDF, extractTextFromDocx, parseResumeHeuristically, ParsedResume } from '../lib/localParser';
import { GoogleGenAI, Type } from "@google/genai";
import UserManagement from '../components/UserManagement';
import DashboardHome from './DashboardHome';
import CandidateModal from '../components/CandidateModal';
import Analytics from '../components/Analytics';
import ThemeToggle from '../components/ThemeToggle';
import UserProfile from '../components/UserProfile';
import Shortlist from '../components/Shortlist';
import LogReview from '../components/LogReview';
import ConfirmModal from '../components/ConfirmModal';

import BulkUpload from '../components/BulkUpload';
import CVRepository from '../components/CVRepository';
import { enhancedParser } from '../services/enhancedParserService';
import InternalChat from '../components/InternalChat';
import QuotaNotice from '../components/QuotaNotice';
import LZString from 'lz-string';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Search, 
  Upload, 
  Users, 
  LogOut, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ChevronRight,
  Shield,
  LayoutDashboard,
  Star,
  LineChart as AnalyticsIcon,
  Trash2,
  Clock,
  RotateCcw,
  AlertTriangle,
  Calendar,
  UserCircle,
  Activity,
  Menu,
  X,
  MessageSquare,
  StickyNote,
  Bell
} from 'lucide-react';

export default function Dashboard() {
  const { user, role, quotaExceeded, setQuotaExceeded } = useAuth();
  const { theme } = useTheme();
  const [candidates, setCandidates] = useState<any[]>([]);
  const candidateMapRef = useRef(new Map<string, any>());
  const lastLogTimestampRef = useRef<number>(Date.now());
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  
  const syncCandidates = useCallback(() => {
    setCandidates(Array.from(candidateMapRef.current.values()));
  }, []);

  const [recentChatMessages, setRecentChatMessages] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<Record<string, string>>({});
  const [fullTeamList, setFullTeamList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ total: 0, processed: 0, failed: 0 });
  const [parsingStatus, setParsingStatus] = useState<Record<string, string>>({});
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error' | 'duplicate' | 'duplicateInTrash'>('idle');
  const [duplicateNotification, setDuplicateNotification] = useState<{ isOpen: boolean; message: string; }>({ isOpen: false, message: '' });
  const [activeTab, setActiveTab] = useState<'home' | 'candidates' | 'users' | 'analytics' | 'trash' | 'shortlist' | 'profile' | 'logs' | 'chat' | 'upload' | 'repository'>('home');
  const [chatRecipientId, setChatRecipientId] = useState<string | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<number>(0);

const handleFirestoreError = (error: any, operationType: string, path: string | null) => {
    const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        authInfo: {
            userId: auth.currentUser?.uid,
            email: auth.currentUser?.email,
        },
        operationType,
        path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
};

  const playNotificationSound = useCallback(() => {
    try {
      // Using a nicer, cleaner chat notification sound
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.5;
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn('[Dashboard] Auto-play was prevented. Audio will play after user interaction.', error);
        });
      }
    } catch (err) {
      console.warn('[Dashboard] Notification sound error:', err);
    }
  }, []);

  useEffect(() => {
    async function testConnection() {
        try {
          await getDocFromServer(doc(db, 'test', 'connection'));
        } catch (error) {
          if(error instanceof Error && error.message.includes('the client is offline')) {
            console.error("Please check your Firebase configuration.");
          }
        }
      }
      testConnection();

    if (user?.uid) {
      setLastReadTimestamp(parseInt(localStorage.getItem(`lastReadChat_${user.uid}`) || '0'));
    }
  }, [user?.uid]);

  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const notificationRef = React.useRef<HTMLDivElement>(null);

  // Close notification box when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notificationRef]);

  // Keep track of read notifications
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());

  const markAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReadNotifications(prev => new Set(prev).add(id));
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewScope, setViewScope] = useState<'mine' | 'all'>('all');
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showAlert = (title: string, message: string) => {
    setConfirmConfig({
      isOpen: true,
      title,
      message,
      onConfirm: () => {},
      variant: 'info',
      confirmText: 'OK'
    });
  };

  useEffect(() => {
    if (uploadStatus !== 'idle') {
      const timer = setTimeout(() => {
        setUploadStatus('idle');
        setParsingStatus({});
        setDuplicateNotification({ isOpen: false, message: '' });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [uploadStatus]);

  useEffect(() => {
    if (!user || !role) return;

    // Chat notifications listener - always active but limited
    const qChat = query(
      collection(db, 'direct_messages'),
      where('participants', 'array-contains', user.uid),
      limit(50) 
    );
    
    let unsubChat = () => {};
    if (!quotaExceeded) {
      unsubChat = onSnapshot(qChat, (snapshot) => {
        const currentUserData = fullTeamList.find(u => u.id === user.uid);
        const readCursors = currentUserData?.readCursors || {};
        const notificationsEnabled = currentUserData?.notificationsEnabled !== false;
        const soundEnabled = currentUserData?.notificationSound !== false;

        let totalUnread = 0;
        let newestUnreadMsg: any = null;

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.recipientId === user.uid) {
            const senderId = data.senderId;
            const createdAt = data.createdAt?.toMillis() || 0;
            const userReadCursorForSender = readCursors[senderId];
            const lastRead = userReadCursorForSender?.toMillis ? userReadCursorForSender.toMillis() : 0;

            if (createdAt > lastRead) {
              totalUnread++;
              if (!newestUnreadMsg || createdAt > (newestUnreadMsg.createdAt?.toMillis() || 0)) {
                newestUnreadMsg = { id: doc.id, ...data };
              }
            }
          }
        });
        
        setUnreadChatCount(totalUnread);
        
        setRecentChatMessages(snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
            .slice(0, 10));

        // Trigger Notification & Sound
        if (newestUnreadMsg) {
          
          if (activeTab === 'chat' && document.visibilityState === 'visible') return;

          if (notificationsEnabled) {
            if (soundEnabled) {
              playNotificationSound();
            }

            if (Notification.permission === 'granted') {
              const senderName = teamMembers[newestUnreadMsg.senderId] || 'New Message';
              new Notification(`Aurrum Chat: ${senderName}`, {
                body: newestUnreadMsg.text || 'Shared an attachment',
                icon: 'https://aurrum.co/wp-content/uploads/2026/04/Aurrum_Logo-2.png'
              });
            }
          }
        }
      }, (err: any) => {
        handleFirestoreError(err, 'get', 'chat');
        if (err.code === 'resource-exhausted') setQuotaExceeded(true);
      });
    }

    // Unconditional listeners
    let unsubCandidates = () => {};
    let unsubAssigned = () => {};
    let unsubLogs = () => {};
    let unsubTrash = () => {};
    let unsubTeam = () => {};

    if (!quotaExceeded) {
      const q = query(
        collection(db, 'candidates'), 
        where('isArchived', '==', false),
        ...(role !== 'admin' ? [where('uploadedBy', '==', user?.uid)] : []),
        orderBy('createdAt', 'desc'),
        limit(200)
      );
      unsubCandidates = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'removed') {
                candidateMapRef.current.delete(change.doc.id);
            } else {
                candidateMapRef.current.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
            }
        });
        syncCandidates();

      }, (err: any) => {
        handleFirestoreError(err, 'get', 'candidates');
        if (err.code === 'resource-exhausted') setQuotaExceeded(true);
      });
      
      if (role !== 'admin') {
         const qAssigned = query(
            collection(db, 'candidates'), 
            where('isArchived', '==', false),
            where('assignedTo', '==', user?.uid),
            orderBy('createdAt', 'desc'),
            limit(200)
        );
        unsubAssigned = onSnapshot(qAssigned, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
             if (change.type === 'removed') {
                candidateMapRef.current.delete(change.doc.id);
             } else {
                candidateMapRef.current.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
             }
          });
          syncCandidates();
        });
      }

      // Trash - unconditional
      const qTrash = query(
        collection(db, 'candidates'), 
        where('isArchived', '==', true),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      unsubTrash = onSnapshot(qTrash, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'removed') {
                candidateMapRef.current.delete(change.doc.id);
            } else {
                candidateMapRef.current.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
            }
        });
        syncCandidates();
      }, (err: any) => {
        console.error("Trash listener error:", err);
      });

      // Logs - unconditional
      unsubLogs = onSnapshot(query(
        collection(db, 'activity_logs'), 
        orderBy('timestamp', 'desc'), 
        limit(100)
      ), (snapshot) => {
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        
        // Activity notifications
        const newLogs = logs.filter(log => (log.timestamp?.toMillis() || 0) > lastLogTimestampRef.current);
        const relevantNewLogs = newLogs.filter(log => log.affectedUserId === user?.uid || log.assignedTo === user?.uid);
        
        if (relevantNewLogs.length > 0) {
            playNotificationSound();
            showAlert('Activity Update', relevantNewLogs[0].message || 'You have a new activity update');
        }
        
        if (logs.length > 0) {
            lastLogTimestampRef.current = logs[0].timestamp?.toMillis() || Date.now();
        }
        
        setActivityLogs(logs);
      }, (err: any) => {
        handleFirestoreError(err, 'get', 'activity_logs');
      });

      // Team members listener
      unsubTeam = onSnapshot(query(collection(db, 'users'), limit(50)), (snapshot) => {
        const mapping: Record<string, string> = {};
        const list: any[] = [];
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          mapping[doc.id] = data.name || data.email;
          list.push({ id: doc.id, ...data });
        });
        setTeamMembers(mapping);
        setFullTeamList(list);
      }, (err: any) => {
        console.error("Team listener error:", err);
      });
    }

    return () => {
      unsubChat();
      unsubCandidates();
      unsubAssigned();
      unsubLogs();
      unsubTrash();
      unsubTeam();
    };
  }, [role, user]); // Removed activeTab and viewScope



  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = (candidatesToShow: any[]) => {
    if (selectedIds.size === candidatesToShow.length && candidatesToShow.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidatesToShow.map(c => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setConfirmConfig({
      isOpen: true,
      title: 'Bulk Archive',
      message: `Are you sure you want to move ${selectedIds.size} candidates to trash?`,
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          const promises = Array.from(selectedIds).map((id: string) => 
            updateDoc(doc(db, 'candidates', id), { isArchived: true })
          );
          await Promise.all(promises);
          setSelectedIds(new Set());
          setUploadStatus('success');
        } catch (err) {
          console.error(err);
          setUploadStatus('error');
        } finally {
          setIsProcessing(false);
        }
      },
      variant: 'danger'
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsProcessing(true);
    setUploadStatus('idle');
    setDuplicateNotification({ isOpen: false, message: '' });
    setUploadProgress({ total: acceptedFiles.length, processed: 0, failed: 0 });
    
    // Track emails in this batch to prevent duplicates if Firebase hasn't updated yet
    const addedEmailsInBatch = new Set<string>();
    
    let currentDone = 0;
    for (const file of acceptedFiles) {
      try {
        setParsingStatus(prev => ({ ...prev, [file.name]: 'parsing' }));
        
        // Use Enhanced CV Parsing Service
        const { parsed, text } = await enhancedParser.parse(file);
        
        // Ensure parsed object exists
        if (!parsed) throw new Error("Parser returned empty data");
        
        parsed.fullName = parsed.fullName || file.name.split('.')[0];
        parsed.email = (parsed.email || 'pending@aurrum.co').toLowerCase();

        // CHECK FOR DUPLICATES
        const isDuplicateInState = candidates.find(c => c.email === parsed.email);
        const isDuplicateInBatch = addedEmailsInBatch.has(parsed.email);
        
        if (isDuplicateInState || isDuplicateInBatch) {
          const workerId = isDuplicateInState ? (isDuplicateInState.assignedTo || isDuplicateInState.uploadedBy) : 'this batch';
          const workerName = isDuplicateInState ? (teamMembers[workerId] || 'Unknown Recruiter') : 'this batch';
          setDuplicateNotification({ 
            isOpen: true, 
            message: `Candidate ${parsed.fullName} is already added and currently being handled by ${workerName}`
          });
          setUploadStatus('duplicate');
          setUploadProgress(prev => ({ ...prev, processed: prev.processed + 1, failed: prev.failed + 1 }));
          continue;
        }

        // Add to batch tracking
        addedEmailsInBatch.add(parsed.email);

        // Compress text to store in Firebase (saving space)
        const compressedText = LZString.compressToUTF16(text);
        const isLargeFile = file.size > 2 * 1024 * 1024; // 2MB+ is "large" for our context
        
        // 3. Upload metadata to Aurrum API
        const formData = new FormData();
        
        // Aurrum API requirements: file (Required), name (Required), email (Required)
        formData.append('file', file);
        formData.append('name', parsed.fullName || file.name);
        formData.append('email', parsed.email || 'pending@aurrum.co');
        if (parsed.phone) {
          formData.append('phone', parsed.phone);
        }

        let result = { status: false, data: { id: null, url: null, name: parsed.fullName || file.name }, message: '' };
        try {
          const response = await fetch('/api/cv/upload', {
            method: 'POST',
            body: formData
          });
          
          if (response.ok) {
            const data = await response.json();
            result = data;
          } else {
            console.warn('API upload response not OK:', response.status);
          }
        } catch (apiErr) {
          console.warn('API upload failed, sticking to local storage:', apiErr);
        }
        
        // 4. Store meta in Firebase
        await addDoc(collection(db, 'candidates'), {
          ...parsed,
          compressedText,
          isLargeFile,
          cid: result.data?.id || null,
          url: result.data?.url || null,
          email: parsed.email?.toLowerCase(),
          fullName: result.data?.name || parsed.fullName || file.name,
          fileName: file.name,
          fileType: file.type,
          isShortlisted: false,
          isArchived: false,
          uploadedBy: user?.uid,
          createdAt: new Date().toISOString()
        });
        
        setUploadStatus('success');
        setUploadProgress(prev => ({ ...prev, processed: prev.processed + 1 }));
      } catch (err: any) {
        console.error(err);
        showAlert('Upload Error', `Unable to process ${file.name}: ${err.message}`);
        setUploadStatus('error');
        setUploadProgress(prev => ({ ...prev, processed: prev.processed + 1, failed: prev.failed + 1 }));
      } finally {
        currentDone++;
      }
    }
    
    setTimeout(() => {
      setIsProcessing(false);
      setUploadProgress({ total: 0, processed: 0, failed: 0 });
    }, 3000);
  }, [user, candidates, teamMembers]); 


  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'text/plain': ['.txt'], 'application/pdf': ['.pdf'], 'application/msword': ['.doc', '.docx'] },
    multiple: true 
  } as any);

  const handleLogout = () => auth.signOut();

  const handleShortlist = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'candidates', id), { isShortlisted: !currentStatus });
      if (selectedCandidate?.id === id) {
        setSelectedCandidate((prev: any) => ({ ...prev, isShortlisted: !currentStatus }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateFollowUp = async (id: string, note: string, date: string) => {
    try {
      await updateDoc(doc(db, 'candidates', id), { 
        followUpNote: note,
        followUpDate: date,
        followUpUpdatedBy: user?.uid,
        updatedAt: new Date().toISOString()
      });
      if (selectedCandidate?.id === id) {
        setSelectedCandidate((prev: any) => ({ ...prev, followUpNote: note, followUpDate: date, followUpUpdatedBy: user?.uid }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateNotes = async (id: string, notes: string) => {
    try {
      await updateDoc(doc(db, 'candidates', id), { 
        notes,
        notesUpdatedBy: user?.uid,
        updatedAt: new Date().toISOString()
      });
      if (selectedCandidate?.id === id) {
        setSelectedCandidate((prev: any) => ({ ...prev, notes, notesUpdatedBy: user?.uid }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateAssignee = async (id: string, userId: string) => {
    if (role !== 'admin') return;
    try {
      await updateDoc(doc(db, 'candidates', id), { 
        assignedTo: userId,
        assignedBy: user?.uid,
        updatedAt: new Date().toISOString()
      });
      if (selectedCandidate?.id === id) {
        setSelectedCandidate((prev: any) => ({ ...prev, assignedTo: userId, assignedBy: user?.uid }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchiveCandidate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmConfig({
      isOpen: true,
      title: 'Move to Trash',
      message: 'Are you sure you want to move this candidate to trash?',
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'candidates', id), { isArchived: true });
        } catch (err) {
          console.error(err);
        }
      },
      variant: 'warning'
    });
  };

  const handleRestoreCandidate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'candidates', id), { isArchived: false });
    } catch (err) {
      console.error(err);
    }
  };

  const handlePermanentDeleteCandidate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmConfig({
      isOpen: true,
      title: 'Permanent Delete',
      message: 'PERMANENT DELETE. This cannot be undone. Are you sure?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'candidates', id));
        } catch (err) {
          console.error(err);
        }
      },
      variant: 'danger'
    });
  };

  const handleBulkRestoreTrash = async () => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    try {
      const promises = Array.from(selectedIds).map((id: string) => 
        updateDoc(doc(db, 'candidates', id), { isArchived: false })
      );
      await Promise.all(promises);
      setSelectedIds(new Set());
      setUploadStatus('success');
    } catch (err) {
      console.error(err);
      setUploadStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkPermanentDeleteTrash = async () => {
    if (selectedIds.size === 0) return;
    setConfirmConfig({
      isOpen: true,
      title: 'Bulk Permanent Delete',
      message: `PERMANENTLY DELETE ${selectedIds.size} candidates? This action is irreversible.`,
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          const promises = Array.from(selectedIds).map((id: string) => 
            deleteDoc(doc(db, 'candidates', id))
          );
          await Promise.all(promises);
          setSelectedIds(new Set());
          setUploadStatus('success');
        } catch (err) {
          console.error(err);
          setUploadStatus('error');
        } finally {
          setIsProcessing(false);
        }
      },
      variant: 'danger'
    });
  };

  const handleRestoreUser = async (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'users', userId), { isArchived: false });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUserPermanently = async (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Team Member',
      message: 'PERMANENT DELETE for Team Member? They will lose all database records. Authentication remains but they will have no role.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'users', userId));
        } catch (err) {
          console.error(err);
        }
      },
      variant: 'danger'
    });
  };

  // Boolean Search logic
  const filteredCandidates = candidates.filter(candidate => {
    if (candidate.isArchived) return false;
    if (!searchQuery.trim()) return true;
    const terms = searchQuery.toLowerCase().split(/\s+/);
    const searchableText = `${candidate.fullName} ${candidate.domain} ${candidate.summary} ${candidate.skills?.join(' ')} ${candidate.notes || ''} ${JSON.stringify(candidate.experience)} ${teamMembers[candidate.uploadedBy] || ''} ${teamMembers[candidate.followUpUpdatedBy] || ''}`.toLowerCase();
    return terms.every(term => searchableText.includes(term));
  });

  const activeCandidates = candidates.filter(c => !c.isArchived);
  const trashedCandidates = candidates.filter(c => c.isArchived);
  const trashedUsers = fullTeamList.filter(u => u.isArchived);

  return (
    <div className="flex h-screen w-full bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans overflow-hidden transition-colors duration-300">
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        id="sidebar-nav"
        className={`w-64 bg-[var(--sidebar-bg)] text-[var(--text-primary)] flex flex-col transition-all duration-300 shadow-2xl fixed inset-y-0 left-0 z-40 lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 flex items-center justify-between border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <img 
              src={theme === 'dark' ? "https://aurrum.co/wp-content/uploads/2026/04/Aurrum-Logo-Golden-BG-1.png" : "https://aurrum.co/wp-content/uploads/2026/04/Aurrum_Logo-2.png"} 
              alt="Aurrum Logo" 
              className="h-10 w-auto object-contain"
            />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button className="lg:hidden p-2 text-[var(--text-primary)]" onClick={() => setIsSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <button 
            id="nav-home"
            onClick={() => { setActiveTab('home'); setIsSidebarOpen(false); setSelectedIds(new Set()); }}
            className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'home' 
                ? 'bg-[var(--accent-purple)] text-white shadow-lg' 
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:shadow-sm'
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 mr-3 ${activeTab === 'home' ? 'text-white' : 'text-[var(--accent-teal)]'}`} />
            Dashboard
          </button>

          <button 
            id="nav-candidates"
            onClick={() => { setActiveTab('candidates'); setIsSidebarOpen(false); setSelectedIds(new Set()); }}
            className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'candidates' 
                ? 'bg-[var(--accent-purple)] text-white shadow-lg' 
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:shadow-sm'
            }`}
          >
            <Users className={`w-5 h-5 mr-3 ${activeTab === 'candidates' ? 'text-white' : 'text-[var(--accent-teal)]'}`} />
            Candidates
          </button>
          
          <button 
            id="nav-upload"
            onClick={() => { setActiveTab('upload'); setIsSidebarOpen(false); setSelectedIds(new Set()); }}
            className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'upload' 
                ? 'bg-[var(--accent-purple)] text-white shadow-lg' 
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:shadow-sm'
            }`}
          >
            <Upload className={`w-5 h-5 mr-3 ${activeTab === 'upload' ? 'text-white' : 'text-[var(--accent-teal)]'}`} />
            CV Parsing
          </button>

          <button 
            id="nav-shortlist"
            onClick={() => { setActiveTab('shortlist'); setIsSidebarOpen(false); setSelectedIds(new Set()); }}
            className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'shortlist' 
                ? 'bg-[var(--accent-purple)] text-white shadow-lg' 
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:shadow-sm'
            }`}
          >
            <Star className={`w-5 h-5 mr-3 ${activeTab === 'shortlist' ? 'text-white' : 'text-[var(--accent-teal)]'}`} />
            Shortlist
          </button>
          
          <button 
            id="nav-analytics"
            onClick={() => { setActiveTab('analytics'); setIsSidebarOpen(false); setSelectedIds(new Set()); }}
            className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'analytics' 
                ? 'bg-[var(--accent-purple)] text-white shadow-lg' 
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:shadow-sm'
            }`}
          >
            <AnalyticsIcon className={`w-5 h-5 mr-3 ${activeTab === 'analytics' ? 'text-white' : 'text-[var(--accent-teal)]'}`} />
            Talent Insights
          </button>

          <button 
            id="nav-profile"
            onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); setSelectedIds(new Set()); }}
            className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'profile' 
                ? 'bg-[var(--accent-purple)] text-white shadow-lg' 
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:shadow-sm'
            }`}
          >
            <UserCircle className={`w-5 h-5 mr-3 ${activeTab === 'profile' ? 'text-white' : 'text-[var(--accent-teal)]'}`} />
            My Profile
          </button>

          <button 
            id="nav-chat"
            onClick={() => { 
                setActiveTab('chat'); 
                setIsSidebarOpen(false); 
                setSelectedIds(new Set()); 
                setUnreadChatCount(0); 
                if (Notification.permission === 'default') {
                    Notification.requestPermission();
                }
            }}
            className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all relative ${
              activeTab === 'chat' 
                ? 'bg-[var(--accent-purple)] text-white shadow-lg' 
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:shadow-sm'
            }`}
          >
            <MessageSquare className={`w-5 h-5 mr-3 ${activeTab === 'chat' ? 'text-white' : 'text-[var(--accent-teal)]'}`} />
            Aurrum Chat
            {unreadChatCount > 0 && activeTab !== 'chat' && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-bounce shadow-lg">
                {unreadChatCount > 9 ? '9+' : unreadChatCount}
              </span>
            )}
          </button>

          {role === 'admin' && (
            <button 
              onClick={() => { setActiveTab('trash'); setIsSidebarOpen(false); setSelectedIds(new Set()); }}
              className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'trash' 
                  ? 'bg-red-600 text-white shadow-lg' 
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:shadow-sm'
              }`}
            >
              <Trash2 className={`w-5 h-5 mr-3 ${activeTab === 'trash' ? 'text-white' : 'text-red-500'}`} />
              Trash
            </button>
          )}

          <button 
            id="nav-repository"
            onClick={() => { setActiveTab('repository'); setIsSidebarOpen(false); setSelectedIds(new Set()); }}
            className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'repository' 
                ? 'bg-indigo-600 text-white shadow-lg' 
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:shadow-sm'
            }`}
          >
            <FileText className={`w-5 h-5 mr-3 ${activeTab === 'repository' ? 'text-white' : 'text-indigo-600'}`} />
            CV Repository
          </button>

          {role === 'admin' && (
            <button 
              onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); setSelectedIds(new Set()); }}
              className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'users' 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:shadow-sm'
              }`}
            >
              <Shield className={`w-5 h-5 mr-3 ${activeTab === 'users' ? 'text-white' : 'text-indigo-600'}`} />
              Team Hub
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-3 p-3 bg-[var(--bg-primary)] rounded-xl group transition-all shadow-sm border border-[var(--border-color)]">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs uppercase shadow-sm relative">
              {user?.displayName?.slice(0, 2) || user?.email?.slice(0, 2)}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-[var(--bg-primary)] rounded-full shadow-sm" />
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold text-[var(--text-primary)] truncate">{user?.email}</p>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">{role || 'Recruiter'}</p>
            </div>
            <button onClick={handleLogout} className="text-[var(--text-muted)] hover:text-red-400 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Background Upload Progress Overlay */}
        {isProcessing && uploadProgress.total > 0 && (
          <div className="absolute bottom-6 right-6 z-50 animate-in slide-in-from-right-8 duration-500">
            <div className="bg-slate-900 text-white p-5 rounded-[2rem] shadow-2xl border border-slate-700 w-80">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                    <Loader2 size={20} className="animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400">Background Indexing</h4>
                    <p className="text-[10px] text-slate-400 font-medium">{uploadProgress.processed} of {uploadProgress.total} parsed</p>
                  </div>
                </div>
                <div className="text-right text-[10px] font-mono text-indigo-300">
                  {Math.round((uploadProgress.processed / uploadProgress.total) * 100)}%
                </div>
              </div>
              
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-50 h-full transition-all duration-500 ease-out fill-mode-forwards" 
                  style={{ width: `${(uploadProgress.processed / uploadProgress.total) * 100}%` }}
                />
              </div>

              {uploadProgress.failed > 0 && (
                <div className="mt-3 flex items-center gap-2 text-red-400">
                  <AlertCircle size={10} />
                  <span className="text-[9px] font-bold uppercase tracking-tighter">{uploadProgress.failed} Issues detected</span>
                </div>
              )}
            </div>
          </div>
        )}

        {duplicateNotification.isOpen && (
            <div className="fixed bottom-4 left-0 right-0 flex justify-center z-50 animate-in slide-in-from-bottom-4">
                <div className="bg-amber-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
                    <AlertCircle size={18} />
                    <span className="text-sm font-bold">{duplicateNotification.message}</span>
                </div>
            </div>
        )}

        <header className="h-16 bg-[var(--card-bg)] border-b border-[var(--border-color)] px-4 md:px-8 flex items-center justify-between shadow-sm z-10 shrink-0 transition-colors duration-300">
          <div className="flex items-center gap-4 text-xs font-bold text-[var(--text-muted)] font-sans uppercase tracking-[0.2em]">
            <button className="lg:hidden p-2 text-[var(--text-secondary)]" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <span className="hidden md:block cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" onClick={() => setActiveTab('candidates')}>Aurrum CV Parsing Software</span>
            <ChevronRight className="hidden md:block w-3 h-3 text-[var(--text-muted)]" />
            <span className="text-[var(--text-primary)] italic font-serif normal-case text-base tracking-normal">
              {activeTab === 'candidates' ? 'Candidates Database' : activeTab === 'analytics' ? 'Talent Insights' : activeTab === 'trash' ? 'Archive' : activeTab === 'users' ? 'Team Hub' : activeTab === 'chat' ? 'Aurrum Chat' : activeTab === 'repository' ? 'CV Repository' : activeTab === 'upload' ? 'CV Parsing' : 'Dashboard Home'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {uploadStatus === 'success' && (
              <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold animate-in fade-in zoom-in-95">
                <CheckCircle2 size={14} />
                Upload Complete
              </div>
            )}
            {uploadStatus === 'success' && (
              <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold animate-in fade-in zoom-in-95">
                <CheckCircle2 size={14} />
                Upload Complete
              </div>
            )}
            {uploadStatus === 'duplicate' && (
              <div className="flex items-center gap-2 text-amber-600 text-xs font-bold animate-in fade-in zoom-in-95 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                <AlertCircle size={14} />
                Skipped: Duplicate detected
              </div>
            )}
            {uploadStatus === 'duplicateInTrash' && (
              <div className="flex items-center gap-2 text-amber-600 text-xs font-bold animate-in fade-in zoom-in-95 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                <AlertCircle size={14} />
                Already in Trash. Restore from there.
              </div>
            )}
            {uploadStatus === 'error' && (
              <div className="flex items-center gap-2 text-red-600 text-xs font-bold animate-in fade-in zoom-in-95">
                <AlertCircle size={14} />
                Upload Failed
              </div>
            )}
            {isProcessing && (
              <div className="flex items-center gap-2 text-indigo-600 text-xs font-semibold animate-pulse">
                <Loader2 className="animate-spin" size={14} />
                Parsing Resumes...
              </div>
            )}
            
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-[var(--text-secondary)] hover:text-indigo-600 transition-colors relative"
              >
                <Bell size={20} />
                {(activityLogs.filter(log => !readNotifications.has(log.id)).length > 0) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute top-full right-0 mt-3 w-96 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[500px]">
                  <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center">
                    <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest">Recent Notifications</h3>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--sidebar-bg)] px-2 py-1 rounded-md">
                      {Math.max(0, activityLogs.length + recentChatMessages.length - readNotifications.size)} New
                    </span>
                  </div>
                  <div className="overflow-y-auto p-2 space-y-1">
                    {activityLogs.map(log => ({ ...log, type: 'activity', id: log.id, timestamp: log.timestamp }))
                      .filter(log => !readNotifications.has(log.id))
                      .sort((a: any, b: any) => b.timestamp - a.timestamp)
                      .slice(0, 15)
                      .map((log, i) => (
                      <div key={log.id} className="group p-3 hover:bg-[var(--sidebar-bg)] rounded-2xl flex items-start gap-3 transition-colors border border-transparent hover:border-[var(--border-color)]">
                        <div className="mt-1 w-2 h-2 rounded-full bg-slate-400" />
                        <div className="flex-1">
                          <p className="text-xs font-bold text-[var(--text-primary)]">{log.action}</p>
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{new Date(log.timestamp).toLocaleString()}</p>
                        </div>
                        <button 
                          onClick={(e) => markAsRead(log.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-[var(--bg-primary)] rounded-lg text-[var(--text-muted)] transition-opacity"
                          title="Mark as read"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {activityLogs.filter(log => !readNotifications.has(log.id)).length === 0 && (
                      <div className="p-10 text-center text-xs text-[var(--text-muted)] italic">No new notifications.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button 
              {...getRootProps()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center shadow-lg shadow-indigo-100 transition-all active:scale-95"
            >
              <input {...getInputProps()} />
              <Upload className="w-4 h-4 mr-2" />
              Upload CVs
            </button>
          </div>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          {quotaExceeded ? (
            <div className="h-full flex items-center justify-center p-4">
              <QuotaNotice onRetry={() => window.location.reload()} />
            </div>
          ) : activeTab === 'home' ? (
            <DashboardHome candidates={activeCandidates} activityLogs={activityLogs} teamMembers={teamMembers} />
          ) : activeTab === 'repository' ? (
            <CVRepository candidates={activeCandidates} />
          ) : activeTab === 'upload' ? (
            <BulkUpload onUpload={onDrop} isProcessing={isProcessing} />
          ) : activeTab === 'candidates' ? (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-[var(--sidebar-bg)] bg-[var(--sidebar-bg)] flex items-center justify-center text-[10px] font-bold text-[var(--text-muted)]">
                        USR
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)] text-[10px] uppercase font-black tracking-[0.2em] mt-1 ml-1">Candidate Intelligence Matrix</p>
                  </div>
                </div>
                {role === 'recruiter' && (
                  <div className="flex p-1 bg-[var(--sidebar-bg)] rounded-xl transition-colors duration-300 border border-[var(--border-color)]">
                    <button 
                      onClick={() => setViewScope('mine')}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${viewScope === 'mine' ? 'bg-[var(--card-bg)] text-indigo-600 dark:text-indigo-300 shadow-sm border border-[var(--border-color)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                    >
                      My Candidates
                    </button>
                    <button 
                      onClick={() => setViewScope('all')}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${viewScope === 'all' ? 'bg-[var(--card-bg)] text-indigo-600 dark:text-indigo-300 shadow-sm border border-[var(--border-color)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                    >
                      All Activity
                    </button>
                  </div>
                )}
              </div>
              
              {/* Stats Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[var(--card-bg)] p-5 rounded-[2rem] border border-[var(--border-color)] shadow-sm flex items-center gap-4 transition-colors duration-300">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-300">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="text-[9px] text-[var(--text-muted)] uppercase font-black tracking-widest mb-0.5">Total Records</p>
                    <h3 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{activeCandidates.length}</h3>
                  </div>
                </div>
                <div className="bg-[var(--card-bg)] p-5 rounded-[2rem] border border-[var(--border-color)] shadow-sm flex items-center gap-4 transition-colors duration-300">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/40 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-300">
                    <Star size={20} />
                  </div>
                  <div>
                    <p className="text-[9px] text-[var(--text-muted)] uppercase font-black tracking-widest mb-0.5">Shortlisted</p>
                    <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">{activeCandidates.filter(c => c.isShortlisted).length}</h3>
                  </div>
                </div>
                <div className="bg-[var(--card-bg)] p-5 rounded-[2rem] border border-[var(--border-color)] shadow-sm flex items-center gap-4 transition-colors duration-300">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    activeCandidates.some(c => c.followUpDate && new Date(c.followUpDate).toISOString().split('T')[0] <= new Date().toISOString().split('T')[0]) 
                      ? 'bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-300 animate-pulse' 
                      : 'bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300'
                  }`}>
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-[9px] text-[var(--text-muted)] uppercase font-black tracking-widest mb-0.5">Follow-up Reminder</p>
                    <h3 className={`text-2xl font-bold tracking-tight ${
                      activeCandidates.some(c => c.followUpDate && !c.notes && new Date(c.followUpDate).toISOString().split('T')[0] <= new Date().toISOString().split('T')[0])
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-[var(--text-primary)]'
                    }`}>
                      {activeCandidates.filter(c => c.followUpDate && !c.notes).length}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Search Area */}
              <div className="bg-[var(--card-bg)] p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm flex flex-col gap-4 transition-colors duration-300">
                <div className="flex flex-col gap-2 px-2">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                    <Search size={12} className="text-indigo-600" /> Boolean Search Expression
                  </label>
                  <div className="flex gap-2 items-center bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-2xl px-4 py-3 ring-2 ring-transparent focus-within:ring-indigo-500/10 focus-within:border-indigo-500/50 transition-all">
                    <input 
                      id="search-input"
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g. React AND Node NOT Java"
                      className="flex-1 bg-transparent border-none focus:outline-none text-sm font-mono placeholder:font-sans text-[var(--text-primary)]"
                    />
                    <div className="h-6 w-px bg-[var(--border-color)] mx-2" />
                    <button className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 px-4 py-1.5 rounded-xl transition-all uppercase tracking-widest">Execute</button>
                  </div>
                </div>

                {role === 'admin' && selectedIds.size > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-2xl animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[var(--card-bg)] rounded-lg flex items-center justify-center text-red-600 dark:text-red-400 shadow-sm border border-red-100 dark:border-red-900/50">
                        <Trash2 size={16} />
                      </div>
                      <p className="text-sm font-bold text-red-700 dark:text-red-400">
                        {selectedIds.size} candidates selected
                      </p>
                    </div>
                    <button 
                      onClick={handleBulkDelete}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-lg shadow-red-200 dark:shadow-none transition-all active:scale-95 flex items-center gap-2"
                    >
                      Delete Selected
                    </button>
                  </div>
                )}

                {/* Candidates Table */}
                <div className="overflow-hidden border border-[var(--border-color)] rounded-2xl transition-colors duration-300 bg-[var(--card-bg)]">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[var(--sidebar-bg)] text-[10px] uppercase font-bold text-[var(--text-muted)] border-b border-[var(--border-color)]">
                      <tr>
                        {role === 'admin' && (
                          <th className="px-6 py-4 w-10">
                            <input 
                              type="checkbox" 
                              checked={filteredCandidates.length > 0 && selectedIds.size === filteredCandidates.length}
                              onChange={() => toggleSelectAll(filteredCandidates)}
                              className="w-4 h-4 rounded border-[var(--border-color)] text-indigo-600 focus:ring-indigo-500 cursor-pointer bg-[var(--card-bg)]"
                            />
                          </th>
                        )}
                        <th className="px-6 py-4">Candidate Identity</th>
                        <th className="px-6 py-4">Domain Focus</th>
                        <th className="px-6 py-4">Competencies</th>
                        <th className="px-6 py-4">Uploaded By</th>
                        <th className="px-6 py-4 text-right">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-[var(--text-secondary)] divide-y divide-[var(--border-color)] transition-colors duration-300">
                      {filteredCandidates.map((candidate) => {
                        const isFollowUpDue = candidate.followUpDate && new Date(candidate.followUpDate).toISOString().split('T')[0] <= new Date().toISOString().split('T')[0];
                        
                        return (
                          <tr key={candidate.id} className={`hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 group transition-all cursor-pointer ${selectedIds.has(candidate.id) ? 'bg-indigo-50/30 dark:bg-indigo-900/20' : ''}`} onClick={() => setSelectedCandidate(candidate)}>
                            {role === 'admin' && (
                              <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                <input 
                                  type="checkbox" 
                                  checked={selectedIds.has(candidate.id)}
                                  onChange={(e) => toggleSelect(e as any, candidate.id)}
                                  className="w-4 h-4 rounded border-[var(--border-color)] text-indigo-600 focus:ring-indigo-500 cursor-pointer bg-[var(--card-bg)]"
                                />
                              </td>
                            )}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="font-bold text-[var(--text-primary)] group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tight truncate max-w-[150px]">{candidate.fullName}</div>
                                {candidate.isShortlisted && <Star size={12} className="text-amber-500 fill-amber-500 shrink-0" />}
                                {candidate.notes && <StickyNote size={12} className="text-indigo-400 shrink-0" title="Has internal notes" />}
                                {(candidate.followUpDate && !candidate.notes) && <Clock size={12} className="text-pink-400 shrink-0" title="Has follow-up" />}
                                {candidate.assignedTo && (
                                  <span className="text-[9px] text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/40 px-1.5 py-0.5 rounded-md">Assigned</span>
                                )}
                              </div>
                              <div className="text-[10px] text-[var(--text-muted)] font-medium">
                                {candidate.email || 'No contact mail'}
                                {candidate.assignedTo && (
                                  <span className="block italic text-[9px] text-indigo-300">
                                    {role === 'admin' ? (
                                      <>Assigned to: {teamMembers[candidate.assignedTo] || 'Recruiter'} (recruiter)</>
                                    ) : (
                                      <>Assigned by: {teamMembers[candidate.assignedBy] || 'Admin'} (admin)</>
                                    )}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">
                                {candidate.domain || 'Unsorted'}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-1.5 flex-wrap">
                                {candidate.skills?.slice(0, 3).map((skill: string) => (
                                  <span key={skill} className="bg-[var(--sidebar-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm transition-all group-hover:border-emerald-100 dark:group-hover:border-emerald-900 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                                    {skill}
                                  </span>
                                ))}
                                {candidate.skills?.length > 3 && (
                                  <span className="text-[9px] text-[var(--text-muted)] font-bold px-2 self-center opacity-60">
                                    +{candidate.skills.length - 3}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-[var(--sidebar-bg)] flex items-center justify-center text-[8px] font-bold text-[var(--text-muted)] border border-[var(--border-color)]">
                                  {(teamMembers[candidate.uploadedBy] || 'AI').slice(0, 2).toUpperCase()}
                                </div>
                                <span className="text-[10px] font-medium text-[var(--text-secondary)] truncate max-w-[120px]">
                                  {candidate.uploadedBy === user?.uid ? '(me)' : (teamMembers[candidate.uploadedBy] || 'System Index')}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-3">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setSelectedCandidate(candidate); }}
                                  className={`p-1.5 rounded-lg transition-all relative ${isFollowUpDue ? 'animate-blink-red bg-red-50 dark:bg-red-900/20' : candidate.followUpDate ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800' : 'text-[var(--text-muted)] hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}
                                  title={candidate.followUpNote || 'Add Follow-up'}
                                >
                                  <Clock size={14} />
                                  {candidate.followUpNote && (
                                    <div className="absolute -top-12 right-0 w-48 p-2 bg-indigo-900 text-white text-[8px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-20 border border-indigo-700 italic">
                                      Reminder: "{candidate.followUpNote.slice(0, 80)}..."
                                    </div>
                                  )}
                                  {candidate.followUpUpdatedBy && (
                                    <div className="absolute -top-7 right-0 bg-slate-800 dark:bg-slate-700 text-white text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10 border border-slate-700 dark:border-slate-600">
                                      By: {teamMembers[candidate.followUpUpdatedBy] || 'System'}
                                    </div>
                                  )}
                                </button>
                                {role === 'admin' && (
                                  <button 
                                    onClick={(e) => handleArchiveCandidate(e, candidate.id)}
                                    className="p-1.5 text-[var(--text-muted)] hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/40 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    title="Move to Trash"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setSelectedCandidate(candidate); }}
                                  className="text-[10px] font-black text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 uppercase tracking-widest transition-colors flex items-center gap-1 ml-1"
                                >
                                  Details <ChevronRight size={12} />
                                </button>
                                {candidate.notes && (
                                  <div className="absolute -top-12 right-0 w-48 p-2 bg-slate-800 text-white text-[9px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-20 border border-slate-700 italic">
                                    "{candidate.notes.slice(0, 80)}..."
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredCandidates.length === 0 && (
                        <tr>
                          <td colSpan={role === 'admin' ? 6 : 5} className="px-6 py-20 text-center text-[var(--text-muted)] font-medium italic transition-colors duration-300">
                            <Users size={32} className="mx-auto mb-2 opacity-20" />
                            No matches found in standard index
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === 'analytics' ? (
            <Analytics 
              candidates={candidates} 
              activityLogs={activityLogs}
              onShortlist={handleShortlist} 
              onUpdateFollowUp={handleUpdateFollowUp} 
              onUpdateNotes={handleUpdateNotes} 
              onUpdateAssignee={handleUpdateAssignee}
              onContact={(id) => { setChatRecipientId(id); setActiveTab('chat'); setSelectedCandidate(null); }}
              teamMembers={teamMembers}
              role={role}
            />
          ) : activeTab === 'chat' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <InternalChat teamMembers={fullTeamList} initialRecipientId={chatRecipientId} />
            </div>
          ) : activeTab === 'trash' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 pb-12">
              {/* Candidate Trash */}
              <div className="bg-[var(--card-bg)] p-8 rounded-[2rem] border border-[var(--border-color)] shadow-sm flex flex-col gap-6 transition-colors duration-300">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center text-red-600 dark:text-red-400">
                    <Trash2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif text-[var(--text-primary)]">Candidate Trash</h3>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">Review or permanently remove soft-deleted candidates</p>
                  </div>
                </div>

                {role === 'admin' && selectedIds.size > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-2xl animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400 shadow-sm">
                        <Trash2 size={16} />
                      </div>
                      <p className="text-sm font-bold text-red-700 dark:text-red-400">
                        {selectedIds.size} candidates selected in Trash
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleBulkRestoreTrash}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-lg shadow-emerald-200 dark:shadow-none transition-all active:scale-95 flex items-center gap-2"
                      >
                        <RotateCcw size={14} /> Restore Selected
                      </button>
                      <button 
                        onClick={handleBulkPermanentDeleteTrash}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-lg shadow-red-200 dark:shadow-none transition-all active:scale-95 flex items-center gap-2"
                      >
                        Delete Permanently
                      </button>
                    </div>
                  </div>
                )}

                <div className="overflow-hidden border border-[var(--border-color)] rounded-2xl transition-colors duration-300">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[var(--sidebar-bg)] text-[10px] uppercase font-bold text-[var(--text-muted)] border-b border-[var(--border-color)]">
                      <tr>
                        {role === 'admin' && (
                          <th className="px-6 py-4 w-10">
                            <input 
                              type="checkbox" 
                              checked={trashedCandidates.length > 0 && selectedIds.size === trashedCandidates.length}
                              onChange={() => toggleSelectAll(trashedCandidates)}
                              className="w-4 h-4 rounded border-[var(--border-color)] text-indigo-600 focus:ring-indigo-500 cursor-pointer bg-[var(--card-bg)]"
                            />
                          </th>
                        )}
                        <th className="px-6 py-4">Candidate Identity</th>
                        <th className="px-6 py-4">Domain Focus</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-[var(--text-secondary)] divide-y divide-[var(--border-color)]">
                      {trashedCandidates.map((candidate) => (
                        <tr key={candidate.id} className={`hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 transition-all ${selectedIds.has(candidate.id) ? 'bg-indigo-50/30 dark:bg-indigo-900/20' : ''}`}>
                          {role === 'admin' && (
                            <td className="px-6 py-4">
                              <input 
                                type="checkbox" 
                                checked={selectedIds.has(candidate.id)}
                                onChange={(e) => toggleSelect(e as any, candidate.id)}
                                className="w-4 h-4 rounded border-[var(--border-color)] text-indigo-600 focus:ring-indigo-500 cursor-pointer bg-[var(--card-bg)]"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                          )}
                          <td className="px-6 py-4">
                            <div className="font-bold text-[var(--text-primary)] uppercase tracking-tight">{candidate.fullName}</div>
                            <div className="text-[10px] text-[var(--text-muted)] font-medium">{candidate.email || 'No contact mail'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                              {candidate.domain || 'Unsorted'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={(e) => handleRestoreCandidate(e, candidate.id)}
                                className="px-4 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all flex items-center gap-2"
                              >
                                <RotateCcw size={12} /> Restore
                              </button>
                              <button 
                                onClick={(e) => handlePermanentDeleteCandidate(e, candidate.id)}
                                className="p-1.5 text-[var(--text-muted)] hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg transition-all"
                                title="Delete Permanently"
                              >
                                <AlertTriangle size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {trashedCandidates.length === 0 && (
                        <tr>
                          <td colSpan={role === 'admin' ? 4 : 3} className="px-6 py-20 text-center text-[var(--text-muted)] font-medium italic transition-colors duration-300">
                            <Trash2 size={32} className="mx-auto mb-2 opacity-20" />
                            No candidates in trash
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Team Trash */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-6 transition-colors duration-300">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <Users size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-serif text-[var(--text-primary)]">Team Member Trash</h3>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">Revoke access permanently or restore teammates</p>
                    </div>
                  </div>

                  <div className="overflow-hidden border border-[var(--border-color)] rounded-2xl transition-colors duration-300">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-[var(--sidebar-bg)] text-[10px] uppercase font-bold text-[var(--text-muted)] border-b border-[var(--border-color)]">
                        <tr>
                          <th className="px-6 py-4">Account Email</th>
                          <th className="px-6 py-4">System Role</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm text-slate-600 dark:text-slate-400 divide-y divide-slate-100 dark:divide-slate-800 transition-colors duration-300">
                        {trashedUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 transition-all">
                            <td className="px-6 py-4">
                              <div className="font-bold text-[var(--text-primary)] tracking-tight">{u.email}</div>
                              <div className="text-[10px] text-[var(--text-muted)] font-medium italic">ID: {u.id.slice(0, 8)}...</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className={`text-[9px] font-black uppercase px-2 py-0.5 rounded inline-block ${u.role === 'admin' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'bg-[var(--sidebar-bg)] text-[var(--text-muted)]'}`}>
                                {u.role}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={(e) => handleRestoreUser(e, u.id)}
                                  className="px-4 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all flex items-center gap-2"
                                >
                                  <RotateCcw size={12} /> Restore
                                </button>
                                <button 
                                  onClick={(e) => handleDeleteUserPermanently(e, u.id)}
                                  className="p-1.5 text-[var(--text-muted)] hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                  title="Delete Permanently"
                                >
                                  <AlertTriangle size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {trashedUsers.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-6 py-20 text-center text-slate-300 dark:text-slate-700 font-medium italic transition-colors duration-300">
                              <Users size={32} className="mx-auto mb-2 opacity-20" />
                              No team members in trash
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
            </div>
          ) : activeTab === 'shortlist' ? (
            <Shortlist candidates={candidates} onCandidateSelect={setSelectedCandidate} onArchive={handleArchiveCandidate} role={role} />
          ) : activeTab === 'profile' ? (
            <UserProfile />
          ) : activeTab === 'logs' ? (
            <LogReview />
          ) : (
            <UserManagement />
          )}
        </div>
      </main>

      {/* Candidate Profile Modal */}
      <CandidateModal 
        candidate={selectedCandidate} 
        isOpen={!!selectedCandidate} 
        onClose={() => setSelectedCandidate(null)}
        onShortlist={handleShortlist}
        onUpdateFollowUp={handleUpdateFollowUp}
        onUpdateNotes={handleUpdateNotes}
        onUpdateAssignee={handleUpdateAssignee}
        onContact={(id) => { setChatRecipientId(id); setActiveTab('chat'); setSelectedCandidate(null); }}
        teamMembers={teamMembers}
      />

      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        variant={confirmConfig.variant}
        confirmText={confirmConfig.confirmText}
      />
    </div>
  );
}


