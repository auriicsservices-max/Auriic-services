import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useTheme } from './ThemeContext';

interface BrandingContextType {
  logoUrlLight: string;
  logoUrlDark: string;
  activeLogoUrl: string;
  bulkUploadLimit: number;
  fileSizeLimit: number;
  loading: boolean;
}

const BrandingContext = createContext<BrandingContextType>({
  logoUrlLight: '',
  logoUrlDark: '',
  activeLogoUrl: '',
  bulkUploadLimit: 20,
  fileSizeLimit: 5,
  loading: true,
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [logoUrlLight, setLogoUrlLight] = useState<string>('');
  const [logoUrlDark, setLogoUrlDark] = useState<string>('');
  const [bulkUploadLimit, setBulkUploadLimit] = useState<number>(20);
  const [fileSizeLimit, setFileSizeLimit] = useState<number>(5);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const docRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLogoUrlLight(data.logoUrlLight || data.logoUrl || '');
        setLogoUrlDark(data.logoUrlDark || data.logoUrl || '');
        setBulkUploadLimit(data.bulkUploadLimit || 20);
        setFileSizeLimit(data.fileSizeCap || data.fileSizeLimit || 5);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error listening to global settings:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Compute activeLogoUrl based on the current theme
  const activeLogoUrl = theme === 'dark' 
    ? (logoUrlDark || logoUrlLight || '') 
    : (logoUrlLight || logoUrlDark || '');

  return (
    <BrandingContext.Provider value={{
      logoUrlLight,
      logoUrlDark,
      activeLogoUrl,
      bulkUploadLimit,
      fileSizeLimit,
      loading
    }}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => useContext(BrandingContext);
