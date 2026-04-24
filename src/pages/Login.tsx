import React, { useState } from 'react';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div 
      style={{ backgroundColor: '#003e5af7' }}
      className="min-h-screen flex items-center justify-center p-4 font-sans transition-colors duration-300"
    >
      <div className="bg-white/95 backdrop-blur-sm p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-white/20 transition-all duration-300">
        <div className="flex justify-center mb-10">
          <div 
            style={{ backgroundColor: '#003e5af7' }}
            className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-xl"
          >
            <span className="text-white font-bold text-3xl">A</span>
          </div>
        </div>
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-serif italic text-indigo-950 tracking-tight">Aurrum Portal</h1>
          <p className="text-indigo-600/60 font-bold uppercase tracking-widest text-[9px] mt-2">Precision Talent Acquisition</p>
        </div>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 p-3 rounded-xl mb-6 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
        
        <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold ml-1">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm text-slate-800 dark:text-slate-100"
              placeholder="name@aurrum.co"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold ml-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm text-slate-800 dark:text-slate-100"
              placeholder="••••••••"
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2 text-sm mt-2"
          >
            <LogIn size={18} />
            Secure Login
          </button>
        </form>
        
        <div className="relative flex items-center py-4">
          <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
          <span className="flex-shrink mx-4 text-slate-300 dark:text-slate-700 text-[10px] font-bold uppercase tracking-widest">Authentication</span>
          <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
        </div>
        
        <button 
          onClick={handleGoogleLogin}
          type="button"
          className="w-full border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 p-3 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2 text-sm"
        >
          <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
          Continue with Google
        </button>
      </div>
    </div>
  );
}

