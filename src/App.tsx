import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { auth } from './lib/firebase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AccessDenied from './components/AccessDenied';
import { Shield } from 'lucide-react';
import './index.css';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, role } = useAuth();
  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );
  
  if (!user) return <Navigate to="/login" />;

  return <>{children}</>;
}

import { ResumeProcessingProvider } from './contexts/ResumeProcessingContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { TimezoneProvider } from './contexts/TimezoneContext';

export default function App() {
  const [ipState, setIpState] = useState<{
    isLoading: boolean;
    isAllowed: boolean | null;
    ipAddress: string;
  }>({
    isLoading: true,
    isAllowed: null,
    ipAddress: '',
  });

  const checkIpAccess = async (retryCount = 0): Promise<void> => {
    try {
      const response = await fetch('/api/verify-ip');
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        
        if (response.ok && data.allowed) {
          setIpState({
            isLoading: false,
            isAllowed: true,
            ipAddress: data.ip || '',
          });
          return;
        } else {
          setIpState({
            isLoading: false,
            isAllowed: false,
            ipAddress: data.ip || 'Access Blocked',
          });
          return;
        }
      }
      
      throw new Error(`Unexpected content type: ${contentType || 'none'}`);
    } catch (error) {
      console.warn(`[App] IP check attempt ${retryCount + 1} failed:`, error);
      if (retryCount < 3) {
        // Wait 1200ms and try again
        await new Promise((resolve) => setTimeout(resolve, 1200));
        return checkIpAccess(retryCount + 1);
      }
      
      // Fail closed for maximum security on consecutive integration errors
      setIpState({
        isLoading: false,
        isAllowed: false,
        ipAddress: 'System Restrict / Timeout',
      });
    }
  };

  useEffect(() => {
    checkIpAccess();
  }, []);

  // Show a gorgeous corporate-level Loading screen during security evaluation
  if (ipState.isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 transition-all duration-300">
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-indigo-600 dark:text-indigo-400">
              <Shield size={36} className="animate-pulse" />
            </div>
          </div>
          <h2 className="text-lg font-serif text-slate-800 dark:text-slate-100 font-medium tracking-tight">
            Security Gatekeeper
          </h2>
          <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-400 dark:text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-ping"></span>
            <span>Running security verification...</span>
          </div>
        </div>
      </div>
    );
  }

  // Intercept the app mounting tree entirely if access to whitelist is unauthorized
  if (ipState.isAllowed === false) {
    return (
      <AccessDenied 
        userIp={ipState.ipAddress} 
        onRetry={checkIpAccess} 
      />
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <TimezoneProvider>
          <NotificationProvider>
            <ResumeProcessingProvider>
              <Router>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route 
                    path="/dashboard" 
                    element={
                      <PrivateRoute>
                        <Dashboard />
                      </PrivateRoute>
                    } 
                  />
                  <Route path="*" element={<Navigate to="/dashboard" />} />
                </Routes>
              </Router>
            </ResumeProcessingProvider>
          </NotificationProvider>
        </TimezoneProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

