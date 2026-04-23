import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  role: 'admin' | 'recruiter' | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, role: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'recruiter' | null>(null);
  const [loading, setLoading] = useState(true);

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
          const userDoc = await getDoc(userDocRef);
          
          const isAdminEmail = authenticatedUser.email === 'darshanwala894@gmail.com' || authenticatedUser.email === 'auriicsservices@gmail.com';
          
          if (!userDoc.exists()) {
            const inviteDocRef = doc(db, 'invitations', authenticatedUser.email!);
            const inviteDoc = await getDoc(inviteDocRef);
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
            await setDoc(userDocRef, newUser);
            setRole(defaultRole as any);
          } else {
            const data = userDoc.data();
            if (isAdminEmail && data.isArchived) {
              await updateDoc(userDocRef, { isArchived: false, status: 'online', lastSeen: serverTimestamp() });
              setRole('admin');
            } else if (data.isArchived) {
              setRole(null);
            } else {
              await updateDoc(userDocRef, { status: 'online', lastSeen: serverTimestamp() });
              setRole(data.role);
            }
          }

          // Heartbeat to keep online status fresh
          if (statusInterval) clearInterval(statusInterval);
          statusInterval = setInterval(async () => {
            await updateDoc(userDocRef, { 
              status: 'online', 
              lastSeen: serverTimestamp() 
            }).catch(console.error);
          }, 120000); // Every 2 minutes

          window.addEventListener('beforeunload', handleOffline);
        } else {
          setRole(null);
          if (statusInterval) clearInterval(statusInterval);
          window.removeEventListener('beforeunload', handleOffline);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
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
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
