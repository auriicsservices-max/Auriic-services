import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { auth } from './lib/firebase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CandidateDetails from './pages/CandidateDetails';
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
                  <Route 
                    path="/candidate/:id" 
                    element={
                      <PrivateRoute>
                        <CandidateDetails />
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


