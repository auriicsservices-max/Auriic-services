import React, { useState, useEffect, useRef } from 'react';
import { 
  FileSpreadsheet, ExternalLink, Download, Upload, CheckCircle2, AlertTriangle, 
  RefreshCw, ShieldCheck, Lock, Sparkles, Database, ArrowRight, Check, XCircle
} from 'lucide-react';
import { linkWithPopup, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');

let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem('aurrum_gs_token');

export const initGoogleSheetsAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  const currentToken = cachedAccessToken || localStorage.getItem('aurrum_gs_token');
  if (auth.currentUser && currentToken) {
    if (onAuthSuccess) onAuthSuccess(auth.currentUser, currentToken);
  } else if (!currentToken && onAuthFailure) {
    onAuthFailure();
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    const storedToken = cachedAccessToken || localStorage.getItem('aurrum_gs_token');
    if (user && storedToken) {
      cachedAccessToken = storedToken;
      if (onAuthSuccess) onAuthSuccess(user, storedToken);
    } else if (user && !storedToken) {
      if (onAuthFailure) onAuthFailure();
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSheetsSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    let result;
    if (auth.currentUser) {
      try {
        result = await linkWithPopup(auth.currentUser, provider);
      } catch (linkErr: any) {
        console.warn('linkWithPopup fallback to popup:', linkErr);
        result = await signInWithPopup(auth, provider);
      }
    } else {
      result = await signInWithPopup(auth, provider);
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }
    cachedAccessToken = credential.accessToken;
    localStorage.setItem('aurrum_gs_token', cachedAccessToken);
    const activeUser = auth.currentUser || result.user;
    if (activeUser?.email) {
      localStorage.setItem('aurrum_gs_email', activeUser.email);
    }
    return { user: activeUser, accessToken: cachedAccessToken };
  } catch (err: any) {
    console.error('Google Sheets sign in error:', err);
    throw err;
  } finally {
    isSigningIn = false;
  }
};

export const googleSheetsSignOut = async () => {
  cachedAccessToken = null;
  localStorage.removeItem('aurrum_gs_token');
  localStorage.removeItem('aurrum_gs_email');
  // Do NOT log out the CRM user session (auth)
};

export const getGoogleSheetsAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken || localStorage.getItem('aurrum_gs_token');
};

interface Candidate {
  id?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  domainFocus?: string;
  status?: string;
  skills?: string[];
  createdAt?: any;
}

interface GoogleSheetsSyncProps {
  candidates: Candidate[];
  onImportSuccess?: () => void;
  role?: string;
}

export default function GoogleSheetsSync({ candidates, onImportSuccess, role }: GoogleSheetsSyncProps) {
  const isAdminOrDev = role === 'admin' || role === 'developer';
  const [needsAuth, setNeedsAuth] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportResultUrl, setExportResultUrl] = useState<string | null>(null);
  
  const [importSpreadsheetUrl, setImportSpreadsheetUrl] = useState('https://docs.google.com/spreadsheets/d/1kf5GdJQOwIim-jOyIQztxZrGbTBttiQ2QYePkyTZAjA/edit?gid=1998677037#gid=1998677037');
  const [isImporting, setIsImporting] = useState(false);
  const stopSyncRef = useRef(false);
  const [importStats, setImportStats] = useState<{ imported: number; duplicates: number; totalRows?: number } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; currentCandidate: string } | null>(null);

  useEffect(() => {
    const unsubscribe = initGoogleSheetsAuth(
      (u, t) => {
        setUser(u);
        setToken(t);
        setNeedsAuth(false);
      },
      () => {
        setNeedsAuth(true);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const res = await googleSheetsSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setNeedsAuth(false);
        setStatusMessage('Successfully connected to Google Workspace & Sheets!');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await googleSheetsSignOut();
    setUser(null);
    setToken(null);
    setNeedsAuth(true);
    setStatusMessage('Disconnected from Google Sheets.');
  };

  const handleExportToSheets = async () => {
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    setIsExporting(true);
    setErrorMsg(null);
    setStatusMessage('Creating new Google Sheet and exporting candidates...');

    try {
      // 1. Create Spreadsheet
      const createRes = await fetch('https://sheets.googleapis.com/spreadsheets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            title: `Aurrum CRM Candidates & Pipeline - ${new Date().toLocaleDateString()}`
          }
        })
      });

      if (!createRes.ok) {
        const errJson = await createRes.json();
        throw new Error(errJson.error?.message || 'Failed to create Google Sheet');
      }

      const sheetData = await createRes.json();
      const spreadsheetId = sheetData.spreadsheetId;
      const sheetUrl = sheetData.spreadsheetUrl;

      // 2. Prepare rows: Header + Candidates
      const rows = [
        ['ID', 'Full Name', 'Email', 'Phone', 'Domain Focus', 'Status', 'Skills', 'Created At'],
        ...candidates.map(c => [
          c.id || 'N/A',
          c.fullName || 'Unknown',
          c.email || 'N/A',
          c.phone || 'N/A',
          c.domainFocus || 'General',
          c.status || 'Sourced',
          (c.skills || []).join(', '),
          c.createdAt ? new Date(c.createdAt?.seconds ? c.createdAt.seconds * 1000 : Date.now()).toLocaleDateString() : 'N/A'
        ])
      ];

      // 3. Append values
      const updateRes = await fetch(
        `https://sheets.googleapis.com/spreadsheets/${spreadsheetId}/values/Sheet1!A1:H${rows.length}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            range: `Sheet1!A1:H${rows.length}`,
            majorDimension: 'ROWS',
            values: rows
          })
        }
      );

      if (!updateRes.ok) {
        throw new Error('Failed to write candidate records into the Google Sheet.');
      }

      setExportResultUrl(sheetUrl);
      setStatusMessage(`Successfully exported ${candidates.length} candidates to Google Sheets!`);
    } catch (err: any) {
      console.error('Export error:', err);
      // Fallback: trigger CSV download if Google API creation fails
      try {
        const csvContent = [
          ['ID', 'Full Name', 'Email', 'Phone', 'Domain Focus', 'Status', 'Skills', 'Created At'],
          ...candidates.map(c => [
            `"${c.id || 'N/A'}"`,
            `"${c.fullName || 'Unknown'}"`,
            `"${c.email || 'N/A'}"`,
            `"${c.phone || 'N/A'}"`,
            `"${c.domainFocus || 'General'}"`,
            `"${c.status || 'Sourced'}"`,
            `"${(c.skills || []).join(', ')}"`,
            `"${c.createdAt ? new Date(c.createdAt?.seconds ? c.createdAt.seconds * 1000 : Date.now()).toLocaleDateString() : 'N/A'}"`
          ])
        ].map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `aurrum_candidates_export_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setStatusMessage('Google Sheets API restriction encountered. Automatically downloaded candidate database as CSV backup!');
      } catch (fallbackErr) {
        setErrorMsg(err.message || String(err));
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFromSheets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isImporting) return;
    if (!importSpreadsheetUrl.trim()) {
      setErrorMsg('Please enter a valid Google Sheets URL or Spreadsheet ID.');
      return;
    }

    // Extract spreadsheet ID from URL if full URL is pasted
    let spreadsheetId = importSpreadsheetUrl.trim();
    const match = spreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      spreadsheetId = match[1];
    }

    let gid = '0';
    const gidMatch = importSpreadsheetUrl.match(/gid=([0-9]+)/);
    if (gidMatch && gidMatch[1]) {
      gid = gidMatch[1];
    }

    stopSyncRef.current = false;
    setIsImporting(true);
    setErrorMsg(null);
    setImportStats(null);
    setStatusMessage('Connecting to Google Sheets and fetching resume records one by one...');
    setSyncProgress(null);

    let rows: string[][] = [];

    const parseCsvText = (csvText: string) => {
      const lines = csvText.split(/\r?\n/);
      const parsedRows: string[][] = [];
      for (let line of lines) {
        if (!line.trim()) continue;
        const row: string[] = [];
        let inQuotes = false;
        let entry = '';
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            row.push(entry.trim().replace(/^"|"$/g, ''));
            entry = '';
          } else {
            entry += char;
          }
        }
        row.push(entry.trim().replace(/^"|"$/g, ''));
        parsedRows.push(row);
      }
      return parsedRows;
    };

    try {
      // Strategy 1: Try Google Sheets API if token is present
      if (token) {
        try {
          const metaRes = await fetch(
            `https://sheets.googleapis.com/spreadsheets/${spreadsheetId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );

          let rangeToFetch = 'A1:Z1000';
          if (metaRes.ok) {
            const metaData = await metaRes.json();
            const firstSheetTitle = metaData.sheets?.[0]?.properties?.title;
            if (firstSheetTitle) {
              rangeToFetch = `'${firstSheetTitle}'!A1:Z1000`;
            }
          }

          const res = await fetch(
            `https://sheets.googleapis.com/spreadsheets/${spreadsheetId}/values/${rangeToFetch}`,
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );

          if (res.ok) {
            const data = await res.json();
            if (data.values && data.values.length > 0) {
              rows = data.values;
            }
          }
        } catch (apiErr) {
          console.warn('Google Sheets API fetch failed, falling back to public CSV export:', apiErr);
        }
      }

      // Strategy 2: If API fetch didn't yield rows, try public CSV export URL with gid
      if (!rows || rows.length === 0) {
        const csvRes = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`);
        if (!csvRes.ok) {
          const fallbackCsvRes = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`);
          if (!fallbackCsvRes.ok) {
            throw new Error('Failed to fetch Google Sheet. Please ensure the Google Sheet is public ("Anyone with the link can view") or authenticate with Google.');
          }
          const csvText = await fallbackCsvRes.text();
          rows = parseCsvText(csvText);
        } else {
          const csvText = await csvRes.text();
          rows = parseCsvText(csvText);
        }
      }

      if (!rows || rows.length === 0) {
        throw new Error('The Google Sheet is empty or could not be parsed.');
      }

      // Ensure header row exists
      const firstRowStr = rows[0].join(' ').toLowerCase();
      const hasHeader = firstRowStr.includes('name') || firstRowStr.includes('email') || firstRowStr.includes('candidate') || firstRowStr.includes('applicant');
      if (!hasHeader) {
        rows.unshift(['Name', 'Email', 'Phone', 'Domain', 'Status', 'Skills', 'Resume']);
      }

      const header = rows[0].map((h: string) => h.toLowerCase().trim());
      const nameIdx = header.findIndex((h: string) => h.includes('name') || h.includes('candidate') || h.includes('applicant'));
      const emailIdx = header.findIndex((h: string) => h.includes('email') || h.includes('mail'));
      const phoneIdx = header.findIndex((h: string) => h.includes('phone') || h.includes('mobile') || h.includes('contact') || h.includes('tel'));
      const domainIdx = header.findIndex((h: string) => h.includes('domain') || h.includes('role') || h.includes('focus') || h.includes('position') || h.includes('title'));
      const statusIdx = header.findIndex((h: string) => h.includes('status') || h.includes('stage'));
      const skillsIdx = header.findIndex((h: string) => h.includes('skill') || h.includes('tech') || h.includes('stack'));
      const resumeIdx = header.findIndex((h: string) => h.includes('resume') || h.includes('cv') || h.includes('link') || h.includes('portfolio') || h.includes('url'));

      let importedCount = 0;
      let duplicateCount = 0;
      const totalRowsToProcess = rows.length - 1;

      const existingEmails = new Set(candidates.map(c => c.email?.toLowerCase().trim()).filter(Boolean));

      for (let i = 1; i < rows.length; i++) {
        if (stopSyncRef.current) {
          setStatusMessage(`Sync stopped by user. Successfully imported ${importedCount} candidates before stopping.`);
          break;
        }

        const row = rows[i];
        if (!row || row.length === 0) continue;

        const fullName = nameIdx >= 0 ? (row[nameIdx] || `Candidate ${i}`) : (row[1] || row[0] || `Candidate ${i}`);
        const email = (emailIdx >= 0 ? (row[emailIdx] || `sheet.import.${i}@auriic.co`) : (row[2] || row[1] || `sheet.import.${i}@auriic.co`)).toLowerCase().trim();
        const phone = phoneIdx >= 0 ? (row[phoneIdx] || '+971 50 000 0000') : (row[3] || row[2] || '+971 50 000 0000');
        const domainFocus = domainIdx >= 0 ? (row[domainIdx] || 'Engineering / Tech') : 'Engineering / Tech';
        const status = statusIdx >= 0 ? (row[statusIdx] || 'Sourced') : 'Sourced';
        const resumeUrl = resumeIdx >= 0 ? (row[resumeIdx] || '') : '';
        const skillsStr = skillsIdx >= 0 ? (row[skillsIdx] || '') : '';
        const skills = skillsStr ? skillsStr.split(',').map((s: string) => s.trim()).filter(Boolean) : ['JavaScript', 'React', 'TypeScript', 'Node.js'];

        setSyncProgress({
          current: i,
          total: totalRowsToProcess,
          currentCandidate: fullName
        });

        if (existingEmails.has(email)) {
          duplicateCount++;
          continue;
        }

        existingEmails.add(email);

        // Add candidate to Firebase Firestore
        await addDoc(collection(db, 'candidates'), {
          fullName,
          email,
          phone,
          domainFocus,
          status,
          skills,
          categorizedSkills: { languages: skills },
          resumeUrl: resumeUrl || null,
          source: 'Google Sheets One-by-One Sync',
          summary: resumeUrl ? `Imported with Resume link: ${resumeUrl}` : 'Imported live from Google Sheets row sync.',
          createdAt: serverTimestamp(),
          isArchived: false
        });

        importedCount++;

        // Small pause to let UI render progress smoothly
        await new Promise(r => setTimeout(r, 80));
      }

      if (!stopSyncRef.current) {
        setImportStats({ imported: importedCount, duplicates: duplicateCount, totalRows: totalRowsToProcess });
        setStatusMessage(`Successfully synced all resumes one-by-one! Imported ${importedCount} candidates into Firebase Firestore (${duplicateCount} duplicates skipped).`);
        if (onImportSuccess) onImportSuccess();
      }
      setSyncProgress(null);
    } catch (err: any) {
      console.error('Import error:', err);
      setErrorMsg(err.message || String(err));
      setSyncProgress(null);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#004564] to-[#003649] rounded-2xl p-8 text-white shadow-xl relative overflow-hidden border border-[#A98B56]/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#A98B56]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#A98B56]/20 border border-[#A98B56]/40 text-[#BC9B66] text-xs font-semibold tracking-wide">
              <FileSpreadsheet size={14} /> Live Resume Synchronization
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight font-sans">Live Resume Sync Hub</h1>
            <p className="text-[#DCE6EC] max-w-xl text-sm leading-relaxed">
              Synchronize candidate resumes and records one-by-one live from your Google Sheets spreadsheet directly into the Aurrum CRM Firebase database.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!isAdminOrDev ? (
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2.5 rounded-xl border border-white/20 backdrop-blur-sm">
                <ShieldCheck size={16} className="text-[#22C55E]" />
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-white">Centralized Shared System Integration</span>
                  <span className="text-[10px] text-[#A9C2CE]">Managed by Admin / Developer</span>
                </div>
              </div>
            ) : !user ? (
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="gsi-material-button px-5 py-3 rounded-xl bg-white text-[#002D38] hover:bg-slate-100 font-semibold text-sm shadow-lg transition-all flex items-center gap-3 cursor-pointer"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 bg-white/10 px-4 py-2.5 rounded-xl border border-white/20 backdrop-blur-sm">
                  <div className="w-8 h-8 rounded-full bg-[#A98B56] text-white flex items-center justify-center font-bold text-xs">
                    {user.email?.substring(0, 2).toUpperCase() || 'GS'}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-white truncate max-w-[160px]">{user.email}</span>
                    <span className="text-[10px] text-[#A9C2CE] flex items-center gap-1 font-semibold">
                      <ShieldCheck size={12} className="text-[#22C55E]" /> Sheets & Drive Connected
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3.5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Disconnect Google Account"
                >
                  <XCircle size={14} /> Disconnect Google
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Banners */}
      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center gap-3 shadow-sm">
          <CheckCircle2 size={20} className="shrink-0 text-emerald-500" />
          <span className="text-sm font-medium">{statusMessage}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 flex items-center gap-3 shadow-sm">
          <AlertTriangle size={20} className="shrink-0 text-rose-500" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Export vs Import */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Export Card */}
        <div className="crm-card bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Download size={24} />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Export Candidates to Google Sheets</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Generate a formatted Google Spreadsheet containing all active candidate records, domain focuses, pipeline stages, and skills instantly.
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
              <span>Ready for Export:</span>
              <span className="font-bold text-[var(--text-primary)]">{candidates.length} Candidate Records</span>
            </div>

            <button
              onClick={handleExportToSheets}
              disabled={isExporting || candidates.length === 0}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#A98B56] to-[#BC9B66] text-white font-semibold text-sm shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isExporting ? <RefreshCw size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
              <span>{isExporting ? 'Exporting to Google Sheets...' : 'Create & Export Google Sheet'}</span>
            </button>

            {exportResultUrl && (
              <a
                href={exportResultUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 text-white font-semibold text-xs shadow hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
              >
                <ExternalLink size={14} /> Open Created Google Sheet
              </a>
            )}
          </div>
        </div>

        {/* Import Card */}
        <div className="crm-card bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Upload size={24} />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Import Candidates from Google Sheets</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Paste a Google Sheets URL or Spreadsheet ID to bulk-import candidate rows directly into your Aurrum CRM pipeline.
            </p>
          </div>

          <form onSubmit={handleImportFromSheets} className="space-y-4 pt-4 border-t border-[var(--border-color)]">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                Google Sheets URL or Spreadsheet ID
              </label>
              <input
                type="text"
                value={importSpreadsheetUrl}
                onChange={(e) => setImportSpreadsheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[#A98B56]"
              />
            </div>

            <button
              type="submit"
              disabled={isImporting}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#004564] to-[#005472] text-white font-bold text-sm shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isImporting ? <RefreshCw size={18} className="animate-spin text-[#A98B56]" /> : <Sparkles size={18} className="text-[#A98B56]" />}
              <span>{isImporting ? 'Syncing Resumes One by One...' : '🚀 Sync Sheet Resumes One-by-One to Firebase'}</span>
            </button>

            {syncProgress && (
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                  <span className="flex items-center gap-2">
                    <RefreshCw size={14} className="animate-spin text-blue-500" />
                    Syncing Row {syncProgress.current} of {syncProgress.total}
                  </span>
                  <span>{Math.round((syncProgress.current / syncProgress.total) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-[#004564] to-[#A98B56] h-full transition-all duration-150"
                    style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] truncate">
                  Processing: <b>{syncProgress.currentCandidate}</b>
                </p>

                <button
                  type="button"
                  onClick={() => {
                    stopSyncRef.current = true;
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <XCircle size={14} /> Stop Syncing Resumes
                </button>
              </div>
            )}

            {importStats && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                <span>Successfully Synced: <b>{importStats.imported}</b></span>
                <span>Duplicates Skipped: <b>{importStats.duplicates}</b></span>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
