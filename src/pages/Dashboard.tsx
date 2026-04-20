import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth, db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { useDropzone } from 'react-dropzone';
import { parseResume } from '../lib/gemini';
import UserManagement from '../components/UserManagement';
import CandidateModal from '../components/CandidateModal';
import Analytics from '../components/Analytics';
import { 
  Search, 
  Upload, 
  Users, 
  LogOut, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ChevronRight,
  Shield,
  LayoutDashboard,
  Star,
  LineChart as AnalyticsIcon,
  Trash2
} from 'lucide-react';

export default function Dashboard() {
  const { user, role } = useAuth();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'candidates' | 'users' | 'analytics'>('candidates');
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, 'candidates'), orderBy('createdAt', 'desc'));
    const unsubCandidates = onSnapshot(q, (snapshot) => {
      setCandidates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch team members for uploader mapping (admin only)
    let unsubTeam = () => {};
    if (role === 'admin') {
      unsubTeam = onSnapshot(collection(db, 'users'), (snapshot) => {
        const mapping: Record<string, string> = {};
        snapshot.docs.forEach(doc => {
          mapping[doc.id] = doc.data().email;
        });
        setTeamMembers(mapping);
      });
    }

    return () => {
      unsubCandidates();
      unsubTeam();
    };
  }, [role]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsProcessing(true);
    setUploadStatus('idle');
    
    for (const file of acceptedFiles) {
      try {
        const text = await file.text();
        const parsed = await parseResume(text);
        
        // Convert file to base64 for download later
        const fileBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        
        await addDoc(collection(db, 'candidates'), {
          ...parsed,
          rawText: text,
          fileData: fileBase64,
          fileName: file.name,
          fileType: file.type,
          isShortlisted: false,
          uploadedBy: user?.uid,
          createdAt: new Date().toISOString()
        });
        setUploadStatus('success');
      } catch (err) {
        console.error(err);
        setUploadStatus('error');
      }
    }
    setIsProcessing(false);
  }, [user]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'text/plain': ['.txt'], 'application/pdf': ['.pdf'], 'application/msword': ['.doc', '.docx'] },
    multiple: true 
  } as any);

  const handleLogout = () => auth.signOut();

  const handleShortlist = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'candidates', id), { isShortlisted: !currentStatus });
      if (selectedCandidate?.id === id) {
        setSelectedCandidate((prev: any) => ({ ...prev, isShortlisted: !currentStatus }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCandidate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Permanent delete. Are you sure?')) return;
    try {
      await deleteDoc(doc(db, 'candidates', id));
    } catch (err) {
      console.error(err);
    }
  };

  // Boolean Search logic
  const filteredCandidates = candidates.filter(candidate => {
    if (!searchQuery.trim()) return true;
    const terms = searchQuery.toLowerCase().split(/\s+/);
    const searchableText = `${candidate.fullName} ${candidate.domain} ${candidate.summary} ${candidate.skills?.join(' ')} ${JSON.stringify(candidate.experience)} ${teamMembers[candidate.uploadedBy] || ''}`.toLowerCase();
    return terms.every(term => searchableText.includes(term));
  });

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <h1 className="font-bold text-xl tracking-tight text-slate-800">Aurrum</h1>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <button 
            onClick={() => setActiveTab('candidates')}
            className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'candidates' 
                ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users className="w-5 h-5 mr-3" />
            Candidates
          </button>
          
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'analytics' 
                ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <AnalyticsIcon className="w-5 h-5 mr-3" />
            Talent Search
          </button>

          <div 
            {...getRootProps()} 
            className="flex items-center px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium cursor-pointer transition-all"
          >
            <input {...getInputProps()} />
            <Upload className="w-5 h-5 mr-3" />
            Bulk Upload
          </div>

          {role === 'admin' && (
            <button 
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'users' 
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Shield className="w-5 h-5 mr-3" />
              Team
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg group transition-all hover:bg-indigo-50/50">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs uppercase shadow-sm">
              {user?.displayName?.slice(0, 2) || user?.email?.slice(0, 2)}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate">{user?.email}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{role || 'Recruiter'}</p>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-4 text-sm font-medium text-slate-500 font-sans">
            <span className="cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => setActiveTab('candidates')}>Portal</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-900 capitalize">
              {activeTab === 'candidates' ? 'Candidate Pulse' : activeTab === 'analytics' ? 'Talent Analytics' : 'User Management'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {isProcessing && (
              <div className="flex items-center gap-2 text-indigo-600 text-xs font-semibold animate-pulse">
                <Loader2 className="animate-spin" size={14} />
                AI Parsing Active...
              </div>
            )}
            <button 
              {...getRootProps()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center shadow-lg shadow-indigo-100 transition-all active:scale-95"
            >
              <input {...getInputProps()} />
              <Upload className="w-4 h-4 mr-2" />
              Upload CVs
            </button>
          </div>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          {activeTab === 'candidates' ? (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Stats Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <FileText size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Total Index</p>
                    <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{candidates.length}</h3>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                    <Star size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Shortlisted</p>
                    <h3 className="text-2xl font-bold text-emerald-600 tracking-tight">{candidates.filter(c => c.isShortlisted).length}</h3>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                    <LayoutDashboard size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Matches found</p>
                    <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{filteredCandidates.length}</h3>
                  </div>
                </div>
              </div>

              {/* Search Area */}
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col gap-4">
                <div className="flex flex-col gap-2 px-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Search size={12} /> Boolean Search Expression
                  </label>
                  <div className="flex gap-2 items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 ring-2 ring-transparent focus-within:ring-indigo-500/10 focus-within:border-indigo-500/50 transition-all">
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g. React AND Node NOT Java"
                      className="flex-1 bg-transparent border-none focus:outline-none text-sm font-mono placeholder:font-sans"
                    />
                    <div className="h-6 w-px bg-slate-200 mx-2" />
                    <button className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-4 py-1.5 rounded-xl transition-all uppercase tracking-widest">Execute</button>
                  </div>
                </div>

                {/* Candidates Table */}
                <div className="overflow-hidden border border-slate-100 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4">Candidate Identity</th>
                        <th className="px-6 py-4">Domain Focus</th>
                        <th className="px-6 py-4">Competencies</th>
                        {role === 'admin' && <th className="px-6 py-4">Uploaded By</th>}
                        <th className="px-6 py-4 text-right">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-slate-600 divide-y divide-slate-100">
                      {filteredCandidates.map((candidate) => (
                        <tr key={candidate.id} className="hover:bg-indigo-50/20 group transition-all cursor-pointer" onClick={() => setSelectedCandidate(candidate)}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="font-bold text-slate-800 group-hover:text-indigo-700 transition-colors uppercase tracking-tight">{candidate.fullName}</div>
                              {candidate.isShortlisted && <Star size={12} className="text-amber-500 fill-amber-500" />}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">{candidate.email || 'No contact mail'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                              {candidate.domain || 'Unsorted'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-1.5 flex-wrap">
                              {candidate.skills?.slice(0, 3).map((skill: string) => (
                                <span key={skill} className="bg-white border border-slate-100 text-slate-500 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm transition-all group-hover:border-emerald-100 group-hover:text-emerald-600">
                                  {skill}
                                </span>
                              ))}
                              {candidate.skills?.length > 3 && (
                                <span className="text-[9px] text-slate-300 font-bold px-2 self-center">
                                  +{candidate.skills.length - 3}
                                </span>
                              )}
                            </div>
                          </td>
                          {role === 'admin' && (
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-400">
                                  {(teamMembers[candidate.uploadedBy] || 'AI').slice(0, 2).toUpperCase()}
                                </div>
                                <span className="text-[10px] font-medium text-slate-500 truncate max-w-[120px]">
                                  {teamMembers[candidate.uploadedBy] || 'System Index'}
                                </span>
                              </div>
                            </td>
                          )}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                              {role === 'admin' && (
                                <button 
                                  onClick={(e) => handleDeleteCandidate(e, candidate.id)}
                                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                              <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedCandidate(candidate); }}
                                className="text-[10px] font-black text-indigo-400 hover:text-indigo-600 uppercase tracking-widest transition-colors flex items-center gap-1"
                              >
                                Details <ChevronRight size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredCandidates.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-20 text-center text-slate-300 font-medium italic">
                            <Users size={32} className="mx-auto mb-2 opacity-20" />
                            No matches found in standard index
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === 'analytics' ? (
            <Analytics candidates={candidates} />
          ) : (
            <UserManagement />
          )}
        </div>
      </main>

      {/* Candidate Profile Modal */}
      <CandidateModal 
        candidate={selectedCandidate} 
        isOpen={!!selectedCandidate} 
        onClose={() => setSelectedCandidate(null)}
        onShortlist={handleShortlist}
      />
    </div>
  );
}


