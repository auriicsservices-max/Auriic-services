import React, { useState, useEffect } from 'react';
import { X, Download, Star, StarOff, Briefcase, GraduationCap, Mail, Phone, Code, Globe, Clock, Save, Calendar, Loader2, StickyNote, Users, Search, MessageSquare, ChevronDown, Linkedin, Github, Twitter, ExternalLink, CheckCircle2, MapPin, Trash, Trash2, Plus, Layers, Building, Coins, ShieldAlert } from 'lucide-react';
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
import { getLinksArray } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useTimezone } from '../contexts/TimezoneContext';
import { logActivity } from '../services/activityService';
import { createNotification, formatNotificationMessage } from '../services/notificationService';
import ConfirmModal from './ConfirmModal';
import { fetchCvList } from '../services/cvApiService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { STAGES, getStageConfig } from '../lib/pipelineStages';
import { getSLAInfo } from '../utils/clientActionService';

const STAGES_LIST = STAGES;

interface CandidateModalProps {
  candidate: any;
  isOpen: boolean;
  onClose: () => void;
  onShortlist: (id: string, currentStatus: boolean) => void;
  onUpdateFollowUp: (id: string, note: string, date: string) => void;
  onCompleteFollowUp: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdateAssignee: (id: string, userId: string) => void;
  onUpdateUploader?: (id: string, uploaderId: string) => void;
  onContact: (userId: string) => void;
  teamMembers: Record<string, string>;
  fullTeamList?: any[];
  onUpdateClient?: (id: string, clientId: string) => void;
  onUpdateStage?: (id: string, stage: string) => void;
}

export default function CandidateModal({ candidate, isOpen, onClose, onShortlist, onUpdateFollowUp, onCompleteFollowUp, onUpdateNotes, onUpdateAssignee, onUpdateUploader, onContact, teamMembers, fullTeamList = [], onUpdateClient, onUpdateStage }: CandidateModalProps) {
  const { user, role, isPrivileged, getUserDisplayName, getUserRole } = useAuth();
  const { formatDate } = useTimezone();
  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [uploadedBy, setUploadedBy] = useState(candidate?.uploadedBy || '');

  useEffect(() => {
    if (candidate) {
      setUploadedBy(candidate.uploadedBy || '');
      setAssignedTo(candidate.assignedTo || '');
    }
  }, [candidate]);
  const [assignedClientId, setAssignedClientId] = useState('');
  const [assignedStage, setAssignedStage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [isSavingStage, setIsSavingStage] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [isSavingLoc, setIsSavingLoc] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editedFullName, setEditedFullName] = useState('');
  const [editedSummary, setEditedSummary] = useState('');
  const [editedDomain, setEditedDomain] = useState('');
  const [editedDomainFocus, setEditedDomainFocus] = useState('');
  const [editedExperience, setEditedExperience] = useState<any[]>([]);
  const [editedEducation, setEditedEducation] = useState<any[]>([]);
  const [editedProjects, setEditedProjects] = useState<any[]>([]);
  const [editedCertifications, setEditedCertifications] = useState<string[]>([]);
  const [editedAchievements, setEditedAchievements] = useState<string[]>([]);
  const [editedSkills, setEditedSkills] = useState<string[]>([]);
  const [editedEmail, setEditedEmail] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [editedSalary, setEditedSalary] = useState('');
  const [editedNoticePeriod, setEditedNoticePeriod] = useState('');
  const [editedWorkAuthorization, setEditedWorkAuthorization] = useState('');
  const [editedCurrentCompany, setEditedCurrentCompany] = useState('');
  const [editedCurrentJobTitle, setEditedCurrentJobTitle] = useState('');
  const [editedLinks, setEditedLinks] = useState<any[]>([]);

  const [showAddCustomLinkModal, setShowAddCustomLinkModal] = useState(false);
  const [modalLinkPlatform, setModalLinkPlatform] = useState('LinkedIn');
  const [modalLinkLabel, setModalLinkLabel] = useState('');
  const [modalLinkUrl, setModalLinkUrl] = useState('');
  const [isSavingModalLink, setIsSavingModalLink] = useState(false);

  const handleAddLink = () => {
    setEditedLinks(prev => [...prev, { label: 'LinkedIn', url: '' }]);
  };
  const handleUpdateLink = (index: number, key: string, value: string) => {
    setEditedLinks(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: value };
      return updated;
    });
  };
  const handleRemoveLink = (index: number) => {
    setEditedLinks(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveModalDirectLink = async () => {
    if (!modalLinkUrl.trim() || !candidate) return;
    setIsSavingModalLink(true);
    try {
      const finalLabel = modalLinkPlatform === 'Custom' 
        ? (modalLinkLabel.trim() || 'Link') 
        : modalLinkPlatform;
      const formattedUrl = modalLinkUrl.trim().startsWith('http') 
        ? modalLinkUrl.trim() 
        : `https://${modalLinkUrl.trim()}`;
      
      const newLinkObj = { label: finalLabel, url: formattedUrl };
      const currentLinks = getLinksArray(candidate.links);
      const updatedLinks = [...currentLinks, newLinkObj];

      await updateDoc(doc(db, 'candidates', candidate.id), {
        links: updatedLinks,
        updatedAt: new Date().toISOString()
      });

      setEditedLinks(updatedLinks);
      setModalLinkUrl('');
      setModalLinkLabel('');
      setShowAddCustomLinkModal(false);
    } catch (err) {
      console.error('Error saving link in modal:', err);
    } finally {
      setIsSavingModalLink(false);
    }
  };

  const handleDeleteModalDirectLink = async (indexToDelete: number) => {
    if (!candidate) return;
    try {
      const currentLinks = getLinksArray(candidate.links);
      const updatedLinks = currentLinks.filter((_: any, idx: number) => idx !== indexToDelete);

      await updateDoc(doc(db, 'candidates', candidate.id), {
        links: updatedLinks,
        updatedAt: new Date().toISOString()
      });

      setEditedLinks(updatedLinks);
    } catch (err) {
      console.error('Error removing link in modal:', err);
    }
  };

  const handleAddExperience = () => {
    setEditedExperience(prev => [...prev, { role: '', company: '', duration: '', description: '' }]);
  };
  const handleUpdateExperience = (index: number, key: string, value: string) => {
    setEditedExperience(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: value };
      return updated;
    });
  };
  const handleRemoveExperience = (index: number) => {
    setEditedExperience(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddEducation = () => {
    setEditedEducation(prev => [...prev, { degree: '', school: '', year: '' }]);
  };
  const handleUpdateEducation = (index: number, key: string, value: string) => {
    setEditedEducation(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: value };
      return updated;
    });
  };
  const handleRemoveEducation = (index: number) => {
    setEditedEducation(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddProject = () => {
    setEditedProjects(prev => [...prev, { title: '', description: '', link: '' }]);
  };
  const handleUpdateProject = (index: number, key: string, value: any) => {
    setEditedProjects(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: value };
      return updated;
    });
  };
  const handleRemoveProject = (index: number) => {
    setEditedProjects(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddCert = () => {
    setEditedCertifications(prev => [...prev, '']);
  };
  const handleUpdateCert = (index: number, value: string) => {
    setEditedCertifications(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };
  const handleRemoveCert = (index: number) => {
    setEditedCertifications(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddAchievement = () => {
    setEditedAchievements(prev => [...prev, '']);
  };
  const handleUpdateAchievement = (index: number, value: string) => {
    setEditedAchievements(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };
  const handleRemoveAchievement = (index: number) => {
    setEditedAchievements(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveCandidateProfile = async () => {
    setIsSaving(true);
    try {
      const candidateRef = doc(db, 'candidates', candidate.id);
      const updateData: any = {};
      
      if (role === 'developer') {
        updateData.fullName = editedFullName.trim();
        updateData.summary = editedSummary.trim();
        updateData.domain = editedDomain.trim();
        updateData.domainFocus = editedDomainFocus.trim();
        updateData.experience = editedExperience;
        updateData.education = editedEducation;
        updateData.projects = editedProjects;
        updateData.certifications = editedCertifications.filter(Boolean);
        updateData.achievements = editedAchievements.filter(Boolean);
        updateData.skills = editedSkills.filter(Boolean);
        updateData.email = editedEmail.trim();
        updateData.phone = editedPhone.trim();
        updateData.salary = editedSalary.trim();
        updateData.noticePeriod = editedNoticePeriod.trim();
        updateData.workAuthorization = editedWorkAuthorization.trim();
        updateData.currentCompany = editedCurrentCompany.trim();
        updateData.currentJobTitle = editedCurrentJobTitle.trim();
        updateData.links = editedLinks.filter(l => l.url && l.url.trim() !== '');
      } else if (role === 'admin' || role === 'team_leader') {
        updateData.fullName = editedFullName.trim();
      }

      await updateDoc(candidateRef, updateData);

      // Update local candidate properties
      Object.assign(candidate, updateData);
      
      if (role === 'developer') {
        setSkills(editedSkills.filter(Boolean));
      }

      await logActivity(
        getUserDisplayName(),
        user!.uid,
        getUserRole(),
        'Profile Updated',
        candidate.fullName || 'Candidate',
        null,
        `Updated profile details of candidate: ${candidate.fullName}`,
        'Candidate'
      );

      setIsEditing(false);
      showAlert('Success', 'Candidate profile updated successfully!');
    } catch (err: any) {
      console.error('Error saving candidate profile:', err);
      showAlert('Error', 'Failed to save candidate profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLocation = async () => {
    setIsSavingLoc(true);
    try {
      const updatedLocationInfo = {
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
        postalCode: postalCode.trim(),
      };
      
      await updateDoc(doc(db, 'candidates', candidate.id), {
        locationInfo: updatedLocationInfo
      });

      // Update local candidate location fields manually
      candidate.locationInfo = updatedLocationInfo;

      await logActivity(
        getUserDisplayName(),
        user!.uid,
        getUserRole(),
        'Location Updated',
        candidate.fullName || 'Candidate',
        null,
        `Updated location of ${candidate.fullName || 'Candidate'} to: ${city.trim() || ''}, ${state.trim() || ''}, ${country.trim() || ''} ${postalCode.trim() || ''}`,
        'Candidate'
      );

      showAlert('Success', 'Candidate location updated successfully');
    } catch (err: any) {
      console.error(err);
      showAlert('Error', 'Failed to update location details.');
    } finally {
      setIsSavingLoc(false);
    }
  };

  const handleCompleteFollowUp = async () => {
    setIsCompleting(true);
    await onCompleteFollowUp(candidate.id);
    setFollowUpNote('');
    setFollowUpDate('');
    setIsCompleting(false);
    showAlert('Success', 'Follow-up marked as completed.');
  };
  const [isSavingAssignee, setIsSavingAssignee] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const renderHighlightedText = (text: any) => {
    const stringText = typeof text === 'string' ? text : String(text || '');
    if (!searchTerm.trim()) return stringText;
    const terms = searchTerm.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    if (terms.length === 0) return stringText;

    // Create a regex that matches any of the terms
    const escapedTerms = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
    
    const parts = stringText.split(regex);
    
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
      setAssignedClientId(candidate.clientId || '');
      setAssignedStage(candidate.pipelineStage || 'cv_upload');
      setSkills(candidate.skills || []);
      setSearchTerm(''); // Clear search on candidate change

      setCity(candidate.locationInfo?.city || '');
      setState(candidate.locationInfo?.state || '');
      setCountry(candidate.locationInfo?.country || '');
      setPostalCode(candidate.locationInfo?.postalCode || '');
      
      // Initialize cvUrl with candidate.url (the most specific link)
      // and only fall back to other links if it's missing
      let initialCvUrl = candidate.url;
      
      if (!initialCvUrl && candidate.links) {
        const cvLink = getLinksArray(candidate.links).find((l: any) => 
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

  useEffect(() => {
    if (candidate) {
      setEditedFullName(candidate.fullName || '');
      setEditedSummary(candidate.summary || '');
      setEditedDomain(candidate.domain || '');
      setEditedDomainFocus(candidate.domainFocus || '');
      setEditedExperience(candidate.experience || []);
      setEditedEducation(candidate.education || []);
      setEditedProjects(candidate.projects || []);
      setEditedCertifications((candidate.certifications || []).map((c: any) => typeof c === 'string' ? c : (c.name || c.title || c.issuer || JSON.stringify(c))));
      setEditedAchievements(candidate.achievements || []);
      setEditedSkills(candidate.skills || []);
      setEditedEmail(candidate.email || '');
      setEditedPhone(candidate.phone || '');
      setEditedSalary(candidate.salary || '');
      setEditedNoticePeriod(candidate.noticePeriod || '');
      setEditedWorkAuthorization(candidate.workAuthorization || '');
      setEditedCurrentCompany(candidate.currentCompany || candidate.company || '');
      setEditedCurrentJobTitle(candidate.currentJobTitle || (candidate.experience?.[0]?.role) || '');
      setEditedLinks(getLinksArray(candidate.links));
    }
  }, [candidate, isEditing]);

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

  const extractProjectBullets = (project: any): string[] => {
    if (!project) return [];
    const points: string[] = [];

    if (Array.isArray(project.highlights) && project.highlights.length > 0) {
      project.highlights.forEach((h: any) => {
        if (typeof h === 'string' && h.trim()) {
          const clean = h.trim().replace(/^[•\-\*\d+\.]\s*/, '');
          if (clean && !points.includes(clean)) points.push(clean);
        }
      });
    }

    const desc = typeof project.description === 'string' ? project.description.trim() : '';
    if (desc) {
      const rawLines = desc
        .split(/\n|•|(?<=\s)[\-\*]\s+/)
        .map(s => s.trim())
        .filter(Boolean);

      if (rawLines.length > 1) {
        for (const line of rawLines) {
          const clean = line.replace(/^[•\-\*\d+\.]\s*/, '').trim();
          if (clean && !points.includes(clean)) {
            points.push(clean);
          }
        }
      } else if (rawLines.length === 1) {
        const line = rawLines[0];
        if (line.length > 80 && line.includes('. ')) {
          const sentences = line.split(/(?<=\.)\s+/).map(s => s.trim()).filter(s => s.length > 8);
          if (sentences.length > 1) {
            sentences.forEach(s => {
              const clean = s.replace(/^[•\-\*\d+\.]\s*/, '').trim();
              if (clean && !points.includes(clean)) points.push(clean);
            });
          } else {
            const clean = line.replace(/^[•\-\*\d+\.]\s*/, '').trim();
            if (clean && !points.includes(clean)) points.push(clean);
          }
        } else {
          const clean = line.replace(/^[•\-\*\d+\.]\s*/, '').trim();
          if (clean && !points.includes(clean)) points.push(clean);
        }
      }
    }

    if (points.length === 0 && desc) {
      points.push(desc);
    }

    return points;
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
    await logActivity(
      getUserDisplayName(),
      user!.uid,
      getUserRole(),
      'Shortlist Toggle',
      candidate.fullName || 'Candidate',
      null,
      `Shortlist status changed to ${newStatus}`,
      'Shortlist'
    );
    
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
    await logActivity(
      getUserDisplayName(),
      user!.uid,
      getUserRole(),
      'Follow-up Update',
      candidate.fullName || 'Candidate',
      null,
      `Follow-up updated for ${followUpDate}`,
      'Follow-Up'
    );
    setIsSaving(false);
    showAlert('Success', 'Follow-up updated successfully.');
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    await onUpdateNotes(candidate.id, generalNotes);
    await logActivity(
      getUserDisplayName(),
      user!.uid,
      getUserRole(),
      'Notes Update',
      candidate.fullName || 'Candidate',
      null,
      `Notes updated`,
      'Candidate'
    );
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
      
      const activityAction = isRemoval ? 'Assignment Removed' : 'Assignee Updated'; 
      await logActivity(
        getUserDisplayName(),
        user!.uid,
        getUserRole(),
        activityAction,
        candidate.fullName || 'Candidate',
        assignedTo ? (teamMembers[assignedTo] || assignedTo) : null,
        isRemoval ? 'Assignment removed' : `Assigned to ${teamMembers[assignedTo] || assignedTo}`,
        'Candidate Assignment'
      );
      
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

  const handleUpdateClient = async () => {
    if (!candidate) return;
    setIsSavingClient(true);
    try {
      const isRemoval = assignedClientId === '';
      const nowIso = new Date().toISOString();

      if (onUpdateClient) {
        await onUpdateClient(candidate.id, assignedClientId);
      } else {
        await updateDoc(doc(db, 'candidates', candidate.id), {
          clientId: assignedClientId || null,
          clientAssignedAt: isRemoval ? null : nowIso,
          slaStartTime: isRemoval ? null : nowIso,
          slaStatus: isRemoval ? null : 'On Time',
          clientStatus: isRemoval ? null : (candidate.clientStatus || 'pending_review')
        });
      }

      candidate.clientId = assignedClientId || null;
      if (!isRemoval) {
        candidate.clientAssignedAt = nowIso;
        candidate.slaStartTime = nowIso;
        candidate.slaStatus = 'On Time';
      }
      
      const clientsList = (fullTeamList || []).filter(u => u.role === 'client');
      const clientUser = clientsList.find(c => c.id === assignedClientId || c.uid === assignedClientId);
      const clientName = clientUser ? (clientUser.name || clientUser.email) : 'Client';

      if (!isRemoval && assignedClientId) {
        try {
          await createNotification(
            `New Candidate Assigned for Review: "${candidate.fullName}". Sourced by ${getUserDisplayName()}.`,
            user!.uid,
            getUserDisplayName(),
            getUserRole(),
            assignedClientId,
            candidate.id
          );
        } catch (e) { console.warn('Notification send failed:', e); }
      }

      const activityAction = isRemoval ? 'Client Assignment Removed' : 'Client Assigned'; 
      await logActivity(
        getUserDisplayName(),
        user!.uid,
        getUserRole(),
        activityAction,
        candidate.fullName || 'Candidate',
        assignedClientId ? clientName : null,
        isRemoval ? 'Client assignment removed' : `Assigned to Client ${clientName} (SLA Timer Started)`,
        'Candidate Client Assignment'
      );
      
      showAlert('Success', isRemoval ? 'Client assignment removed successfully.' : 'Candidate assigned to client successfully (SLA Timer Started).');
    } catch (err) {
      console.error(err);
      showAlert('Error', 'Failed to update client assignment.');
    } finally {
      setIsSavingClient(false);
    }
  };

  const handleUpdateStage = async () => {
    setIsSavingStage(true);
    try {
      if (onUpdateStage) {
        await onUpdateStage(candidate.id, assignedStage);
      } else {
        await updateDoc(doc(db, 'candidates', candidate.id), {
          pipelineStage: assignedStage,
          updatedAt: new Date().toISOString()
        });
      }

      candidate.pipelineStage = assignedStage;

      const stageObj = STAGES_LIST.find(s => s.id === assignedStage);
      const stageLabel = stageObj ? stageObj.label : assignedStage;

      await logActivity(
        getUserDisplayName(),
        user!.uid,
        getUserRole(),
        'Pipeline Stage Updated',
        candidate.fullName || 'Candidate',
        null,
        `Updated pipeline stage to: ${stageLabel}`,
        'Candidate'
      );
      
      showAlert('Success', 'Candidate pipeline stage updated successfully.');
    } catch (err) {
      console.error(err);
      showAlert('Error', 'Failed to update candidate pipeline stage.');
    } finally {
      setIsSavingStage(false);
    }
  };

  const handleRemoveSkill = async (skillToRemove: string) => {
    const updatedSkills = skills.filter(s => s !== skillToRemove);
    setSkills(updatedSkills);
    try {
      await updateDoc(doc(db, 'candidates', candidate.id), { skills: updatedSkills });
      await logActivity(
        getUserDisplayName(),
        user!.uid,
        getUserRole(),
        'Skill Removed',
        candidate.fullName || 'Candidate',
        null,
        `Skill '${skillToRemove}' removed`,
        'Candidate'
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-250"
    >
      <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] w-full max-w-5xl h-[94vh] sm:h-auto max-h-[92vh] overflow-hidden rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col animate-in zoom-in-95 duration-300 transition-colors duration-300 border border-[var(--border-color)]/70">
        
        {/* Modal Top Banner Header */}
        <header className="p-6 sm:p-8 border-b border-[var(--border-color)]/80 flex flex-col gap-5 shrink-0 bg-[var(--bg-secondary)]">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex items-center gap-4 sm:gap-5">
              {/* Dynamic Gradients Initial Avatar Circle */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-tr from-[#004564] via-[#005472] to-[#A98B56] rounded-2xl flex items-center justify-center text-white text-lg sm:text-2xl font-black shadow-md uppercase shrink-0">
                {(candidate.fullName || '??').slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap w-full max-w-xl">
                  {isEditing ? (
                    <div className="flex flex-col gap-1 w-full max-w-md">
                      <label className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-wider">Candidate Full Name</label>
                      <input 
                        type="text" 
                        value={editedFullName} 
                        onChange={(e) => setEditedFullName(e.target.value)} 
                        className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-3 py-1.5 text-base focus:outline-none focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-bold shadow-xs"
                        placeholder="Candidate Full Name"
                      />
                    </div>
                  ) : (
                    <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] leading-tight tracking-tight">{candidate.fullName || 'Unnamed Candidate'}</h2>
                  )}
                  {!isEditing && (
                    <button 
                      onClick={handleShortlistClick}
                      disabled={!isPrivileged && role !== 'recruiter'}
                      className={`p-1.5 rounded-xl transition-all shrink-0 ${!isPrivileged && role !== 'recruiter' ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 active:scale-95'} ${candidate.isShortlisted ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'text-slate-300 dark:text-slate-700 hover:text-amber-500 dark:hover:text-amber-400'}`}
                    >
                      {candidate.isShortlisted ? <Star fill="currentColor" size={16} /> : <StarOff size={16} />}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[10px] font-bold w-full">
                  {isEditing && role === 'developer' ? (
                    <div className="grid grid-cols-2 gap-2.5 w-full max-w-md mt-1">
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-wider">Domain Focus</label>
                        <input 
                          type="text" 
                          value={editedDomainFocus} 
                          onChange={(e) => setEditedDomainFocus(e.target.value)} 
                          className="bg-white dark:bg-slate-900 border border-[var(--border-color)] rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[var(--text-primary)] font-bold shadow-sm"
                          placeholder="e.g. Full-Stack Engineer"
                        />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-wider">Main Domain</label>
                        <input 
                          type="text" 
                          value={editedDomain} 
                          onChange={(e) => setEditedDomain(e.target.value)} 
                          className="bg-white dark:bg-slate-900 border border-[var(--border-color)] rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[var(--text-primary)] font-bold shadow-sm"
                          placeholder="e.g. Technology"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                        {candidate.domainFocus || candidate.domain || 'Uncategorized Profile'}
                      </span>
                      <span className="text-[var(--text-muted)]">•</span>
                      <span className="text-[var(--text-muted)] uppercase tracking-wider">
                        {candidate.domain || 'General Talent'}
                      </span>
                      {candidate.pipelineStage && (
                        <>
                          <span className="text-[var(--text-muted)]">•</span>
                          <span className={getStageConfig(candidate.pipelineStage).badgeClass}>
                            <span className={`w-1.5 h-1.5 rounded-full ${getStageConfig(candidate.pipelineStage).dotClass}`} />
                            {getStageConfig(candidate.pipelineStage).label}
                          </span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Action Buttons Toolbar */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              {/* Profile Editing Controls */}
              {(role === 'developer' || role === 'admin' || role === 'team_leader') && (
                <>
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleSaveCandidateProfile}
                        disabled={isSaving}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                        <span>Save Profile</span>
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        disabled={isSaving}
                        className="px-3.5 py-2 crm-btn-secondary text-xs flex items-center gap-1.5"
                      >
                        <span>Cancel</span>
                      </button>
                    </div>
                  ) : (
                    (role as any) !== 'client' && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-3.5 py-2 crm-btn-gold text-xs flex items-center gap-1.5"
                      >
                        <Code size={13} />
                        <span>{role === 'developer' ? 'Edit Profile' : 'Edit Name'}</span>
                      </button>
                    )
                  )}
                </>
              )}
              {(role === 'admin' || role === 'developer' || role === 'client' || candidate.uploadedBy === user?.uid || candidate.clientId === user?.uid) && (cvUrl || candidate.url || candidate.compressedText || candidate.cid || candidate.cvBase64) && (
                <button 
                  onClick={handleView}
                  disabled={isFetchingCV}
                  className={`px-3.5 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-[var(--card-hover-bg)] transition-all border border-[var(--border-color)] ${isFetchingCV ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {isFetchingCV ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
                  <span>{isFetchingCV ? 'Syncing...' : 'View Original'}</span>
                </button>
              )}
              {(role === 'admin' || role === 'developer' || role === 'client' || candidate.uploadedBy === user?.uid || candidate.clientId === user?.uid) && (cvUrl || candidate.url || candidate.compressedText || candidate.cid || candidate.cvBase64) && (
                <button 
                  onClick={handleDownload}
                  disabled={isFetchingCV}
                  className={`px-3.5 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-[var(--card-hover-bg)] transition-all border border-[var(--border-color)] ${isFetchingCV ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {isFetchingCV ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  <span>{isFetchingCV ? 'Syncing...' : 'Download'}</span>
                </button>
              )}
              <button 
                onClick={onClose}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Quick Boolean Filter bar within modal */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl px-4 py-2.5 flex items-center gap-3 transition-all">
            <Search size={13} className="text-[var(--primary-gold)]" />
            <input 
              type="text" 
              placeholder="Query expression or text keyword search..."
              className="flex-1 bg-transparent border-none focus:outline-none text-xs font-mono placeholder:font-sans text-[var(--text-primary)]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <div className="flex items-center gap-2">
                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${matchesAll() ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'}`}>
                    {matchesAll() ? 'Full Boolean Match' : 'Partial Match'}
                </span>
                <button onClick={() => setSearchTerm('')} className="text-[var(--text-muted)] hover:text-indigo-600 transition-colors">
                    <X size={13} />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Large Index Processing Warning banner */}
        {candidate.isLargeFile && !(cvUrl || candidate.url) && (
          <div className="mx-8 mt-4 p-3 bg-amber-50 dark:bg-amber-950/15 border border-amber-100/20 rounded-xl flex items-center gap-3 shrink-0">
            <span className="flex-shrink-0 w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Loader2 className="animate-spin" size={15} />
            </span>
            <p className="text-[10px] text-amber-800 dark:text-amber-200 font-bold leading-normal">
              Large Index Frame: Extracting detailed PDF. Fallback document text is available inside sections below.
            </p>
          </div>
        )}

        {/* Modal Double-Column Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 scroll-smooth custom-scrollbar">
          
          {/* Main Left Column (Experience & Summary) */}
          <div className="md:col-span-2 space-y-6 sm:space-y-8 pr-1">
            
            {/* Professional Summary */}
            <section className="bg-slate-50/20 dark:bg-slate-900/10 p-5 sm:p-6 rounded-[2rem] border border-[var(--border-color)]/70 shadow-sm card-hover-effect">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                  <Globe size={12} className="text-indigo-500" /> Executive summary
                </h3>
                {(cvUrl || candidate.url || candidate.compressedText) && !isEditing && (
                  <button 
                    onClick={handleView}
                    className="text-[9px] font-black text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 uppercase tracking-widest transition-colors"
                  >
                    View Source CV
                  </button>
                )}
              </div>
              {isEditing && role === 'developer' ? (
                <textarea
                  value={editedSummary}
                  onChange={(e) => setEditedSummary(e.target.value)}
                  className="w-full h-32 bg-white dark:bg-slate-900 border border-[var(--border-color)] rounded-2xl p-4 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[var(--text-primary)] font-medium leading-relaxed shadow-sm"
                  placeholder="Enter executive summary..."
                />
              ) : (
                <p className="text-[var(--text-secondary)] leading-relaxed text-sm italic border-l-2 border-indigo-500 pl-4 select-text">
                  "{renderHighlightedText(candidate.summary || 'No summary extracted.')}"
                </p>
              )}
            </section>

            {/* Work History timeline */}
            <section className="bg-slate-50/20 dark:bg-slate-900/10 p-5 sm:p-6 rounded-[2rem] border border-[var(--border-color)]/70 shadow-sm card-hover-effect">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                  <Briefcase size={12} className="text-indigo-500" /> Professional timeline
                </h3>
                {isEditing && role === 'developer' && (
                  <button
                    onClick={handleAddExperience}
                    className="text-[9px] font-black text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 uppercase tracking-widest transition-colors flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-100/30"
                  >
                    <Plus size={10} /> Add Experience
                  </button>
                )}
              </div>
              {isEditing && role === 'developer' ? (
                <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                  {editedExperience.map((exp: any, i: number) => (
                    <div key={i} className="p-4 bg-white dark:bg-slate-900 border border-[var(--border-color)] rounded-2xl relative flex flex-col gap-3 shadow-sm">
                      <button
                        onClick={() => handleRemoveExperience(i)}
                        className="absolute top-3 right-3 text-rose-500 hover:text-rose-600 transition-colors p-1"
                        title="Remove work history entry"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-wider">Role / Title</label>
                          <input
                            type="text"
                            value={exp.role || ''}
                            onChange={(e) => handleUpdateExperience(i, 'role', e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950 border border-[var(--border-color)] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[var(--text-primary)] font-bold"
                            placeholder="e.g. Senior Frontend Engineer"
                          />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-wider">Company</label>
                          <input
                            type="text"
                            value={exp.company || ''}
                            onChange={(e) => handleUpdateExperience(i, 'company', e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950 border border-[var(--border-color)] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[var(--text-primary)] font-bold"
                            placeholder="e.g. Google"
                          />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-wider">Duration</label>
                          <input
                            type="text"
                            value={exp.duration || ''}
                            onChange={(e) => handleUpdateExperience(i, 'duration', e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950 border border-[var(--border-color)] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[var(--text-primary)] font-bold"
                            placeholder="e.g. Jan 2021 - Present"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-wider">Job Description</label>
                        <textarea
                          value={exp.description || ''}
                          onChange={(e) => handleUpdateExperience(i, 'description', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[var(--text-primary)] font-medium leading-relaxed h-20"
                          placeholder="Describe your responsibilities, technologies used, and key achievements..."
                        />
                      </div>
                    </div>
                  ))}
                  {editedExperience.length === 0 && (
                    <p className="text-[var(--text-muted)] text-center py-6 text-xs font-semibold">No experience entries. Click "+ Add Experience" to add one.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-6 max-h-[320px] overflow-y-auto custom-scrollbar pr-2">
                  {candidate.experience?.map((exp: any, i: number) => (
                    <div key={i} className="relative pl-6 border-l-2 border-[var(--border-color)]/70 hover:border-indigo-500/50 transition-all duration-300">
                      <div className="absolute -left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-indigo-500 border-2 border-[var(--bg-primary)] shadow-sm" />
                      <h4 className="font-extrabold text-[var(--text-primary)] text-sm tracking-tight">{renderHighlightedText(exp.role)}</h4>
                      <p className="text-indigo-600 dark:text-indigo-400 text-xs font-bold mt-0.5">{renderHighlightedText(exp.company)} • {renderHighlightedText(exp.duration)}</p>
                      <p className="text-[var(--text-secondary)] text-xs mt-2 leading-relaxed select-text">{renderHighlightedText(exp.description)}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Academic Credentials */}
            <section className="bg-slate-50/20 dark:bg-slate-900/10 p-5 sm:p-6 rounded-[2rem] border border-[var(--border-color)]/70 shadow-sm card-hover-effect">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                  <GraduationCap size={12} className="text-indigo-500" /> Academic credentials
                </h3>
                {isEditing && role === 'developer' && (
                  <button
                    onClick={handleAddEducation}
                    className="text-[9px] font-black text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 uppercase tracking-widest transition-colors flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-100/30"
                  >
                    <Plus size={10} /> Add Education
                  </button>
                )}
              </div>
              {isEditing && role === 'developer' ? (
                <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  {editedEducation.map((edu: any, i: number) => (
                    <div key={i} className="p-4 bg-white dark:bg-slate-900 border border-[var(--border-color)] rounded-2xl relative flex flex-col gap-2.5 shadow-sm">
                      <button
                        onClick={() => handleRemoveEducation(i)}
                        className="absolute top-3 right-3 text-rose-500 hover:text-rose-600 transition-colors p-1"
                        title="Remove education entry"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="flex flex-col gap-0.5 sm:col-span-1">
                          <label className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-wider">Degree / Course</label>
                          <input
                            type="text"
                            value={edu.degree || ''}
                            onChange={(e) => handleUpdateEducation(i, 'degree', e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950 border border-[var(--border-color)] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[var(--text-primary)] font-bold"
                            placeholder="e.g. B.S. Computer Science"
                          />
                        </div>
                        <div className="flex flex-col gap-0.5 sm:col-span-1">
                          <label className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-wider">School / University</label>
                          <input
                            type="text"
                            value={edu.school || ''}
                            onChange={(e) => handleUpdateEducation(i, 'school', e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950 border border-[var(--border-color)] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[var(--text-primary)] font-bold"
                            placeholder="e.g. Stanford University"
                          />
                        </div>
                        <div className="flex flex-col gap-0.5 sm:col-span-1">
                          <label className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-wider">Year</label>
                          <input
                            type="text"
                            value={edu.year || ''}
                            onChange={(e) => handleUpdateEducation(i, 'year', e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950 border border-[var(--border-color)] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[var(--text-primary)] font-bold"
                            placeholder="e.g. 2018 - 2022"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {editedEducation.length === 0 && (
                    <p className="text-[var(--text-muted)] text-center py-6 text-xs font-semibold">No education entries. Click "+ Add Education" to add one.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-6 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  {candidate.education?.map((edu: any, i: number) => {
                    const deg = edu.degree || edu.course || edu.field || edu.field_of_study || 'Degree';
                    const course = edu.course || edu.field || edu.field_of_study || '';
                    const spec = edu.specialization || '';
                    const sch = edu.school || edu.institution || edu.university || '';
                    const board = edu.board || '';
                    const yr = edu.year || edu.duration || (edu.start_year || edu.start_date ? `${edu.start_year || edu.start_date} - ${edu.end_year || edu.end_date || 'Present'}` : (edu.end_year || edu.end_date || ''));
                    const gpa = edu.gpa || edu.grade || '';
                    const loc = edu.location || '';
                    const certs = Array.isArray(edu.certifications) ? edu.certifications : [];

                    return (
                      <div key={i} className="relative pl-6 border-l-2 border-[var(--border-color)]/70 hover:border-emerald-500/50 transition-all duration-300">
                        <div className="absolute -left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[var(--bg-primary)] shadow-sm" />
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h4 className="font-extrabold text-[var(--text-primary)] text-sm tracking-tight">
                            {deg}{course && course !== deg ? ` — ${course}` : ''}{spec ? ` (${spec})` : ''}
                          </h4>
                          {gpa && <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">Grade/GPA: {gpa}</span>}
                        </div>
                        <p className="text-emerald-600 dark:text-emerald-400 text-xs font-bold mt-0.5">
                          {sch}{board ? ` • Board: ${board}` : ''}{yr ? ` • ${yr}` : ''}{loc ? ` • ${loc}` : ''}
                        </p>
                        {certs.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {certs.map((c: any, ci: number) => (
                              <span key={ci} className="text-[10px] bg-[var(--bg-secondary)] text-[var(--text-secondary)] px-2 py-0.5 rounded-md border border-[var(--border-color)]">
                                {typeof c === 'string' ? c : (c.name || c.title || c.issuer || JSON.stringify(c))}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {(!candidate.education || candidate.education.length === 0) && (
                    <p className="text-xs italic text-[var(--text-muted)] text-center py-4">No academic credentials extracted.</p>
                  )}
                </div>
              )}
            </section>

            {/* Key Projects */}
            {(((candidate.projects && candidate.projects.length > 0) || (candidate.keyProjects && candidate.keyProjects.length > 0)) || (isEditing && role === 'developer')) && (
              <section className="bg-slate-50/20 dark:bg-slate-900/10 p-5 sm:p-6 rounded-[2rem] border border-[var(--border-color)]/70 shadow-sm card-hover-effect">
                <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-[var(--border-color)]/60">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                    <Star size={12} className="text-indigo-500" /> Key Projects
                  </h3>
                  {isEditing && role === 'developer' && (
                    <button
                      onClick={handleAddProject}
                      className="text-[9px] font-black text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 uppercase tracking-widest transition-colors flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-100/30"
                    >
                      <Plus size={10} /> Add Project
                    </button>
                  )}
                </div>
                {isEditing && role === 'developer' ? (
                  <div className="space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                    {editedProjects.map((project: any, i: number) => (
                      <div key={i} className="p-4 bg-white dark:bg-slate-900 border border-[var(--border-color)] rounded-2xl relative flex flex-col gap-2.5 shadow-sm">
                        <button
                          onClick={() => handleRemoveProject(i)}
                          className="absolute top-3 right-3 text-rose-500 hover:text-rose-600 transition-colors p-1"
                          title="Remove project"
                        >
                          <Trash2 size={14} />
                        </button>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pr-8">
                          <div className="flex flex-col gap-0.5">
                            <label className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-wider">Project Title</label>
                            <input
                              type="text"
                              value={project.title || project.name || ''}
                              onChange={(e) => handleUpdateProject(i, 'title', e.target.value)}
                              className="bg-slate-50 dark:bg-slate-950 border border-[var(--border-color)] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[var(--text-primary)] font-bold"
                              placeholder="e.g. ATS Platform Rewrite"
                            />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <label className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-wider">Link / Repository (Optional)</label>
                            <input
                              type="text"
                              value={project.link || project.live_url || ''}
                              onChange={(e) => handleUpdateProject(i, 'link', e.target.value)}
                              className="bg-slate-50 dark:bg-slate-950 border border-[var(--border-color)] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[var(--text-primary)] font-bold"
                              placeholder="e.g. https://github.com/..."
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-wider">Project Description & Highlights</label>
                          <textarea
                            value={project.description || ''}
                            onChange={(e) => handleUpdateProject(i, 'description', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[var(--text-primary)] font-medium leading-relaxed h-20"
                            placeholder="• Feature details...\n• Bullet point details..."
                          />
                        </div>
                      </div>
                    ))}
                    {editedProjects.length === 0 && (
                      <p className="text-[var(--text-muted)] text-center py-6 text-xs font-semibold">No project entries. Click "+ Add Project" to add one.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                    {(candidate.projects?.length ? candidate.projects : (candidate.keyProjects || []))?.map((project: any, i: number) => {
                      const title = project.title || project.name || 'Project';
                      const role = project.role || '';
                      const link = project.link || project.live_url || project.code_url || null;
                      const techList = Array.isArray(project.technologies) && project.technologies.length > 0
                        ? project.technologies
                        : (Array.isArray(project.tech_stack) ? project.tech_stack : []);
                      const bulletPoints = extractProjectBullets(project);

                      return (
                        <div key={i} className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border border-[var(--border-color)]/70 rounded-2xl transition-colors hover:border-indigo-500/30">
                          <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-[var(--border-color)]/40">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-[var(--text-primary)] text-xs tracking-tight">{title}</h4>
                              {role && (
                                <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                                  {role}
                                </span>
                              )}
                            </div>
                            {link && (
                              <a
                                href={link.startsWith('http') ? link : `https://${link}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-bold text-indigo-500 hover:underline flex items-center gap-1 shrink-0"
                              >
                                <span>Link</span>
                                <ExternalLink size={10} />
                              </a>
                            )}
                          </div>

                          {bulletPoints.length > 0 ? (
                            <ul className="space-y-1.5 select-text my-2">
                              {bulletPoints.map((pt, pIdx) => (
                                <li key={pIdx} className="text-[var(--text-secondary)] text-[11px] leading-relaxed flex items-start gap-2">
                                  <span className="text-indigo-500 font-extrabold shrink-0 mt-0.5">•</span>
                                  <span>{pt}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            project.description && (
                              <p className="text-[var(--text-secondary)] text-[11px] leading-relaxed select-text my-2 whitespace-pre-line">
                                {project.description}
                              </p>
                            )
                          )}

                          {techList.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 pt-2 border-t border-[var(--border-color)]/30 mt-2">
                              <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-wider mr-0.5">Stack:</span>
                              {techList.map((tech: string, tIdx: number) => (
                                <span
                                  key={tIdx}
                                  className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[var(--text-muted)] text-[9px] font-semibold rounded"
                                >
                                  {tech}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* Certifications and achievements */}
            {((candidate.certifications && candidate.certifications.length > 0) || (isEditing && role === 'developer')) && (
              <section className="bg-slate-50/20 dark:bg-slate-900/10 p-5 sm:p-6 rounded-[2rem] border border-[var(--border-color)]/70 shadow-sm card-hover-effect">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                    <Star size={12} className="text-amber-500" /> Certifications & Licenses
                  </h3>
                  {isEditing && role === 'developer' && (
                    <button
                      onClick={handleAddCert}
                      className="text-[9px] font-black text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 uppercase tracking-widest transition-colors flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-100/30"
                    >
                      <Plus size={10} /> Add Certificate
                    </button>
                  )}
                </div>
                {isEditing && role === 'developer' ? (
                  <div className="space-y-2.5 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                    {editedCertifications.map((cert: string, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={cert}
                          onChange={(e) => handleUpdateCert(i, e.target.value)}
                          className="flex-1 bg-white dark:bg-slate-900 border border-[var(--border-color)] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[var(--text-primary)] font-bold shadow-sm"
                          placeholder="e.g. AWS Certified Solutions Architect"
                        />
                        <button
                          onClick={() => handleRemoveCert(i)}
                          className="text-rose-500 hover:text-rose-600 transition-colors p-1"
                          title="Remove certification"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {editedCertifications.length === 0 && (
                      <p className="text-[var(--text-muted)] text-center py-4 text-xs font-semibold">No certifications. Click "+ Add Certificate" to add one.</p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[180px] overflow-y-auto custom-scrollbar pr-2">
                    {candidate.certifications?.map((cert: any, i: number) => (
                      <div key={i} className="p-3 bg-amber-50/20 dark:bg-amber-950/20 border border-amber-100/10 dark:border-amber-900/10 rounded-xl text-[11px] font-bold text-amber-900 dark:text-amber-300">
                        {typeof cert === 'string' ? cert : (cert.name || cert.title || cert.issuer || JSON.stringify(cert))}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {((candidate.achievements && candidate.achievements.length > 0) || (isEditing && role === 'developer')) && (
              <section className="bg-slate-50/20 dark:bg-slate-900/10 p-5 sm:p-6 rounded-[2rem] border border-[var(--border-color)]/70 shadow-sm card-hover-effect">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                     <Globe size={12} className="text-emerald-500" /> Key Achievements
                  </h3>
                  {isEditing && role === 'developer' && (
                    <button
                      onClick={handleAddAchievement}
                      className="text-[9px] font-black text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 uppercase tracking-widest transition-colors flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-100/30"
                    >
                      <Plus size={10} /> Add Achievement
                    </button>
                  )}
                </div>
                {isEditing && role === 'developer' ? (
                  <div className="space-y-2.5 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                    {editedAchievements.map((ach: string, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={ach}
                          onChange={(e) => handleUpdateAchievement(i, e.target.value)}
                          className="flex-1 bg-white dark:bg-slate-900 border border-[var(--border-color)] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[var(--text-primary)] font-medium shadow-sm"
                          placeholder="e.g. Reduced processing latency by 45%"
                        />
                        <button
                          onClick={() => handleRemoveAchievement(i)}
                          className="text-rose-500 hover:text-rose-600 transition-colors p-1"
                          title="Remove achievement"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {editedAchievements.length === 0 && (
                      <p className="text-[var(--text-muted)] text-center py-4 text-xs font-semibold">No achievements. Click "+ Add Achievement" to add one.</p>
                    )}
                  </div>
                ) : (
                  <ul className="space-y-2.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-2">
                    {candidate.achievements?.map((ach: string, i: number) => (
                      <li key={i} className="text-xs text-[var(--text-secondary)] flex items-start gap-2 select-text">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0 animate-pulse" />
                        <span>{ach}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>

          {/* Sidebar Right Column (Metadata, Location, Reminders, Assignee, Communication Logs) */}
          <div className="space-y-6 sm:space-y-8">
            
            {/* Competency tags */}
            <section className="bg-[var(--card-bg)] p-5 sm:p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
                <Code size={12} className="text-[var(--primary-gold)]" /> Skills Profile
              </h3>
              {isEditing && role === 'developer' ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-wider">Skills (Comma-separated)</label>
                  <textarea
                    value={editedSkills.join(', ')}
                    onChange={(e) => setEditedSkills(e.target.value.split(',').map(s => s.trim()))}
                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-bold h-20 shadow-sm"
                    placeholder="e.g. React, TypeScript, Node.js"
                  />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto custom-scrollbar pr-2">
                  {skills.map((skill: string) => (
                    <span key={skill} className="px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Direct Contact info */}
            <section className="bg-[var(--card-bg)] p-5 sm:p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                  <Mail size={12} className="text-[var(--primary-gold)]" /> Contact channels
                </h3>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setShowAddCustomLinkModal(!showAddCustomLinkModal)}
                    className="text-[10px] font-black text-[var(--primary-gold)] hover:underline uppercase tracking-wider flex items-center gap-1 bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-color)] transition-all hover:border-[var(--primary-gold)]"
                  >
                    <Plus size={11} /> {showAddCustomLinkModal ? 'Cancel' : 'Add Link'}
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {isEditing && role === 'developer' ? (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-wider">Email Address</label>
                      <input
                        type="email"
                        value={editedEmail}
                        onChange={(e) => setEditedEmail(e.target.value)}
                        className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-bold shadow-sm"
                        placeholder="email@example.com"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-wider">Phone Number</label>
                      <input
                        type="text"
                        value={editedPhone}
                        onChange={(e) => setEditedPhone(e.target.value)}
                        className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-bold shadow-sm"
                        placeholder="+1 (555) 019-2834"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
                      <Mail className="text-[var(--primary-gold)] shrink-0" size={14} />
                      <p className="text-xs font-bold text-[var(--text-secondary)] truncate select-all">{candidate.email}</p>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
                      <Phone className="text-[var(--primary-gold)] shrink-0" size={14} />
                      <p className="text-xs font-bold text-[var(--text-secondary)] select-all">{candidate.phone || 'N/A'}</p>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
                  <MapPin className="text-[var(--primary-gold)] shrink-0" size={14} />
                  <p className="text-xs font-bold text-[var(--text-secondary)] truncate">
                      { (candidate.locationInfo && (candidate.locationInfo.city || candidate.locationInfo.state)) ? 
                        `${candidate.locationInfo.city ? candidate.locationInfo.city + ', ' : ''}${candidate.locationInfo.state || ''}${candidate.locationInfo.country ? ', ' + candidate.locationInfo.country : ''}` 
                        : 'Location undisclosed'}
                  </p>
                </div>
                {isEditing && role === 'developer' ? (
                  <div className="space-y-3 pt-2 border-t border-[var(--border-color)]">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider">Social / Custom Links</label>
                      <button
                        type="button"
                        onClick={handleAddLink}
                        className="text-[9px] font-black text-[var(--primary-gold)] hover:underline uppercase tracking-wider flex items-center gap-1"
                      >
                        <Plus size={10} /> Add Link
                      </button>
                    </div>
                    {editedLinks.map((link: any, i: number) => (
                      <div key={i} className="p-3 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl relative flex flex-col gap-2 shadow-sm">
                        <button
                          type="button"
                          onClick={() => handleRemoveLink(i)}
                          className="absolute top-2.5 right-2.5 text-rose-500 hover:text-rose-600 transition-colors p-1"
                          title="Remove link"
                        >
                          <Trash2 size={13} />
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={link.label || ''}
                            onChange={(e) => handleUpdateLink(i, 'label', e.target.value)}
                            className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1 text-xs font-bold text-[var(--text-primary)]"
                            placeholder="Label (e.g. GitHub)"
                          />
                          <input
                            type="url"
                            value={link.url || ''}
                            onChange={(e) => handleUpdateLink(i, 'url', e.target.value)}
                            className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1 text-xs font-bold text-[var(--text-primary)]"
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    ))}
                    {editedLinks.length === 0 && (
                      <p className="text-[var(--text-muted)] text-center py-2 text-xs font-semibold">No custom links added. Click "+ Add Link" to add one.</p>
                    )}
                  </div>
                ) : (
                  getLinksArray(candidate.links).map((link: any, i: number) => (
                      <div key={i} className="group relative flex items-center justify-between p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl transition-all hover:border-[var(--primary-gold)]">
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="text-[var(--primary-gold)] shrink-0">
                                  {getLinkIcon(link.label || 'Link')}
                              </div>
                              <div className="min-w-0">
                                  <p className="text-xs font-black text-[var(--primary-gold)] truncate uppercase tracking-wider">{link.label || 'Reference Link'}</p>
                                  <p className="text-[10px] text-[var(--text-muted)] truncate">{link.url}</p>
                              </div>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteModalDirectLink(i)}
                            className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-600 transition-opacity p-1 ml-2"
                            title="Delete link"
                          >
                            <Trash2 size={13} />
                          </button>
                      </div>
                  ))
                )}

                {!isEditing && showAddCustomLinkModal && (
                  <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--primary-gold)] rounded-2xl space-y-3 mt-2 shadow-md">
                    <p className="text-[10px] font-black uppercase text-[var(--primary-gold)] tracking-wider">Add Social / Custom Link</p>
                    
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Platform / Label</label>
                      <select
                        value={modalLinkPlatform}
                        onChange={(e) => setModalLinkPlatform(e.target.value)}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--text-primary)]"
                      >
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="GitHub">GitHub</option>
                        <option value="Portfolio">Portfolio</option>
                        <option value="Twitter">Twitter / X</option>
                        <option value="Website">Personal Website</option>
                        <option value="Dribbble">Dribbble</option>
                        <option value="Medium">Medium</option>
                        <option value="YouTube">YouTube</option>
                        <option value="Custom">Custom Label</option>
                      </select>
                    </div>

                    {modalLinkPlatform === 'Custom' && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Custom Label Name</label>
                        <input
                          type="text"
                          value={modalLinkLabel}
                          onChange={(e) => setModalLinkLabel(e.target.value)}
                          placeholder="e.g. Behance, Kaggle, StackOverflow"
                          className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--text-primary)]"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Link URL</label>
                      <input
                        type="url"
                        value={modalLinkUrl}
                        onChange={(e) => setModalLinkUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--text-primary)]"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSaveModalDirectLink}
                        disabled={isSavingModalLink || !modalLinkUrl.trim()}
                        className="crm-btn-gold text-[10px] px-3 py-1.5 flex items-center gap-1 rounded-xl"
                      >
                        {isSavingModalLink ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        Save Link
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddCustomLinkModal(false)}
                        className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] px-3 py-1.5 font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Employment & Sourcing Details */}
            <section className="bg-[var(--card-bg)] p-5 sm:p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
                <Briefcase size={12} className="text-[var(--primary-gold)]" /> Sourcing Insights
              </h3>
              <div className="space-y-3">
                {isEditing && role === 'developer' ? (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-wider">Current Company</label>
                      <input
                        type="text"
                        value={editedCurrentCompany}
                        onChange={(e) => setEditedCurrentCompany(e.target.value)}
                        className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-bold shadow-sm"
                        placeholder="Current Company"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-wider">Current Job Title</label>
                      <input
                        type="text"
                        value={editedCurrentJobTitle}
                        onChange={(e) => setEditedCurrentJobTitle(e.target.value)}
                        className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-bold shadow-sm"
                        placeholder="Current Job Title"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-wider">Annual Salary (CTC) (₹)</label>
                      <input
                        type="number"
                        value={editedSalary}
                        onChange={(e) => setEditedSalary(e.target.value)}
                        className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-bold shadow-sm"
                        placeholder="e.g. 1200000"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-wider">Notice Period</label>
                      <input
                        type="text"
                        value={editedNoticePeriod}
                        onChange={(e) => setEditedNoticePeriod(e.target.value)}
                        className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-bold shadow-sm"
                        placeholder="e.g. 30 Days, Immediate"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-wider">Work Authorization</label>
                      <input
                        type="text"
                        value={editedWorkAuthorization}
                        onChange={(e) => setEditedWorkAuthorization(e.target.value)}
                        className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-bold shadow-sm"
                        placeholder="e.g. US Citizen, Green Card"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
                      <Building className="text-[var(--primary-gold)] shrink-0" size={14} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider leading-none mb-1">Current Company</p>
                        <p className="text-xs font-bold text-[var(--text-secondary)] select-all truncate">{candidate.currentCompany || candidate.company || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
                      <Briefcase className="text-[var(--primary-gold)] shrink-0" size={14} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider leading-none mb-1">Current Role</p>
                        <p className="text-xs font-bold text-[var(--text-secondary)] select-all truncate">{candidate.currentJobTitle || (candidate.experience?.[0]?.role) || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
                      <Coins className="text-[var(--primary-gold)] shrink-0" size={14} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider leading-none mb-1">Annual Salary (CTC)</p>
                        <p className="text-xs font-bold text-[var(--text-secondary)] select-all truncate">{candidate.salary || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
                      <Calendar className="text-[var(--primary-gold)] shrink-0" size={14} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider leading-none mb-1">Notice Period</p>
                        <p className="text-xs font-bold text-[var(--text-secondary)] select-all truncate">{candidate.noticePeriod || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
                      <ShieldAlert className="text-[var(--primary-gold)] shrink-0" size={14} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider leading-none mb-1">Work Auth Status</p>
                        <p className="text-xs font-bold text-[var(--text-secondary)] select-all truncate">{candidate.workAuthorization || 'N/A'}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Geographic Details Customizer */}
            <section className="bg-[var(--card-bg)] p-5 sm:p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
                <MapPin size={12} className="text-[var(--primary-gold)]" /> Geographic profile
              </h3>
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[8px] font-black uppercase text-[var(--text-muted)] mb-1 tracking-wider">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. San Francisco"
                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[8px] font-black uppercase text-[var(--text-muted)] mb-1 tracking-wider">State</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. CA"
                      className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black uppercase text-[var(--text-muted)] mb-1 tracking-wider">Zip</label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="e.g. 94105"
                      className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[8px] font-black uppercase text-[var(--text-muted)] mb-1 tracking-wider">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. United States"
                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-bold"
                  />
                </div>
                <button
                  onClick={handleSaveLocation}
                  disabled={isSavingLoc}
                  className="w-full py-2 crm-btn-gold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 mt-1"
                >
                  {isSavingLoc ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />}
                  Save Location
                </button>
              </div>
            </section>

            {/* Recruiter Assignment Panel */}
            {isPrivileged && (
              <section className="bg-[var(--card-bg)] p-5 sm:p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
                  <Users size={12} className="text-[var(--primary-gold)]" /> Sourcing Assignee
                </h3>
                <div className="space-y-3.5">
                  <div className="relative">
                    <select 
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl pl-4 pr-10 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] appearance-none cursor-pointer font-bold"
                    >
                      <option value="">Unassigned</option>
                      {teamMembers && Object.entries(teamMembers).map(([id, name]) => (
                        <option key={id} value={id}>{name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-3.5 text-[var(--text-muted)] pointer-events-none" />
                  </div>
                  <button 
                    onClick={handleUpdateAssignee}
                    disabled={isSavingAssignee}
                    className="w-full py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSavingAssignee ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />} 
                    Update Sourcing
                  </button>
                </div>
              </section>
            )}

            {/* Client Assignment Panel */}
            {(isPrivileged || role === 'recruiter') && (
              <section className="bg-[var(--card-bg)] p-5 sm:p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
                  <Briefcase size={12} className="text-[var(--primary-gold)]" /> Assign to Client
                </h3>
                <div className="space-y-3.5">
                  <div className="relative">
                    <select 
                      value={assignedClientId}
                      onChange={(e) => setAssignedClientId(e.target.value)}
                      className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl pl-4 pr-10 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] appearance-none cursor-pointer font-bold"
                    >
                      <option value="">No Client Assigned</option>
                      {fullTeamList && fullTeamList.filter(u => u.role === 'client').map((client) => (
                        <option key={client.id} value={client.id}>{client.name || client.email}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-3.5 text-[var(--text-muted)] pointer-events-none" />
                  </div>
                  <button 
                    onClick={handleUpdateClient}
                    disabled={isSavingClient}
                    className="w-full py-2 crm-btn-gold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSavingClient ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />} 
                    Update Client Assignment
                  </button>
                </div>
              </section>
            )}

            {/* Client Review & SLA Tracking Panel */}
            {candidate.clientId && (
              <section className="bg-[var(--card-bg)] p-5 sm:p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                    <Clock size={12} className="text-[#A98B56]" /> Client SLA & Review Tracking
                  </h3>
                  {(() => {
                    const sla = getSLAInfo(candidate);
                    return (
                      <span className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${sla.badgeBg}`}>
                        <Clock size={10} className={sla.indicatorColor} />
                        {sla.label}
                      </span>
                    );
                  })()}
                </div>

                {/* SLA Progress Bar */}
                {(() => {
                  const sla = getSLAInfo(candidate);
                  return (
                    <div className="space-y-1.5 bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--border-color)] text-xs">
                      <div className="flex justify-between text-[10px] font-extrabold">
                        <span className="text-[var(--text-muted)]">SLA Elapsed ({sla.elapsedHours.toFixed(1)}h / 48h)</span>
                        <span className="text-[var(--text-primary)]">{sla.percent}%</span>
                      </div>
                      <div className="w-full bg-[var(--border-color)] h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${sla.indicatorColor}`}
                          style={{ width: `${sla.percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-bold text-[var(--text-muted)] pt-0.5">
                        <span>Assigned: {candidate.clientAssignedAt ? new Date(candidate.clientAssignedAt).toLocaleDateString() : 'Recent'}</span>
                        <span>Status: <strong className="text-[var(--text-primary)] uppercase">{candidate.clientStatus || 'pending_review'}</strong></span>
                      </div>
                    </div>
                  );
                })()}

                {/* Client Activity Audit History */}
                {Array.isArray(candidate.clientInteractions) && candidate.clientInteractions.length > 0 ? (
                  <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
                    <p className="text-[10px] font-black uppercase text-[var(--text-muted)]">Client Interactions History</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {candidate.clientInteractions.map((act: any, idx: number) => (
                        <div key={act.id || idx} className="p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl space-y-1 text-xs">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-extrabold text-[var(--text-primary)]">{act.userName || 'Client'}</span>
                            <span className="text-[var(--text-muted)]">{act.timestamp ? new Date(act.timestamp).toLocaleString() : ''}</span>
                          </div>
                          <p className="text-[11px] font-bold text-[#A98B56]">{act.action}</p>
                          {act.feedback && (
                            <p className="text-[10px] text-[var(--text-secondary)] italic bg-[var(--card-bg)] p-1.5 rounded-lg border border-[var(--border-color)]">
                              "{act.feedback}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-[var(--text-muted)] italic text-center py-2">
                    Awaiting client review response.
                  </p>
                )}
              </section>
            )}

            {/* Pipeline Stage Panel */}
            {(isPrivileged || role === 'recruiter') && (
              <section className="bg-[var(--card-bg)] p-5 sm:p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
                  <Layers size={12} className="text-[var(--primary-gold)]" /> Pipeline Stage
                </h3>
                <div className="space-y-3.5">
                  <div className="relative">
                    <select 
                      value={assignedStage}
                      onChange={(e) => setAssignedStage(e.target.value)}
                      className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl pl-4 pr-10 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] appearance-none cursor-pointer font-bold"
                    >
                      {STAGES_LIST.map((stage) => (
                        <option key={stage.id} value={stage.id}>{stage.label} ({stage.parentLabel})</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-3.5 text-[var(--text-muted)] pointer-events-none" />
                  </div>
                  <button 
                    onClick={handleUpdateStage}
                    disabled={isSavingStage}
                    className="w-full py-2 crm-btn-gold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSavingStage ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />} 
                    Update Pipeline Stage
                  </button>
                </div>
              </section>
            )}

            {/* Follow-Up reminder module */}
            <section className="bg-[var(--card-bg)] p-5 sm:p-6 rounded-[2rem] text-[var(--text-primary)] border border-[var(--border-color)] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--primary-gold)] flex items-center gap-2">
                  <Clock size={12} /> Follow-Up Scheduler
                </h3>
                {candidate.followUpUpdatedBy && (
                  <span className="text-[8px] font-black text-[var(--primary-gold)] uppercase tracking-widest bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded-md shrink-0 border border-[var(--border-color)]">
                    By: {teamMembers?.[candidate.followUpUpdatedBy] || 'Sourcing'}
                  </span>
                )}
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-[var(--text-muted)] ml-1 tracking-wider">Next reminder date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-[var(--primary-gold)]" size={13} />
                    <input 
                      type="datetime-local" 
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-[var(--text-muted)] ml-1 tracking-wider">Task notes / Reminders</label>
                  <textarea 
                     value={followUpNote}
                     onChange={(e) => setFollowUpNote(e.target.value)}
                     placeholder="e.g. Discussed experience gap; schedule next step interview..."
                     className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-xs h-24 focus:outline-none focus:ring-1 focus:ring-[var(--primary-gold)] placeholder:text-[var(--text-muted)] text-[var(--text-primary)] font-medium"
                  />
                </div>
                <button 
                  onClick={handleSaveFollowUp}
                  disabled={isSaving}
                  className="w-full py-2 crm-btn-gold text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />} 
                  Update Task
                </button>
                <button 
                  onClick={handleCompleteFollowUp}
                  disabled={isCompleting}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                >
                  {isCompleting ? <Loader2 className="animate-spin" size={12} /> : <CheckCircle2 size={12} />} 
                  Mark Complete
                </button>
              </div>

              {/* Follow-Up Communication history timeline */}
              <div className="mt-5 pt-4 border-t border-[var(--border-color)]">
                <h4 className="text-[9px] font-black uppercase tracking-widest text-[var(--primary-gold)] mb-3 flex items-center gap-1.5">
                  <StickyNote size={10} /> Scheduler logs
                </h4>
                {candidate.internalNotesLog && candidate.internalNotesLog.filter((log: any) => log.type === 'follow_up' || log.type === 'follow_up_completed' || log.noteContent?.includes('⏰') || log.noteContent?.includes('✅')).length > 0 ? (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {candidate.internalNotesLog
                      .filter((log: any) => log.type === 'follow_up' || log.type === 'follow_up_completed' || log.noteContent?.includes('⏰') || log.noteContent?.includes('✅'))
                      .slice()
                      .reverse()
                      .map((log: any, i: number) => {
                        return (
                          <div key={i} className="text-[10px] text-[var(--text-secondary)] space-y-1 bg-[var(--bg-secondary)] p-2.5 rounded-xl border border-[var(--border-color)]">
                            <div className="flex justify-between items-center text-[8px]">
                              <span className="font-bold text-[var(--primary-gold)]">{log.author}</span>
                              <span className="text-[var(--text-muted)] font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-[10px] leading-relaxed select-text font-medium text-[var(--text-primary)]">{log.noteContent}</p>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-[9px] text-[var(--text-muted)] italic font-medium">No reminder history logged.</p>
                )}
              </div>
            </section>

            {/* Recruiter Activity / Communication log panel */}
            <section className="bg-[var(--card-bg)] p-5 sm:p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
                <StickyNote size={12} className="text-[var(--primary-gold)]" /> Recruiter notes
              </h3>
              <div className="space-y-3">
                <textarea 
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Type a new comment or assessment here..."
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-2xl p-4 text-xs h-24 focus:outline-none focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-medium"
                />
                <button 
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="w-full py-2 crm-btn-gold text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingNotes ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />} 
                  Add Note
                </button>
              </div>
              <div className="mt-5 space-y-3.5 pt-4 border-t border-[var(--border-color)]/70 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                {candidate.internalNotesLog && candidate.internalNotesLog.filter((log: any) => !(log.type === 'follow_up' || log.type === 'follow_up_completed' || log.noteContent?.includes('⏰') || log.noteContent?.includes('✅'))).length > 0 ? (
                  candidate.internalNotesLog
                    .filter((log: any) => !(log.type === 'follow_up' || log.type === 'follow_up_completed' || log.noteContent?.includes('⏰') || log.noteContent?.includes('✅')))
                    .slice()
                    .reverse()
                    .map((log: any, i: number) => {
                      return (
                        <div key={i} className="text-[10px] text-[var(--text-secondary)] space-y-1 p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/50 border-[var(--border-color)]">
                          <div className="flex justify-between items-center">
                             <span className="font-extrabold text-indigo-500">
                               {log.author}
                             </span>
                             <span className="text-[var(--text-muted)] font-mono text-[8px]">{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="leading-relaxed select-text font-medium">{log.noteContent}</p>
                        </div>
                      );
                    })
                ) : (
                  <p className="text-[10px] text-[var(--text-muted)] italic font-medium">No notes posted yet.</p>
                )}
              </div>
            </section>

            {/* Candidate Metadata profile audit logs */}
            <section className="bg-slate-50/20 dark:bg-slate-900/10 p-5 sm:p-6 rounded-[2rem] border border-[var(--border-color)]/70 shadow-sm text-[10px] font-bold">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4">Metadata Audit Logs</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-[var(--border-color)]/50 pb-2">
                  <span className="text-[var(--text-muted)]">Indexed on</span>
                  <span className="font-mono text-[var(--text-secondary)]">{formatDate(candidate.createdAt)}</span>
                </div>
                {candidate.uploadedBy && (
                  <div className="flex justify-between items-center border-b border-[var(--border-color)]/50 pb-2">
                    <span className="text-[var(--text-muted)]">Uploaded by</span>
                    {role === 'developer' ? (
                      <select
                        value={uploadedBy}
                        onChange={async (e) => {
                          const newId = e.target.value;
                          setUploadedBy(newId);
                          if (onUpdateUploader) {
                            await onUpdateUploader(candidate.id, newId);
                          }
                        }}
                        className="crm-input text-[10px] py-1 px-2 font-bold max-w-[150px]"
                      >
                        {fullTeamList && fullTeamList.length > 0 ? (
                          fullTeamList.map(m => (
                            <option key={m.id || m.uid} value={m.id || m.uid}>{m.name || m.email}</option>
                          ))
                        ) : (
                          Object.entries(teamMembers).map(([uid, name]) => (
                            <option key={uid} value={uid}>{name}</option>
                          ))
                        )}
                      </select>
                    ) : candidate.uploadedBy !== user?.uid ? (
                      <button 
                        onClick={() => onContact(candidate.uploadedBy)}
                        className="flex items-center gap-1 text-indigo-500 hover:text-indigo-600 font-black group uppercase text-[9px] tracking-wider"
                      >
                        {teamMembers?.[candidate.uploadedBy] || 'AI Sourcing'}
                        <MessageSquare size={9} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ) : (
                      <span className="font-bold text-[var(--text-secondary)] uppercase text-[9px]">
                        {teamMembers?.[candidate.uploadedBy] || '(me)'}
                      </span>
                    )}
                  </div>
                )}
                {candidate.assignedTo && (
                  <div className="flex justify-between items-center border-b border-[var(--border-color)]/50 pb-2">
                    <span className="text-[var(--text-muted)]">
                      {isPrivileged ? 'Assigned recruiter' : 'Assigned manager'}
                    </span>
                    <span className="font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-wide">
                      {isPrivileged 
                        ? `${teamMembers?.[candidate.assignedTo] || 'Recruiter'}` 
                        : `${teamMembers?.[candidate.assignedBy] || 'Admin'}`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">Shortlist State</span>
                  <span className={candidate.isShortlisted ? 'text-amber-500' : 'text-[var(--text-muted)]'}>
                    {candidate.isShortlisted ? 'YES (SHORTLISTED)' : 'NO (STANDARD)'}
                  </span>
                </div>
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
