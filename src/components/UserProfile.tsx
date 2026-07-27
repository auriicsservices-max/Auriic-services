import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Loader2, User as UserIcon, Mail, Save, AlertCircle } from 'lucide-react';

export default function UserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Edit form state
  const [name, setName] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationSound, setNotificationSound] = useState(true);
  const notificationAudioSrc = 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_3230617233.mp3?filename=message-124468.mp3';

  useEffect(() => {
    if (!user) return;
    
    const fetchProfile = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfile(data);
          setName(data.name || '');
          setNotificationsEnabled(data.notificationsEnabled !== false);
          setNotificationSound(data.notificationSound !== false);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    setError('');
    setSuccess(false);
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: name,
        notificationsEnabled,
        notificationSound
      });
      setProfile((prev: any) => ({ ...prev, name, notificationsEnabled, notificationSound }));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      setError('Notifications are not supported by this browser.');
      return;
    }
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setNotificationsEnabled(false);
      setError('Notification permission denied.');
    }
  };

  if (loading) return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin text-[var(--accent-color)]" /></div>;

  return (
    <div className="max-w-3xl mx-auto crm-card p-8 space-y-8">
      {/* Header Profile Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-[var(--bg-secondary)] border-2 border-[var(--primary-gold)] flex items-center justify-center text-[var(--primary-gold)] font-extrabold text-2xl shadow-sm relative overflow-hidden">
            {profile?.name?.slice(0, 2).toUpperCase() || user?.email?.slice(0, 2).toUpperCase()}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-[var(--text-primary)]">{profile?.name || 'User Profile'}</h2>
              <span className="crm-badge-gold text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {profile?.role || 'Recruiter'}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 font-medium">
              <Mail size={13} className="text-[var(--primary-gold)]" />
              {user?.email}
            </p>
          </div>
        </div>
      </div>
      
      {error && <div className="p-4 crm-badge-error rounded-xl flex items-center gap-2 text-xs"><AlertCircle size={16} /> {error}</div>}
      {success && <div className="p-4 crm-badge-success rounded-xl text-xs font-bold">Profile settings updated successfully!</div>}
      
      <form onSubmit={handleUpdateProfile} className="space-y-6">
        <div className="space-y-2">
          <label className="crm-label">Full Name</label>
          <div className="relative">
            <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="crm-input pl-10"
              placeholder="Enter your full name"
            />
          </div>
        </div>

        <div className="border-t border-[var(--border-color)] pt-6 space-y-4">
          <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Notification Preferences</h3>
          
          <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-[var(--text-primary)]">Push Notifications</p>
              <p className="text-[10px] text-[var(--text-muted)]">Receive real-time browser alerts for chats and candidate updates</p>
            </div>
            {Notification.permission !== 'granted' ? (
              <button 
                type="button"
                onClick={requestNotificationPermission}
                className="crm-btn-gold text-[10px] px-3.5 py-2 uppercase tracking-wider font-bold"
              >
                Enable in Browser
              </button>
            ) : (
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--border-color)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-gold)]"></div>
              </label>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-[var(--text-primary)]">Notification Sound</p>
              <p className="text-[10px] text-[var(--text-muted)]">Play an audible chime when new notifications arrive</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => {
                  const audio = new Audio(notificationAudioSrc);
                  audio.play().catch(e => setError('Audio failed to play. Please check your browser sound permissions.'));
                }}
                className="text-[10px] text-[var(--primary-gold)] font-bold hover:underline px-2 uppercase tracking-wider"
              >
                Test Sound
              </button>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={notificationSound}
                  onChange={(e) => setNotificationSound(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--border-color)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-gold)]"></div>
              </label>
            </div>
          </div>
          
          <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl">
            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
              <strong className="text-[var(--text-primary)]">Browser Setup Note:</strong> If notifications or chime sounds do not fire, click the lock icon in your browser address bar and verify that <span className="font-bold text-[var(--text-primary)]">'Notifications'</span> and <span className="font-bold text-[var(--text-primary)]">'Sound'</span> permissions are granted for this origin.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--border-color)] flex justify-end">
          <button 
            type="submit"
            disabled={saving}
            className="crm-btn-gold text-xs font-bold px-6 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Profile
          </button>
        </div>
      </form>
    </div>
  );
}
