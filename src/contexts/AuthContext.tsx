import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firestoreError';

interface AuthContextType {
  user: User | null;
  role: 'developer' | 'admin' | 'team_leader' | 'recruiter' | 'client' | null;
  loading: boolean;
  quotaExceeded: boolean;
  setQuotaExceeded: (value: boolean) => void;
  isPrivileged: boolean;
  getUserDisplayName: () => string;
  getUserRole: () => string;
  getUserName: () => string;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  role: null, 
  loading: true,
  quotaExceeded: false,
  setQuotaExceeded: () => {},
  isPrivileged: false,
  getUserDisplayName: () => 'System',
  getUserRole: () => 'System',
  getUserName: () => 'System'
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'developer' | 'admin' | 'team_leader' | 'recruiter' | 'client' | null>(null);
  const [loading, setLoading] = useState(true);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const isPrivileged = role === 'admin' || role === 'team_leader' || role === 'developer';

  const getUserDisplayName = () => {
    if (!user) return 'System';
    return `${user.displayName || user.email?.split('@')[0] || 'User'} (${role || 'No Role'})`;
  };
  
  const getUserRole = () => role || 'No Role';
  const getUserName = () => user?.displayName || user?.email?.split('@')[0] || 'User';

  useEffect(() => {
    let statusInterval: any;
    const handleOffline = () => {
      if (user?.uid) {
        const userDocRef = doc(db, 'users', user.uid);
        updateDoc(userDocRef, { status: 'offline', lastSeen: serverTimestamp() });
      }
    };

    const unsub = onAuthStateChanged(auth, async (authenticatedUser) => {
      try {
        setUser(authenticatedUser);
        if (authenticatedUser) {
          const userDocRef = doc(db, 'users', authenticatedUser.uid);
          let userDoc;
          try {
            userDoc = await getDoc(userDocRef);
          } catch (error) {
            handleFirestoreError(error, OperationType.GET, 'users/' + authenticatedUser.uid);
          }
          
          const isAdminEmail = authenticatedUser.email === 'darshanwala894@gmail.com' || authenticatedUser.email === 'auriicsservices@gmail.com' || authenticatedUser.email === 'mayur.jungi@aurrum.co';
          
          if (!userDoc.exists()) {
            const inviteDocRef = doc(db, 'invitations', authenticatedUser.email!);
            let inviteDoc;
            try {
              inviteDoc = await getDoc(inviteDocRef);
            } catch (error) {
              handleFirestoreError(error, OperationType.GET, 'invitations/' + authenticatedUser.email!);
            }
            const defaultRole = isAdminEmail ? 'admin' : (inviteDoc.exists() ? inviteDoc.data().role : 'recruiter');

            const newUser = {
              uid: authenticatedUser.uid,
              email: authenticatedUser.email,
              name: authenticatedUser.displayName || authenticatedUser.email?.split('@')[0],
              role: defaultRole,
              createdAt: new Date().toISOString(),
              isArchived: false,
              status: 'online',
              lastSeen: serverTimestamp()
            };
            try {
              await setDoc(userDocRef, newUser);
            } catch (error) {
              handleFirestoreError(error, OperationType.CREATE, 'users/' + authenticatedUser.uid);
            }
            setRole(defaultRole as any);
          } else {
            const data = userDoc.data();
            if (isAdminEmail && data.isArchived) {
              try {
                await updateDoc(userDocRef, { isArchived: false, status: 'online', lastSeen: serverTimestamp() });
              } catch (error) {
                handleFirestoreError(error, OperationType.UPDATE, 'users/' + authenticatedUser.uid);
              }
              setRole('admin');
            } else if (data.isArchived) {
              setRole(null);
            } else {
              try {
                await updateDoc(userDocRef, { status: 'online', lastSeen: serverTimestamp() });
              } catch (error) {
                handleFirestoreError(error, OperationType.UPDATE, 'users/' + authenticatedUser.uid);
              }
              setRole(data.role);
            }
          }

          // Heartbeat to keep online status fresh
          if (statusInterval) clearInterval(statusInterval);
          statusInterval = setInterval(async () => {
            if (quotaExceeded) return;
            try {
              try {
                await updateDoc(userDocRef, { 
                  status: 'online', 
                  lastSeen: serverTimestamp() 
                });
              } catch (error) {
                handleFirestoreError(error, OperationType.UPDATE, 'users/' + authenticatedUser.uid);
              }
            } catch (err: any) {
              if (err.code === 'resource-exhausted') setQuotaExceeded(true);
              console.error(err);
            }
          }, 120000); // Every 2 minutes

          window.addEventListener('beforeunload', handleOffline);
        } else {
          setRole(null);
          if (statusInterval) clearInterval(statusInterval);
          window.removeEventListener('beforeunload', handleOffline);
        }
      } catch (err: any) {
        console.error("Auth initialization error:", err);
        if (err.code === 'resource-exhausted') setQuotaExceeded(true);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsub();
      if (statusInterval) clearInterval(statusInterval);
      window.removeEventListener('beforeunload', handleOffline);
    };
  }, [user?.uid]);

  return (
    <AuthContext.Provider value={{ user, role, loading, quotaExceeded, setQuotaExceeded, isPrivileged, getUserDisplayName, getUserRole, getUserName }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
