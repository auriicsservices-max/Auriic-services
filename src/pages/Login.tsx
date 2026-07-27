import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleAuthSuccess = () => {
    setIsLoggingIn(true);
    setTimeout(() => {
      navigate('/dashboard');
    }, 2000);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      handleAuthSuccess();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 font-sans transition-colors duration-300 bg-[var(--bg-primary)]"
    >
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <AnimatePresence>
        {isLoggingIn && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-[var(--bg-primary)]/90 flex flex-col items-center justify-center z-50 backdrop-blur-xs"
            >
                <div className="flex flex-col items-center">
                    <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-12 h-12 border-4 border-[var(--primary-gold)] border-t-transparent rounded-full mb-6"
                    />
                    <h2 className="text-2xl font-serif italic text-[var(--text-primary)]">Login Successful</h2>
                    <p className="text-[var(--text-secondary)] font-bold uppercase tracking-widest text-[9px] mt-2">Redirecting to Dashboard...</p>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-[var(--card-bg)] p-10 rounded-[2rem] shadow-2xl w-full max-w-sm border border-[var(--border-color)] transition-all duration-300">
        <div className="flex justify-center mb-8">
          <img 
            src={theme === 'dark' ? "https://aurrum.co/wp-content/uploads/2026/05/Rectech-white-logo.svg" : "https://aurrum.co/wp-content/uploads/2026/05/Rectech-Logo.svg"} 
            alt="Rectech Logo" 
            className="h-16 w-auto object-contain"
          />
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-serif italic text-[var(--text-primary)] tracking-tight">Rectech Portal</h1>
          <p className="text-[var(--text-secondary)] font-bold uppercase tracking-widest text-[9px] mt-2">Precision Talent Acquisition</p>
        </div>
        
        {error && (
          <div className="text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded-xl mb-6 text-xs flex items-center gap-2">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
        
        <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
          <div className="space-y-1.5">
            <label className="block text-[9px] uppercase tracking-widest text-[var(--text-secondary)] font-bold ml-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-gold)] transition-all text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              placeholder="name@aurrum.co"
              required
            />
          </div>
          <div className="space-y-1.5 relative">
            <label className="block text-[9px] uppercase tracking-widest text-[var(--text-secondary)] font-bold ml-1">Password</label>
            <input 
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-gold)] transition-all text-sm text-[var(--text-primary)] pr-10 placeholder:text-[var(--text-muted)]"
              placeholder="••••••••"
              required
            />
            <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-[var(--text-secondary)] hover:text-[var(--brand-color)] transition-colors"
            >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input type="checkbox" id="remember" className="rounded border-slate-300 dark:border-slate-600 text-[var(--brand-color)] focus:ring-[var(--brand-color)]" />
            <label htmlFor="remember" className="text-[10px] text-[var(--text-secondary)] font-medium">Remember me</label>
          </div>
          <button 
            type="submit"
            className="w-full bg-[var(--brand-color)] text-white p-3 rounded-lg font-bold hover:bg-[#A98B56] transition-all shadow-md mt-2 flex items-center justify-center gap-2 text-sm"
          >
            {isLoggingIn ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            Secure Login
          </button>
        </form>
      </div>
    </div>
  );
}

