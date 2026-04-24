import React, { useState, useEffect } from 'react';
import { X, Download, Star, StarOff, Briefcase, GraduationCap, Mail, Phone, Code, Globe, Clock, Save, Calendar, Loader2, StickyNote } from 'lucide-react';
import LZString from 'lz-string';
import { useAuth } from '../contexts/AuthContext';
import { logActivity } from '../lib/logger';
import ConfirmModal from './ConfirmModal';

interface CandidateModalProps {
  candidate: any;
  isOpen: boolean;
  onClose: () => void;
  onShortlist: (id: string, currentStatus: boolean) => void;
  onUpdateFollowUp: (id: string, note: string, date: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  teamMembers: Record<string, string>;
}

export default function CandidateModal({ candidate, isOpen, onClose, onShortlist, onUpdateFollowUp, onUpdateNotes, teamMembers }: CandidateModalProps) {
  const { user, role } = useAuth();
  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
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

  const fetchCVUrl = async () => {
      try {
          const response = await fetch('/api/cv/list', {
              headers: { 'x-api-key': 'AURRUM_SECRET_123' }
          });
          let data;
          try {
            data = await response.json();
          } catch (e) {
            console.error('Failed to parse list API response', e);
            throw new Error('Invalid JSON response from server');
          }
          if (data.status && data.data) {
              const matchedCV = data.data.find((item: any) => item.id == candidate.cid);
              if (matchedCV) {
                  setCvUrl(matchedCV.url);
              }
          }
      } catch (err) {
          console.error('Failed to fetch CV URL', err);
      }
  };

  useEffect(() => {
    if (candidate) {
      setFollowUpNote(candidate.followUpNote || '');
      setFollowUpDate(candidate.followUpDate || '');
      setGeneralNotes(candidate.notes || '');
      if (candidate.cid) {
          fetchCVUrl();
      }
    }
  }, [candidate]);

  if (!isOpen || !candidate) return null;

  const handleDownload = () => {
    if (cvUrl) {
      window.open(cvUrl, '_blank');
    } else {
      showAlert('Download Unavailable', "No CV URL found.");
    }
  };

  const handleView = () => {
    if (cvUrl) {
      window.open(cvUrl, '_blank');
    }
  };

  const handleShortlistClick = async () => {
    if (role !== 'admin' && role !== 'recruiter') return;
    await onShortlist(candidate.id, candidate.isShortlisted);
    await logActivity('Shortlist Toggle', { candidateId: candidate.id, status: !candidate.isShortlisted }, user!.uid, role);
  };

  const handleSaveFollowUp = async () => {
    setIsSaving(true);
    await onUpdateFollowUp(candidate.id, followUpNote, followUpDate);
    await logActivity('Follow-up Update', { candidateId: candidate.id }, user!.uid, role!);
    setIsSaving(false);
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    await onUpdateNotes(candidate.id, generalNotes);
    await logActivity('Notes Update', { candidateId: candidate.id }, user!.uid, role!);
    setIsSavingNotes(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2.5rem] shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 transition-colors duration-300">
        {/* Header */}
        <header className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-indigo-100 dark:shadow-none uppercase">
              {candidate.fullName.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-serif text-slate-800 dark:text-slate-100">{candidate.fullName}</h2>
                <button 
                  onClick={handleShortlistClick}
                  disabled={role !== 'admin' && role !== 'recruiter'}
                  className={`p-1.5 rounded-full transition-colors ${role !== 'admin' && role !== 'recruiter' ? 'opacity-50 cursor-not-allowed' : ''} ${candidate.isShortlisted ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-300 dark:text-slate-700 hover:text-slate-400 dark:hover:text-slate-500'}`}
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
            {(role === 'admin' || candidate.uploadedBy === user?.uid) && cvUrl && (
              <button 
                onClick={handleView}
                className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all border border-indigo-100 dark:border-indigo-800"
              >
                <Globe size={18} /> View CV
              </button>
            )}
            {(role === 'admin' || candidate.uploadedBy === user?.uid) && (
              <button 
                onClick={handleDownload}
                className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
              >
                <Download size={18} /> Download CV
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all"
            >
              <X size={24} />
            </button>
          </div>
        </header>

        {/* Banner for Large Files */}
        {candidate.isLargeFile && (
          <div className="mx-8 mt-4 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl flex items-center gap-3">
            <span className="flex-shrink-0 w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock size={16} />
            </span>
            <p className="text-[10px] text-amber-800 dark:text-amber-200 font-medium leading-relaxed">
              <strong>Large File Support:</strong> This CV exceeds constant limit. To ensure database stability, we've indexed the full text for search, but the original PDF preview was omitted. You can download the extracted text version above.
            </p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="md:col-span-2 space-y-8">
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-2">
                <Globe size={12} /> Professional Summary
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm italic border-l-2 border-indigo-100 dark:border-indigo-900/50 pl-4">
                "{candidate.summary || 'No summary extracted.'}"
              </p>
            </section>

            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-2">
                <Briefcase size={12} /> Work Experience
              </h3>
              <div className="space-y-6">
                {candidate.experience?.map((exp: any, i: number) => (
                  <div key={i} className="relative pl-6 border-l border-slate-100 dark:border-slate-800 transition-colors duration-300">
                    <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white dark:border-slate-900" />
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{exp.role}</h4>
                    <p className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold">{exp.company} • {exp.duration}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 leading-relaxed">{exp.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-2">
                <GraduationCap size={12} /> Education
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {candidate.education?.map((edu: any, i: number) => (
                  <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">{edu.degree}</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-medium">{edu.school}</p>
                    <p className="text-indigo-500 dark:text-indigo-400 text-[10px] font-black mt-1">{edu.year}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-8">
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-2">
                <Code size={12} /> Skills & Tools
              </h3>
              <div className="flex flex-wrap gap-2">
                {candidate.skills?.map((skill: string) => (
                  <span key={skill} className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors duration-300">
                    {skill}
                  </span>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-2">
                <Mail size={12} /> Contact Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl transition-colors duration-300">
                  <Mail className="text-indigo-500 dark:text-indigo-400" size={16} />
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{candidate.email}</p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl transition-colors duration-300">
                  <Phone className="text-indigo-500 dark:text-indigo-400" size={16} />
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{candidate.phone || 'N/A'}</p>
                </div>
                {candidate.links?.map((link: any, i: number) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl transition-all hover:border-indigo-200">
                        <Globe className="text-indigo-500 dark:text-indigo-400" size={16} />
                        <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 truncate">{link.label || 'Link'}</p>
                    </a>
                ))}
              </div>
            </section>

            <section className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 transition-colors duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  <StickyNote size={12} /> Internal Notes
                </h3>
                {candidate.notesUpdatedBy && (
                  <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter shrink-0">
                    Last: {teamMembers?.[candidate.notesUpdatedBy] || 'Team'}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <textarea 
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Record interview feedback, behavioral observations, or potential team fit..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs h-32 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
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

            <section className="bg-slate-900 dark:bg-slate-950 p-6 rounded-3xl text-white transition-colors duration-300 shadow-inner">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Metadata</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Indexed on</span>
                  <span className="font-mono">{new Date(candidate.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Shortlisted</span>
                  <span className={candidate.isShortlisted ? 'text-amber-400' : 'text-slate-400'}>
                    {candidate.isShortlisted ? 'YES' : 'NO'}
                  </span>
                </div>
              </div>
            </section>

            <section className="bg-indigo-600 p-6 rounded-3xl text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-200 flex items-center gap-2">
                  <Clock size={12} /> Follow-up Reminder
                </h3>
                {candidate.followUpUpdatedBy && (
                  <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-tighter shrink-0">
                    By: {teamMembers?.[candidate.followUpUpdatedBy] || 'Team'}
                  </span>
                )}
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-indigo-300 ml-1 tracking-wider">Next Follow-up Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-indigo-400" size={14} />
                    <input 
                      type="date" 
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full bg-indigo-700/50 border border-indigo-500/50 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-indigo-300 ml-1 tracking-wider">Follow-up Note</label>
                  <textarea 
                    value={followUpNote}
                    onChange={(e) => setFollowUpNote(e.target.value)}
                    placeholder="Candidate mentioned expected notice..."
                    className="w-full bg-indigo-700/50 border border-indigo-500/50 rounded-xl px-4 py-2 text-xs h-24 focus:outline-none focus:ring-1 focus:ring-indigo-300 placeholder:text-indigo-400/50"
                  />
                </div>
                <button 
                  onClick={handleSaveFollowUp}
                  disabled={isSaving}
                  className="w-full py-2 bg-white text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
