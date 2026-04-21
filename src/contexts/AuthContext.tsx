import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
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
        
        const isAdminEmail = user.email === 'darshanwala894@gmail.com' || user.email === 'auriicsservices@gmail.com';
        
        if (!userDoc.exists()) {
          // Check for invitation or simply allow access since user wants it "without authorization"
          const inviteDocRef = doc(db, 'invitations', user.email!);
          const inviteDoc = await getDoc(inviteDocRef);
          
          // Determine role: hardcoded admins get admin, plus anybody in the invite list.
          // Everyone else becomes a recruiter by default to allow baseline functionality.
          const defaultRole = isAdminEmail ? 'admin' : (inviteDoc.exists() ? inviteDoc.data().role : 'recruiter');

          const newUser = {
            uid: user.uid,
            email: user.email,
            name: user.displayName || user.email?.split('@')[0],
            role: defaultRole,
            createdAt: new Date().toISOString(),
            isArchived: false
          };
          await setDoc(userDocRef, newUser);
          setRole(defaultRole as any);
        } else {
          const data = userDoc.data();
          if (isAdminEmail && data.isArchived) {
            // Auto-restore admin if accidentally archived
            await updateDoc(userDocRef, { isArchived: false });
            setRole('admin');
          } else {
            // Always set role if it exists, don't set to null if archived
            // because user wants "no authorization" gate.
            setRole(data.role || 'recruiter');
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
