import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserPlus, Shield, User as UserIcon, Trash2, Mail, Lock, Loader2, RotateCcw, AlertTriangle } from 'lucide-react';

export default function UserManagement() {
  const { role } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'recruiter'>('recruiter');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<'active' | 'trash'>('active');

  useEffect(() => {
    if (role !== 'admin') return;

    const usersQ = query(collection(db, 'users'));
    return onSnapshot(usersQ, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [role]);

  const activeUsers = users.filter(u => !u.isArchived);
  const trashedUsers = users.filter(u => u.isArchived);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newPassword.trim()) return;
    setIsAdding(true);
    setError('');

    try {
      // Create user using a temporary secondary app to avoid logging out the admin
      const tempAppName = `temp-app-${Date.now()}`;
      const tempApp = initializeApp(firebaseConfig, tempAppName);
      const tempAuth = getAuth(tempApp);
      
      const userCredential = await createUserWithEmailAndPassword(tempAuth, newEmail.toLowerCase(), newPassword);
      const newUser = userCredential.user;

      // Create user doc in main database
      await setDoc(doc(db, 'users', newUser.uid), {
        uid: newUser.uid,
        email: newEmail.toLowerCase(),
        name: newEmail.toLowerCase().split('@')[0],
        role: newRole,
        createdAt: new Date().toISOString(),
        addedBy: 'admin',
        isArchived: false
      });

      // Cleanup temp app
      await signOut(tempAuth);
      
      setNewEmail('');
      setNewPassword('');
      setNewRole('recruiter');
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
    setIsAdding(false);
  };

  const handleUpdateRole = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === 'admin' ? 'recruiter' : 'admin';
    try {
      await updateDoc(doc(db, 'users', userId), { role: nextRole });
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchiveUser = async (userId: string) => {
    if (!window.confirm('Move this user to Trash? They will lose access to the portal immediately.')) return;
    try {
      await updateDoc(doc(db, 'users', userId), { isArchived: true });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestoreUser = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isArchived: false });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUserPermanently = async (userId: string) => {
    if (!window.confirm('PERMANENT DELETE. This will remove the user entry from the database. Note: The user account in Firebase Auth remains but they will have NO role/access.')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (err) {
      console.error(err);
    }
  };

  if (role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white rounded-[2rem] border border-slate-200 shadow-sm">
        <Shield size={64} className="text-slate-200 mb-6" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Restricted Access</h2>
        <p className="text-slate-500">Only administrators can manage users and roles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Creation form */}
      <section className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="mb-8">
          <h2 className="text-3xl font-serif text-slate-800">Team Expansion</h2>
          <p className="text-slate-500 text-sm mt-1">Directly register new team members with credentials</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-semibold flex items-center gap-2 animate-in fade-in zoom-in-95">
            <Shield size={14} />
            {error}
          </div>
        )}

        <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5 flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email (Gmail preferred)</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input 
                type="email" 
                placeholder="colleague@aurrum.co"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-sm h-11"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5 flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Temporary Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input 
                type="password" 
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-sm h-11"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5 flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Permission Role</label>
            <select 
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold uppercase tracking-wider text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 h-11"
            >
              <option value="recruiter">Recruiter</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button 
            type="submit"
            disabled={isAdding}
            className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50 h-11"
          >
            {isAdding ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
            Register Member
          </button>
        </form>
      </section>

      {/* List section */}
      <section className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <UserIcon size={20} />
            </div>
            <div>
              <h3 className="text-xl font-serif text-slate-800">Team Registry</h3>
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Manage access and authority levels</p>
            </div>
          </div>

          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button 
              onClick={() => setView('active')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'active' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Active ({activeUsers.length})
            </button>
            <button 
              onClick={() => setView('trash')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'trash' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Trash ({trashedUsers.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(view === 'active' ? activeUsers : trashedUsers).map((u) => (
            <div key={u.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 group transition-all hover:bg-white hover:border-slate-200 hover:shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-sm font-bold shadow-sm transition-all ${u.isArchived ? 'bg-red-50 border-red-100 text-red-400' : 'bg-white border-slate-200 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                  {(u.name || (u.email?.split('@')[0])).slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{u.name || (u.email?.split('@')[0])}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{u.email}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-md ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                      {u.role}
                    </p>
                    {u.addedBy === 'admin' && (
                        <p className="text-[9px] text-slate-300 font-medium italic">Direct invite</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                {view === 'active' ? (
                  <>
                    <button 
                      onClick={() => handleUpdateRole(u.id, u.role)}
                      className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      title={`Switch to ${u.role === 'admin' ? 'Recruiter' : 'Admin'}`}
                    >
                      <Shield size={18} />
                    </button>
                    <button 
                      onClick={() => handleArchiveUser(u.id)}
                      className="p-2 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all"
                      title="Move to Trash"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => handleRestoreUser(u.id)}
                      className="p-2 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                      title="Restore User"
                    >
                      <RotateCcw size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteUserPermanently(u.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="Delete Permanently"
                    >
                      <AlertTriangle size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {(view === 'active' ? activeUsers : trashedUsers).length === 0 && (
            <div className="col-span-full py-12 text-center flex flex-col items-center justify-center bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
              <UserIcon size={32} className="text-slate-200 mb-2" />
              <p className="text-slate-400 text-sm font-medium italic">No {view} team members found</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
