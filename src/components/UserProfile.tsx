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

  if (loading) return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="max-w-2xl bg-[var(--card-bg)] p-8 rounded-[2rem] border border-[var(--border-color)] shadow-sm transition-colors duration-300">
      <h2 className="text-3xl font-serif text-[var(--text-primary)] mb-8">My Profile</h2>
      
      {error && <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}
      {success && <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">Profile updated successfully!</div>}
      
      <form onSubmit={handleUpdateProfile} className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-[var(--sidebar-bg)] border border-[var(--border-color)] flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-2xl">
            {profile?.name?.slice(0, 2).toUpperCase() || user?.email?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Email Address</p>
            <p className="text-[var(--text-secondary)] font-medium">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Full Name</label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-sm text-[var(--text-primary)]"
          />
        </div>

        <div className="border-t border-[var(--border-color)] pt-6 space-y-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">Notification Settings</h3>
          
          <div className="flex items-center justify-between p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-[var(--text-primary)]">Push Notifications</p>
              <p className="text-[10px] text-[var(--text-muted)]">Receive alerts for new chat messages</p>
            </div>
            {Notification.permission !== 'granted' ? (
              <button 
                type="button"
                onClick={requestNotificationPermission}
                className="text-[10px] bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-700 transition-all uppercase tracking-tighter"
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
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-[var(--text-primary)]">Notification Sound</p>
              <p className="text-[10px] text-[var(--text-muted)]">Play a sound when a message arrives</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => {
                  const audio = new Audio(notificationAudioSrc);
                  audio.play().catch(e => setError('Audio failed to play. Please click the lock/settings icon in your browser address bar and enable Sound.'));
                }}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline px-2"
              >
                Test
              </button>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={notificationSound}
                  onChange={(e) => setNotificationSound(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
          
          <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl">
            <p className="text-[10px] text-[var(--text-muted)]">
              <strong>Troubleshooting:</strong> If notifications or sound are not working, click the <span className="font-bold">lock icon</span> or <span className="font-bold">settings icon</span> in your Chrome address bar. Ensure 'Sound' and 'Notifications' are set to 'Allow', then reload the page.
            </p>
          </div>
        </div>

        <button 
          type="submit"
          disabled={saving}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Save Changes
        </button>
      </form>
    </div>
  );
}
