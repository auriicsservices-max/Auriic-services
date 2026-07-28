import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useTheme } from './ThemeContext';

interface BrandingContextType {
  logoUrlLight: string;
  logoUrlDark: string;
  loginLogoLight: string;
  loginLogoDark: string;
  headerLogoLight: string;
  headerLogoDark: string;
  invoiceLogoLight: string;
  invoiceLogoDark: string;

  activeLogoUrl: string;
  activeLoginLogoUrl: string;
  activeHeaderLogoUrl: string;
  activeInvoiceLogoUrl: string;

  bulkUploadLimit: number;
  fileSizeLimit: number;
  loading: boolean;
}

const BrandingContext = createContext<BrandingContextType>({
  logoUrlLight: '',
  logoUrlDark: '',
  loginLogoLight: '',
  loginLogoDark: '',
  headerLogoLight: '',
  headerLogoDark: '',
  invoiceLogoLight: '',
  invoiceLogoDark: '',

  activeLogoUrl: '',
  activeLoginLogoUrl: '',
  activeHeaderLogoUrl: '',
  activeInvoiceLogoUrl: '',

  bulkUploadLimit: 20,
  fileSizeLimit: 5,
  loading: true,
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [logoUrlLight, setLogoUrlLight] = useState<string>('');
  const [logoUrlDark, setLogoUrlDark] = useState<string>('');
  const [loginLogoLight, setLoginLogoLight] = useState<string>('');
  const [loginLogoDark, setLoginLogoDark] = useState<string>('');
  const [headerLogoLight, setHeaderLogoLight] = useState<string>('');
  const [headerLogoDark, setHeaderLogoDark] = useState<string>('');
  const [invoiceLogoLight, setInvoiceLogoLight] = useState<string>('');
  const [invoiceLogoDark, setInvoiceLogoDark] = useState<string>('');

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
        setLoginLogoLight(data.loginLogoLight || '');
        setLoginLogoDark(data.loginLogoDark || '');
        setHeaderLogoLight(data.headerLogoLight || '');
        setHeaderLogoDark(data.headerLogoDark || '');
        setInvoiceLogoLight(data.invoiceLogoLight || '');
        setInvoiceLogoDark(data.invoiceLogoDark || '');
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

  // Compute active URLs based on current theme with fallback chain
  const isDark = theme === 'dark';

  const activeLogoUrl = isDark 
    ? (logoUrlDark || logoUrlLight || '') 
    : (logoUrlLight || logoUrlDark || '');

  const activeLoginLogoUrl = isDark
    ? (loginLogoDark || logoUrlDark || loginLogoLight || logoUrlLight || '')
    : (loginLogoLight || logoUrlLight || loginLogoDark || logoUrlDark || '');

  const activeHeaderLogoUrl = activeLogoUrl;

  const activeInvoiceLogoUrl = isDark
    ? (invoiceLogoDark || logoUrlDark || invoiceLogoLight || logoUrlLight || '')
    : (invoiceLogoLight || logoUrlLight || invoiceLogoDark || logoUrlDark || '');

  return (
    <BrandingContext.Provider value={{
      logoUrlLight,
      logoUrlDark,
      loginLogoLight,
      loginLogoDark,
      headerLogoLight,
      headerLogoDark,
      invoiceLogoLight,
      invoiceLogoDark,
      activeLogoUrl,
      activeLoginLogoUrl,
      activeHeaderLogoUrl,
      activeInvoiceLogoUrl,
      bulkUploadLimit,
      fileSizeLimit,
      loading
    }}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => useContext(BrandingContext);
