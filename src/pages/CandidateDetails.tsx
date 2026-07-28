import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, onSnapshot, collection, query, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  ArrowLeft, Download, Star, StarOff, Briefcase, GraduationCap, Mail, Phone, 
  Code, Globe, Clock, Save, Calendar, Loader2, StickyNote, Users, Search, 
  MessageSquare, ChevronDown, Linkedin, Github, Twitter, ExternalLink, 
  CheckCircle2, MapPin, Trash, Trash2, Plus, Layers, FileText 
} from 'lucide-react';
import LZString from 'lz-string';

import { useAuth } from '../contexts/AuthContext';
import { useTimezone } from '../contexts/TimezoneContext';
import { logActivity } from '../services/activityService';
import { createNotification, formatNotificationMessage } from '../services/notificationService';
import ConfirmModal from '../components/ConfirmModal';
import { fetchCvList } from '../services/cvApiService';
import { STAGES, getStageConfig } from '../lib/pipelineStages';

const STAGES_LIST = STAGES;

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

export default function CandidateDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role, isPrivileged, getUserDisplayName, getUserRole } = useAuth();
  const { formatDate } = useTimezone();

  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Team members list
  const [teamMembers, setTeamMembers] = useState<Record<string, string>>({});
  const [fullTeamList, setFullTeamList] = useState<any[]>([]);

  // Local state for edits & updates
  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [assignedClientId, setAssignedClientId] = useState('');
  const [assignedStage, setAssignedStage] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [isSavingStage, setIsSavingStage] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isSavingLoc, setIsSavingLoc] = useState(false);
  const [isSavingAssignee, setIsSavingAssignee] = useState(false);

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

  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [isFetchingCV, setIsFetchingCV] = useState<boolean>(false);

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

  // Fetch Team/Users list
  useEffect(() => {
    const unsubTeam = onSnapshot(query(collection(db, 'users'), limit(50)), (snapshot) => {
      const team: Record<string, string> = {};
      const fullList: any[] = [];
      snapshot.docs.forEach((doc) => {
        const u = doc.data();
        if (u.name) {
          team[doc.id] = u.name;
        } else {
          team[doc.id] = u.email || doc.id;
        }
        fullList.push({ id: doc.id, ...u });
      });
      setTeamMembers(team);
      setFullTeamList(fullList);
    });

    return () => unsubTeam();
  }, []);

  // Fetch Candidate Details
  useEffect(() => {
    if (!id) return;

    const unsubCandidate = onSnapshot(doc(db, 'candidates', id), (snapshot) => {
      if (snapshot.exists()) {
        const data = { id: snapshot.id, ...snapshot.data() } as any;
        setCandidate(data);
        
        // Populate local states
        setFollowUpNote(data.followUpNote || '');
        setFollowUpDate(data.followUpDate || '');
        setGeneralNotes(data.notes || '');
        setAssignedTo(data.assignedTo || '');
        setAssignedClientId(data.clientId || '');
        setAssignedStage(data.pipelineStage || 'cv_upload');
        setSkills(data.skills || []);

        setCity(data.locationInfo?.city || '');
        setState(data.locationInfo?.state || '');
        setCountry(data.locationInfo?.country || '');
        setPostalCode(data.locationInfo?.postalCode || '');

        setEditedFullName(data.fullName || '');
        setEditedSummary(data.summary || '');
        setEditedDomain(data.domain || '');
        setEditedDomainFocus(data.domainFocus || '');
        setEditedExperience(data.experience || []);
        setEditedEducation(data.education || []);
        setEditedProjects(data.projects || []);
        setEditedCertifications(data.certifications || []);
        setEditedAchievements(data.achievements || []);
        setEditedSkills(data.skills || []);
        setEditedEmail(data.email || '');
        setEditedPhone(data.phone || '');

        let initialCvUrl = data.url;
        if (!initialCvUrl && data.links) {
          const cvLink = data.links.find((l: any) => 
            l.label?.toLowerCase().includes('cv') || 
            l.label?.toLowerCase().includes('resume') ||
            l.url?.toLowerCase().endsWith('.pdf')
          );
          if (cvLink) {
            initialCvUrl = cvLink.url;
          }
        }
        setCvUrl(initialCvUrl || null);
      }
      setLoading(false);
    });

    return () => unsubCandidate();
  }, [id]);

  // Fetch CV link from resume service on demand
  const fetchCVUrl = async () => {
    if (!candidate?.cid && !candidate?.email) return;
    setIsFetchingCV(true);
    try {
      const cvList = await fetchCvList();
      let matchedCV = cvList.find((item: any) => 
        String(item.id) === String(candidate.cid)
      );
      if (!matchedCV && candidate.email) {
        matchedCV = cvList.find((item: any) => 
          item.email?.toLowerCase() === candidate.email?.toLowerCase()
        );
      }
      if (matchedCV) {
        setCvUrl(matchedCV.url);
      }
    } catch (err) {
      console.warn('[CandidateDetails] CV sync fetch failed:', (err as Error).message);
    } finally {
      setIsFetchingCV(false);
    }
  };

  useEffect(() => {
    if (candidate?.cid && !cvUrl) {
      fetchCVUrl();
    }
  }, [candidate, cvUrl]);

  const handleDownload = async () => {
    const originalName = candidate.originalFileName || 'Resume';
    const finalUrl = cvUrl || candidate.url;
    const extension = (finalUrl || originalName || 'file.pdf').split('?')[0].split('.').pop()?.toLowerCase() || 'pdf';
    const fileName = `${candidate.fullName?.replace(/\s+/g, '_') || 'Candidate'}_CV.${extension}`;

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

    if (finalUrl) {
      try {
        const link = document.createElement('a');
        link.href = finalUrl;
        link.setAttribute('download', fileName);
        link.setAttribute('target', '_blank');
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
    try {
      await updateDoc(doc(db, 'candidates', candidate.id), { isShortlisted: newStatus });
      const action = newStatus ? "shortlisted candidate" : "removed from shortlist";
      const purpose = newStatus ? "Candidate shortlisted" : "Candidate removed from shortlist";

      const message = formatNotificationMessage(
        getUserDisplayName(),
        getUserRole(),
        `${action} candidate ${candidate.fullName} — ${purpose}`
      );
      await createNotification(
        message,
        user!.uid,
        getUserDisplayName(),
        getUserRole(),
        'all',
        candidate.id
      );

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
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveFollowUp = async () => {
    if (!followUpDate) {
      showAlert('Required Date', 'Please select a date for the follow-up reminder.');
      return;
    }
    setIsSaving(true);
    try {
      const existingLogs = candidate?.internalNotesLog || [];
      const dateStr = followUpDate ? formatDate(followUpDate) : 'No Date';
      const logEntry = {
        author: user?.displayName || user?.email || 'Unknown',
        timestamp: new Date().toISOString(),
        noteContent: `⏰ Follow-up reminder set for ${dateStr}. Details: ${followUpNote || '(No additional notes)'}`,
        candidateName: candidate?.fullName || 'Candidate',
        type: 'follow_up'
      };
      const updatedLogs = [...existingLogs, logEntry];

      await updateDoc(doc(db, 'candidates', candidate.id), { 
        followUpNote,
        followUpDate,
        followUpUpdatedBy: user?.uid,
        internalNotesLog: updatedLogs,
        updatedAt: new Date().toISOString()
      });

      const message = formatNotificationMessage(
        getUserDisplayName(),
        getUserRole(),
        `Updated follow-up status for candidate ${candidate.fullName}`
      );
      await createNotification(
        message,
        user!.uid,
        getUserDisplayName(),
        getUserRole(),
        'all',
        candidate.id
      );

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
      showAlert('Success', 'Follow-up updated successfully.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteFollowUp = async () => {
    setIsCompleting(true);
    try {
      const existingLogs = candidate?.internalNotesLog || [];
      const logEntry = {
        author: user?.displayName || user?.email || 'Unknown',
        timestamp: new Date().toISOString(),
        noteContent: `✅ Completed follow-up. Previous note: ${candidate?.followUpNote || '(None)'}`,
        candidateName: candidate?.fullName || 'Candidate',
        type: 'follow_up_completed'
      };
      const updatedLogs = [...existingLogs, logEntry];

      await updateDoc(doc(db, 'candidates', candidate.id), { 
        followUpNote: '',
        followUpDate: '',
        followUpStatus: 'completed',
        internalNotesLog: updatedLogs,
        updatedAt: new Date().toISOString()
      });

      setFollowUpNote('');
      setFollowUpDate('');
      showAlert('Success', 'Follow-up marked as completed.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!generalNotes.trim()) {
      showAlert('Required Notes', 'Please type a feedback note to add.');
      return;
    }
    setIsSavingNotes(true);
    try {
      const existingLogs = candidate?.internalNotesLog || [];
      const newLogEntry = {
        author: user?.displayName || user?.email || 'Unknown',
        timestamp: new Date().toISOString(),
        noteContent: generalNotes,
        candidateName: candidate?.fullName || 'Candidate'
      };
      const updatedLogs = [...existingLogs, newLogEntry];

      await updateDoc(doc(db, 'candidates', candidate.id), { 
        notes: generalNotes,
        internalNotesLog: updatedLogs,
        notesUpdatedBy: user?.uid,
        updatedAt: new Date().toISOString()
      });

      const message = formatNotificationMessage(
        getUserDisplayName(),
        getUserRole(),
        `Added feedback for candidate ${candidate.fullName}`
      );
      await createNotification(
        message,
        user!.uid,
        getUserDisplayName(),
        getUserRole(),
        'all',
        candidate.id
      );

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
      setGeneralNotes('');
      showAlert('Success', 'Notes updated successfully.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleUpdateAssignee = async () => {
    setIsSavingAssignee(true);
    
    // Play audio notification feedback
    const audio = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_3230617233.mp3?filename=message-124468.mp3');
    audio.play().catch(e => console.warn('Audio feedback notification skipped:', e));

    try {
      const isRemoval = assignedTo === '';
      await updateDoc(doc(db, 'candidates', candidate.id), { 
        assignedTo,
        assignedBy: user?.uid,
        updatedAt: new Date().toISOString()
      });
      
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
    setIsSavingClient(true);
    try {
      const isRemoval = assignedClientId === '';
      await updateDoc(doc(db, 'candidates', candidate.id), {
        clientId: assignedClientId || null,
        clientAssignedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const clientsList = fullTeamList.filter(u => u.role === 'client');
      const clientUser = clientsList.find(c => c.id === assignedClientId);
      const clientName = clientUser ? (clientUser.name || clientUser.email) : 'Client';

      const activityAction = isRemoval ? 'Client Assignment Removed' : 'Client Assigned'; 
      await logActivity(
        getUserDisplayName(),
        user!.uid,
        getUserRole(),
        activityAction,
        candidate.fullName || 'Candidate',
        assignedClientId ? clientName : null,
        isRemoval ? 'Client assignment removed' : `Assigned to Client ${clientName}`,
        'Candidate Client Assignment'
      );
      
      showAlert('Success', isRemoval ? 'Client assignment removed successfully.' : 'Candidate assigned to client successfully.');
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
      const timestamp = new Date().toISOString();
      const author = getUserDisplayName() || user?.email || 'System';

      const updateData: any = {
        pipelineStage: assignedStage,
        status: assignedStage,
        updatedAt: timestamp
      };

      const currentStageHistory = candidate.stageHistory || [];
      const isDuplicateStage = currentStageHistory.some((h: any) => h.stage === assignedStage);
      if (!isDuplicateStage) {
        updateData.stageHistory = [
          ...currentStageHistory,
          { stage: assignedStage, timestamp, author }
        ];
      }

      await updateDoc(doc(db, 'candidates', candidate.id), updateData);

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

  const handleSaveCandidateProfile = async () => {
    setIsSaving(true);
    try {
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
      } else if (role === 'admin' || role === 'team_leader') {
        updateData.fullName = editedFullName.trim();
      }

      await updateDoc(doc(db, 'candidates', candidate.id), updateData);
      
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
  const handleUpdateProject = (index: number, key: string, value: string) => {
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

  const handleDeleteCandidate = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Candidate',
      message: `Are you sure you want to permanently delete ${candidate?.fullName || 'this candidate'}? This action cannot be undone.`,
      variant: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'candidates', id!));
          try {
            await logActivity(
              getUserDisplayName(),
              user?.uid || '',
              getUserRole(),
              'Delete Candidate',
              candidate?.fullName || 'Candidate',
              null,
              `Deleted candidate record: ${candidate?.fullName || id}`,
              'Candidates'
            );
          } catch (e) {
            console.warn("Failed to log activity:", e);
          }
          navigate('/candidates');
        } catch (err) {
          console.error('Error deleting candidate:', err);
        }
      }
    });
  };

  const renderHighlightedText = (text: string) => {
    if (!searchTerm.trim()) return text;
    const terms = searchTerm.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    if (terms.length === 0) return text;

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-10">
        <div className="flex flex-col items-center gap-4 text-slate-500 font-bold">
          <Loader2 size={36} className="animate-spin text-indigo-600" />
          <p className="animate-pulse">Loading Candidate Profile Workspace...</p>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-10">
        <div className="text-center crm-card p-8 rounded-3xl max-w-md shadow-lg">
          <p className="text-lg font-bold text-rose-500 mb-4">Profile Not Found</p>
          <p className="text-sm text-[var(--text-secondary)] mb-6">This candidate may have been removed or index is corrupt.</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="crm-btn-gold"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300 font-sans pb-16">
      
      {/* Dynamic Sub-header Navigation bar */}
      <div className="border-b border-[var(--border-color)] bg-[var(--card-bg)]/80 backdrop-blur-md sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="group flex items-center gap-2.5 text-xs font-black text-[var(--text-muted)] hover:text-[var(--primary-gold)] uppercase tracking-widest transition-colors duration-200"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back to candidates</span>
          </button>
          
          <div className="flex items-center gap-3">
            {/* Quick Boolean Search bar */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2 flex items-center gap-3 w-64 md:w-80 transition-all focus-within:ring-2 focus-within:ring-[var(--primary-gold)]/20 focus-within:border-[var(--primary-gold)]">
              <Search size={13} className="text-[var(--primary-gold)]" />
              <input 
                type="text" 
                placeholder="Live keyword highlighting..."
                className="flex-1 bg-transparent border-none focus:outline-none text-xs font-mono placeholder:font-sans text-[var(--text-primary)]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <Plus size={12} className="rotate-45" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Main Workspace Header Card */}
        <header className="crm-card p-6 sm:p-8 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5 min-w-0 flex-1">
            <div className="w-16 h-16 crm-btn-gold rounded-2xl flex items-center justify-center text-white text-xl sm:text-2xl font-black shadow-md uppercase shrink-0">
              {(candidate.fullName || '??').slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editedFullName} 
                    onChange={(e) => setEditedFullName(e.target.value)} 
                    className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-1.5 text-lg focus:outline-none focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-black shadow-sm"
                    placeholder="Candidate Name"
                  />
                ) : (
                  <h1 className="text-xl sm:text-3xl font-black text-[var(--text-primary)] leading-tight tracking-tight">{candidate.fullName || 'Unnamed Candidate'}</h1>
                )}
                {!isEditing && (
                  <button 
                    onClick={handleShortlistClick}
                    disabled={!isPrivileged && role !== 'recruiter'}
                    className={`p-1.5 rounded-xl transition-all shrink-0 ${!isPrivileged && role !== 'recruiter' ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 active:scale-95'} ${candidate.isShortlisted ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'text-[var(--text-muted)] hover:text-amber-500'}`}
                  >
                    {candidate.isShortlisted ? <Star fill="currentColor" size={20} /> : <StarOff size={20} />}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap text-xs font-bold">
                {isEditing && role === 'developer' ? (
                  <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                    <input 
                      type="text" 
                      value={editedDomainFocus} 
                      onChange={(e) => setEditedDomainFocus(e.target.value)} 
                      className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)]"
                      placeholder="e.g. Full-Stack Engineer"
                    />
                    <input 
                      type="text" 
                      value={editedDomain} 
                      onChange={(e) => setEditedDomain(e.target.value)} 
                      className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)]"
                      placeholder="e.g. Technology"
                    />
                  </div>
                ) : (
                  <>
                    <span className="crm-badge-gold text-xs uppercase tracking-widest">
                      {candidate.domainFocus || candidate.domain || 'Uncategorized'}
                    </span>
                    <span className="text-[var(--text-muted)]">•</span>
                    <span className="text-[var(--text-muted)] uppercase tracking-wider">
                      {candidate.domain || 'General'}
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

          {/* Header Action Toolbar */}
          <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-end flex-wrap shrink-0">
            {(role === 'developer' || role === 'admin' || role === 'team_leader') && (
              <>
                {isEditing ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleSaveCandidateProfile}
                      disabled={isSaving}
                      className="crm-btn-gold"
                    >
                      {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      <span>Save Workspace</span>
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      disabled={isSaving}
                      className="crm-btn-secondary"
                    >
                      <span>Cancel</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="crm-btn-gold"
                  >
                    <Code size={13} />
                    <span>{role === 'developer' ? 'Edit Profile' : 'Edit Name'}</span>
                  </button>
                )}
              </>
            )}
            
            {(role === 'admin' || role === 'developer' || role === 'team_leader' || candidate.uploadedBy === user?.uid) && (
              <button
                onClick={handleDeleteCandidate}
                className="px-3 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-rose-200 dark:border-rose-900/50"
                title="Delete Candidate"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            )}

            {(role === 'admin' || role === 'developer' || candidate.uploadedBy === user?.uid) && (cvUrl || candidate.url || candidate.compressedText || candidate.cid) && (
              <>
                <button 
                  onClick={handleView}
                  disabled={isFetchingCV}
                  className="crm-btn-gold"
                >
                  {isFetchingCV ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
                  <span>{isFetchingCV ? 'Syncing...' : 'View Original'}</span>
                </button>
                <button 
                  onClick={handleDownload}
                  disabled={isFetchingCV}
                  className="crm-btn-secondary"
                >
                  {isFetchingCV ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  <span>Download CV</span>
                </button>
              </>
            )}
          </div>
        </header>

        {/* Large Index Processing Warning banner */}
        {candidate.isLargeFile && !(cvUrl || candidate.url) && (
          <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-950/15 border border-amber-100/20 rounded-2xl flex items-center gap-3">
            <span className="flex-shrink-0 w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Loader2 className="animate-spin" size={15} />
            </span>
            <p className="text-xs text-amber-800 dark:text-amber-200 font-bold">
              Large Index Frame: Extracting detailed PDF. Fallback document text is available inside sections below.
            </p>
          </div>
        )}

        {/* Double-Column Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT 2 COLUMNS: Profile Experience, Education, Projects */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Professional Summary */}
            <section className="crm-card p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                  <Globe size={14} className="text-[var(--primary-gold)]" /> Executive Summary
                </h3>
              </div>
              {isEditing && role === 'developer' ? (
                <textarea
                  value={editedSummary}
                  onChange={(e) => setEditedSummary(e.target.value)}
                  className="w-full h-36 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-4 text-sm focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-medium leading-relaxed"
                  placeholder="Enter executive summary..."
                />
              ) : (
                <p className="text-[var(--text-secondary)] leading-relaxed text-sm italic border-l-2 border-[var(--primary-gold)] pl-4 select-text">
                  "{renderHighlightedText(candidate.summary || 'No executive summary extracted.')}"
                </p>
              )}
            </section>

            {/* Work History timeline */}
            <section className="crm-card p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                  <Briefcase size={14} className="text-[var(--primary-gold)]" /> Professional timeline
                </h3>
                {isEditing && role === 'developer' && (
                  <button
                    onClick={handleAddExperience}
                    className="crm-btn-secondary text-[10px]"
                  >
                    <Plus size={11} /> Add Experience
                  </button>
                )}
              </div>
              
              {isEditing && role === 'developer' ? (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                  {editedExperience.map((exp: any, i: number) => (
                    <div key={i} className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl relative flex flex-col gap-3">
                      <button
                        onClick={() => handleRemoveExperience(i)}
                        className="absolute top-3 right-3 text-rose-500 hover:text-rose-600 transition-colors p-1"
                        title="Remove work history entry"
                      >
                        <Trash2 size={16} />
                      </button>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider">Role / Title</label>
                          <input
                            type="text"
                            value={exp.role || ''}
                            onChange={(e) => handleUpdateExperience(i, 'role', e.target.value)}
                            className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-bold"
                            placeholder="e.g. Senior Frontend Engineer"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider">Company</label>
                          <input
                            type="text"
                            value={exp.company || ''}
                            onChange={(e) => handleUpdateExperience(i, 'company', e.target.value)}
                            className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-bold"
                            placeholder="e.g. Google"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider">Duration</label>
                          <input
                            type="text"
                            value={exp.duration || ''}
                            onChange={(e) => handleUpdateExperience(i, 'duration', e.target.value)}
                            className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-bold"
                            placeholder="e.g. Jan 2021 - Present"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider">Job Description</label>
                        <textarea
                          value={exp.description || ''}
                          onChange={(e) => handleUpdateExperience(i, 'description', e.target.value)}
                          className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] h-24"
                          placeholder="Describe responsibilities and achievements..."
                        />
                      </div>
                    </div>
                  ))}
                  {editedExperience.length === 0 && (
                    <p className="text-[var(--text-muted)] text-center py-6 text-xs font-semibold">No experience entries. Click "Add Experience" to start.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {candidate.experience?.map((exp: any, i: number) => (
                    <div key={i} className="relative pl-6 border-l-2 border-[var(--border-color)] hover:border-[var(--primary-gold)] transition-all duration-300">
                      <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-[var(--primary-gold)] border-2 border-[var(--card-bg)] shadow-sm" />
                      <h4 className="font-extrabold text-[var(--text-primary)] text-sm tracking-tight">{renderHighlightedText(exp.role)}</h4>
                      <p className="text-[var(--primary-gold)] text-xs font-bold mt-0.5">{renderHighlightedText(exp.company)} • {renderHighlightedText(exp.duration)}</p>
                      <p className="text-[var(--text-secondary)] text-xs mt-2 leading-relaxed select-text">{renderHighlightedText(exp.description)}</p>
                    </div>
                  ))}
                  {(!candidate.experience || candidate.experience.length === 0) && (
                    <p className="text-xs italic text-[var(--text-muted)] text-center py-4">No work history entries extracted.</p>
                  )}
                </div>
              )}
            </section>

            {/* Academic Credentials */}
            <section className="crm-card p-6 sm:p-8 rounded-[2.5rem]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                  <GraduationCap size={14} className="text-[var(--primary-gold)]" /> Academic Credentials
                </h3>
                {isEditing && role === 'developer' && (
                  <button
                    onClick={handleAddEducation}
                    className="text-[10px] font-black text-[var(--primary-gold)] uppercase tracking-widest transition-colors flex items-center gap-1 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-xl border border-[var(--border-color)]"
                  >
                    <Plus size={11} /> Add Education
                  </button>
                )}
              </div>

              {isEditing && role === 'developer' ? (
                <div className="space-y-4">
                  {editedEducation.map((edu: any, i: number) => (
                    <div key={i} className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl relative flex flex-col gap-2.5">
                      <button
                        onClick={() => handleRemoveEducation(i)}
                        className="absolute top-3 right-3 text-rose-500 hover:text-rose-600 transition-colors p-1"
                        title="Remove education entry"
                      >
                        <Trash2 size={16} />
                      </button>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider">Degree / Course</label>
                          <input
                            type="text"
                            value={edu.degree || ''}
                            onChange={(e) => handleUpdateEducation(i, 'degree', e.target.value)}
                            className="crm-input text-xs"
                            placeholder="e.g. B.S. Computer Science"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider">School / University</label>
                          <input
                            type="text"
                            value={edu.school || ''}
                            onChange={(e) => handleUpdateEducation(i, 'school', e.target.value)}
                            className="crm-input text-xs"
                            placeholder="e.g. Stanford University"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider">Year</label>
                          <input
                            type="text"
                            value={edu.year || ''}
                            onChange={(e) => handleUpdateEducation(i, 'year', e.target.value)}
                            className="crm-input text-xs"
                            placeholder="e.g. 2018 - 2022"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {editedEducation.length === 0 && (
                    <p className="text-[var(--text-muted)] text-center py-6 text-xs font-semibold">No education entries. Click "Add Education" to start.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {candidate.education?.map((edu: any, i: number) => (
                    <div key={i} className="relative pl-6 border-l-2 border-[var(--border-color)]/70 hover:border-emerald-500/50 transition-all duration-300">
                      <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--bg-primary)] shadow-sm" />
                      <h4 className="font-extrabold text-[var(--text-primary)] text-sm tracking-tight">{edu.degree}</h4>
                      <p className="text-emerald-600 dark:text-emerald-400 text-xs font-bold mt-0.5">{edu.school} • {edu.year}</p>
                    </div>
                  ))}
                  {(!candidate.education || candidate.education.length === 0) && (
                    <p className="text-xs italic text-[var(--text-muted)] text-center py-4">No academic credentials extracted.</p>
                  )}
                </div>
              )}
            </section>

            {/* Key Projects */}
            {((candidate.projects && candidate.projects.length > 0) || (isEditing && role === 'developer')) && (
              <section className="crm-card p-6 sm:p-8 rounded-[2.5rem]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                    <Star size={14} className="text-[var(--primary-gold)]" /> Key Projects
                  </h3>
                  {isEditing && role === 'developer' && (
                    <button
                      onClick={handleAddProject}
                      className="text-[10px] font-black text-[var(--primary-gold)] uppercase tracking-widest transition-colors flex items-center gap-1 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-xl border border-[var(--border-color)]"
                    >
                      <Plus size={11} /> Add Project
                    </button>
                  )}
                </div>
                {isEditing && role === 'developer' ? (
                  <div className="space-y-4">
                    {editedProjects.map((project: any, i: number) => (
                      <div key={i} className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl relative flex flex-col gap-2.5">
                        <button
                          onClick={() => handleRemoveProject(i)}
                          className="absolute top-3 right-3 text-rose-500 hover:text-rose-600 transition-colors p-1"
                          title="Remove project"
                        >
                          <Trash2 size={16} />
                        </button>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider">Project Title</label>
                            <input
                              type="text"
                              value={project.title || ''}
                              onChange={(e) => handleUpdateProject(i, 'title', e.target.value)}
                              className="crm-input text-xs"
                              placeholder="e.g. ATS Platform Rewrite"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider">Link / Repo</label>
                            <input
                              type="text"
                              value={project.link || ''}
                              onChange={(e) => handleUpdateProject(i, 'link', e.target.value)}
                              className="crm-input text-xs"
                              placeholder="e.g. https://github.com/..."
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider">Description</label>
                          <textarea
                            value={project.description || ''}
                            onChange={(e) => handleUpdateProject(i, 'description', e.target.value)}
                            className="crm-input text-xs h-16"
                            placeholder="Describe project details..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {candidate.projects?.map((project: any, i: number) => (
                      <div key={i} className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-extrabold text-[var(--text-primary)] text-xs tracking-tight">{project.title}</h4>
                          {project.link && (
                            <a href={project.link} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-[var(--primary-gold)] hover:underline flex items-center gap-1">
                              View Project <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                        <p className="text-[var(--text-secondary)] text-xs leading-relaxed select-text">
                          {project.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Certifications and Achievements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {((candidate.certifications && candidate.certifications.length > 0) || (isEditing && role === 'developer')) && (
                <section className="crm-card p-6 sm:p-8 rounded-[2.5rem]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                      <Star size={14} className="text-amber-500" /> Certifications
                    </h3>
                    {isEditing && role === 'developer' && (
                      <button
                        onClick={handleAddCert}
                        className="text-[9px] font-black text-[var(--primary-gold)] uppercase tracking-widest transition-colors flex items-center gap-1 bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-color)]"
                      >
                        <Plus size={10} /> Add Cert
                      </button>
                    )}
                  </div>
                  {isEditing && role === 'developer' ? (
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                      {editedCertifications.map((cert: string, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={cert}
                            onChange={(e) => handleUpdateCert(i, e.target.value)}
                            className="flex-1 crm-input text-xs"
                            placeholder="e.g. AWS Certified Solutions Architect"
                          />
                          <button
                            onClick={() => handleRemoveCert(i)}
                            className="text-rose-500 hover:text-rose-600 p-1"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {candidate.certifications?.map((cert: string, i: number) => (
                        <div key={i} className="p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-primary)]">
                          {cert}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {((candidate.achievements && candidate.achievements.length > 0) || (isEditing && role === 'developer')) && (
                <section className="crm-card p-6 sm:p-8 rounded-[2.5rem]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                      <Globe size={14} className="text-emerald-500" /> Key Achievements
                    </h3>
                    {isEditing && role === 'developer' && (
                      <button
                        onClick={handleAddAchievement}
                        className="text-[9px] font-black text-[var(--primary-gold)] uppercase tracking-widest transition-colors flex items-center gap-1 bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-color)]"
                      >
                        <Plus size={10} /> Add
                      </button>
                    )}
                  </div>
                  {isEditing && role === 'developer' ? (
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                      {editedAchievements.map((ach: string, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={ach}
                            onChange={(e) => handleUpdateAchievement(i, e.target.value)}
                            className="flex-1 crm-input text-xs"
                            placeholder="e.g. Reduced latency by 45%"
                          />
                          <button
                            onClick={() => handleRemoveAchievement(i)}
                            className="text-rose-500 hover:text-rose-600 p-1"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ul className="space-y-2.5 select-text">
                      {candidate.achievements?.map((ach: string, i: number) => (
                        <li key={i} className="text-xs text-[var(--text-secondary)] flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                          <span>{ach}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Recruiter Workflow Assignees, Notes, Location details */}
          <div className="space-y-8">
            
            {/* Pipeline Stage Selector */}
            {(isPrivileged || role === 'recruiter') && (
              <section className="crm-card p-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
                  <Layers size={14} className="text-[var(--primary-gold)]" /> Pipeline Stage
                </h3>
                <div className="space-y-3">
                  <div className="relative">
                    <select 
                      value={assignedStage}
                      onChange={(e) => setAssignedStage(e.target.value)}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl pl-4 pr-10 py-2.5 text-xs focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] appearance-none cursor-pointer font-bold"
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
                    className="crm-btn-gold w-full text-[10px]"
                  >
                    {isSavingStage ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />} 
                    Update Pipeline Stage
                  </button>
                </div>
              </section>
            )}

            {/* Recruiter Assignment Panel */}
            {isPrivileged && (
              <section className="crm-card p-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
                  <Users size={14} className="text-[var(--primary-gold)]" /> Recruiter Assignee
                </h3>
                <div className="space-y-3">
                  <div className="relative">
                    <select 
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl pl-4 pr-10 py-2.5 text-xs focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] appearance-none cursor-pointer font-bold"
                    >
                      <option value="">Unassigned</option>
                      {Object.entries(teamMembers).map(([id, name]) => (
                        <option key={id} value={id}>{name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-3.5 text-[var(--text-muted)] pointer-events-none" />
                  </div>
                  <button 
                    onClick={handleUpdateAssignee}
                    disabled={isSavingAssignee}
                    className="crm-btn-gold w-full text-[10px]"
                  >
                    {isSavingAssignee ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />} 
                    Update Assignee
                  </button>
                </div>
              </section>
            )}

            {/* Client Assignment Panel */}
            {(isPrivileged || role === 'recruiter') && (
              <section className="crm-card p-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
                  <Briefcase size={14} className="text-[var(--primary-gold)]" /> Client Assignment
                </h3>
                <div className="space-y-3">
                  <div className="relative">
                    <select 
                      value={assignedClientId}
                      onChange={(e) => setAssignedClientId(e.target.value)}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl pl-4 pr-10 py-2.5 text-xs focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] appearance-none cursor-pointer font-bold"
                    >
                      <option value="">No Client Assigned</option>
                      {fullTeamList.filter(u => u.role === 'client').map((client) => (
                        <option key={client.id} value={client.id}>{client.name || client.email}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-3.5 text-[var(--text-muted)] pointer-events-none" />
                  </div>
                  <button 
                    onClick={handleUpdateClient}
                    disabled={isSavingClient}
                    className="crm-btn-gold w-full text-[10px]"
                  >
                    {isSavingClient ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />} 
                    Assign Client
                  </button>
                </div>
              </section>
            )}

            {/* Skills Profile */}
            <section className="crm-card p-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
                <Code size={14} className="text-[var(--primary-gold)]" /> Skills Profile
              </h3>
              {isEditing && role === 'developer' ? (
                <div className="flex flex-col gap-1.5">
                  <textarea
                    value={editedSkills.join(', ')}
                    onChange={(e) => setEditedSkills(e.target.value.split(',').map(s => s.trim()))}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-bold h-24"
                    placeholder="e.g. React, TypeScript, Node.js"
                  />
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {skills.map((skill: string) => (
                    <span key={skill} className="px-2.5 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                      {skill}
                    </span>
                  ))}
                  {skills.length === 0 && (
                    <span className="text-xs text-[var(--text-muted)] italic">No skills extracted.</span>
                  )}
                </div>
              )}
            </section>

            {/* Direct Contact info */}
            <section className="crm-card p-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
                <Mail size={14} className="text-[var(--primary-gold)]" /> Contact Channels
              </h3>
              <div className="space-y-3">
                {isEditing && role === 'developer' ? (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black uppercase text-[var(--text-muted)]">Email Address</label>
                      <input
                        type="email"
                        value={editedEmail}
                        onChange={(e) => setEditedEmail(e.target.value)}
                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-bold"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black uppercase text-[var(--text-muted)]">Phone Number</label>
                      <input
                        type="text"
                        value={editedPhone}
                        onChange={(e) => setEditedPhone(e.target.value)}
                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-bold"
                      />
                    </div>
                  </div>
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

                {!isEditing && candidate.links?.map((link: any, i: number) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl transition-all hover:scale-[1.01]">
                    <div className="text-[var(--primary-gold)] shrink-0">
                      {getLinkIcon(link.label || 'Link')}
                    </div>
                    <p className="text-xs font-black text-[var(--primary-gold)] truncate uppercase tracking-wider">{link.label || 'Reference Link'}</p>
                  </a>
                ))}
              </div>
            </section>

            {/* Geographic Details Customizer */}
            <section className="crm-card p-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
                <MapPin size={14} className="text-[var(--primary-gold)]" /> Geographic profile
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-black uppercase text-[var(--text-muted)] mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. San Francisco"
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-[var(--text-muted)] mb-1">State</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. CA"
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-[var(--text-muted)] mb-1">Zip Code</label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="e.g. 94105"
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-[var(--text-muted)] mb-1">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. United States"
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-bold"
                  />
                </div>
                <button
                  onClick={handleSaveLocation}
                  disabled={isSavingLoc}
                  className="crm-btn-gold w-full text-[10px] mt-1"
                >
                  {isSavingLoc ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />}
                  Save Location
                </button>
              </div>
            </section>

            {/* Follow-Up Scheduler */}
            <section className="crm-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--primary-gold)] flex items-center gap-2">
                  <Clock size={14} /> Follow-Up Scheduler
                </h3>
                {candidate.followUpUpdatedBy && (
                  <span className="text-[9px] font-black text-[var(--primary-gold)] uppercase tracking-widest bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded-md border border-[var(--border-color)]">
                    By: {teamMembers?.[candidate.followUpUpdatedBy] || 'Sourcing'}
                  </span>
                )}
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-[var(--text-muted)] ml-1">Next reminder date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-[var(--primary-gold)]" size={13} />
                    <input 
                      type="datetime-local" 
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-[var(--text-muted)] ml-1">Task notes / Reminders</label>
                  <textarea 
                    value={followUpNote}
                    onChange={(e) => setFollowUpNote(e.target.value)}
                    placeholder="e.g. Discussed experience gap..."
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-xs h-24 focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] font-medium"
                  />
                </div>
                <button 
                  onClick={handleSaveFollowUp}
                  disabled={isSaving}
                  className="crm-btn-gold w-full text-[10px]"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />} 
                  Update Follow-Up
                </button>
                <button 
                  onClick={handleCompleteFollowUp}
                  disabled={isCompleting}
                  className="crm-btn-secondary w-full text-[10px]"
                >
                  {isCompleting ? <Loader2 className="animate-spin" size={12} /> : <CheckCircle2 size={12} />} 
                  Mark Completed
                </button>
              </div>

              {/* Scheduler Logs */}
              <div className="mt-5 pt-4 border-t border-[var(--border-color)]">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--primary-gold)] mb-3 flex items-center gap-1.5">
                  <StickyNote size={11} /> Scheduler Logs
                </h4>
                {candidate.internalNotesLog && candidate.internalNotesLog.filter((log: any) => log.type === 'follow_up' || log.type === 'follow_up_completed' || log.noteContent?.includes('⏰') || log.noteContent?.includes('✅')).length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {candidate.internalNotesLog
                      .filter((log: any) => log.type === 'follow_up' || log.type === 'follow_up_completed' || log.noteContent?.includes('⏰') || log.noteContent?.includes('✅'))
                      .slice()
                      .reverse()
                      .map((log: any, i: number) => (
                        <div key={i} className="text-[10px] text-[var(--text-secondary)] space-y-1 bg-[var(--bg-secondary)] p-2.5 rounded-xl border border-[var(--border-color)]">
                          <div className="flex justify-between items-center text-[8px]">
                            <span className="font-bold text-[var(--primary-gold)]">{log.author}</span>
                            <span className="text-[var(--text-muted)] font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-[10px] leading-relaxed font-medium">{log.noteContent}</p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-[var(--text-muted)] italic font-medium">No reminder history logged.</p>
                )}
              </div>
            </section>

            {/* Recruiter Notes / Comments */}
            <section className="crm-card p-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
                <StickyNote size={14} className="text-[var(--primary-gold)]" /> Recruiter Notes
              </h3>
              <div className="space-y-3">
                <textarea 
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Type a new feedback comment or recruiter assessment..."
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-4 text-xs h-24 focus:ring-1 focus:ring-[var(--primary-gold)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-medium"
                />
                <button 
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="crm-btn-gold w-full text-[10px]"
                >
                  {isSavingNotes ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />} 
                  Add Note
                </button>
              </div>
              <div className="mt-5 space-y-3 pt-4 border-t border-[var(--border-color)] max-h-[300px] overflow-y-auto pr-1">
                {candidate.internalNotesLog && candidate.internalNotesLog.filter((log: any) => !(log.type === 'follow_up' || log.type === 'follow_up_completed' || log.noteContent?.includes('⏰') || log.noteContent?.includes('✅'))).length > 0 ? (
                  candidate.internalNotesLog
                    .filter((log: any) => !(log.type === 'follow_up' || log.type === 'follow_up_completed' || log.noteContent?.includes('⏰') || log.noteContent?.includes('✅')))
                    .slice()
                    .reverse()
                    .map((log: any, i: number) => (
                      <div key={i} className="text-[10px] text-[var(--text-secondary)] space-y-1 p-3 rounded-xl border bg-[var(--bg-secondary)] border-[var(--border-color)]">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-[var(--primary-gold)]">{log.author}</span>
                          <span className="text-[var(--text-muted)] font-mono text-[8px]">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="leading-relaxed font-medium select-text">{log.noteContent}</p>
                      </div>
                    ))
                ) : (
                  <p className="text-[10px] text-[var(--text-muted)] italic font-medium">No notes posted yet.</p>
                )}
              </div>
            </section>

            {/* Candidate Metadata profile audit logs */}
            <section className="crm-card p-6 text-xs font-bold">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4">Metadata Audit Logs</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-2">
                  <span className="text-[var(--text-muted)]">Indexed on</span>
                  <span className="font-mono text-[var(--text-secondary)]">{formatDate(candidate.createdAt)}</span>
                </div>
                {candidate.uploadedBy && candidate.uploadedBy !== user?.uid && (
                  <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-2">
                    <span className="text-[var(--text-muted)]">Uploaded by</span>
                    <span className="text-[var(--primary-gold)] font-black uppercase text-[10px] tracking-wider">
                      {teamMembers?.[candidate.uploadedBy] || 'AI Sourcing'}
                    </span>
                  </div>
                )}
                {candidate.assignedTo && (
                  <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-2">
                    <span className="text-[var(--text-muted)]">
                      {isPrivileged ? 'Assigned recruiter' : 'Assigned manager'}
                    </span>
                    <span className="font-black text-[var(--primary-gold)] uppercase tracking-wide">
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
