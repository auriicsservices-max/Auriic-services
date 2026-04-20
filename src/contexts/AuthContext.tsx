import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
    return onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Create user doc if it doesn't exist
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          // Check for invitation
          const inviteDocRef = doc(db, 'invitations', user.email!);
          const inviteDoc = await getDoc(inviteDocRef);
          
          const isAdminEmail = user.email === 'darshanwala894@gmail.com' || user.email === 'auriicsservices@gmail.com';
          
          if (!inviteDoc.exists() && !isAdminEmail) {
            setRole(null);
            setLoading(false);
            return;
          }

          const defaultRole = inviteDoc.exists() 
            ? inviteDoc.data().role 
            : 'admin';

          const newUser = {
            uid: user.uid,
            email: user.email,
            role: defaultRole,
            createdAt: new Date().toISOString()
          };
          await setDoc(userDocRef, newUser);
          setRole(defaultRole as any);
        } else {
          const data = userDoc.data();
          if (data.isArchived) {
            setRole(null);
          } else {
            setRole(data.role);
          }
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
