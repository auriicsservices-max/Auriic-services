import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth, db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, orderBy, updateDoc, doc, deleteDoc, where, getDocs } from 'firebase/firestore';
import { useDropzone } from 'react-dropzone';
import { parseResume } from '../lib/gemini';
import UserManagement from '../components/UserManagement';
import CandidateModal from '../components/CandidateModal';
import Analytics from '../components/Analytics';
import ThemeToggle from '../components/ThemeToggle';
import UserProfile from '../components/UserProfile';
import Shortlist from '../components/Shortlist';
import LogReview from '../components/LogReview';
import ConfirmModal from '../components/ConfirmModal';
import LZString from 'lz-string';
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
  X
} from 'lucide-react';

export default function Dashboard() {
  const { user, role } = useAuth();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<Record<string, string>>({});
  const [fullTeamList, setFullTeamList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ total: 0, processed: 0, failed: 0 });
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error' | 'duplicate' | 'duplicateInTrash'>('idle');
  const [activeTab, setActiveTab] = useState<'candidates' | 'users' | 'analytics' | 'trash' | 'shortlist' | 'profile' | 'logs'>('candidates');
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

  useEffect(() => {
    if (uploadStatus !== 'idle') {
      const timer = setTimeout(() => setUploadStatus('idle'), 4000);
      return () => clearTimeout(timer);
    }
  }, [uploadStatus]);

  useEffect(() => {
    const q = query(collection(db, 'candidates'), orderBy('createdAt', 'desc'));
    const unsubCandidates = onSnapshot(q, (snapshot) => {
      const allCandidates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      if (role === 'admin') {
        setCandidates(allCandidates);
      } else {
        setCandidates(allCandidates.filter(c => c.uploadedBy === user?.uid));
      }
    });

    const unsubLogs = onSnapshot(query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc')), (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      if (role === 'admin') {
        setActivityLogs(logs);
      } else {
        setActivityLogs(logs.filter(log => log.userId === user?.uid));
      }
    });

    // Fetch team members for uploader mapping (admin only)
    let unsubTeam = () => {};
    if (role === 'admin') {
      unsubTeam = onSnapshot(collection(db, 'users'), (snapshot) => {
        const mapping: Record<string, string> = {};
        const list: any[] = [];
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          mapping[doc.id] = data.name || data.email;
          list.push({ id: doc.id, ...data });
        });
        setTeamMembers(mapping);
        setFullTeamList(list);
      });
    }

    return () => {
      unsubCandidates();
      unsubLogs();
      unsubTeam();
    };
  }, [role]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsProcessing(true);
    setUploadStatus('idle');
    setUploadProgress({ total: acceptedFiles.length, processed: 0, failed: 0 });
    
    for (const file of acceptedFiles) {
      try {
        let parsed;
        let fileBase64 = null;
        
        // Convert to base64 for multimodal parsing or storage
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // Only the data part
          };
          reader.readAsDataURL(file);
        });

        // Use ArrayBuffer directly for PDFs/DOCX/Images for better stability
        if (file.type === 'application/pdf' || 
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.type === 'application/msword' ||
            file.type.startsWith('image/')) {
          const buffer = await file.arrayBuffer();
          parsed = await parseResume({
            mimeType: file.type,
            data: buffer
          });
        } else {
          const text = await file.text();
          parsed = await parseResume(text);
        }
        
        // No more rate limit delay needed for local parsing
        
        // Global Duplicate check based on candidate email (across all recruiters)
        const emailQuery = query(collection(db, 'candidates'), where('email', '==', parsed.email?.toLowerCase() || ''));
        const querySnapshot = await getDocs(emailQuery);
        const isDuplicate = !querySnapshot.empty;
        
        if (isDuplicate) {
          const duplicateDoc = querySnapshot.docs[0].data();
          const uploaderId = duplicateDoc.uploadedBy;
          const isArchived = duplicateDoc.isArchived;
          
          if (isArchived) {
            setUploadStatus('duplicateInTrash');
          } else if (uploaderId === user?.uid) {
            setUploadStatus('duplicate');
          } else {
            // Found duplicate from another recruiter
            showAlert('Duplicate Found', `This candidate (${parsed.fullName}) has already been uploaded by another team member. Duplicate check passed.`);
            setUploadStatus('duplicate');
          }
          setUploadProgress(prev => ({ ...prev, processed: prev.processed + 1, failed: prev.failed + 1 }));
          continue;
        }

        // Firestore 1MB limit check: LZString + Base64
        // We budget 800KB for the WHOLE document to be safe.
        let isLargeFile = false;
        if (file.size < 800 * 1024) { 
           const fullBase64 = `data:${file.type};base64,${base64}`;
           // Use compressToUTF16 as it's efficient for Firestore storage
           fileBase64 = LZString.compressToUTF16(fullBase64);
        } else {
          isLargeFile = true;
        }
        
        await addDoc(collection(db, 'candidates'), {
          ...parsed,
          email: parsed.email?.toLowerCase(),
          fullName: parsed.fullName || file.name.split('.')[0] || 'Unknown Candidate',
          fileName: file.name,
          fileType: file.type,
          fileData: fileBase64,
          isCompressed: !!fileBase64,
          rawText: file.type.startsWith('text/') ? (await file.text()).slice(0, 5000) : `Extracted data from ${file.name}`,
          isLargeFile,
          isShortlisted: false,
          isArchived: false,
          uploadedBy: user?.uid,
          createdAt: new Date().toISOString()
        });
        setUploadStatus('success');
        setUploadProgress(prev => ({ ...prev, processed: prev.processed + 1 }));
      } catch (err: any) {
        console.error(err);
        // Special handling for quota errors
        if (err.message?.includes('429') || err.message?.toLowerCase().includes('limit')) {
          showAlert('Rate Limit', "Rate limit reached. Please wait a minute before uploading more resumes.");
          break; // Stop processing further files
        }
        
        // Generic error handling for local parser
        showAlert('Parsing Error', `Unable to extract data from ${file.name}. Please try another file format or check the file content.`);
        
        setUploadStatus('error');
        setUploadProgress(prev => ({ ...prev, processed: prev.processed + 1, failed: prev.failed + 1 }));
      }
    }
    
    // Smooth reset
    setTimeout(() => {
      setIsProcessing(false);
      setUploadProgress({ total: 0, processed: 0, failed: 0 });
    }, 3000);
  }, [user, candidates]);

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
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-300">
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`w-64 bg-[#003e5af7] text-white flex flex-col transition-all duration-300 shadow-2xl fixed inset-y-0 left-0 z-40 lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
              <span className="text-indigo-900 font-bold text-lg">A</span>
            </div>
            <h1 className="font-bold text-xl tracking-tight text-white italic font-serif">Aurrum</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button className="lg:hidden p-2 text-white" onClick={() => setIsSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <button 
            onClick={() => { setActiveTab('candidates'); setIsSidebarOpen(false); setSelectedIds(new Set()); }}
            className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'candidates' 
                ? 'bg-white text-indigo-900 shadow-lg' 
                : 'text-indigo-100 hover:bg-white/10'
            }`}
          >
            <Users className="w-5 h-5 mr-3" />
            Candidates
          </button>
          
          <button 
            onClick={() => { setActiveTab('shortlist'); setIsSidebarOpen(false); setSelectedIds(new Set()); }}
            className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'shortlist' 
                ? 'bg-white text-indigo-900 shadow-lg' 
                : 'text-indigo-100 hover:bg-white/10'
            }`}
          >
            <Star className="w-5 h-5 mr-3" />
            Shortlist
          </button>
          
          <button 
            onClick={() => { setActiveTab('analytics'); setIsSidebarOpen(false); setSelectedIds(new Set()); }}
            className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'analytics' 
                ? 'bg-white text-indigo-900 shadow-lg' 
                : 'text-indigo-100 hover:bg-white/10'
            }`}
          >
            <AnalyticsIcon className="w-5 h-5 mr-3" />
            Talent Search
          </button>

          <button 
            onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); setSelectedIds(new Set()); }}
            className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'profile' 
                ? 'bg-white text-indigo-900 shadow-lg' 
                : 'text-indigo-100 hover:bg-white/10'
            }`}
          >
            <UserCircle className="w-5 h-5 mr-3" />
            My Profile
          </button>

          <button 
            onClick={() => { setActiveTab('logs'); setIsSidebarOpen(false); setSelectedIds(new Set()); }}
            className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'logs' 
                ? 'bg-white text-indigo-900 shadow-lg' 
                : 'text-indigo-100 hover:bg-white/10'
            }`}
          >
            <Activity className="w-5 h-5 mr-3" />
            Log Review
          </button>

          {role === 'admin' && (
            <button 
              onClick={() => { setActiveTab('trash'); setIsSidebarOpen(false); setSelectedIds(new Set()); }}
              className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'trash' 
                  ? 'bg-white text-red-700 shadow-lg' 
                  : 'text-indigo-100 hover:bg-white/10'
              }`}
            >
              <Trash2 className="w-5 h-5 mr-3" />
              Trash
            </button>
          )}

          <div className="h-px bg-white/10 my-4" />

          <div 
            {...getRootProps()} 
            className="flex items-center px-4 py-3 text-indigo-100 hover:bg-white/10 rounded-xl text-sm font-bold cursor-pointer transition-all"
          >
            <input {...getInputProps()} />
            <Upload className="w-5 h-5 mr-3" />
            Bulk Upload
          </div>

          {role === 'admin' && (
            <button 
              onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); setSelectedIds(new Set()); }}
              className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'users' 
                  ? 'bg-white text-indigo-900 shadow-lg' 
                  : 'text-indigo-100 hover:bg-white/10'
              }`}
            >
              <Shield className="w-5 h-5 mr-3" />
              Team Hub
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl group transition-all hover:bg-white/20">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-indigo-900 font-bold text-xs uppercase shadow-sm">
              {user?.displayName?.slice(0, 2) || user?.email?.slice(0, 2)}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold text-white truncate">{user?.email}</p>
              <p className="text-[10px] text-indigo-200 uppercase tracking-wider font-bold">{role || 'Recruiter'}</p>
            </div>
            <button onClick={handleLogout} className="text-white/60 hover:text-red-400 transition-colors">
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

        <header className="h-16 bg-white dark:bg-slate-950 border-b border-indigo-100 dark:border-slate-800 px-4 md:px-8 flex items-center justify-between shadow-sm z-10 shrink-0 transition-colors duration-300">
          <div className="flex items-center gap-4 text-xs font-bold text-slate-400 dark:text-slate-500 font-sans uppercase tracking-[0.2em]">
            <button className="lg:hidden p-2 text-slate-500" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <span className="hidden md:block cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" onClick={() => setActiveTab('candidates')}>Registry</span>
            <ChevronRight className="hidden md:block w-3 h-3" />
            <span className="text-slate-800 dark:text-slate-100 italic font-serif normal-case text-base tracking-normal">
              {activeTab === 'candidates' ? 'Candidate Registry' : activeTab === 'analytics' ? 'Talent Insights' : activeTab === 'trash' ? 'Archive' : activeTab === 'users' ? 'Team Hub' : 'Log Review'}
            </span>
          </div>
          <div className="flex items-center gap-4">
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
          {activeTab === 'candidates' ? (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Stats Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-indigo-50 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors duration-300">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-300">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest mb-0.5">Total Records</p>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{activeCandidates.length}</h3>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-indigo-50 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors duration-300">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/40 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-300">
                    <Star size={20} />
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest mb-0.5">Shortlisted</p>
                    <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">{activeCandidates.filter(c => c.isShortlisted).length}</h3>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-indigo-50 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors duration-300">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    activeCandidates.some(c => c.followUpDate && new Date(c.followUpDate).toISOString().split('T')[0] <= new Date().toISOString().split('T')[0]) 
                      ? 'bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-300 animate-pulse' 
                      : 'bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300'
                  }`}>
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest mb-0.5">Pending Follow-ups</p>
                    <h3 className={`text-2xl font-bold tracking-tight ${
                      activeCandidates.some(c => c.followUpDate && new Date(c.followUpDate).toISOString().split('T')[0] <= new Date().toISOString().split('T')[0])
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-800 dark:text-slate-100'
                    }`}>
                      {activeCandidates.filter(c => c.followUpDate).length}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Search Area */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4 transition-colors duration-300">
                <div className="flex flex-col gap-2 px-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Search size={12} /> Boolean Search Expression
                  </label>
                  <div className="flex gap-2 items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 ring-2 ring-transparent focus-within:ring-indigo-500/10 focus-within:border-indigo-500/50 transition-all">
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g. React AND Node NOT Java"
                      className="flex-1 bg-transparent border-none focus:outline-none text-sm font-mono placeholder:font-sans text-slate-800 dark:text-slate-100"
                    />
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2" />
                    <button className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 px-4 py-1.5 rounded-xl transition-all uppercase tracking-widest">Execute</button>
                  </div>
                </div>

                {role === 'admin' && selectedIds.size > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-2xl animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400 shadow-sm">
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
                <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded-2xl transition-colors duration-300">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        {role === 'admin' && (
                          <th className="px-6 py-4 w-10">
                            <input 
                              type="checkbox" 
                              checked={filteredCandidates.length > 0 && selectedIds.size === filteredCandidates.length}
                              onChange={() => toggleSelectAll(filteredCandidates)}
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
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
                    <tbody className="text-sm text-slate-600 dark:text-slate-400 divide-y divide-slate-100 dark:divide-slate-800 transition-colors duration-300">
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
                                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                              </td>
                            )}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{candidate.fullName}</div>
                                {candidate.isShortlisted && <Star size={12} className="text-amber-500 fill-amber-500" />}
                              </div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{candidate.email || 'No contact mail'}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">
                                {candidate.domain || 'Unsorted'}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-1.5 flex-wrap">
                                {candidate.skills?.slice(0, 3).map((skill: string) => (
                                  <span key={skill} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm transition-all group-hover:border-emerald-100 dark:group-hover:border-emerald-900 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                                    {skill}
                                  </span>
                                ))}
                                {candidate.skills?.length > 3 && (
                                  <span className="text-[9px] text-slate-300 dark:text-slate-600 font-bold px-2 self-center">
                                    +{candidate.skills.length - 3}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[8px] font-bold text-slate-400 dark:text-slate-500">
                                  {(teamMembers[candidate.uploadedBy] || 'AI').slice(0, 2).toUpperCase()}
                                </div>
                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                                  {teamMembers[candidate.uploadedBy] || 'System Index'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-3">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setSelectedCandidate(candidate); }}
                                  className={`p-1.5 rounded-lg transition-all relative ${isFollowUpDue ? 'animate-blink-red bg-red-50 dark:bg-red-900/20' : candidate.followUpDate ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800' : 'text-slate-300 dark:text-slate-700 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}
                                  title={candidate.followUpNote || 'Add Follow-up'}
                                >
                                  <Clock size={14} />
                                  {candidate.followUpUpdatedBy && (
                                    <div className="absolute -top-7 right-0 bg-slate-800 dark:bg-slate-700 text-white text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10 border border-slate-700 dark:border-slate-600">
                                      By: {teamMembers[candidate.followUpUpdatedBy] || 'System'}
                                    </div>
                                  )}
                                </button>
                                {role === 'admin' && (
                                  <button 
                                    onClick={(e) => handleArchiveCandidate(e, candidate.id)}
                                    className="p-1.5 text-slate-300 dark:text-slate-700 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
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
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredCandidates.length === 0 && (
                        <tr>
                          <td colSpan={role === 'admin' ? 6 : 5} className="px-6 py-20 text-center text-slate-300 dark:text-slate-700 font-medium italic transition-colors duration-300">
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
              teamMembers={teamMembers}
              role={role}
            />
          ) : activeTab === 'trash' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 pb-12">
              {/* Candidate Trash */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-6 transition-colors duration-300">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center text-red-600 dark:text-red-400">
                    <Trash2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif text-slate-800 dark:text-slate-100">Candidate Trash</h3>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500">Review or permanently remove soft-deleted candidates</p>
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

                <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded-2xl transition-colors duration-300">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        {role === 'admin' && (
                          <th className="px-6 py-4 w-10">
                            <input 
                              type="checkbox" 
                              checked={trashedCandidates.length > 0 && selectedIds.size === trashedCandidates.length}
                              onChange={() => toggleSelectAll(trashedCandidates)}
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </th>
                        )}
                        <th className="px-6 py-4">Candidate Identity</th>
                        <th className="px-6 py-4">Domain Focus</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-slate-600 dark:text-slate-400 divide-y divide-slate-100 dark:divide-slate-800">
                      {trashedCandidates.map((candidate) => (
                        <tr key={candidate.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800 transition-all ${selectedIds.has(candidate.id) ? 'bg-indigo-50/30 dark:bg-indigo-900/20' : ''}`}>
                          {role === 'admin' && (
                            <td className="px-6 py-4">
                              <input 
                                type="checkbox" 
                                checked={selectedIds.has(candidate.id)}
                                onChange={(e) => toggleSelect(e as any, candidate.id)}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                          )}
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">{candidate.fullName}</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{candidate.email || 'No contact mail'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
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
                                className="p-1.5 text-slate-300 dark:text-slate-700 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
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
                          <td colSpan={role === 'admin' ? 4 : 3} className="px-6 py-20 text-center text-slate-300 dark:text-slate-700 font-medium italic transition-colors duration-300">
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
                      <h3 className="text-xl font-serif text-slate-800 dark:text-slate-100">Team Member Trash</h3>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500">Revoke access permanently or restore teammates</p>
                    </div>
                  </div>

                  <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded-2xl transition-colors duration-300">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-6 py-4">Account Email</th>
                          <th className="px-6 py-4">System Role</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm text-slate-600 dark:text-slate-400 divide-y divide-slate-100 dark:divide-slate-800 transition-colors duration-300">
                        {trashedUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-800 dark:text-slate-200 tracking-tight">{u.email}</div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium italic">ID: {u.id.slice(0, 8)}...</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className={`text-[9px] font-black uppercase px-2 py-0.5 rounded inline-block ${u.role === 'admin' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
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
                                  className="p-1.5 text-slate-300 dark:text-slate-700 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
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


