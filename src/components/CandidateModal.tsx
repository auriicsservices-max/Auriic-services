import React, { useState, useEffect } from 'react';
import { X, Download, Star, StarOff, Briefcase, GraduationCap, Mail, Phone, Code, Globe, Clock, Save, Calendar, Loader2, StickyNote, Users, Search, MessageSquare, ChevronDown, Linkedin, Github, Twitter, ExternalLink } from 'lucide-react';
import LZString from 'lz-string';

// Helper to get icon for link
const getLinkIcon = (label: string) => {
  const l = label.toLowerCase();
  if (l.includes('linkedin')) return <Linkedin size={16} />;
  if (l.includes('github')) return <Github size={16} />;
  if (l.includes('twitter')) return <Twitter size={16} />;
  if (l.includes('portfolio') || l.includes('website')) return <Globe size={16} />;
  if (l.includes('project')) return <Briefcase size={16} />;
  if (l.includes('cv') || l.includes('resume')) return <Download size={16} />;
  return <ExternalLink size={16} />;
};
import { formatUKDate } from '../lib/dateUtils';
import { useAuth } from '../contexts/AuthContext';
import { useTimezone } from '../contexts/TimezoneContext';
import { logActivity } from '../lib/logger';
import { createNotification, formatNotificationMessage } from '../services/notificationService';
import ConfirmModal from './ConfirmModal';
import { fetchCvList } from '../services/cvApiService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface CandidateModalProps {
  candidate: any;
  isOpen: boolean;
  onClose: () => void;
  onShortlist: (id: string, currentStatus: boolean) => void;
  onUpdateFollowUp: (id: string, note: string, date: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdateAssignee: (id: string, userId: string) => void;
  onContact: (userId: string) => void;
  teamMembers: Record<string, string>;
}

export default function CandidateModal({ candidate, isOpen, onClose, onShortlist, onUpdateFollowUp, onUpdateNotes, onUpdateAssignee, onContact, teamMembers }: CandidateModalProps) {
  const { user, role, isPrivileged } = useAuth();
  const { formatDate } = useTimezone();
  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isSavingAssignee, setIsSavingAssignee] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const renderHighlightedText = (text: string) => {
    if (!searchTerm.trim()) return text;
    const terms = searchTerm.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    if (terms.length === 0) return text;

    // Create a regex that matches any of the terms
    const escapedTerms = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
    
    const parts = text.split(regex);
    
    return (
      <>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <mark key={i} className="bg-yellow-200 dark:bg-yellow-800/50 text-slate-900 dark:text-yellow-100 rounded-sm px-0.5">
              {part}
            </mark>
          ) : part
        )}
      </>
    );
  };

  const matchesAll = () => {
    if (!searchTerm.trim()) return true;
    const terms = searchTerm.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    const searchableText = `${candidate.fullName} ${candidate.domain} ${candidate.summary} ${candidate.skills?.join(' ')} ${candidate.notes || ''} ${JSON.stringify(candidate.experience)}`.toLowerCase();
    return terms.every(term => searchableText.includes(term));
  };

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

  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [isFetchingCV, setIsFetchingCV] = useState<boolean>(false);
  const [skills, setSkills] = useState<string[]>([]);

  const fetchCVUrl = async () => {
      if (!candidate?.cid && !candidate?.email) return;
      setIsFetchingCV(true);
      try {
          const cvList = await fetchCvList();
          // Try to match by ID (CID) first for best precision
          let matchedCV = cvList.find((item: any) => 
            String(item.id) === String(candidate.cid)
          );
          
          // Fallback to email matching ONLY if ID match fails
          if (!matchedCV && candidate.email) {
            matchedCV = cvList.find((item: any) => 
              item.email?.toLowerCase() === candidate.email?.toLowerCase()
            );
          }

          if (matchedCV) {
              setCvUrl(matchedCV.url);
          }
      } catch (err) {
          console.warn('[CandidateModal] CV sync fetch failed:', (err as Error).message);
      } finally {
          setIsFetchingCV(false);
      }
  };

  useEffect(() => {
    if (candidate) {
      setFollowUpNote(candidate.followUpNote || '');
      setFollowUpDate(candidate.followUpDate || '');
      setGeneralNotes(candidate.notes || '');
      setAssignedTo(candidate.assignedTo || '');
      setSkills(candidate.skills || []);
      setSearchTerm(''); // Clear search on candidate change
      
      // Initialize cvUrl with candidate.url (the most specific link)
      // and only fall back to other links if it's missing
      let initialCvUrl = candidate.url;
      
      if (!initialCvUrl && candidate.links) {
        const cvLink = candidate.links.find((l: any) => 
          l.label?.toLowerCase().includes('cv') || 
          l.label?.toLowerCase().includes('resume') ||
          l.url?.toLowerCase().endsWith('.pdf')
        );
        if (cvLink) {
          initialCvUrl = cvLink.url;
        }
      }
      
      setCvUrl(initialCvUrl || null);
      
      // Always try to fetch from API if we have a CID to ensure we have the most up-to-date link
      if (candidate.cid) {
          fetchCVUrl();
      }
    }
  }, [candidate]);

  if (!isOpen || !candidate) return null;

  const handleDownload = async () => {
    // Detect original extension from URL or stored filename
    const originalName = candidate.originalFileName || 'Resume';
    const finalUrl = cvUrl || candidate.url;
    const extension = (finalUrl || originalName || 'file.pdf').split('?')[0].split('.').pop()?.toLowerCase() || 'pdf';
    const fileName = `${candidate.fullName?.replace(/\s+/g, '_') || 'Candidate'}_CV.${extension}`;

    // Priority 1: Base64 (Most reliable, no CORS issues)
    if (candidate.cvBase64) {
      try {
        const link = document.createElement('a');
        link.href = candidate.cvBase64;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      } catch (err) {
        console.error('Base64 download failed:', err);
      }
    }

    // Priority 2: URL
    if (finalUrl) {
      try {
        const link = document.createElement('a');
        link.href = finalUrl;
        link.setAttribute('download', fileName);
        link.setAttribute('target', '_blank'); // Ensures it doesn't navigate current page
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        window.open(finalUrl, '_blank');
      }
    } else if (candidate.compressedText) {
      const text = LZString.decompressFromUTF16(candidate.compressedText);
      const blob = new Blob([text || ''], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${candidate.fullName?.replace(/\s+/g, '_') || 'Candidate'}_Resume.txt`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } else {
      showAlert('Download Unavailable', "No valid CV link, Base64, or text found for this candidate.");
    }
  };

  const handleView = () => {
    // If we have base64, we can open it in a new window/tab
    if (candidate.cvBase64) {
        const win = window.open();
        if (win) {
            win.document.write(`<iframe src="${candidate.cvBase64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
            return;
        }
    }

    const finalUrl = cvUrl || candidate.url;
    if (finalUrl) {
      window.open(finalUrl, '_blank');
    } else if (candidate.compressedText) {
      const text = LZString.decompressFromUTF16(candidate.compressedText);
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };

  const handleShortlistClick = async () => {
    if (!isPrivileged && role !== 'recruiter') return;
    const newStatus = !candidate.isShortlisted;
    await onShortlist(candidate.id, candidate.isShortlisted);
    await logActivity('Shortlist Toggle', { candidateId: candidate.id, status: newStatus }, user!.uid, role);
    
    if (newStatus) {
      showAlert('Shortlisted!', `Excellent choice! ${candidate.fullName} has been added to your shortlist.`);
    } else {
      showAlert('Removed', `${candidate.fullName} has been removed from your shortlist.`);
    }
  };

  const handleSaveFollowUp = async () => {
    if (!followUpDate) {
      showAlert('Required Date', 'Please select a date for the follow-up reminder.');
      return;
    }
    setIsSaving(true);
    await onUpdateFollowUp(candidate.id, followUpNote, followUpDate);
    await logActivity('Follow-up Update', { candidateId: candidate.id }, user!.uid, role!);
    setIsSaving(false);
    showAlert('Success', 'Follow-up updated successfully.');
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    await onUpdateNotes(candidate.id, generalNotes);
    await logActivity('Notes Update', { candidateId: candidate.id }, user!.uid, role!);
    setIsSavingNotes(false);
    showAlert('Success', 'Notes updated successfully.');
  };

  const handleUpdateAssignee = async () => {
    setIsSavingAssignee(true);
    
    // Play sound immediately on user interaction
    const audio = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_3230617233.mp3?filename=message-124468.mp3');
    audio.play().catch(e => console.warn('Audio failed to play (expected if interaction lost):', e));

    try {
      const isRemoval = assignedTo === ''; // Check if it's a removal
      
      await onUpdateAssignee(candidate.id, assignedTo);
      
      const activityAction = isRemoval ? 'Assignment Removed' : 'Assignee Updated'; // Log message
      await logActivity(activityAction, { candidateId: candidate.id, userId: assignedTo }, user!.uid, role!);
      
      // Show desktop notification if enabled
      if (Notification.permission === 'granted') {
          const title = isRemoval ? 'Assignment Removed' : 'Candidate Assigned';
          const body = isRemoval 
              ? `Assignment removed for ${candidate.fullName}.`
              : `Successfully assigned ${candidate.fullName} to ${teamMembers[assignedTo] || 'Recruiter'}.`;
              
          new Notification(title, {
              body,
              icon: 'https://aurrum.co/wp-content/uploads/2026/05/Rectech-Logo.svg'
          });
      }
      
      showAlert('Success', isRemoval ? 'Assignment removed successfully.' : 'Candidate assigned successfully.');
    } catch (err) {
      console.error(err);
      showAlert('Error', 'Failed to update assignment.');
    } finally {
      setIsSavingAssignee(false);
    }
  };

  const handleRemoveSkill = async (skillToRemove: string) => {
    const updatedSkills = skills.filter(s => s !== skillToRemove);
    setSkills(updatedSkills);
    try {
      const { updateDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      await updateDoc(doc(db, 'candidates', candidate.id), { skills: updatedSkills });
      await logActivity('Skill Removed', { candidateId: candidate.id, skill: skillToRemove }, user!.uid, role!);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2.5rem] shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 transition-colors duration-300">
        {/* Header */}
        <header className="p-8 border-b border-[var(--border-color)] flex flex-col gap-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-indigo-100 dark:shadow-none uppercase">
                {(candidate.fullName || '??').slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-serif text-[var(--text-primary)]">{candidate.fullName || 'Unnamed Candidate'}</h2>
                  <button 
                    onClick={handleShortlistClick}
                    disabled={!isPrivileged && role !== 'recruiter'}
                    className={`p-1.5 rounded-full transition-colors ${!isPrivileged && role !== 'recruiter' ? 'opacity-50 cursor-not-allowed' : ''} ${candidate.isShortlisted ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-300 dark:text-slate-700 hover:text-slate-400 dark:hover:text-slate-500'}`}
                  >
                    {candidate.isShortlisted ? <Star fill="currentColor" size={20} /> : <StarOff size={20} />}
                  </button>
                </div>
                <p className="text-indigo-600 dark:text-indigo-400 font-bold text-sm uppercase tracking-widest mt-1">
                  {candidate.domain || 'Uncategorized Domain'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {(role === 'admin' || candidate.uploadedBy === user?.uid) && (cvUrl || candidate.url || candidate.compressedText || candidate.cid) && (
                <button 
                  onClick={handleView}
                  disabled={isFetchingCV}
                  className={`px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all border border-indigo-100 dark:border-indigo-800 ${isFetchingCV ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {isFetchingCV ? <Loader2 size={18} className="animate-spin" /> : <Globe size={18} />}
                  {isFetchingCV ? 'Syncing...' : 'View CV'}
                </button>
              )}
              {(role === 'admin' || candidate.uploadedBy === user?.uid) && (cvUrl || candidate.url || candidate.compressedText || candidate.cid) && (
                <button 
                  onClick={handleDownload}
                  disabled={isFetchingCV}
                  className={`px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 ${isFetchingCV ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {isFetchingCV ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  {isFetchingCV ? 'Syncing...' : 'Download CV'}
                </button>
              )}
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-2xl px-4 py-2 flex items-center gap-3 ring-2 ring-transparent focus-within:ring-indigo-500/10 focus-within:border-indigo-500/50 transition-all">
            <Search size={14} className="text-indigo-600" />
            <input 
              type="text" 
              placeholder="Boolean Search within candidate record..."
              className="flex-1 bg-transparent border-none focus:outline-none text-xs font-mono placeholder:font-sans text-[var(--text-primary)]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded ${matchesAll() ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'}`}>
                    {matchesAll() ? 'Full Boolean Match' : 'Partial/No Match'}
                </span>
                <button onClick={() => setSearchTerm('')} className="text-[var(--text-muted)] hover:text-indigo-600 transition-colors">
                    <X size={14} />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Banner for Large Files */}
        {candidate.isLargeFile && !(cvUrl || candidate.url) && (
          <div className="mx-8 mt-4 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl flex items-center gap-3">
            <span className="flex-shrink-0 w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Loader2 className="animate-spin" size={16} />
            </span>
            <p className="text-[10px] text-amber-800 dark:text-amber-200 font-medium leading-relaxed">
              <strong>Large File:</strong> Extracting full PDF URL. If it doesn't appear, you can use the text version below.
            </p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="md:col-span-2 space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                  <Globe size={12} /> Professional Summary
                </h3>
                {(cvUrl || candidate.url || candidate.compressedText) && (
                  <button 
                    onClick={handleView}
                    className="text-[9px] font-bold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 uppercase tracking-widest"
                  >
                    View Original CV
                  </button>
                )}
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed text-sm italic border-l-2 border-indigo-100 dark:border-indigo-900/50 pl-4">
                "{renderHighlightedText(candidate.summary || 'No summary extracted.')}"
              </p>
            </section>

            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
                <Briefcase size={12} /> Work Experience
              </h3>
              <div className="space-y-6">
                {candidate.experience?.map((exp: any, i: number) => (
                  <div key={i} className="relative pl-6 border-l border-[var(--border-color)] transition-colors duration-300">
                    <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-[var(--bg-primary)]" />
                    <h4 className="font-bold text-[var(--text-primary)] text-sm">{renderHighlightedText(exp.role)}</h4>
                    <p className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold">{renderHighlightedText(exp.company)} • {renderHighlightedText(exp.duration)}</p>
                    <p className="text-[var(--text-secondary)] text-xs mt-2 leading-relaxed">{renderHighlightedText(exp.description)}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
                <GraduationCap size={12} /> Education
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {candidate.education?.map((edu: any, i: number) => (
                  <div key={i} className="p-4 bg-[var(--sidebar-bg)] rounded-2xl border border-[var(--border-color)] transition-colors duration-300">
                    <h4 className="font-bold text-[var(--text-primary)] text-xs">{edu.degree}</h4>
                    <p className="text-[var(--text-secondary)] text-[10px] font-medium">{edu.school}</p>
                    <p className="text-indigo-500 dark:text-indigo-400 text-[10px] font-black mt-1">{edu.year}</p>
                  </div>
                ))}
              </div>
            </section>

            {candidate.projects?.length > 0 && (
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
                  <Star size={12} className="text-indigo-500" /> Key Projects
                </h3>
                <div className="space-y-4">
                  {candidate.projects.map((project: any, i: number) => (
                    <div key={i} className="p-4 bg-indigo-50/20 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-[var(--text-primary)] text-xs">{project.title}</h4>
                        {project.link && (
                          <a href={project.link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-500 hover:underline">
                            View Project
                          </a>
                        )}
                      </div>
                      <p className="text-[var(--text-secondary)] text-[11px] leading-relaxed italic">
                        {project.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {candidate.certifications?.length > 0 && (
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
                  <Star size={12} className="text-amber-500" /> Certifications & Licenses
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {candidate.certifications.map((cert: string, i: number) => (
                    <div key={i} className="p-3 bg-amber-50/30 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50 rounded-xl text-[11px] font-medium text-amber-900 dark:text-amber-200">
                      {cert}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {candidate.achievements?.length > 0 && (
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
                  <Globe size={12} className="text-emerald-500" /> Key Achievements
                </h3>
                <ul className="space-y-2">
                  {candidate.achievements.map((ach: string, i: number) => (
                    <li key={i} className="text-xs text-[var(--text-secondary)] flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      {ach}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Sidebar Column */}
          <div className="space-y-8">
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
                <Code size={12} /> Skills & Core Competencies
              </h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {skills.map((skill: string) => (
                  <span key={skill} className="group px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all">
                    {skill}
                    {(isPrivileged || role === 'recruiter') && (
                      <button 
                        onClick={() => handleRemoveSkill(skill)}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
                <Mail size={12} /> Contact Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl transition-colors duration-300">
                  <Mail className="text-indigo-500 dark:text-indigo-400" size={16} />
                  <p className="text-xs font-medium text-[var(--text-secondary)] truncate">{candidate.email}</p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl transition-colors duration-300">
                  <Phone className="text-indigo-500 dark:text-indigo-400" size={16} />
                  <p className="text-xs font-medium text-[var(--text-secondary)]">{candidate.phone || 'N/A'}</p>
                </div>
                {/* Secondary verification of CV presence */}
                {(cvUrl || candidate.url || candidate.cid) && (
                  <div className={`flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl transition-all ${isFetchingCV ? 'opacity-70' : ''}`}>
                    {isFetchingCV ? <Loader2 className="animate-spin text-emerald-600" size={16} /> : <Download className="text-emerald-600 dark:text-emerald-400" size={16} />}
                    <button 
                      onClick={handleDownload}
                      disabled={isFetchingCV}
                      className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline text-left truncate"
                    >
                      {isFetchingCV ? 'Finding latest Rectech CV...' : 'Download Original Attachment'}
                    </button>
                  </div>
                )}
                {candidate.links?.map((link: any, i: number) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl transition-all hover:border-indigo-200">
                        <div className="text-indigo-500 dark:text-indigo-400">
                            {getLinkIcon(link.label || 'Link')}
                        </div>
                        <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 truncate">{link.label || 'Link'}</p>
                    </a>
                ))}
              </div>
            </section>

            <section className="bg-[var(--sidebar-bg)] p-6 rounded-3xl border border-[var(--border-color)] transition-colors duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                  <StickyNote size={12} /> Internal Notes
                </h3>
                {candidate.notesUpdatedBy && (
                  <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter shrink-0">
                    Last: {teamMembers?.[candidate.notesUpdatedBy] || 'Team'}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <textarea 
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Record interview feedback, behavioral observations, or potential team fit..."
                  className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-4 text-xs h-32 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
                <button 
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSavingNotes ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} 
                  Save Strategy Notes
                </button>
              </div>
            </section>

            <section className="bg-[var(--sidebar-bg)] p-6 rounded-3xl transition-colors duration-300 border border-[var(--border-color)]">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4">Metadata</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] items-center">
                  <span className="text-[var(--text-muted)]">Indexed on</span>
                  <span className="font-mono text-[var(--text-secondary)]">{formatDate(candidate.createdAt)}</span>
                </div>
                {candidate.uploadedBy && candidate.uploadedBy !== user?.uid && (
                  <div className="flex justify-between text-[10px] items-center">
                    <span className="text-[var(--text-muted)]">Uploaded by</span>
                    <button 
                      onClick={() => onContact(candidate.uploadedBy)}
                      className="flex items-center gap-1.5 text-indigo-500 hover:text-indigo-600 font-bold group"
                    >
                      {teamMembers?.[candidate.uploadedBy] || 'AI'}
                      <MessageSquare size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </div>
                )}
                {candidate.assignedTo && (
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[var(--text-muted)]">
                      {isPrivileged ? 'Assigned to' : 'Assigned by'}
                    </span>
                    <span className="font-bold text-indigo-400">
                      {isPrivileged 
                        ? `${teamMembers?.[candidate.assignedTo] || 'Recruiter'} (recruiter)` 
                        : `${teamMembers?.[candidate.assignedBy] || 'Privileged User'} (privileged)`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-[10px]">
                  <span className="text-[var(--text-muted)]">Shortlisted</span>
                  <span className={candidate.isShortlisted ? 'text-amber-400' : 'text-[var(--text-muted)]'}>
                    {candidate.isShortlisted ? 'YES' : 'NO'}
                  </span>
                </div>
              </div>
            </section>

            {isPrivileged && (
            <section className="bg-[var(--sidebar-bg)] p-6 rounded-3xl border border-[var(--border-color)] transition-colors duration-300">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
                <Users size={12} /> Assign to Recruiter
              </h3>
              <div className="space-y-3">
                <div className="relative">
                  <select 
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl pl-4 pr-10 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-[var(--text-primary)] appearance-none cursor-pointer hover:border-indigo-400 transition-colors"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers && Object.entries(teamMembers).map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-2.5 text-[var(--text-muted)] pointer-events-none" />
                </div>
                <button 
                  onClick={handleUpdateAssignee}
                  disabled={isSavingAssignee}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSavingAssignee ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} 
                  Update Assignment
                </button>
              </div>
            </section>
            )}

            <section className="bg-indigo-50 dark:bg-indigo-950 p-6 rounded-3xl text-slate-900 dark:text-indigo-100 border border-indigo-100 dark:border-indigo-900">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                  <Clock size={12} /> Follow-up Reminder
                </h3>
                {candidate.followUpUpdatedBy && (
                  <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-tighter shrink-0">
                    By: {teamMembers?.[candidate.followUpUpdatedBy] || 'Team'}
                  </span>
                )}
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-indigo-800 dark:text-indigo-200 ml-1 tracking-wider">Next Follow-up Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-indigo-600 dark:text-indigo-400" size={14} />
                    <input 
                      type="date" 
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full bg-white dark:bg-indigo-900 border border-indigo-200 dark:border-indigo-700 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-indigo-800 dark:text-indigo-200 ml-1 tracking-wider">Follow-up Note</label>
                  <textarea 
                    value={followUpNote}
                    onChange={(e) => setFollowUpNote(e.target.value)}
                    placeholder="Candidate mentioned expected notice..."
                    className="w-full bg-white dark:bg-indigo-900 border border-indigo-200 dark:border-indigo-700 rounded-xl px-4 py-2 text-xs h-24 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-indigo-400/50 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <button 
                  onClick={handleSaveFollowUp}
                  disabled={isSaving}
                  className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} 
                  Update Reminder
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

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
