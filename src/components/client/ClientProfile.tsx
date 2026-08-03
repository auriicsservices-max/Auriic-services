import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Lock, 
  Bell, 
  ShieldCheck, 
  Save, 
  CheckCircle2, 
  KeyRound, 
  Briefcase
} from 'lucide-react';
import { updatePassword, updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { BackButton } from '../common/BackButton';

interface ClientProfileProps {
  user: any;
  role: string | null;
}

export const ClientProfile: React.FC<ClientProfileProps> = ({ user, role }) => {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [companyName, setCompanyName] = useState(user?.companyName || user?.company || '');
  const [jobTitle, setJobTitle] = useState(user?.jobTitle || 'Hiring Manager');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  
  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Notification Preferences
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [interviewAlerts, setInterviewAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  // Status Feedback
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setMessage(null);

    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName });
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          displayName,
          companyName,
          jobTitle,
          phoneNumber,
          notificationPreferences: { emailAlerts, interviewAlerts, weeklyDigest }
        });
      }
      setMessage({ type: 'success', text: 'Profile information successfully updated!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match or are empty.' });
      return;
    }

    setSavingPassword(true);
    setMessage(null);

    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
      }
      setNewPassword('');
      setConfirmPassword('');
      setMessage({ type: 'success', text: 'Password successfully updated!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update password. You may need to re-authenticate.' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 pb-12">
      <div className="flex items-center justify-between pb-2">
        <BackButton />
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Client Portal</span>
      </div>
      {/* Header Banner */}
      <div className="crm-card p-6 border-l-4 border-l-[#A98B56] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#A98B56]/10 text-[#A98B56] rounded-2xl">
            <User size={22} />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-[var(--text-primary)]">Client Account Settings</h1>
            <p className="text-xs text-[var(--text-muted)] font-medium">Manage your personal information, security credentials, and alert preferences.</p>
          </div>
        </div>

        <div className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto">
          <ShieldCheck size={14} /> Client Portal Account
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 border ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
        }`}>
          <CheckCircle2 size={16} />
          <span>{message.text}</span>
        </div>
      )}

      {/* Personal Information Form */}
      <form onSubmit={handleUpdateProfile} className="crm-card p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
          <User size={18} className="text-[#A98B56]" />
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Personal Details & Corporate Profile</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1">
              <User size={12} className="text-[#A98B56]" /> Full Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Sarah Jenkins"
              className="crm-input w-full"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1">
              <Mail size={12} className="text-[#A98B56]" /> Email Address (Read-Only)
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="crm-input w-full bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-not-allowed opacity-80"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1">
              <Building size={12} className="text-[#A98B56]" /> Company Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Tech Solutions"
              className="crm-input w-full"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1">
              <Briefcase size={12} className="text-[#A98B56]" /> Job Title / Designation
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. VP of Engineering"
              className="crm-input w-full"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1">
              <Phone size={12} className="text-[#A98B56]" /> Contact Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="crm-input w-full"
            />
          </div>
        </div>

        {/* Notification Preferences Section */}
        <div className="pt-4 border-t border-[var(--border-color)] space-y-4">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-[#A98B56]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Email Notification Preferences</h3>
          </div>

          <div className="space-y-3 bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--border-color)]">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-semibold text-[var(--text-primary)]">New Candidate Submissions</span>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 accent-[#A98B56] cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-semibold text-[var(--text-primary)]">Interview Confirmations & Updates</span>
              <input
                type="checkbox"
                checked={interviewAlerts}
                onChange={(e) => setInterviewAlerts(e.target.checked)}
                className="w-4 h-4 accent-[#A98B56] cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-semibold text-[var(--text-primary)]">Weekly Candidate Summary Digest</span>
              <input
                type="checkbox"
                checked={weeklyDigest}
                onChange={(e) => setWeeklyDigest(e.target.checked)}
                className="w-4 h-4 accent-[#A98B56] cursor-pointer"
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={savingProfile}
            className="crm-btn-gold px-6 py-2.5 rounded-xl text-xs font-black uppercase flex items-center gap-2 cursor-pointer"
          >
            <Save size={14} />
            {savingProfile ? 'Saving Changes...' : 'Save Profile Details'}
          </button>
        </div>
      </form>

      {/* Password Update Form */}
      <form onSubmit={handleUpdatePassword} className="crm-card p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
          <KeyRound size={18} className="text-[#A98B56]" />
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Security & Password</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)]">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              className="crm-input w-full"
              minLength={6}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)]">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="crm-input w-full"
              minLength={6}
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={savingPassword || !newPassword}
            className="px-6 py-2.5 bg-[var(--bg-secondary)] hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Lock size={14} className="text-[#A98B56]" />
            {savingPassword ? 'Updating Password...' : 'Update Password'}
          </button>
        </div>
      </form>

      {/* Billing Settings Form */}
      <form onSubmit={handleUpdateProfile} className="crm-card p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
          <Building size={18} className="text-[#A98B56]" />
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Client Billing Configuration</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)]">Placement Fee Type</label>
            <select className="crm-input w-full">
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)]">Fee Value</label>
            <input type="number" placeholder="e.g. 8" className="crm-input w-full" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)]">GST/Tax Rate (%)</label>
            <input type="number" placeholder="e.g. 18" className="crm-input w-full" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)]">Currency</label>
            <input type="text" placeholder="e.g. INR" className="crm-input w-full" />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" className="crm-btn-gold px-6 py-2.5 rounded-xl text-xs font-black uppercase flex items-center gap-2 cursor-pointer">
            <Save size={14} />
            Save Billing Settings
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClientProfile;
