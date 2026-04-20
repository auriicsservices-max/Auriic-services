import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, Shield, User as UserIcon, Trash2, Mail, ChevronRight } from 'lucide-react';

export default function UserManagement() {
  const { role } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'recruiter'>('recruiter');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (role !== 'admin') return;

    const usersQ = query(collection(db, 'users'));
    const invitesQ = query(collection(db, 'invitations'));

    const unsubUsers = onSnapshot(usersQ, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubInvites = onSnapshot(invitesQ, (snapshot) => {
      setInvites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubUsers();
      unsubInvites();
    };
  }, [role]);

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setIsAdding(true);
    try {
      await setDoc(doc(db, 'invitations', newEmail.toLowerCase()), {
        email: newEmail.toLowerCase(),
        role: newRole,
        createdAt: new Date().toISOString()
      });
      setNewEmail('');
      setNewRole('recruiter');
    } catch (err) {
      console.error(err);
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

  const handleDeleteInvite = async (email: string) => {
    try {
      await deleteDoc(doc(db, 'invitations', email));
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
      {/* Header section */}
      <section className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-serif text-slate-800">User Management</h2>
          <p className="text-slate-500 text-sm mt-1">Configure roles and pre-register team members</p>
        </div>
        <form onSubmit={handleCreateInvitation} className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-grow md:w-64">
            <Mail className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input 
              type="email" 
              placeholder="e.g. colleague@aurrum.co"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-sm"
              required
            />
          </div>
          <select 
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold uppercase tracking-wider text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
          >
            <option value="recruiter">Recruiter</option>
            <option value="admin">Admin</option>
          </select>
          <button 
            type="submit"
            disabled={isAdding}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            <UserPlus size={16} />
            <span className="hidden sm:inline">Pre-register</span>
          </button>
        </form>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Users */}
        <section className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col gap-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <UserIcon size={20} />
            </div>
            <div>
              <h3 className="text-xl font-serif text-slate-800">Active Team</h3>
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Current system users</p>
            </div>
          </div>

          <div className="space-y-3">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group transition-all hover:border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-400">
                    {u.email.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{u.email}</p>
                    <p className={`text-[10px] uppercase font-bold tracking-widest ${u.role === 'admin' ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {u.role}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => handleUpdateRole(u.id, u.role)}
                  className="opacity-0 group-hover:opacity-100 transition-all text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100"
                >
                  Switch to {u.role === 'admin' ? 'Recruiter' : 'Admin'}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Pending Invites */}
        <section className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col gap-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="text-xl font-serif text-slate-800">Pending Registrations</h3>
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Pre-assigned roles</p>
            </div>
          </div>

          <div className="space-y-3">
            {invites.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Mail size={32} className="text-slate-200 mb-2" />
                <p className="text-slate-400 text-sm font-medium italic">No pending invitations</p>
              </div>
            ) : (
              invites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 group transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                      <Mail size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{inv.email}</p>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-amber-600">
                        Pending {inv.role}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteInvite(inv.id)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
