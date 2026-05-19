import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth, db, getFirebaseStorage } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, orderBy, updateDoc, doc, deleteDoc, where, getDocs, limit, getDocFromServer, getDoc, QuerySnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useDropzone } from 'react-dropzone';
import { extractTextFromPDF, extractTextFromDocx, parseResumeHeuristically, ParsedResume } from '../lib/localParser';
import { GoogleGenAI, Type } from "@google/genai";
import UserManagement from '../components/UserManagement';
import DashboardHome from './DashboardHome';
import CandidateModal from '../components/CandidateModal';
import NotificationList from '../components/NotificationList';
import ChatNotificationPopup from '../components/ChatNotificationPopup';
import Analytics from '../components/Analytics';
import ThemeToggle from '../components/ThemeToggle';
import UserProfile from '../components/UserProfile';
import Shortlist from '../components/Shortlist';
import LogReview from '../components/LogReview';
import ActivityLogList from '../components/ActivityLogList';
import ConfirmModal from '../components/ConfirmModal';

import SystemSettings from '../components/SystemSettings';
import TimezoneWidget from '../components/TimezoneWidget';
import BulkUpload from '../components/BulkUpload';
import CVRepository from '../components/CVRepository';
import { resumeParser } from '../services/resumeParserService';
import { createNotification } from '../services/notificationService';
import InternalChat from '../components/InternalChat';
import NotificationBadge from '../components/NotificationBadge';
import QuotaNotice from '../components/QuotaNotice';
import LZString from 'lz-string';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useTimezone } from '../contexts/TimezoneContext';
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
  Bell,
  Settings,
  Download
} from 'lucide-react';

import MigrationTool from '../components/MigrationTool';

export default function Dashboard() {
  const { user, role, quotaExceeded, setQuotaExceeded, isPrivileged } = useAuth();
  const { theme } = useTheme();
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const { timezone, setTimezone, formatDate } = useTimezone();
  const [candidates, setCandidates] = useState<any[]>([]);
  const candidateMapRef = useRef(new Map<string, any>());
  const lastLogTimestampRef = useRef<number>(Date.now());
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  
  const syncCandidates = useCallback(() => {
    const sorted = Array.from(candidateMapRef.current.values()).sort((a: any, b: any) => {
      const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
      const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
    setCandidates(sorted);
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
  const [activeTab, setActiveTab] = useState<'home' | 'candidates' | 'users' | 'analytics' | 'trash' | 'shortlist' | 'profile' | 'logs' | 'activity_logs' | 'chat' | 'upload' | 'repository' | 'settings'>('home');
  const [bulkLimit, setBulkLimit] = useState<number>(20);
  const [chatRecipientId, setChatRecipientId] = useState<string | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [notificationMessage, setNotificationMessage] = useState<any>(null);
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

    // Fetch Global Settings
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'global');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setBulkLimit(docSnap.data().bulkUploadLimit || 20);
        }
      } catch (err) {
        console.warn("Could not fetch global settings, using default limit", err);
      }
    };
    fetchSettings();

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
            setNotificationMessage(newestUnreadMsg);
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
    let unsubNotifications = () => {};
    let unsubTrash = () => {};
    let unsubTeam = () => {};

    if (!quotaExceeded) {
      const q = query(
        collection(db, 'candidates'), 
        where('isArchived', '==', false),
        ...(role !== 'admin' && role !== 'team_leader' ? [where('uploadedBy', '==', user?.uid)] : []),
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
      
      if (role !== 'admin' && role !== 'team_leader') {
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

      // Notifications - unconditional
      unsubNotifications = onSnapshot(query(
        collection(db, 'notifications'), 
        where('recipientId', 'in', [user?.uid, 'all']),                
        orderBy('createdAt', 'desc'), 
        limit(10)
      ), (snapshot) => {
        const notificationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        
        // Notify for new chat or assignment notifications
        const recentNotifications = notificationsData.filter(n => 
          (n.createdAt?.toMillis() || Date.now()) > lastLogTimestampRef.current && 
          (n.type === 'chat' || n.type === 'assignment')
        );
        
        if (recentNotifications.length > 0) {
            playNotificationSound();
        }
        
        if (notificationsData.length > 0) {
            lastLogTimestampRef.current = notificationsData[0].createdAt?.toMillis() || Date.now();
        }
      }, (err: any) => {
        handleFirestoreError(err, 'get', 'notifications');
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
      unsubNotifications();
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
    // Enforcement of Bulk Upload Limit (Admins bypass)
    if (role !== 'admin' && acceptedFiles.length > bulkLimit) {
      setDuplicateNotification({
        isOpen: true,
        message: `Batch rejected: You can only upload up to ${bulkLimit} CVs at once to ensure processing quality. Please reduce your batch size.`
      });
      setUploadStatus('error');
      return;
    }

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
        const { parsed, text } = await resumeParser.parse(file);
        
        // Ensure parsed object exists
        if (!parsed) throw new Error("Parser returned empty data");
        
        parsed.name = parsed.name || file.name.split('.')[0];
        parsed.contact.email = (parsed.contact.email || 'pending@aurrum.co').toLowerCase();

        // CHECK FOR DUPLICATES
        const isDuplicateInState = candidates.find(c => c.email === parsed.contact.email);
        const isDuplicateInBatch = addedEmailsInBatch.has(parsed.contact.email);
        
        if (isDuplicateInState || isDuplicateInBatch) {
          const workerId = isDuplicateInState ? (isDuplicateInState.assignedTo || isDuplicateInState.uploadedBy) : 'this batch';
          const workerName = isDuplicateInState ? (teamMembers[workerId] || 'Unknown Recruiter') : 'this batch';
          setDuplicateNotification({ 
            isOpen: true, 
            message: `Candidate ${parsed.name} is already added and currently being handled by ${workerName}`
          });
          setUploadStatus('duplicate');
          setUploadProgress(prev => ({ ...prev, processed: prev.processed + 1, failed: prev.failed + 1 }));
          continue;
        }

        // Add to batch tracking
        addedEmailsInBatch.add(parsed.contact.email);

        // Compress text to store in Firebase (saving space)
        // 1. Convert to Base64 to ensure the file is stored even if storage fails or is blocked by CORS
        const fileToBase64 = (file: File): Promise<string> => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
          });
        };

        const MAX_BASE64_SIZE = 1000000; // ~1MB Firestore limit
        let cvBase64 = null;
        if (file.size < MAX_BASE64_SIZE) {
          cvBase64 = await fileToBase64(file);
        } else {
          console.warn(`[Dashboard] File ${file.name} is too large (${(file.size / 1024).toFixed(1)}KB) for Base64 storage in Firestore.`);
        }

        // 2. Compress text to store in Firebase (saving space)
        const compressedText = LZString.compressToUTF16(text);
        const isLargeFile = file.size > MAX_BASE64_SIZE;
        
        // 3. Upload metadata to Aurrum API
        const formData = new FormData();
        
        // Aurrum API requirements: file (Required), name (Required), email (Required)
        formData.append('file', file);
        formData.append('name', parsed.name || file.name);
        formData.append('email', parsed.contact.email || 'pending@aurrum.co');
        if (parsed.contact.phone) {
          formData.append('phone', parsed.contact.phone);
        }

        let result = { status: false, data: { id: null, url: null as string | null, name: parsed.name || file.name }, message: '' };
        
        // NOTE: Firebase Storage upload is skipped to avoid CORS errors reported by user.
        // We rely on cvBase64 in Firestore and Aurrum API URL instead.
        
        try {
          const response = await fetch('/api/cv/upload', {
            method: 'POST',
            body: formData
          });
          
          if (response.ok) {
            const data = await response.json();
            // Merge results, keeping storage URL if Aurrum API doesn't provide one
            if (data.data) {
              result.data.id = data.data.id || result.data.id;
              result.data.name = data.data.name || result.data.name;
              if (data.data.url) result.data.url = data.data.url;
            }
          } else {
            console.warn('API upload response not OK:', response.status);
          }
        } catch (apiErr) {
          console.warn('API upload failed, sticking to local storage:', apiErr);
        }
        
        // 4. Store meta in Firebase
        const normalizedExperience = parsed.experience?.map(exp => ({
          role: exp.title || '',
          company: exp.company || '',
          duration: exp.duration || '',
          description: exp.responsibilities?.join(". ") || "",
          location: exp.location || ''
        })) || [];

        const normalizedEducation = parsed.education?.map(edu => ({
          degree: edu.degree || '',
          school: edu.institution || '',
          year: edu.duration || '',
          field: edu.field || '',
          gpa: edu.gpa || '',
          location: edu.location || ''
        })) || [];

        // Flatten skills for UI compatibility
        const allSkills = Array.from(new Set([
          ...parsed.skills.languages,
          ...parsed.skills.frameworks,
          ...parsed.skills.databases,
          ...parsed.skills.tools,
          ...parsed.skills.libraries,
          ...parsed.skills.other
        ])).filter(s => s.length > 0);

        const projectLinks = parsed.projects?.flatMap(p => p.links.map(l => ({ url: l, label: `Project: ${p.name}` }))) || [];

        const newCandidateRef = await addDoc(collection(db, 'candidates'), {
          fullName: result.data?.name || parsed.name || file.name,
          cvBase64: cvBase64,
          originalFileName: file.name,
          email: (parsed.contact.email || 'pending@aurrum.co').toLowerCase(),
          phone: parsed.contact.phone || '',
          location: parsed.contact.linkedin || '', // Use linkedin as a proxy if location missing in contact
          summary: parsed.profile || '', 
          domainFocus: parsed.domainFocus || 'Other',
          skills: allSkills,
          categorizedSkills: parsed.skills, // Full structured data
          experience: normalizedExperience,
          education: normalizedEducation,
          projects: parsed.projects?.map(p => ({
            title: p.name,
            description: p.description.join(". "),
            technologies: p.technologies,
            duration: p.duration,
            link: p.links[0] || null
          })) || [],
          certifications: parsed.achievements || [], // Map achievements to certifications for UI
          achievements: parsed.achievements || [],
          languages: parsed.languages || [],
          interests: parsed.interests || [],
          links: [
            ...(parsed.contact.linkedin ? [{ url: parsed.contact.linkedin, label: 'LinkedIn' }] : []),
            ...(parsed.contact.github ? [{ url: parsed.contact.github, label: 'GitHub' }] : []),
            ...(parsed.contact.portfolio ? [{ url: parsed.contact.portfolio, label: 'Portfolio' }] : []),
            ...projectLinks
          ],
          totalExperience: parsed.totalExperienceYears || 0,
          rawResumeText: text,
          compressedText,
          isLargeFile,
          cid: result.data?.id || null,
          url: result.data?.url || null,
          fileName: file.name,
          fileType: file.type,
          isShortlisted: false,
          isArchived: false,
          aiAnalyzed: true,
          uploadedBy: user?.uid,
          createdAt: new Date().toISOString()
        });
        
        // Notify
        await createNotification(
            user?.displayName || 'System',
            role!,
            'Upload',
            parsed.name || file.name,
            'All',
            'Resume parsing completed',
            'CV Parsing',
            'all',
            newCandidateRef.id
        );
        
        setParsingStatus(prev => ({ ...prev, [file.name]: 'finished' }));
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
      setActiveTab('candidates');
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
      const candidate = candidates.find(c => c.id === id);
      if (selectedCandidate?.id === id) {
        setSelectedCandidate((prev: any) => ({ ...prev, isShortlisted: !currentStatus }));
      }
      
      // Notify
      if (candidate) {
          const action = !currentStatus ? "shortlisted candidate" : "removed from shortlist";
          const purpose = !currentStatus ? "Candidate shortlisted" : "Candidate removed from shortlist";
          await createNotification(
              user?.displayName || 'System',
              role!,
              !currentStatus ? "shortlisted" : "removed from shortlist",
              candidate.fullName,
              'All',
              !currentStatus ? "Candidate shortlisted" : "Candidate removed from shortlist",
              'Shortlist',
              'all',
              id
          );
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
      const candidate = candidates.find(c => c.id === id);
      if (selectedCandidate?.id === id) {
        setSelectedCandidate((prev: any) => ({ ...prev, followUpNote: note, followUpDate: date, followUpUpdatedBy: user?.uid }));
      }
      
      // Notify
      if (candidate) {
          await createNotification(
              user?.displayName || 'System',
              role!,
              "updated status for candidate",
              candidate.fullName,
              'All',
              "Interview progress",
              'Follow-Up',
              'all',
              id
          );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteFollowUp = async (id: string) => {
    try {
      await updateDoc(doc(db, 'candidates', id), { 
        followUpNote: '',
        followUpDate: '',
        followUpStatus: 'completed',
        updatedAt: new Date().toISOString()
      });
      const candidate = candidates.find(c => c.id === id);
      if (selectedCandidate?.id === id) {
        setSelectedCandidate((prev: any) => ({ ...prev, followUpNote: '', followUpDate: '', followUpStatus: 'completed' }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateNotes = async (id: string, notes: string) => {
    try {
      const candidate = candidates.find(c => c.id === id);
      const newLogEntry = {
        author: user?.displayName || user?.email || 'Unknown',
        timestamp: new Date().toISOString(),
        noteContent: notes,
        candidateName: candidate?.fullName || 'Candidate'
      };
      
      const existingLogs = candidate?.internalNotesLog || [];
      const updatedLogs = [...existingLogs, newLogEntry];

      await updateDoc(doc(db, 'candidates', id), { 
        notes,
        internalNotesLog: updatedLogs,
        notesUpdatedBy: user?.uid,
        updatedAt: new Date().toISOString()
      });
      if (selectedCandidate?.id === id) {
        setSelectedCandidate((prev: any) => ({ ...prev, notes, internalNotesLog: updatedLogs, notesUpdatedBy: user?.uid }));
      }
      
      // Notify
      if (candidate) {
          await createNotification(
              user?.displayName || 'System',
              role!,
              "added feedback for candidate",
              candidate.fullName,
              'All',
              "Interview feedback added",
              'Candidate',
              'all',
              id
          );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateAssignee = async (id: string, userId: string) => {
    if (role !== 'admin' && role !== 'team_leader') return;
    try {
      await updateDoc(doc(db, 'candidates', id), { 
        assignedTo: userId,
        assignedBy: user?.uid,
        updatedAt: new Date().toISOString()
      });
      const candidate = candidates.find(c => c.id === id);
      if (selectedCandidate?.id === id) {
        setSelectedCandidate((prev: any) => ({ ...prev, assignedTo: userId, assignedBy: user?.uid }));
      }
      // Notify
      if (candidate) {
          await createNotification(
              user?.displayName || 'System',
              role!,
              "assigned candidate",
              candidate.fullName,
              teamMembers[userId] || 'Recruiter',
              "Profile assignment",
              'Candidate Assignment',
              userId,
              id
          );
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
    const searchableText = `${candidate.fullName} ${candidate.domainFocus || ''} ${candidate.domain || ''} ${candidate.summary} ${candidate.skills?.join(' ')} ${candidate.notes || ''} ${JSON.stringify(candidate.experience)} ${teamMembers[candidate.uploadedBy] || ''} ${teamMembers[candidate.followUpUpdatedBy] || ''}`.toLowerCase();
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
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        id="sidebar-nav"
        className={`w-64 bg-[var(--sidebar-bg)] border-r border-[var(--border-color)] flex flex-col transition-all duration-300 fixed inset-y-0 left-0 z-40 lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="px-6 py-5 flex items-center justify-between border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <img 
              src={theme === 'dark' ? "https://aurrum.co/wp-content/uploads/2026/05/Rectech-white-logo.svg" : "https://aurrum.co/wp-content/uploads/2026/05/Rectech-Logo.svg"} 
              alt="Rectech Logo" 
              className="h-8 w-auto object-contain"
            />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button className="lg:hidden p-2 hover:bg-[var(--bg-secondary)] rounded-md transition-colors" onClick={() => setIsSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-4 py-2">
          <TimezoneWidget />
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {[
            { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'candidates', label: 'Candidates', icon: Users },
            { id: 'activity_logs', label: 'Activity Logs', icon: Activity },
            { id: 'upload', label: 'CV Parsing', icon: Upload },
            { id: 'shortlist', label: 'Shortlist', icon: Star },
            { id: 'analytics', label: 'Talent Insights', icon: AnalyticsIcon },
            { id: 'profile', label: 'My Profile', icon: UserCircle },
            { id: 'chat', label: 'Rectech Chat', icon: MessageSquare },
          ].map((item) => (
            <button 
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => { setActiveTab(item.id as any); setIsSidebarOpen(false); setSelectedIds(new Set()); if(item.id === 'chat') setUnreadChatCount(0); }}
              className={`w-full flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.id 
                  ? 'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]' 
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <item.icon className={`w-4 h-4 mr-3 ${activeTab === item.id ? 'text-[var(--accent-purple)]' : 'text-[var(--text-muted)]'}`} />
              {item.label}
              {item.id === 'chat' && unreadChatCount > 0 && activeTab !== 'chat' && (
                <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>
          ))}
          
          <div className="pt-4 mt-4 border-t border-[var(--border-color)]">
              <span className="px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">System</span>
              {isPrivileged && (
                <button 
                  onClick={() => { setActiveTab('trash'); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center px-4 py-2.5 mt-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'trash' 
                      ? 'bg-red-50 text-red-600' 
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  <Trash2 className={`w-4 h-4 mr-3 ${activeTab === 'trash' ? 'text-red-500' : 'text-[var(--text-muted)]'}`} />
                  Trash
                </button>
              )}
              <button 
                id="nav-repository"
                onClick={() => { setActiveTab('repository'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center px-4 py-2.5 mt-1 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'repository' 
                    ? 'bg-indigo-50 text-indigo-600' 
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                <FileText className={`w-4 h-4 mr-3 ${activeTab === 'repository' ? 'text-indigo-600' : 'text-[var(--text-muted)]'}`} />
                CV Repository
              </button>
          </div>
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
            <div className="bg-slate-900 text-white p-5 rounded-[2rem] shadow-2xl border border-slate-700 w-80 max-h-[80vh] overflow-y-auto">
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
              </div>
              
              <div className="space-y-2 mt-4">
                {Object.entries(parsingStatus).map(([filename, status]) => (
                    <div key={filename} className="text-[10px] flex justify-between">
                        <span className="truncate max-w-[150px]">{filename}</span>
                        <span className={status === 'finished' ? 'text-emerald-400' : 'text-indigo-400'}>{status}</span>
                    </div>
                ))}
              </div>
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
            <span className="hidden md:block cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" onClick={() => setActiveTab('candidates')}>Rectech CV Parsing Software</span>
            <ChevronRight className="hidden md:block w-3 h-3 text-[var(--text-muted)]" />
            <span className="text-[var(--text-primary)] italic font-serif normal-case text-base tracking-normal">
              {activeTab === 'candidates' ? 'Candidates Database' : activeTab === 'activity_logs' ? 'Activity Log' : activeTab === 'analytics' ? 'Talent Insights' : activeTab === 'trash' ? 'Archive' : activeTab === 'users' ? 'Team Hub' : activeTab === 'chat' ? 'Rectech Chat' : activeTab === 'repository' ? 'CV Repository' : activeTab === 'upload' ? 'CV Parsing' : 'Dashboard Home'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
                <NotificationBadge onClick={() => setShowNotifications(!showNotifications)} />
                {showNotifications && <NotificationList onClose={() => setShowNotifications(false)} />}
            </div>
            
            {showNotifications && (
              <div 
                ref={notificationRef}
                className="absolute right-8 top-16 w-80 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-xl z-50 p-4 max-h-[60vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold">Notifications</h3>
                  <button 
                    onClick={() => markAllAsRead()}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider"
                  >
                    Mark all read
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">No new notifications</p>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((n: any) => (
                      <div 
                        key={n.id} 
                        onClick={() => !n.read && markAsRead(n.id)}
                        className={`text-xs p-2 rounded-xl transition-all cursor-pointer ${n.read ? 'text-[var(--text-secondary)] opacity-60' : 'text-[var(--text-primary)] bg-indigo-50/50 dark:bg-indigo-900/10 border-l-2 border-indigo-500'} flex flex-col gap-1`}
                      >
                        <p>{n.text}</p>
                        <span className="text-[10px] text-[var(--text-muted)]">{formatDate(n.createdAt?.toDate())}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
            <CVRepository candidates={activeCandidates} onSelect={setSelectedCandidate} />
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
                  <div className="flex p-1 bg-[var(--sidebar-bg)] rounded-xl transition-colors duration-300 border border-[var(--border-color)] overflow-x-auto whitespace-nowrap">
                    <button 
                      onClick={() => {
                        const headers = ['FullName', 'Email', 'Phone', 'Domain Focus', 'Skills', 'Shortlisted', 'Follow Up Date', 'Follow Up Note', 'Summary'];
                        const csvData = activeCandidates.map(c => [
                          `"${c.fullName || ''}"`,
                          `"${c.email || ''}"`,
                          `"${c.phone || ''}"`,
                          `"${c.domainFocus || c.domain || ''}"`,
                          `"${(c.skills || []).join(', ')}"`,
                          `"${c.isShortlisted ? 'Yes' : 'No'}"`,
                          `"${c.followUpDate || ''}"`,
                          `"${(c.followUpNote || '').replace(/"/g, '""')}"`,
                          `"${(c.summary || '').replace(/"/g, '""')}"`
                        ].join(','));
                        
                        const csvContent = [headers.join(','), ...csvData].join('\n');
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.setAttribute('download', `Rectech_Candidates_${new Date().toISOString().split('T')[0]}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all text-emerald-600 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 flex items-center gap-2"
                    >
                      <Download size={12} />
                      Export CSV
                    </button>
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
                    <p className="text-[9px] text-[var(--text-muted)] uppercase font-black tracking-widest mb-0.5">Follow Up Reminder</p>
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

                {isPrivileged && selectedIds.size > 0 && (
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
                        {isPrivileged && (
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
                        <th className="px-6 py-4">Follow Up</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-[var(--text-secondary)] divide-y divide-[var(--border-color)] transition-colors duration-300">
                      {filteredCandidates.map((candidate) => {
                        const isFollowUpDue = candidate.followUpDate && new Date(candidate.followUpDate).toISOString().split('T')[0] <= new Date().toISOString().split('T')[0];
                        
                        return (
                          <tr key={candidate.id} className={`hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 group transition-all cursor-pointer ${selectedIds.has(candidate.id) ? 'bg-indigo-50/30 dark:bg-indigo-900/20' : ''}`} onClick={() => setSelectedCandidate(candidate)}>
                            {isPrivileged && (
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
                                {candidate.notes && <StickyNote size={12} className="text-indigo-400 shrink-0" />}
                                {(candidate.followUpDate && !candidate.notes) && <Clock size={12} className="text-pink-400 shrink-0" />}
                                {candidate.assignedTo && (
                                  <span className="text-[9px] text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/40 px-1.5 py-0.5 rounded-md">Assigned</span>
                                )}
                              </div>
                              <div className="text-[10px] text-[var(--text-muted)] font-medium">
                                {candidate.email || 'No contact mail'}
                                {candidate.assignedTo && (
                                  <span className="block italic text-[9px] text-indigo-300">
                                    {isPrivileged ? (
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
                                {candidate.domainFocus || candidate.domain || 'Unsorted'}
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
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setSelectedCandidate(candidate); }}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider ${isFollowUpDue ? 'bg-red-500 text-white animate-pulse' : candidate.followUpDate ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300' : 'bg-slate-50 text-slate-400 dark:bg-slate-800'}`}
                                >
                                  <Clock size={12} />
                                  {candidate.followUpDate ? formatDate(candidate.followUpDate) : 'No Date'}
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              {isPrivileged && (
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
                                className="text-[10px] font-black text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 uppercase tracking-widest transition-colors inline-flex items-center gap-1"
                              >
                                Details <ChevronRight size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredCandidates.length === 0 && (
                        <tr>
                          <td colSpan={isPrivileged ? 6 : 5} className="px-6 py-20 text-center text-[var(--text-muted)] font-medium italic transition-colors duration-300">
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
          ) : activeTab === 'activity_logs' ? (
            <ActivityLogList role={role} />
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

                {isPrivileged && selectedIds.size > 0 && (
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
                        {isPrivileged && (
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
                          {isPrivileged && (
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
                          <td colSpan={isPrivileged ? 4 : 3} className="px-6 py-20 text-center text-[var(--text-muted)] font-medium italic transition-colors duration-300">
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
          ) : activeTab === 'settings' ? (
            <div className="space-y-6">
               <MigrationTool />
               <SystemSettings />
            </div>
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
        onCompleteFollowUp={handleCompleteFollowUp}
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


