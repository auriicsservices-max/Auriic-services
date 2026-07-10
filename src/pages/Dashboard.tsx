import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth, db, getFirebaseStorage } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, orderBy, updateDoc, doc, deleteDoc, where, getDocs, limit, getDocFromServer, getDoc, QuerySnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useDropzone } from 'react-dropzone';
import { extractTextFromPDF, extractTextFromDocx, parseResumeHeuristically, ParsedResume } from '../lib/localParser';
import { formatUKDate } from '../lib/dateUtils';
import { GoogleGenAI, Type } from "@google/genai";
import UserManagement from '../components/UserManagement';
import DashboardHome from './DashboardHome';
import CandidateModal from '../components/CandidateModal';
import ProcessingWidget from '../components/resume-processing/ProcessingWidget';
import Analytics from '../components/Analytics';
import ThemeToggle from '../components/ThemeToggle';
import UserProfile from '../components/UserProfile';
import Shortlist from '../components/Shortlist';
import LogReview from '../components/LogReview';
import ActivityLogList from '../components/ActivityLogList';
import { InvoiceList } from '../components/InvoiceList';
import ConfirmModal from '../components/ConfirmModal';

import SystemSettings from '../components/SystemSettings';
import BulkUpload from '../components/BulkUpload';
import CVRepository from '../components/CVRepository';
import { RecruitmentPipeline } from '../components/RecruitmentPipeline';
import { resumeParser } from '../services/resumeParserService';
import { logActivity } from '../services/activityService';
import { createNotification, formatNotificationMessage } from '../services/notificationService';
import NotificationBadge from '../components/NotificationBadge';
import QuotaNotice from '../components/QuotaNotice';
import LZString from 'lz-string';
import Select from 'react-select';

export const DOMAIN_OPTIONS = [
  { value: 'IT / Software', label: 'IT / Software' },
  { value: 'AI / Machine Learning', label: 'AI / Machine Learning' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'HR', label: 'HR' },
  { value: 'Operations', label: 'Operations' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Design', label: 'Design' },
  { value: 'Project Management', label: 'Project Management' },
  { value: 'Others', label: 'Others' },
  { value: 'Unknown Domain', label: 'Unknown Domain' }
];

export function getNormalizedDomain(candidate: any): string {
  const dom = (candidate.domainFocus || candidate.domain || '').trim();
  if (!dom) return 'Unknown Domain';
  if (dom === 'IT') return 'IT / Software';
  if (dom === 'Other') return 'Others';
  return dom;
}
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
  BookOpen,
  LineChart as AnalyticsIcon,
  Trash2,
  Clock,
  RotateCcw,
  AlertTriangle,
  Calendar,
  Receipt,
  UserCircle,
  Activity,
  Menu,
  X,
  MessageSquare,
  StickyNote,
  Bell,
  Settings,
  Download,
  Database,
  Target,
  MapPin,
  Layers
} from 'lucide-react';


import DatabaseDetails from '../components/DatabaseDetails';
import BackupDashboard from '../components/BackupDashboard';

export default function Dashboard() {
  const { user, role, quotaExceeded, setQuotaExceeded, isPrivileged, getUserDisplayName, getUserRole, getUserName } = useAuth();
  console.log("DEBUG: Dashboard role:", role);
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

  const [teamMembers, setTeamMembers] = useState<Record<string, string>>({});
  const [fullTeamList, setFullTeamList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'processed' | 'shortlisted' | 'follow_up'>('all');
  const [selectedDomains, setSelectedDomains] = useState<any[]>([]);
  const [isMultiDomain, setIsMultiDomain] = useState<boolean>(true);
  const [sortField, setSortField] = useState<'createdAt' | 'domainFocus' | 'fullName'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ total: 0, processed: 0, failed: 0 });
  const [parsingStatus, setParsingStatus] = useState<Record<string, { status: string, progress: number }>>({});
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error' | 'duplicate' | 'duplicateInTrash'>('idle');
  const [duplicateNotification, setDuplicateNotification] = useState<{ isOpen: boolean; message: string; }>({ isOpen: false, message: '' });
  const [duplicateResolution, setDuplicateResolution] = useState<{
    isOpen: boolean;
    candidate: any;
    newParsed: any;
    file: File | null;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'candidates' | 'pipeline' | 'users' | 'analytics' | 'trash' | 'shortlist' | 'profile' | 'logs' | 'activity_logs' | 'upload' | 'repository' | 'settings' | 'backup' | 'database' | 'invoices'>('home');
  const [bulkLimit, setBulkLimit] = useState<number>(20);
  const [fileSizeLimit, setFileSizeLimit] = useState<number>(5);
  const [searchPage, setSearchPage] = useState(1);
  const [searchRowsPerPage, setSearchRowsPerPage] = useState(20);
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
          setFileSizeLimit(docSnap.data().fileSizeLimit || 5);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setActiveTab('candidates');
        setTimeout(() => {
          const input = document.getElementById('search-input');
          if (input) input.focus();
        }, 150);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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

  const processingJobs = useMemo(() => {
    return Object.entries(parsingStatus).map(([filename, data]) => ({
        id: filename,
        filename,
        progress: data.progress,
        currentStep: data.status,
    }));
  }, [parsingStatus]);

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
    if (duplicateNotification.isOpen) {
      const timer = setTimeout(() => {
        setDuplicateNotification({ isOpen: false, message: '' });
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [duplicateNotification.isOpen]);

  useEffect(() => {
    if (!user || !role) return;

    // Unconditional listeners
    let unsubCandidates = () => {};
    let unsubAssigned = () => {};
    let unsubNotifications = () => {};
    let unsubTrash = () => {};
    let unsubTeam = () => {};
    let unsubActivityLogs = () => {};

    if (!quotaExceeded) {
      const q = query(
        collection(db, 'candidates'), 
        where('isArchived', '==', false)
      );
      unsubCandidates = onSnapshot(q, (snapshot) => {
        const candidatesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("[Dashboard] Snapshot updated, candidates count:", candidatesData.length);
        
        let filtered = candidatesData;
        if (role === 'client') {
          filtered = candidatesData.filter((c: any) => c.clientId === user?.uid);
        } else if (role !== 'admin' && role !== 'team_leader' && role !== 'developer') {
          filtered = candidatesData.filter((c: any) => c.uploadedBy === user?.uid || c.assignedTo === user?.uid);
        }

        setCandidates(prev => {
          const trashOnly = prev.filter(c => c.isArchived);
          return [...filtered, ...trashOnly].sort((a: any, b: any) => {
            const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
            const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });
        });

      }, (err: any) => {
        handleFirestoreError(err, 'get', 'candidates');
        if (err.code === 'resource-exhausted') setQuotaExceeded(true);
      });
      
      // Trash - unconditional
      const qTrash = query(
        collection(db, 'candidates'), 
        where('isArchived', '==', true)
      );
      unsubTrash = onSnapshot(qTrash, (snapshot) => {
        const trashedCandidates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCandidates(prev => {
            const activeOnly = prev.filter(c => !c.isArchived);
            return [...activeOnly, ...trashedCandidates].sort((a: any, b: any) => {
                const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
                const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
                return dateB - dateA;
            });
        });
      }, (err: any) => {
        console.error("Trash listener error:", err);
      });

      // Notifications - unconditional
      unsubNotifications = onSnapshot(query(
        collection(db, 'notifications'), 
        where('recipientId', 'in', [user?.uid, 'all']),                
        limit(50)
      ), (snapshot) => {
        const rawNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        const sortedNotifs = rawNotifs.sort((a: any, b: any) => {
          const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
          const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
        const notificationsData = sortedNotifs.slice(0, 10);
        
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

      // Real-time activity logs listener with role safety
      const qLogs = (role === 'admin' || role === 'developer' || role === 'team_leader')
        ? query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), limit(1000))
        : query(collection(db, 'activity_logs'), where('authorUid', '==', user?.uid), limit(1000));
      
      unsubActivityLogs = onSnapshot(qLogs, (snapshot) => {
        const logs = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        const sortedLogs = logs.sort((a: any, b: any) => {
          const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : new Date(a.timestamp || 0).getTime();
          const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : new Date(b.timestamp || 0).getTime();
          return timeB - timeA;
        });
        setActivityLogs(sortedLogs);
      }, (err: any) => {
        console.warn("Activity logs query error/index warning, falling back:", err);
        // Fallback or handle offline
      });
    }

    return () => {
      unsubCandidates();
      unsubAssigned();
      unsubNotifications();
      unsubTrash();
      unsubTeam();
      unsubActivityLogs();
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
    if (role !== 'admin' && role !== 'developer' && acceptedFiles.length > bulkLimit) {
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
    
    // Process files in parallel to improve performance
    await Promise.all(acceptedFiles.map(async (file) => {
      if (file.size > fileSizeLimit * 1024 * 1024) {
        setDuplicateNotification({
          isOpen: true,
          message: `File rejected: ${file.name} is larger than ${fileSizeLimit}MB. Please upload a smaller file.`
        });
        setUploadProgress(prev => ({ ...prev, processed: prev.processed + 1, failed: prev.failed + 1 }));
        return;
      }
      try {
        // Progress: 0-10% -> Uploading File
        setParsingStatus(prev => ({ ...prev, [file.name]: { status: 'Uploading File', progress: 10 } }));
        
        // Use Enhanced CV Parsing Service
        // Progress: 20-40% -> Extracting PDF Text (handled by service)
        const { parsed, text } = await resumeParser.parse(file, (progress) => {
            setParsingStatus(prev => ({ ...prev, [file.name]: { status: 'Extracting PDF Text', progress: 20 + (progress * 0.2) } }));
        });
        
                // Progress: 40-60% -> Detecting candidate information
        setParsingStatus(prev => ({ ...prev, [file.name]: { status: 'Detecting Candidate Information', progress: 50 } }));
        
        // Progress: 60-80% -> AI Analysis Running (post-extraction)
        setParsingStatus(prev => ({ ...prev, [file.name]: { status: 'AI Analysis Running', progress: 70 } }));
        
        // Ensure parsed object exists
        if (!parsed) throw new Error("Parser returned empty data");
        
        // Use extracted name, normalize it
        const candidateFullName = (parsed.fullName || parsed.name || file.name.split('.')[0]).trim();
        parsed.name = candidateFullName;
        parsed.contact.email = (parsed.contact.email || 'pending@aurrum.co').toLowerCase();
        parsed.contact.phone = (parsed.contact.phone || '').trim();
        parsed.contact.linkedin = (parsed.contact.linkedin || '').trim();

        // CHECK FOR DUPLICATES
        // Note: This check uses the latest candidates state, but might have race conditions
        // if multiple uploads are processed in parallel.
        const isDuplicateInState = candidates.find(c => 
          (c.email && c.email === parsed.contact.email) ||
          (c.phone && c.phone === parsed.contact.phone) ||
          (c.linkedin && c.linkedin === parsed.contact.linkedin) ||
          (c.fullName && c.fullName === candidateFullName && c.company === parsed.company)
        );
        
        // Check duplicate within the batch
        const isDuplicateInBatch = addedEmailsInBatch.has(parsed.contact.email);
        
        if (isDuplicateInState || isDuplicateInBatch) {
          const workerId = isDuplicateInState ? (isDuplicateInState.assignedTo || isDuplicateInState.uploadedBy) : 'this batch';
          const workerName = isDuplicateInState ? (teamMembers[workerId] || 'Unknown Recruiter') : 'this batch';
          const status = isDuplicateInState ? (isDuplicateInState.pipelineStage || isDuplicateInState.status || 'Screening') : 'New';
          const lastUpdated = isDuplicateInState ? formatUKDate(isDuplicateInState.updatedAt || isDuplicateInState.createdAt) : 'N/A';
          
          setDuplicateNotification({ 
            isOpen: true, 
            message: `Candidate: ${candidateFullName}\nStatus: Already exists in system\nCurrently Assigned To: ${workerName}\nCurrent Stage: ${status}\nLast Updated: ${lastUpdated}`
          });
          setUploadStatus('duplicate');
          setUploadProgress(prev => ({ ...prev, processed: prev.processed + 1, failed: prev.failed + 1 }));

          if (isDuplicateInState) {
            setDuplicateResolution({
              isOpen: true,
              candidate: isDuplicateInState,
              newParsed: parsed,
              file: file
            });
          }
          return;
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
        
        // Progress: 80-95% -> Saving Candidate Data
        setParsingStatus(prev => ({ ...prev, [file.name]: { status: 'Saving Candidate Data', progress: 80 } }));
        
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

        const allSkills = Array.from(new Set([
          ...(parsed.skills.languages || []),
          ...(parsed.skills.frameworks || []),
          ...(parsed.skills.databases || []),
          ...(parsed.skills.tools || []),
          ...(parsed.skills.libraries || []),
          ...(parsed.skills.other || [])
        ])).filter(s => s && s.length > 0);

        const projectLinks = parsed.projects?.flatMap(p => p.links.map(l => ({ url: l, label: `Project: ${p.name}` }))) || [];
        
        const newCandidateRef = await addDoc(collection(db, 'candidates'), {
          fullName: result.data?.name || parsed.name || file.name,
          cvBase64: cvBase64,
          originalFileName: file.name,
          email: (parsed.contact.email || 'pending@aurrum.co').toLowerCase(),
          phone: parsed.contact.phone || '',
          locationInfo: parsed.locationDetails || { city: '', state: '', country: '', postalCode: '' },
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

        // Progress: 95-100% -> Background Indexing / Completed
        setParsingStatus(prev => ({ ...prev, [file.name]: { status: 'Completed', progress: 100 } }));
        
        // Cleanup status after delay
        setTimeout(() => {
          setParsingStatus(prev => {
              const next = { ...prev };
              delete next[file.name];
              return next;
          });
        }, 3000);
        
        // Notify
        const message = formatNotificationMessage(
            getUserName(),
            getUserRole(),
            `Uploaded CV for ${parsed.name || file.name} — Resume parsing completed`
        );
        await createNotification(
            message,
            user!.uid,
            getUserName(),
            getUserRole(),
            'all',
            newCandidateRef.id
        );
        await logActivity(
            getUserDisplayName(),
            user?.uid || 'System',
            getUserRole(),
            "uploaded CV",
            parsed.name || file.name,
            null,
            "Resume parsing completed",
            "CV Parsing"
        );
        
        setParsingStatus(prev => ({ ...prev, [file.name]: { status: 'finished', progress: 100 } }));
        setUploadStatus('success');
        setUploadProgress(prev => ({ ...prev, processed: prev.processed + 1 }));
      } catch (err: any) {
        console.error(err);
        showAlert('Upload Error', `Unable to process ${file.name}: ${err.message}`);
        setUploadStatus('error');
        setUploadProgress(prev => ({ ...prev, processed: prev.processed + 1, failed: prev.failed + 1 }));
      }
    }));

    
    setTimeout(() => {
      setIsProcessing(false);
      setUploadProgress({ total: 0, processed: 0, failed: 0 });
      setActiveTab('candidates');
    }, 3000);
  }, [user, candidates, teamMembers]); 


  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ 
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
          const message = formatNotificationMessage(
              getUserName(),
              getUserRole(),
              `${action} candidate ${candidate.fullName} — ${purpose}`
          );
          await createNotification(
              message,
              user!.uid,
              getUserName(),
              getUserRole(),
              'all',
              id
          );
          await logActivity(
              getUserDisplayName(),
              user?.uid || 'System',
              getUserRole(),
              action,
              candidate.fullName,
              null,
              purpose,
              "Shortlist"
          );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateFollowUp = async (id: string, note: string, date: string) => {
    try {
      const candidate = candidates.find(c => c.id === id);
      const existingLogs = candidate?.internalNotesLog || [];
      const dateStr = date ? formatDate(date) : 'No Date';
      const logEntry = {
        author: user?.displayName || user?.email || 'Unknown',
        timestamp: new Date().toISOString(),
        noteContent: `⏰ Follow-up reminder set for ${dateStr}. Details: ${note || '(No additional notes)'}`,
        candidateName: candidate?.fullName || 'Candidate',
        type: 'follow_up'
      };
      const updatedLogs = [...existingLogs, logEntry];

      await updateDoc(doc(db, 'candidates', id), { 
        followUpNote: note,
        followUpDate: date,
        followUpUpdatedBy: user?.uid,
        internalNotesLog: updatedLogs,
        updatedAt: new Date().toISOString()
      });
      if (selectedCandidate?.id === id) {
        setSelectedCandidate((prev: any) => ({ ...prev, followUpNote: note, followUpDate: date, followUpUpdatedBy: user?.uid, internalNotesLog: updatedLogs }));
      }
      
      // Notify
      if (candidate) {
          const message = formatNotificationMessage(
              getUserName(),
              getUserRole(),
              `Updated status for candidate ${candidate.fullName} — Interview progress`
          );
          await createNotification(
              message,
              user!.uid,
              getUserName(),
              getUserRole(),
              'all',
              id
          );
          await logActivity(
              getUserDisplayName(),
              user?.uid || 'System',
              getUserRole(),
              "updated interview follow-up",
              candidate.fullName,
              null,
              "Interview progress updated",
              "Follow-Up"
          );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteFollowUp = async (id: string) => {
    try {
      const candidate = candidates.find(c => c.id === id);
      const existingLogs = candidate?.internalNotesLog || [];
      const logEntry = {
        author: user?.displayName || user?.email || 'Unknown',
        timestamp: new Date().toISOString(),
        noteContent: `✅ Completed follow-up. Previous note: ${candidate?.followUpNote || '(None)'}`,
        candidateName: candidate?.fullName || 'Candidate',
        type: 'follow_up_completed'
      };
      const updatedLogs = [...existingLogs, logEntry];

      await updateDoc(doc(db, 'candidates', id), { 
        followUpNote: '',
        followUpDate: '',
        followUpStatus: 'completed',
        internalNotesLog: updatedLogs,
        updatedAt: new Date().toISOString()
      });
      if (selectedCandidate?.id === id) {
        setSelectedCandidate((prev: any) => ({ ...prev, followUpNote: '', followUpDate: '', followUpStatus: 'completed', internalNotesLog: updatedLogs }));
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
          const message = formatNotificationMessage(
              getUserName(),
              getUserRole(),
              `Added feedback for candidate ${candidate.fullName} — Interview feedback added`
          );
          await createNotification(
              message,
              user!.uid,
              getUserName(),
              getUserRole(),
              'all',
              id
          );
          await logActivity(
              getUserDisplayName(),
              user?.uid || 'System',
              getUserRole(),
              "added feedback",
              candidate.fullName,
              null,
              "Interview feedback added",
              "Notes"
          );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateAssignee = async (id: string, userId: string) => {
    if (role !== 'admin' && role !== 'team_leader' && role !== 'developer') return;
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
          const message = formatNotificationMessage(
              getUserName(),
              getUserRole(),
              `Assigned candidate ${candidate.fullName} to ${teamMembers[userId] || 'Recruiter'} — Profile assignment`
          );
          await createNotification(
              message,
              user!.uid,
              getUserName(),
              getUserRole(),
              userId,
              id
          );
          await logActivity(
              getUserDisplayName(),
              user?.uid || 'System',
              getUserRole(),
              "assigned candidate",
              candidate.fullName,
              teamMembers[userId] || 'Recruiter',
              "Profile assignment",
              "Candidate Assignment"
          );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateClient = async (id: string, clientId: string) => {
    if (role !== 'admin' && role !== 'team_leader' && role !== 'developer' && role !== 'recruiter') return;
    try {
      await updateDoc(doc(db, 'candidates', id), { 
        clientId: clientId || null,
        clientAssignedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      if (selectedCandidate?.id === id) {
        setSelectedCandidate((prev: any) => ({ ...prev, clientId: clientId || null }));
      }
    } catch (err) {
      console.error('[Dashboard] Error updating candidate client:', err);
    }
  };

  const handleUpdateStage = async (id: string, stage: string) => {
    if (role !== 'admin' && role !== 'team_leader' && role !== 'developer' && role !== 'recruiter') return;
    try {
      const candidateDoc = doc(db, 'candidates', id);
      const candSnap = await getDoc(candidateDoc);
      if (!candSnap.exists()) return;
      const candidateData = candSnap.data();

      const timestamp = new Date().toISOString();
      const author = getUserDisplayName() || user?.email || 'System';

      const updateData: any = {
        pipelineStage: stage,
        status: stage,
        updatedAt: timestamp
      };

      const currentStageHistory = candidateData.stageHistory || [];
      const isDuplicateStage = currentStageHistory.some((h: any) => h.stage === stage);
      if (!isDuplicateStage) {
        updateData.stageHistory = [
          ...currentStageHistory,
          { stage, timestamp, author }
        ];
      }

      await updateDoc(candidateDoc, updateData);

      if (selectedCandidate?.id === id) {
        setSelectedCandidate((prev: any) => ({ 
          ...prev, 
          pipelineStage: stage,
          status: stage,
          stageHistory: updateData.stageHistory || prev.stageHistory
        }));
      }

      await logActivity(
        author,
        user?.uid || 'System',
        getUserRole() || 'recruiter',
        'pipeline_stage_moved',
        candidateData.fullName || 'Candidate',
        null,
        `Moved candidate stage to: ${stage}`,
        'Pipeline'
      );
    } catch (err) {
      console.error('[Dashboard] Error updating candidate stage:', err);
    }
  };

  const handleResolveView = () => {
    if (!duplicateResolution) return;
    setSelectedCandidate(duplicateResolution.candidate);
    setDuplicateResolution(null);
  };

  const handleResolveRestore = async () => {
    if (!duplicateResolution) return;
    try {
      await updateDoc(doc(db, 'candidates', duplicateResolution.candidate.id), {
        isArchived: false,
        updatedAt: new Date().toISOString()
      });
      setDuplicateResolution(null);
      showAlert('Success', 'Candidate has been successfully restored.');
    } catch (err) {
      console.error('[Dashboard] Error restoring duplicate candidate:', err);
      showAlert('Error', 'Failed to restore candidate.');
    }
  };

  const handleResolveDelete = async () => {
    if (!duplicateResolution) return;
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Permanently',
      message: `Are you sure you want to PERMANENTLY delete ${duplicateResolution.candidate.fullName}? This cannot be undone and will completely erase their records.`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'candidates', duplicateResolution.candidate.id));
          setDuplicateResolution(null);
          showAlert('Success', 'Candidate has been permanently deleted from Firebase.');
        } catch (err) {
          console.error('[Dashboard] Error permanently deleting duplicate candidate:', err);
          showAlert('Error', 'Failed to permanently delete candidate.');
        }
      },
      variant: 'danger'
    });
  };

  const handleResolveOverwrite = async () => {
    if (!duplicateResolution || !duplicateResolution.file) return;
    const { candidate, newParsed, file } = duplicateResolution;
    setIsProcessing(true);
    try {
      const fileToBase64 = (f: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(f);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
      };

      const MAX_BASE64_SIZE = 1000000;
      let cvBase64 = null;
      if (file.size < MAX_BASE64_SIZE) {
        cvBase64 = await fileToBase64(file);
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', newParsed.name || file.name);
      formData.append('email', newParsed.contact.email || 'pending@aurrum.co');
      if (newParsed.contact.phone) {
        formData.append('phone', newParsed.contact.phone);
      }

      let uploadResultUrl = candidate.url;
      let uploadResultCid = candidate.cid;

      try {
        const response = await fetch('/api/cv/upload', {
          method: 'POST',
          body: formData
        });
        if (response.ok) {
          const data = await response.json();
          if (data.data) {
            uploadResultCid = data.data.id || uploadResultCid;
            if (data.data.url) uploadResultUrl = data.data.url;
          }
        }
      } catch (apiErr) {
        console.warn('API upload failed for overwrite, sticking to existing url:', apiErr);
      }

      const normalizedExperience = newParsed.experience?.map((exp: any) => ({
        role: exp.title || '',
        company: exp.company || '',
        duration: exp.duration || '',
        description: exp.responsibilities?.join(". ") || "",
        location: exp.location || ''
      })) || [];

      const normalizedEducation = newParsed.education?.map((edu: any) => ({
        degree: edu.degree || '',
        school: edu.institution || '',
        year: edu.duration || '',
        field: edu.field || '',
        gpa: edu.gpa || '',
        location: edu.location || ''
      })) || [];

      const allSkills = Array.from(new Set([
        ...(newParsed.skills?.languages || []),
        ...(newParsed.skills?.frameworks || []),
        ...(newParsed.skills?.databases || []),
        ...(newParsed.skills?.tools || []),
        ...(newParsed.skills?.libraries || []),
        ...(newParsed.skills?.other || [])
      ])).filter(s => s && s.length > 0);

      const projectLinks = newParsed.projects?.flatMap((p: any) => p.links.map((l: any) => ({ url: l, label: `Project: ${p.name}` }))) || [];

      await updateDoc(doc(db, 'candidates', candidate.id), {
        fullName: newParsed.name || file.name,
        cvBase64: cvBase64 || candidate.cvBase64,
        originalFileName: file.name,
        email: (newParsed.contact.email || 'pending@aurrum.co').toLowerCase(),
        phone: newParsed.contact.phone || candidate.phone,
        locationInfo: newParsed.locationDetails || candidate.locationInfo,
        summary: newParsed.profile || candidate.summary,
        domainFocus: newParsed.domainFocus || candidate.domainFocus,
        skills: allSkills,
        categorizedSkills: newParsed.skills || candidate.categorizedSkills,
        experience: normalizedExperience,
        education: normalizedEducation,
        projects: newParsed.projects?.map((p: any) => ({
          title: p.name,
          description: p.description.join(". "),
          technologies: p.technologies,
          duration: p.duration,
          link: p.links[0] || null
        })) || candidate.projects,
        certifications: newParsed.achievements || candidate.certifications,
        achievements: newParsed.achievements || candidate.achievements,
        languages: newParsed.languages || candidate.languages,
        interests: newParsed.interests || candidate.interests,
        links: [
          ...(newParsed.contact.linkedin ? [{ url: newParsed.contact.linkedin, label: 'LinkedIn' }] : []),
          ...(newParsed.contact.github ? [{ url: newParsed.contact.github, label: 'GitHub' }] : []),
          ...(newParsed.contact.portfolio ? [{ url: newParsed.contact.portfolio, label: 'Portfolio' }] : []),
          ...projectLinks
        ],
        totalExperience: newParsed.totalExperienceYears || candidate.totalExperienceYears,
        cid: uploadResultCid,
        url: uploadResultUrl,
        updatedAt: new Date().toISOString()
      });

      await logActivity(
        getUserDisplayName() || user?.email || 'System',
        user?.uid || 'System',
        getUserRole() || 'recruiter',
        'Candidate Overwritten',
        candidate.fullName || 'Candidate',
        null,
        `Overwrote duplicate candidate ${candidate.fullName || 'Candidate'} with newly uploaded CV: ${file.name}`,
        'Candidate'
      );

      setDuplicateResolution(null);
      showAlert('Success', `Candidate ${candidate.fullName} profile has been updated with the new resume data.`);
    } catch (err) {
      console.error('[Dashboard] Error overwriting candidate:', err);
      showAlert('Error', 'Failed to overwrite candidate.');
    } finally {
      setIsProcessing(false);
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
  let filteredCandidates = candidates.filter(candidate => {
    if (candidate.isArchived) return false;
    
    // Status Filter
    if (statusFilter === 'processed' && !candidate.notes && !candidate.isShortlisted) return false;
    if (statusFilter === 'shortlisted' && !candidate.isShortlisted) return false;
    if (statusFilter === 'follow_up' && !candidate.followUpDate) return false;

    // Domain Focus Filter
    if (selectedDomains.length > 0) {
      const candDomain = getNormalizedDomain(candidate);
      const isMatched = selectedDomains.some(d => d.value === candDomain);
      if (!isMatched) return false;
    }

    if (!searchQuery.trim()) return true;
    const terms = searchQuery.toLowerCase().split(/\s+/);
    const loc = `${candidate.locationInfo?.city || ''} ${candidate.locationInfo?.state || ''} ${candidate.locationInfo?.country || ''} ${candidate.locationInfo?.postalCode || ''}`.toLowerCase();
    const searchableText = `${candidate.fullName} ${candidate.domainFocus || ''} ${candidate.domain || ''} ${loc} ${candidate.summary} ${candidate.skills?.join(' ')} ${candidate.notes || ''} ${JSON.stringify(candidate.experience)} ${teamMembers[candidate.uploadedBy] || ''} ${teamMembers[candidate.followUpUpdatedBy] || ''}`.toLowerCase();
    return terms.every(term => searchableText.includes(term));
  });

  // Apply Candidate Sorting (Support sorting by domain, etc.)
  filteredCandidates = [...filteredCandidates].sort((a: any, b: any) => {
    let factor = sortDirection === 'asc' ? 1 : -1;
    if (sortField === 'domainFocus') {
      const domA = getNormalizedDomain(a);
      const domB = getNormalizedDomain(b);
      return domA.localeCompare(domB) * factor;
    }
    if (sortField === 'fullName') {
      const nameA = (a.fullName || '').toLowerCase();
      const nameB = (b.fullName || '').toLowerCase();
      return nameA.localeCompare(nameB) * factor;
    }
    // Default to 'createdAt'
    const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
    const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
    return (dateA - dateB) * factor;
  });

  const activeCandidates = candidates.filter(c => !c.isArchived);
  const domainOptionsWithCount = useMemo(() => {
    const counts: Record<string, number> = {};
    activeCandidates.forEach(c => {
      const norm = getNormalizedDomain(c);
      counts[norm] = (counts[norm] || 0) + 1;
    });

    return DOMAIN_OPTIONS.map(opt => ({
      value: opt.value,
      label: `${opt.label} (${counts[opt.value] || 0})`
    }));
  }, [activeCandidates]);

  const trashedCandidates = candidates.filter(c => c.isArchived);
  const trashedUsers = fullTeamList.filter(u => u.isArchived);

  return (
    <div {...getRootProps({ onClick: e => e.stopPropagation() })} className="flex h-screen w-full bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans overflow-hidden transition-colors duration-300">
      <input {...getInputProps()} />
      {isDragActive && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-indigo-500/20 backdrop-blur-sm pointer-events-none">
          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-8 py-4 rounded-2xl shadow-2xl">
            Drop resumes to parse
          </div>
        </div>
      )}
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-md z-30 lg:hidden transition-all duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        id="sidebar-nav"
        className={`bg-[var(--sidebar-bg)] border-r border-[var(--border-color)] flex flex-col transition-all duration-300 fixed inset-y-0 left-0 z-40 lg:static lg:translate-x-0 ${isSidebarCollapsed ? 'lg:w-20 w-68' : 'w-68'} ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}
        style={{ boxShadow: 'var(--sidebar-shadow)' }}
      >
        <div className={`px-5 py-6 flex items-center justify-between border-b border-[var(--border-color)]/70 ${isSidebarCollapsed ? 'lg:justify-center lg:px-3' : ''}`}>
          <div className="flex items-center gap-3">
            {!isSidebarCollapsed ? (
              <div className="flex items-center gap-2">
                <img 
                  src={theme === 'dark' ? "https://aurrum.co/wp-content/uploads/2026/05/Rectech-white-logo.svg" : "https://aurrum.co/wp-content/uploads/2026/05/Rectech-Logo.svg"} 
                  alt="Rectech Logo" 
                  className="h-7 w-auto object-contain transition-all duration-300 hover:opacity-90"
                />
                <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider font-mono">
                  SaaS
                </span>
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-base shadow-lg shadow-indigo-500/10">
                R
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {!isSidebarCollapsed && <ThemeToggle />}
            <button className="lg:hidden p-2 hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl transition-colors" onClick={() => setIsSidebarOpen(false)}>
              <X size={18} />
            </button>
            <button 
              className="hidden lg:block p-1.5 hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl transition-all hover:scale-105" 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronRight className={`w-4 h-4 transform transition-transform duration-300 ${isSidebarCollapsed ? '' : 'rotate-180'}`} />
            </button>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-7 overflow-y-auto custom-scrollbar">
          {/* Workspace Group */}
          <div>
            {!isSidebarCollapsed && (
              <p className="px-3 text-[10px] font-black uppercase text-[var(--text-muted)] tracking-[0.2em] mb-3">Workspace</p>
            )}
            <div className="space-y-1">
              {[
                { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
                ...(role === 'client' || role === 'admin' || role === 'developer' ? [{ id: 'pipeline', label: 'Pipeline', icon: Layers }] : []),
                { id: 'candidates', label: 'Candidates', icon: Users },
                ...(role !== 'client' ? [{ id: 'upload', label: 'CV Parsing', icon: Upload }] : []),
                { id: 'shortlist', label: 'Shortlist', icon: Star },
                { id: 'analytics', label: 'Talent Insights', icon: AnalyticsIcon },
                { id: 'repository', label: 'CV Repository', icon: FileText },
                ...(role === 'developer' || role === 'admin' || role === 'team_leader' ? [{ id: 'invoices', label: 'Invoices', icon: Receipt }] : []),
              ].map((item) => (
                <button 
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => { setActiveTab(item.id as any); setIsSidebarOpen(false); setSelectedIds(new Set()); }}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'lg:justify-center px-3' : 'px-3.5'} py-2.5 rounded-xl text-xs font-bold transition-all duration-200 group relative ${
                    activeTab === item.id 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10 dark:shadow-none' 
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] hover:translate-x-0.5'
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${isSidebarCollapsed ? 'lg:mr-0' : 'mr-3'} shrink-0 transition-colors ${activeTab === item.id ? 'text-white' : 'text-[var(--text-muted)] group-hover:text-indigo-500'}`} />
                  {(!isSidebarCollapsed || (isSidebarCollapsed && window.innerWidth < 1024)) && <span className="tracking-tight">{item.label}</span>}
                  
                  {activeTab === item.id && isSidebarCollapsed && (
                    <span className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-r-md" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Administration Group */}
          {((role === 'admin' || role === 'team_leader' || role === 'developer') || isPrivileged) && (
            <div>
              {!isSidebarCollapsed && (
                <p className="px-3 text-[10px] font-black uppercase text-[var(--text-muted)] tracking-[0.2em] mb-3">Management</p>
              )}
              <div className="space-y-1">
                {[
                  ...((role === 'admin' || role === 'team_leader' || role === 'developer') ? [{ id: 'users', label: 'Team Hub', icon: Users }] : []),
                  ...((role === 'developer') ? [{ id: 'backup', label: 'Backup & Export', icon: Download }] : []),
                  ...((role === 'developer') ? [{ id: 'database', label: 'Database Details', icon: Database }] : []),
                  ...(isPrivileged ? [{ id: 'trash', label: 'Archive Trash', icon: Trash2 }] : []),
                ].map((item) => (
                  <button 
                    key={item.id}
                    id={`nav-${item.id}`}
                    onClick={() => { setActiveTab(item.id as any); setIsSidebarOpen(false); setSelectedIds(new Set()); }}
                    title={isSidebarCollapsed ? item.label : undefined}
                    className={`w-full flex items-center ${isSidebarCollapsed ? 'lg:justify-center px-3' : 'px-3.5'} py-2.5 rounded-xl text-xs font-bold transition-all duration-200 group relative ${
                      activeTab === item.id 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10 dark:shadow-none' 
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] hover:translate-x-0.5'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${isSidebarCollapsed ? 'lg:mr-0' : 'mr-3'} shrink-0 transition-colors ${activeTab === item.id ? 'text-white' : 'text-[var(--text-muted)] group-hover:text-indigo-500'}`} />
                    {(!isSidebarCollapsed || (isSidebarCollapsed && window.innerWidth < 1024)) && <span className="tracking-tight">{item.label}</span>}
                    
                    {activeTab === item.id && isSidebarCollapsed && (
                      <span className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-r-md" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preferences Group */}
          <div>
            {!isSidebarCollapsed && (
              <p className="px-3 text-[10px] font-black uppercase text-[var(--text-muted)] tracking-[0.2em] mb-3">Preferences</p>
            )}
            <div className="space-y-1">
              {[
                { id: 'profile', label: 'My Profile', icon: UserCircle },
                { id: 'settings', label: 'System Settings', icon: Settings },
              ].map((item) => (
                <button 
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => { setActiveTab(item.id as any); setIsSidebarOpen(false); setSelectedIds(new Set()); }}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'lg:justify-center px-3' : 'px-3.5'} py-2.5 rounded-xl text-xs font-bold transition-all duration-200 group relative ${
                    activeTab === item.id 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10 dark:shadow-none' 
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] hover:translate-x-0.5'
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${isSidebarCollapsed ? 'lg:mr-0' : 'mr-3'} shrink-0 transition-colors ${activeTab === item.id ? 'text-white' : 'text-[var(--text-muted)] group-hover:text-indigo-500'}`} />
                  {(!isSidebarCollapsed || (isSidebarCollapsed && window.innerWidth < 1024)) && <span className="tracking-tight">{item.label}</span>}
                  
                  {activeTab === item.id && isSidebarCollapsed && (
                    <span className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-r-md" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* User Account Bento Panel */}
        <div className={`p-4 border-t border-[var(--border-color)]/70 ${isSidebarCollapsed ? 'lg:flex lg:flex-col lg:items-center' : ''}`}>
          <div className={`flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl group transition-all duration-300 border border-[var(--border-color)]/75 hover:border-indigo-500/25 ${isSidebarCollapsed ? 'lg:justify-center lg:p-1.5 lg:border-none lg:bg-transparent lg:shadow-none' : 'shadow-sm'}`}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white font-extrabold text-xs uppercase shadow-md relative shrink-0">
              {user?.displayName?.slice(0, 2) || user?.email?.slice(0, 2)}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[var(--sidebar-bg)] rounded-full shadow-sm animate-pulse" />
            </div>
            {!isSidebarCollapsed && (
              <div className="overflow-hidden flex-1">
                <p className="text-xs font-bold text-[var(--text-primary)] truncate">{user?.displayName || user?.email?.split('@')[0]}</p>
                <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest font-black mt-0.5">{role || 'Recruiter'}</p>
              </div>
            )}
            {!isSidebarCollapsed ? (
              <button 
                onClick={handleLogout} 
                className="text-[var(--text-muted)] hover:text-rose-500 transition-all p-2 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl" 
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            ) : (
              <button onClick={handleLogout} className="hidden" />
            )}
          </div>
          {isSidebarCollapsed && (
            <div className="hidden lg:flex lg:flex-col lg:items-center lg:gap-3.5 lg:mt-4">
              <ThemeToggle />
              <button 
                onClick={handleLogout} 
                className="text-[var(--text-muted)] hover:text-rose-500 transition-all p-2 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl border border-[var(--border-color)] hover:border-rose-500/20 hover:scale-105" 
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
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
                {Object.entries(parsingStatus).map(([filename, statusInfo]) => (
                    <div key={filename} className="text-[10px] flex justify-between">
                        <span className="truncate max-w-[150px]">{filename}</span>
                        <span className={statusInfo.status === 'finished' ? 'text-emerald-400' : 'text-indigo-400'}>{statusInfo.status} {statusInfo.progress}%</span>
                    </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {duplicateNotification.isOpen && (
            <div className="fixed bottom-4 left-0 right-0 flex justify-center z-50 animate-in slide-in-from-bottom-4">
                <div className="bg-amber-600 text-white px-6 py-3 rounded-[2rem] shadow-2xl flex items-center gap-3 border border-amber-500/20">
                    <AlertCircle size={18} />
                    <span className="text-sm font-bold">{duplicateNotification.message}</span>
                    <button 
                      onClick={() => setDuplicateNotification({ isOpen: false, message: '' })}
                      className="p-1 hover:bg-amber-700/50 rounded-full transition-all text-white/80 hover:text-white"
                      title="Dismiss"
                    >
                      <X size={14} className="stroke-[3px]" />
                    </button>
                </div>
            </div>
        )}

        <header className="h-16 bg-[var(--card-bg)] border-b border-[var(--border-color)] px-4 md:px-8 flex items-center justify-between shadow-sm z-20 shrink-0 transition-colors duration-300">
          <div className="flex items-center gap-3 text-xs font-bold text-[var(--text-muted)] font-sans uppercase tracking-[0.2em]">
            <button 
              className="lg:hidden p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] rounded-xl transition-all" 
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span 
              className="hidden md:block cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-extrabold" 
              onClick={() => setActiveTab('candidates')}
            >
              AURRUM CRM
            </span>
            <ChevronRight className="hidden md:block w-3 h-3 text-[var(--text-muted)] opacity-60" />
            <span className="text-[var(--text-primary)] italic font-serif normal-case text-base tracking-tight font-black">
              {activeTab === 'candidates' 
                ? 'Candidates Index' 
                : activeTab === 'activity_logs' 
                ? 'Activity Streams' 
                : activeTab === 'analytics' 
                ? 'Talent Insights' 
                : activeTab === 'trash' 
                ? 'Archive & Trash' 
                : activeTab === 'users' 
                ? 'Team Directory' 
                : activeTab === 'repository' 
                ? 'CV Repository' 
                : activeTab === 'upload' 
                ? 'CV Parsing Engine' 
                : activeTab === 'invoices'
                ? 'Generated Invoices'
                : 'Dashboard Hub'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {/* Quick search input indicator */}
            <div 
              onClick={() => {
                setActiveTab('candidates');
                setTimeout(() => {
                  const searchEl = document.getElementById('search-input');
                  if (searchEl) searchEl.focus();
                }, 150);
              }}
              className="hidden md:flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-[var(--border-color)] px-3.5 py-1.5 rounded-xl text-[10px] font-black text-[var(--text-muted)] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all uppercase tracking-wider shadow-inner"
              title="Press ⌘K to search anywhere"
            >
              <Search size={12} className="text-indigo-500" />
              <span>Search index...</span>
              <kbd className="bg-[var(--card-bg)] border border-[var(--border-color)] px-1.5 py-0.5 rounded text-[9px] font-mono shadow-sm normal-case">⌘K</kbd>
            </div>

            {/* Timezone Indicator */}
            <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-900 px-3.5 py-1.5 rounded-xl border border-[var(--border-color)]">
              <Clock size={12} className="text-indigo-500 shrink-0" />
              <span>{timezone}</span>
            </div>

            {Object.keys(parsingStatus).length > 0 && (
              <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border border-indigo-100/10">
                <Loader2 size={13} className="animate-spin" />
                Processing ({Object.keys(parsingStatus).length})
              </div>
            )}
            <NotificationBadge onClick={() => setShowNotifications(!showNotifications)} />
            
            {showNotifications && (
              <div 
                ref={notificationRef}
                className="absolute right-8 top-16 w-80 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-xl z-50 p-5 max-h-[60vh] overflow-y-auto animate-in fade-in slide-in-from-top-3 duration-250"
              >
                <div className="flex items-center justify-between mb-4 border-b border-[var(--border-color)]/60 pb-2">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-primary)]">Notifications</h3>
                  <button 
                    onClick={() => markAllAsRead()}
                    className="text-[9px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest"
                  >
                    Mark all read
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] font-bold py-4 text-center">No new notifications</p>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((n: any) => (
                      <div 
                        key={n.id} 
                        onClick={() => !n.read && markAsRead(n.id)}
                        className={`text-xs p-3 rounded-xl transition-all cursor-pointer ${n.read ? 'text-[var(--text-secondary)] opacity-60 hover:opacity-100' : 'text-[var(--text-primary)] bg-indigo-50/50 dark:bg-indigo-950/20 border-l-2 border-indigo-500'} flex flex-col gap-1`}
                      >
                        <p className="font-bold">{n.text}</p>
                        <span className="text-[10px] text-[var(--text-muted)]">{formatDate(n.createdAt?.toDate())}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {uploadStatus === 'success' && (
              <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-black uppercase tracking-wider animate-in fade-in zoom-in-95">
                <CheckCircle2 size={14} />
                Sourced
              </div>
            )}
            {uploadStatus === 'duplicate' && (
              <div className="flex items-center gap-1.5 text-amber-600 text-[10px] font-black uppercase tracking-wider animate-in fade-in zoom-in-95 bg-amber-50 dark:bg-amber-950/20 px-3 py-1 rounded-full border border-amber-100/20">
                <AlertCircle size={14} />
                Duplicate
              </div>
            )}
            {uploadStatus === 'duplicateInTrash' && (
              <div className="flex items-center gap-1.5 text-amber-600 text-[10px] font-black uppercase tracking-wider animate-in fade-in zoom-in-95 bg-amber-50 dark:bg-amber-950/20 px-3 py-1 rounded-full border border-amber-100/20">
                <AlertCircle size={14} />
                Trashed Duplicate
              </div>
            )}
            {uploadStatus === 'error' && (
              <div className="flex items-center gap-1.5 text-rose-600 text-[10px] font-black uppercase tracking-wider animate-in fade-in zoom-in-95">
                <AlertCircle size={14} />
                Failed
              </div>
            )}
            
            
            <button 
              onClick={open}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-md shadow-indigo-600/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Upload className="w-3.5 h-3.5 mr-2" />
              Upload CVs
            </button>
          </div>
        </header>

        {Object.keys(parsingStatus).length > 0 && <ProcessingWidget jobs={processingJobs} />}

        <div className="p-8 flex-1 overflow-y-auto">
          {quotaExceeded ? (
            <div className="h-full flex items-center justify-center p-4">
              <QuotaNotice onRetry={() => window.location.reload()} />
            </div>
          ) : activeTab === 'backup' ? (
             <BackupDashboard />
          ) : activeTab === 'database' ? (
             <DatabaseDetails />
          ) : activeTab === 'invoices' ? (
             <InvoiceList />
          ) : activeTab === 'home' ? (
            <div className="flex flex-col gap-6">
              <DashboardHome candidates={activeCandidates} activityLogs={activityLogs} teamMembers={teamMembers} fullTeamList={fullTeamList} />
            </div>
          ) : activeTab === 'repository' ? (
            <CVRepository candidates={activeCandidates} onSelect={setSelectedCandidate} />
          ) : activeTab === 'upload' ? (
            <BulkUpload onUpload={onDrop} isProcessing={isProcessing} />
          ) : activeTab === 'pipeline' ? (
            <RecruitmentPipeline candidates={activeCandidates} onSelect={setSelectedCandidate} role={role} teamMembers={teamMembers} fullTeamList={fullTeamList} />
          ) : activeTab === 'candidates' ? (
            <div className="flex flex-col gap-6 sm:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Candidates Header banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2.5">
                    {['A', 'B', 'C'].map((char, i) => {
                      const colors = ['bg-blue-4564', 'bg-gold-a98b', 'bg-blue-3649'];
                      return (
                        <div key={i} className={`w-9 h-9 rounded-full border-2 border-[var(--card-bg)] ${colors[i]} flex items-center justify-center text-[10px] font-bold text-white shadow-sm`}>
                          {char}
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-[var(--text-primary)]">Candidate Operations</h2>
                    <p className="text-[var(--text-muted)] text-[9px] uppercase font-black tracking-[0.15em] mt-0.5">Unified Sourcing & Intelligence Matrix</p>
                  </div>
                </div>
                {role === 'recruiter' && (
                  <div className="flex p-1 bg-[var(--sidebar-bg)] rounded-2xl transition-colors duration-300 border border-[var(--border-color)] overflow-x-auto whitespace-nowrap shadow-sm">
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
                      className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 flex items-center gap-1.5"
                    >
                      <Download size={13} />
                      Export CSV
                    </button>
                    <button 
                      onClick={() => setViewScope('mine')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${viewScope === 'mine' ? 'bg-[var(--card-bg)] text-indigo-600 dark:text-indigo-400 shadow-sm border border-[var(--border-color)]/70' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                    >
                      My Candidates
                    </button>
                    <button 
                      onClick={() => setViewScope('all')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${viewScope === 'all' ? 'bg-[var(--card-bg)] text-indigo-600 dark:text-indigo-400 shadow-sm border border-[var(--border-color)]/70' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                    >
                      All Activity
                    </button>
                  </div>
                )}
              </div>
              
              {/* Premium KPI Stats Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { id: 'all', count: activeCandidates.length, label: 'Total Index', color: 'text-indigo-600 dark:text-indigo-400', icon: FileText, bg: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-indigo-100/30 dark:border-indigo-900/10', activeBorder: 'border-indigo-500 ring-2 ring-indigo-500/10' },
                  { id: 'processed', count: activeCandidates.filter(c => c.notes || c.isShortlisted).length, label: 'Processed', color: 'text-violet-600 dark:text-violet-400', icon: Target, bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-100/30 dark:border-violet-900/10', activeBorder: 'border-violet-500 ring-2 ring-violet-500/10' },
                  { id: 'shortlisted', count: activeCandidates.filter(c => c.isShortlisted).length, label: 'Shortlisted', color: 'text-emerald-600 dark:text-emerald-400', icon: Star, bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-100/30 dark:border-emerald-900/10', activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/10' },
                  { id: 'follow_up', count: activeCandidates.filter(c => c.followUpDate).length, label: 'Reminders', color: 'text-amber-600 dark:text-amber-400', icon: Clock, bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-100/30 dark:border-amber-900/10', activeBorder: 'border-amber-500 ring-2 ring-amber-500/10' },
                ].map((stat) => (
                  <button 
                    key={stat.id}
                    onClick={() => setStatusFilter(stat.id as any)}
                    className={`bg-[var(--card-bg)] p-5 rounded-[2rem] border text-left shadow-sm flex items-center gap-4 transition-all duration-300 w-full hover:scale-[1.01] active:scale-[0.99] ${
                      statusFilter === stat.id 
                        ? `${stat.activeBorder} bg-slate-50/20` 
                        : 'border-[var(--border-color)] hover:border-indigo-400/45'
                    }`}
                  >
                    <div className={`w-11 h-11 ${stat.bg} ${stat.border} rounded-2xl flex items-center justify-center ${stat.color} shrink-0`}>
                      <stat.icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] text-[var(--text-muted)] uppercase font-black tracking-widest mb-0.5 truncate">{stat.label}</p>
                      <h3 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">{stat.count}</h3>
                    </div>
                    {statusFilter === stat.id && (
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {/* Boolean Search Engine Cockpit & Controls */}
              <div className="bg-[var(--card-bg)] p-6 sm:p-8 rounded-[2rem] border border-[var(--border-color)] shadow-sm flex flex-col gap-6 card-hover-effect">
                <div className="flex flex-col gap-2.5">
                  <label className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
                    <span className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500">
                      <Search size={12} />
                    </span>
                    Boolean Search Expression Engine
                  </label>
                  <div className="flex gap-2 items-center bg-slate-50 dark:bg-slate-900/60 border border-[var(--border-color)] rounded-2xl px-4 py-3 ring-2 ring-transparent focus-within:ring-indigo-500/10 focus-within:border-indigo-500/50 transition-all duration-300">
                    <input 
                      id="search-input"
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g. React AND Node NOT Java"
                      className="flex-1 bg-transparent border-none focus:outline-none text-sm font-mono placeholder:font-sans text-[var(--text-primary)]"
                    />
                    <div className="h-6 w-px bg-[var(--border-color)] mx-2" />
                    <button className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 px-4 py-2 rounded-xl transition-all uppercase tracking-widest">Execute</button>
                  </div>
                </div>

                {/* Direct Filters pills */}
                <div className="flex flex-wrap items-center gap-2 pb-1.5 border-b border-[var(--border-color)]/60">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mr-2">Status Focus:</span>
                  {[
                    { id: 'all', label: `All (${activeCandidates.length})` },
                    { id: 'processed', label: `Processed (${activeCandidates.filter(c => c.notes || c.isShortlisted).length})`, icon: Target, color: 'text-violet-500' },
                    { id: 'shortlisted', label: `Shortlisted (${activeCandidates.filter(c => c.isShortlisted).length})`, icon: Star, color: 'text-emerald-500' },
                    { id: 'follow_up', label: `Follow Up (${activeCandidates.filter(c => c.followUpDate).length})`, icon: Clock, color: 'text-amber-500' }
                  ].map((btn) => (
                    <button 
                      key={btn.id}
                      onClick={() => setStatusFilter(btn.id as any)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        statusFilter === btn.id 
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                          : 'bg-slate-50 dark:bg-slate-900 border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      {btn.icon && <btn.icon size={12} className={statusFilter === btn.id ? 'text-white' : btn.color} />}
                      {btn.label}
                    </button>
                  ))}
                </div>

                {/* Domain Focus selector */}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1.5">
                      Filter by Domain Focus
                    </label>
                    <button
                      onClick={() => {
                        setIsMultiDomain(!isMultiDomain);
                        setSelectedDomains([]);
                      }}
                      className="px-3 py-1 bg-slate-100 dark:bg-slate-900 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-xl text-[10px] font-black uppercase tracking-wider hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer"
                    >
                      {isMultiDomain ? 'Single-select mode' : 'Multi-select mode'}
                    </button>
                  </div>
                  <div>
                    <Select 
                      options={domainOptionsWithCount}
                      value={isMultiDomain 
                        ? selectedDomains.map(sd => domainOptionsWithCount.find(o => o.value === sd.value) || sd)
                        : (domainOptionsWithCount.find(o => o.value === selectedDomains[0]?.value) || null)
                      }
                      onChange={(selected) => {
                        if (!selected) {
                          setSelectedDomains([]);
                        } else if (Array.isArray(selected)) {
                          setSelectedDomains(selected.map((s: any) => ({ value: s.value, label: DOMAIN_OPTIONS.find(o => o.value === s.value)?.label || s.value })));
                        } else {
                          const singleVal = selected as any;
                          setSelectedDomains([{ value: singleVal.value, label: DOMAIN_OPTIONS.find(o => o.value === singleVal.value)?.label || singleVal.value }]);
                        }
                      }}
                      isMulti={isMultiDomain}
                      placeholder="Select domain profiles..."
                      styles={{
                        control: (provided: any) => ({
                          ...provided,
                          backgroundColor: 'var(--card-bg)',
                          borderColor: 'var(--border-color)',
                          borderRadius: '1rem',
                          padding: '0.2rem',
                          boxShadow: 'none',
                          cursor: 'pointer',
                          minHeight: '44px',
                          '&:hover': {
                            borderColor: 'var(--brand-color)',
                          },
                        }),
                        option: (provided: any, state: any) => ({
                          ...provided,
                          backgroundColor: state.isSelected ? 'var(--brand-color)' : state.isFocused ? 'var(--bg-secondary)' : 'var(--card-bg)',
                          color: state.isSelected ? 'white' : 'var(--text-primary)',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }),
                        menu: (provided: any) => ({ ...provided, backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', borderRadius: '1rem', overflow: 'hidden', zIndex: 10 }),
                        input: (provided: any) => ({ ...provided, color: 'var(--text-primary)' }),
                        placeholder: (provided: any) => ({ ...provided, color: 'var(--text-muted)', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }),
                        singleValue: (provided: any) => ({ ...provided, color: 'var(--text-primary)', fontSize: '12px', fontWeight: 'bold' }),
                        multiValue: (provided: any) => ({
                          ...provided,
                          backgroundColor: 'var(--bg-secondary)',
                          borderRadius: '0.5rem',
                          border: '1px solid var(--border-color)',
                        }),
                        multiValueLabel: (provided: any) => ({
                          ...provided,
                          color: 'var(--text-primary)',
                          fontSize: '11px',
                          fontWeight: '700',
                        }),
                        multiValueRemove: (provided: any) => ({
                          ...provided,
                          color: 'var(--text-muted)',
                          ':hover': {
                            backgroundColor: 'var(--bg-primary)',
                            color: '#EF4444',
                          },
                        }),
                      }}
                      isSearchable
                    />
                  </div>

                  {selectedDomains.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1.5 animate-in fade-in duration-200">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)] mr-1.5">Active profiles:</span>
                      {selectedDomains.map((dom) => (
                        <span
                          key={dom.value}
                          className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100/40 dark:border-indigo-900/40 text-[10px] font-black rounded-xl flex items-center gap-1.5 shadow-sm"
                        >
                          {dom.label}
                          <button
                            onClick={() => setSelectedDomains(selectedDomains.filter(d => d.value !== dom.value))}
                            className="text-indigo-400 hover:text-red-500 font-extrabold focus:outline-none"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <button
                        onClick={() => setSelectedDomains([])}
                        className="text-[10px] font-black text-rose-500 hover:underline cursor-pointer ml-1.5 uppercase tracking-wider"
                      >
                        Clear Profiles
                      </button>
                    </div>
                  )}
                </div>

                {isPrivileged && selectedIds.size > 0 && (
                  <div className="flex items-center justify-between px-5 py-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-rose-100 dark:bg-rose-950/40 rounded-xl flex items-center justify-center text-rose-600 shadow-sm border border-rose-200/20">
                        <Trash2 size={16} />
                      </div>
                      <p className="text-xs font-black text-rose-800 dark:text-rose-450 uppercase tracking-wider">
                        {selectedIds.size} Candidates selected for deletion
                      </p>
                    </div>
                    <button 
                      onClick={handleBulkDelete}
                      className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-xl text-xs font-black shadow-lg shadow-rose-200 dark:shadow-none transition-all active:scale-95 flex items-center gap-1.5 uppercase tracking-wider"
                    >
                      Purge Selected
                    </button>
                  </div>
                )}

                {/* Candidates Table Grid wrapper */}
                <div className="overflow-hidden border border-[var(--border-color)]/70 rounded-2xl transition-colors duration-300 bg-[var(--card-bg)] overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] uppercase font-black text-[var(--text-muted)] border-b border-[var(--border-color)] tracking-wider">
                      <tr>
                        {isPrivileged && (
                          <th className="px-6 py-4.5 w-10">
                            <input 
                              type="checkbox" 
                              checked={filteredCandidates.length > 0 && selectedIds.size === filteredCandidates.length}
                              onChange={() => toggleSelectAll(filteredCandidates)}
                              className="w-4.5 h-4.5 rounded-md border-[var(--border-color)] text-indigo-600 focus:ring-indigo-500 cursor-pointer bg-[var(--card-bg)]"
                            />
                          </th>
                        )}
                        <th 
                          className="px-6 py-4.5 cursor-pointer select-none hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          onClick={() => {
                            if (sortField === 'fullName') {
                              setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                            } else {
                              setSortField('fullName');
                              setSortDirection('asc');
                            }
                          }}
                        >
                          <div className="flex items-center gap-1">
                            Candidate Identity
                            {sortField === 'fullName' && (sortDirection === 'asc' ? ' ▲' : ' ▼')}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-4.5 cursor-pointer select-none hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          onClick={() => {
                            if (sortField === 'domainFocus') {
                              setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                            } else {
                              setSortField('domainFocus');
                              setSortDirection('asc');
                            }
                          }}
                        >
                          <div className="flex items-center gap-1">
                            Domain Focus
                            {sortField === 'domainFocus' && (sortDirection === 'asc' ? ' ▲' : ' ▼')}
                          </div>
                        </th>
                        <th className="px-6 py-4.5">Core Competencies</th>
                        <th className="px-6 py-4.5">Parser Agent</th>
                        <th className="px-6 py-4.5">Reminders</th>
                        <th className="px-6 py-4.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-[var(--text-secondary)] divide-y divide-[var(--border-color)]/70 transition-colors duration-300">
                      {filteredCandidates.slice((searchPage - 1) * searchRowsPerPage, searchPage * searchRowsPerPage).map((candidate) => {
                        const isFollowUpDue = candidate.followUpDate && new Date(candidate.followUpDate).toISOString().split('T')[0] <= new Date().toISOString().split('T')[0];
                        
                        // Beautiful dynamic color initials gradient
                        const getAvatarGradient = (name: string) => {
                          const gradients = [
                            'from-blue-5472 to-blue-4564',
                            'from-gold-bc9b to-gold-a98b',
                            'from-blue-3e51 to-gold-bc9b',
                            'from-blue-2d38 to-blue-3e51',
                            'from-gold-a98b to-blue-4564',
                            'from-gold-9b7e to-gold-a081'
                          ];
                          let sum = 0;
                          const cleanName = name || 'Anonymous';
                          for (let i = 0; i < cleanName.length; i++) {
                            sum += cleanName.charCodeAt(i);
                          }
                          return gradients[sum % gradients.length];
                        };

                        const getInitials = (name: string) => {
                          const cleanName = name || '??';
                          return cleanName.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
                        };

                        return (
                          <tr 
                            key={candidate.id} 
                            className={`hover:bg-slate-50/45 dark:hover:bg-slate-900/30 group transition-all duration-250 cursor-pointer ${selectedIds.has(candidate.id) ? 'bg-gold-bc9b/10 dark:bg-gold-a98b/10' : ''}`} 
                            onClick={() => setSelectedCandidate(candidate)}
                          >
                            {isPrivileged && (
                              <td className="px-6 py-4.5" onClick={(e) => e.stopPropagation()}>
                                <input 
                                  type="checkbox" 
                                  checked={selectedIds.has(candidate.id)}
                                  onChange={(e) => toggleSelect(e as any, candidate.id)}
                                  className="w-4.5 h-4.5 rounded-md border-[var(--border-color)] text-gold-a98b focus:ring-gold-a98b cursor-pointer bg-[var(--card-bg)]"
                                />
                              </td>
                            )}
                            <td className="px-6 py-4.5">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${getAvatarGradient(candidate.fullName)} flex items-center justify-center text-white font-extrabold text-[11px] shadow-sm shrink-0`}>
                                  {getInitials(candidate.fullName)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <div className="font-extrabold text-[var(--text-primary)] group-hover:text-gold-a98b dark:group-hover:text-gold-bc9b transition-colors tracking-tight truncate max-w-[170px]">{candidate.fullName}</div>
                                    {candidate.isShortlisted && <Star size={11} className="text-amber-500 fill-amber-500 shrink-0" />}
                                    {candidate.notes && <StickyNote size={11} className="text-gold-bc9b shrink-0" />}
                                    {(candidate.followUpDate && !candidate.notes) && <Clock size={11} className="text-pink-400 shrink-0" />}
                                    {candidate.assignedTo && (
                                      <span className="text-[8px] text-gold-a98b font-extrabold bg-gold-bc9b/10 px-1.5 py-0.5 rounded uppercase tracking-wider border border-gold-bc9b/20">Assigned</span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-[var(--text-muted)] font-semibold truncate max-w-[190px]">
                                    {candidate.email || 'No contact mail'}
                                  </div>
                                  {candidate.locationInfo && (candidate.locationInfo.city || candidate.locationInfo.state || candidate.locationInfo.country || candidate.locationInfo.postalCode) && (
                                    <div className="flex items-center gap-1 mt-1 text-[9px] text-gold-a98b dark:text-gold-bc9b font-black uppercase tracking-widest">
                                      <MapPin size={10} className="shrink-0" />
                                      <span>
                                        {candidate.locationInfo.city || ''}
                                        {candidate.locationInfo.state ? `${candidate.locationInfo.city ? ', ' : ''}${candidate.locationInfo.state}` : ''}
                                        {candidate.locationInfo.country ? ` (${candidate.locationInfo.country})` : ''}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4.5">
                              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50/60 dark:bg-indigo-950/40 px-2.5 py-1.5 rounded-xl border border-indigo-100/10">
                                {getNormalizedDomain(candidate)}
                              </span>
                            </td>
                            <td className="px-6 py-4.5">
                              <div className="flex gap-1 flex-wrap max-w-[220px]">
                                {candidate.skills?.slice(0, 3).map((skill: string) => (
                                  <span key={skill} className="bg-slate-50 dark:bg-slate-900 border border-[var(--border-color)] text-[var(--text-secondary)] px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider shadow-inner transition-all group-hover:border-indigo-100 dark:group-hover:border-indigo-900/30">
                                    {skill}
                                  </span>
                                ))}
                                {candidate.skills?.length > 3 && (
                                  <span className="text-[9px] text-[var(--text-muted)] font-black px-1.5 self-center bg-slate-100 dark:bg-slate-900 rounded-md py-0.5">
                                    +{candidate.skills.length - 3}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4.5">
                              <div className="flex items-center gap-2">
                                <div className="w-6.5 h-6.5 rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-[8px] font-black text-slate-500 uppercase border border-[var(--border-color)]">
                                  {getInitials(teamMembers[candidate.uploadedBy] || 'AI')}
                                </div>
                                <span className="text-[10px] font-bold text-[var(--text-secondary)] truncate max-w-[100px]">
                                  {candidate.uploadedBy === user?.uid ? '(me)' : (teamMembers[candidate.uploadedBy] || 'System Index')}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4.5">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedCandidate(candidate); }}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-wider ${isFollowUpDue ? 'bg-rose-500 text-white animate-blink-red' : candidate.followUpDate ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-100/10' : 'bg-slate-50 text-slate-400 dark:bg-slate-900/40'}`}
                              >
                                <Clock size={11} />
                                {candidate.followUpDate ? formatDate(candidate.followUpDate) : 'Schedule'}
                              </button>
                            </td>
                            <td className="px-6 py-4.5 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                              {isPrivileged && (
                                <button 
                                  onClick={(e) => handleArchiveCandidate(e, candidate.id)}
                                  className="p-2 text-[var(--text-muted)] hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                  title="Archive Profile"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                              <button 
                                onClick={() => setSelectedCandidate(candidate)}
                                className="px-3.5 py-1.5 text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/80 rounded-xl uppercase tracking-widest transition-all"
                              >
                                Profile
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredCandidates.length === 0 && (
                        <tr>
                          <td colSpan={isPrivileged ? 7 : 6} className="px-6 py-24 text-center text-[var(--text-muted)] font-bold italic">
                            <Users size={36} className="mx-auto mb-3 opacity-20" />
                            No candidates match your Boolean or Domain filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Pagination bar */}
                <div className="p-4 sm:p-5 border-t border-[var(--border-color)]/75 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold text-[var(--text-secondary)]">
                  <div>
                    Showing <span className="font-mono text-indigo-600 dark:text-indigo-400">{Math.min((searchPage - 1) * searchRowsPerPage + 1, filteredCandidates.length)}</span>–<span className="font-mono text-indigo-600 dark:text-indigo-400">{Math.min(searchPage * searchRowsPerPage, filteredCandidates.length)}</span> of <span className="font-mono text-indigo-600 dark:text-indigo-400">{filteredCandidates.length}</span> records
                  </div>
                  <div className="flex flex-wrap items-center gap-3.5">
                    <select 
                      value={searchRowsPerPage} 
                      onChange={(e) => { setSearchRowsPerPage(Number(e.target.value)); setSearchPage(1); }} 
                      className="px-2.5 py-1.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-[var(--border-color)] text-xs font-bold focus:outline-none cursor-pointer"
                    >
                      {[20, 50, 100, 200].map(v => <option key={v} value={v}>{v} rows</option>)}
                    </select>
                    <div className="flex gap-1.5">
                      <button className="px-3 py-1.5 border border-[var(--border-color)] rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-[var(--bg-secondary)] disabled:opacity-50 text-[10px] uppercase font-black tracking-wider transition-all" onClick={() => setSearchPage(1)} disabled={searchPage === 1}>First</button>
                      <button className="px-3 py-1.5 border border-[var(--border-color)] rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-[var(--bg-secondary)] disabled:opacity-50 text-[10px] uppercase font-black tracking-wider transition-all" onClick={() => setSearchPage(p => Math.max(1, p - 1))} disabled={searchPage === 1}>Previous</button>
                      <button className="px-3 py-1.5 border border-[var(--border-color)] rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-[var(--bg-secondary)] disabled:opacity-50 text-[10px] uppercase font-black tracking-wider transition-all" onClick={() => setSearchPage(p => p + 1)} disabled={searchPage * searchRowsPerPage >= filteredCandidates.length}>Next</button>
                    </div>
                  </div>
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
              onCompleteFollowUp={handleCompleteFollowUp}
              onUpdateNotes={handleUpdateNotes} 
              onUpdateAssignee={handleUpdateAssignee}
              onContact={() => {}}
              teamMembers={teamMembers}
              role={role}
              fullTeamList={fullTeamList}
            />
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
               <SystemSettings />
            </div>
          ) : activeTab === 'users' ? (
            <UserManagement />
          ) : (
            <DashboardHome candidates={activeCandidates} activityLogs={activityLogs} teamMembers={teamMembers} fullTeamList={fullTeamList} />
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
        onContact={() => {}}
        teamMembers={teamMembers}
        fullTeamList={fullTeamList}
        onUpdateClient={handleUpdateClient}
        onUpdateStage={handleUpdateStage}
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

      {duplicateResolution?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[1100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] max-w-lg w-full rounded-[2rem] p-6 sm:p-8 shadow-2xl relative flex flex-col gap-6 animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-serif text-[var(--text-primary)]">Duplicate Detected</h3>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-amber-600 dark:text-amber-400">Manage existing candidate profile conflict</p>
                </div>
              </div>
              <button 
                onClick={() => setDuplicateResolution(null)} 
                className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Candidate Details */}
            <div className="bg-slate-50 dark:bg-slate-950/50 p-5 rounded-2xl border border-[var(--border-color)]/70 flex flex-col gap-3 text-xs font-bold text-[var(--text-secondary)]">
              <div className="flex justify-between border-b border-[var(--border-color)]/50 pb-2">
                <span className="text-[var(--text-muted)] uppercase tracking-wider text-[9px]">Candidate Identity:</span>
                <span className="text-[var(--text-primary)] text-right truncate max-w-[200px]">{duplicateResolution.candidate.fullName}</span>
              </div>
              <div className="flex justify-between border-b border-[var(--border-color)]/50 pb-2">
                <span className="text-[var(--text-muted)] uppercase tracking-wider text-[9px]">Email address:</span>
                <span className="text-[var(--text-primary)] text-right truncate max-w-[200px]">{duplicateResolution.candidate.email}</span>
              </div>
              <div className="flex justify-between border-b border-[var(--border-color)]/50 pb-2">
                <span className="text-[var(--text-muted)] uppercase tracking-wider text-[9px]">Current Pipeline Stage:</span>
                <span className="text-indigo-600 dark:text-indigo-400 capitalize">{(duplicateResolution.candidate.pipelineStage || 'cv_upload').replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between border-b border-[var(--border-color)]/50 pb-2">
                <span className="text-[var(--text-muted)] uppercase tracking-wider text-[9px]">Currently Assigned To:</span>
                <span className="text-[var(--text-primary)]">{teamMembers[duplicateResolution.candidate.assignedTo || duplicateResolution.candidate.uploadedBy] || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)] uppercase tracking-wider text-[9px]">Last Record Update:</span>
                <span className="text-[var(--text-primary)] font-mono">{formatUKDate(duplicateResolution.candidate.updatedAt || duplicateResolution.candidate.createdAt)}</span>
              </div>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed font-bold">
              This candidate is already registered in the system. Please select an action to resolve this conflict:
            </p>

            {/* Actions Grid */}
            <div className="grid grid-cols-2 gap-3">
              {duplicateResolution.candidate.isArchived ? (
                <button 
                  onClick={handleResolveRestore}
                  className="col-span-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/10"
                >
                  <RotateCcw size={14} /> Restore & View Candidate
                </button>
              ) : (
                <button 
                  onClick={handleResolveView}
                  className="col-span-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10"
                >
                  View Profile Details
                </button>
              )}

              <button 
                onClick={handleResolveOverwrite}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-[var(--text-primary)] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 border border-[var(--border-color)]"
                title="Overwrite the existing resume data and file with the new one"
              >
                Overwrite Profile
              </button>

              {isPrivileged && (
                <button 
                  onClick={handleResolveDelete}
                  className="py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 border border-rose-200/50 dark:border-rose-950"
                  title="Permanently remove candidate from Firebase database"
                >
                  Delete Permanently
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


