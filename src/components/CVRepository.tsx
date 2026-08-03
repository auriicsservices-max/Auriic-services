import React, { useState, useMemo } from 'react';
import { Search, FileText, Mail, Calendar, ExternalLink, Download, ChevronLeft, ChevronRight, Sparkles, Send, RefreshCw, Bot, User, Trash2, X, Maximize2, Minimize2, ChevronDown, ChevronUp, Copy, Check, Archive } from 'lucide-react';
import Select from 'react-select';
import ReactMarkdown from 'react-markdown';
import { Pagination } from './Pagination';
import JSZip from 'jszip';

interface CVRepositoryProps {
  candidates: any[];
  onSelect?: (candidate: any) => void;
}

const DOMAIN_OPTIONS = [
  { value: 'IT / Software', label: 'IT / Software' },
  { value: 'AI / Machine Learning', label: 'AI / Machine Learning' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'HR', label: 'HR' },
  { value: 'Operations', label: 'Operations' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Design', label: 'Design' },
  { value: 'Project Management', label: 'Project Management' },
  { value: 'Others', label: 'Others' },
  { value: 'Unknown Domain', label: 'Unknown Domain' }
];

export default function CVRepository({ candidates, onSelect }: CVRepositoryProps) {
  const [search, setSearch] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<any[]>([]);
  const [isMultiDomain, setIsMultiDomain] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // AI Chat Search states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatFullscreen, setChatFullscreen] = useState(false);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [searchPrecision, setSearchPrecision] = useState<'semantic' | 'exact'>('semantic');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; text: string; matchedIds?: string[] }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [aiFilterActive, setAiFilterActive] = useState(false);
  const [aiMatchedIds, setAiMatchedIds] = useState<string[]>([]);
  const [currentAiQuery, setCurrentAiQuery] = useState('');
  
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (chatOpen && !chatMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatLoading, chatOpen, chatMinimized]);

  const handleCopyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleClearChat = () => {
    setChatMessages([]);
    setChatInput('');
    setAiFilterActive(false);
    setAiMatchedIds([]);
    setCurrentAiQuery('');
  };

  const handleDownloadAllZipped = async () => {
    try {
      const zip = new JSZip();
      let count = 0;
      
      for (let index = 0; index < candidates.length; index++) {
        const c = candidates[index];
        const safeName = (c.fullName || `Candidate_${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        const prefix = `${index + 1}_${safeName}`;
        let added = false;

        if (c.cvBase64) {
          try {
            const arr = c.cvBase64.split(',');
            const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/pdf';
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            const ext = mime.includes('wordprocessingml') ? 'docx' : mime.includes('msword') ? 'doc' : 'pdf';
            const fileName = `${prefix}_CV.${ext}`;
            zip.file(fileName, u8arr);
            added = true;
            count++;
          } catch (e) {
            console.warn(`Failed parsing cvBase64 for ${c.fullName}:`, e);
          }
        } 
        
        if (!added && c.url) {
          try {
            const res = await fetch(c.url);
            if (res.ok) {
              const blob = await res.blob();
              const ext = c.url.split('.').pop()?.split('?')[0] || 'pdf';
              const fileName = `${prefix}_CV.${ext}`;
              zip.file(fileName, blob);
              added = true;
              count++;
            }
          } catch (err) {
            console.warn('Failed to fetch CV URL for zip:', c.fullName);
          }
        }

        if (!added) {
          // Fallback text profile summary so every single candidate is included in the zip
          const profileText = `
Candidate Name: ${c.fullName || 'N/A'}
Email: ${c.email || 'N/A'}
Phone: ${c.phone || 'N/A'}
Position: ${c.position || c.title || 'N/A'}
Status: ${c.status || 'Active'}
Skills: ${Array.isArray(c.skills) ? c.skills.join(', ') : (typeof c.skills === 'string' ? c.skills : 'N/A')}
Experience / CTC: ${typeof c.experience === 'string' ? c.experience : (Array.isArray(c.experience) ? c.experience.map(e => (typeof e === 'string' ? e : (e.role || e.job_title || ''))).filter(Boolean).join(', ') : (c.totalExperience ? `${c.totalExperience} Yrs` : 'N/A'))} / ${c.ctc || 'N/A'}
Summary / Bio: ${c.bio || c.summary || 'No resume file uploaded. Profile summary generated by Aurrum CRM.'}
          `.trim();
          zip.file(`${prefix}_Profile.txt`, profileText);
          count++;
        }
      }

      if (count === 0) {
        alert('No candidates found in the repository.');
        return;
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Aurrum_CRM_All_Candidates_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ZIP generation error:', err);
      alert('Failed to generate ZIP package.');
    }
  };

  const preparedCandidates = useMemo(() => {
    return candidates.map(c => {
      let flatSkills: string[] = [];
      if (Array.isArray(c.skills)) {
        flatSkills = c.skills;
      } else if (c.skills && typeof c.skills === 'object') {
        flatSkills = Object.values(c.skills)
          .filter(Array.isArray)
          .flat() as string[];
      }
      return {
        id: c.id,
        fullName: c.fullName || c.name || 'Unnamed Candidate',
        skills: flatSkills,
        domainFocus: c.domainFocus || c.domain || '',
        position: c.position || c.title || '',
        experience: typeof c.totalExperience === 'number' || typeof c.totalExperience === 'string'
          ? String(c.totalExperience)
          : (typeof c.totalExperienceYears === 'number' || typeof c.totalExperienceYears === 'string'
              ? String(c.totalExperienceYears)
              : '0'),
        location: typeof c.location === 'object' 
          ? `${c.location?.city || ''} ${c.location?.state || ''} ${c.location?.country || ''}`.trim() 
          : (c.location || '')
      };
    });
  }, [candidates]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch('/api/cv/search-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMsg,
          candidates: preparedCandidates,
          history: chatMessages,
          precision: searchPrecision
        })
      });

      const contentType = response.headers.get('content-type');
      if (!response.ok) {
        let errorMessage = `Server returned status ${response.status}`;
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json().catch(() => ({}));
          errorMessage = errorData.details || errorData.error || errorMessage;
        } else {
          const errorText = await response.text().catch(() => '');
          console.error('Server returned non-JSON error:', errorText);
        }
        throw new Error(errorMessage);
      }

      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned an invalid response (not JSON)');
      }

      const result = await response.json();
      const matched = result.matchedIds || [];
      const explanation = result.explanation || 'No candidates found matching the search criteria.';

      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        text: explanation,
        matchedIds: matched
      }]);

      if (matched.length > 0) {
        setAiMatchedIds(matched);
        setAiFilterActive(true);
        setCurrentAiQuery(userMsg);
      } else {
        setAiFilterActive(false);
        setAiMatchedIds([]);
        setCurrentAiQuery('');
      }
    } catch (err: any) {
      console.error('AI Search Error:', err);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        text: `Sorry, I encountered an error while searching for candidates: ${err?.message || 'Please try again.'}` 
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedDomains, rowsPerPage, aiFilterActive]);

  const stats = useMemo(() => {
    const total = candidates.length;
    
    // Recent CVs (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recent = candidates.filter(c => new Date(c.createdAt) > sevenDaysAgo).length;
    
    // Unique emails
    const uniqueEmails = new Set(candidates.map(c => c.email?.toLowerCase()).filter(Boolean)).size;

    return { total, recent, uniqueEmails };
  }, [candidates]);

  const customSelectStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: 'var(--bg-primary)',
      borderColor: 'var(--border-color)',
      borderRadius: '1rem',
      padding: '0.15rem',
      boxShadow: 'none',
      cursor: 'pointer',
      minHeight: '42px',
      '&:hover': {
        borderColor: 'var(--brand-color)',
      },
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? 'var(--brand-color)' : state.isFocused ? 'var(--bg-secondary)' : 'var(--card-bg)',
      color: state.isSelected ? 'white' : 'var(--text-primary)',
      fontSize: '0.75rem',
      cursor: 'pointer',
    }),
    menu: (provided: any) => ({ ...provided, backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', borderRadius: '1rem', overflow: 'hidden', zIndex: 10 }),
    input: (provided: any) => ({ ...provided, color: 'var(--text-primary)' }),
    placeholder: (provided: any) => ({ ...provided, color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold' }),
    singleValue: (provided: any) => ({ ...provided, color: 'var(--text-primary)', fontSize: '0.75rem', fontWeight: 'bold' }),
    multiValue: (provided: any) => ({
      ...provided,
      backgroundColor: 'var(--sidebar-bg)',
      borderRadius: '0.5rem',
      border: '1px solid var(--border-color)',
    }),
    multiValueLabel: (provided: any) => ({
      ...provided,
      color: 'var(--text-primary)',
      fontSize: '0.75rem',
    }),
    multiValueRemove: (provided: any) => ({
      ...provided,
      color: 'var(--text-muted)',
      ':hover': {
        backgroundColor: 'var(--bg-primary)',
        color: '#EF4444',
      },
    }),
  };

  const evaluateBooleanSearch = (candidate: any, searchString: string) => {
    const tokens = searchString.toLowerCase().split(/\s+/);
    const fullName = (candidate.fullName || '').toLowerCase();
    
    let flatSkills: string[] = [];
    if (Array.isArray(candidate.skills)) {
      flatSkills = [...candidate.skills];
    } else if (candidate.skills && typeof candidate.skills === 'object') {
      flatSkills = Object.values(candidate.skills)
        .filter(Array.isArray)
        .flat() as string[];
    }
    if (Array.isArray(candidate.matchedCustomSkills)) {
      flatSkills.push(...candidate.matchedCustomSkills);
    }
    const skills = flatSkills.map((s: string) => s.toLowerCase());

    const matchesTerm = (term: string) => 
      fullName.includes(term) || skills.some((s: string) => s.includes(term));

    let i = 0;
    let result = true;
    let operator = 'AND'; // Default operator

    while (i < tokens.length) {
      let token = tokens[i];
      
      if (token === 'and' || token === 'or' || token === 'not') {
        operator = token.toUpperCase();
        i++;
        continue;
      }

      const match = matchesTerm(token);

      if (operator === 'AND') {
        result = result && match;
      } else if (operator === 'OR') {
        result = result || match;
      } else if (operator === 'NOT') {
        result = result && !match;
      }
      
      i++;
    }
    return result;
  };

  const filteredCandidates = useMemo(() => {
    let list = [...candidates];
    
    // Sort by latest first
    list.sort((a, b) => {
      const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
      const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    // Apply AI matched IDs filter if active
    if (aiFilterActive) {
      list = list.filter(c => aiMatchedIds.some(id => String(id) === String(c.id)));
    }

    if (selectedDomains.length > 0) {
      list = list.filter(c => {
        const d = (c.domainFocus || c.domain || '').trim();
        const candDom = (!d) ? 'Unknown Domain' : (d === 'IT' ? 'IT / Software' : d === 'Other' ? 'Others' : d);
        return selectedDomains.some(sel => sel.value === candDom);
      });
    }

    if (!search) return list;
    return list.filter(c => evaluateBooleanSearch(c, search));
  }, [candidates, search, selectedDomains, aiFilterActive, aiMatchedIds]);

  const paginatedCandidates = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredCandidates.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredCandidates, currentPage, rowsPerPage]);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="crm-card p-6 flex items-center gap-4">
            <div className="w-14 h-14 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl flex items-center justify-center text-[var(--primary-gold)] shadow-sm">
                <FileText size={28} />
            </div>
            <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest mb-1">Total Candidate CVs</p>
                <h3 className="text-3xl font-black text-[var(--text-primary)]">{stats.total}</h3>
            </div>
        </div>
        <div className="crm-card p-6 flex items-center gap-4">
            <div className="w-14 h-14 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                <FileText size={28} />
            </div>
            <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest mb-1">Recent (7d)</p>
                <h3 className="text-3xl font-black text-[var(--text-primary)]">{stats.recent}</h3>
            </div>
        </div>
        <div className="crm-card p-6 flex items-center gap-4">
            <div className="w-14 h-14 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl flex items-center justify-center text-[var(--primary-gold)] shadow-sm">
                <Mail size={28} />
            </div>
            <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest mb-1">Unique Contacts</p>
                <h3 className="text-3xl font-black text-[var(--text-primary)]">{stats.uniqueEmails}</h3>
            </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-[var(--card-bg)] p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="font-black text-sm text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
            Filter & Search Repository
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadAllZipped}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all border cursor-pointer uppercase tracking-wider bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--primary-gold)] hover:text-[var(--primary-gold)] shadow-xs"
              title="Download all candidate CVs in a single ZIP archive"
            >
              <Archive size={14} className="text-[var(--primary-gold)]" />
              Download All CVs (ZIP)
            </button>
            {chatOpen && chatMinimized && (
              <button
                type="button"
                onClick={() => setChatMinimized(false)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all border cursor-pointer uppercase tracking-wider bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--primary-gold)] hover:text-[var(--primary-gold)]"
              >
                <ChevronDown size={14} />
                Restore AI Chat
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setChatOpen(!chatOpen);
                if (!chatOpen) {
                  setChatMinimized(false);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all border cursor-pointer uppercase tracking-wider ${
                chatOpen && !chatMinimized
                  ? 'crm-btn-gold text-white shadow-sm' 
                  : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--primary-gold)] hover:text-[var(--primary-gold)]'
              }`}
            >
              <Sparkles size={14} className={chatOpen && !chatMinimized ? 'animate-pulse' : ''} />
              {chatOpen && !chatMinimized ? 'Close AI Assistant' : 'Ask AI Chat Assistant'}
            </button>
          </div>
        </div>

        {/* AI Chat Window Block */}
        {chatOpen && !chatMinimized && (
          <div className={`border border-[var(--border-color)] bg-[var(--card-bg)] p-5 sm:p-6 flex flex-col gap-4 transition-all duration-300 rounded-3xl shadow-sm ${
            chatFullscreen 
              ? 'fixed inset-4 md:inset-8 z-50 bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-2xl rounded-3xl flex flex-col justify-between overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200' 
              : ''
          }`}>
            
            {/* Header / Info / Controls */}
            <div className="flex items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#A98B56] to-[#BC9B66] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Bot size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                    AI CV Finder Assistant 
                    <span className="px-2 py-0.5 bg-[var(--primary-gold)]/10 text-[var(--primary-gold)] dark:text-gold-bc9b border border-[var(--primary-gold)]/20 text-[9px] font-black rounded-full uppercase tracking-widest">
                      Gemini 3.6 Flash Engine
                    </span>
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5 font-medium">Chat with Gemini AI to search, rank, and extract talent CVs in real time.</p>
                </div>
              </div>

              {/* Chat Window Operations Header */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search Precision Select */}
                <div className="flex items-center bg-[var(--bg-secondary)] border border-[var(--border-color)] p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSearchPrecision('semantic')}
                    className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      searchPrecision === 'semantic' 
                        ? 'bg-[var(--primary-gold)] text-white shadow-xs' 
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Semantic
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchPrecision('exact')}
                    className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      searchPrecision === 'exact' 
                        ? 'bg-[var(--primary-gold)] text-white shadow-xs' 
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Exact Match
                  </button>
                </div>

                {/* Export Chat */}
                {chatMessages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const text = chatMessages.map(m => `[${m.role.toUpperCase()}]\n${m.text}`).join('\n\n');
                      navigator.clipboard.writeText(text);
                      alert('Chat transcript copied to clipboard!');
                    }}
                    title="Copy full chat transcript"
                    className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--primary-gold)]/50 transition-all cursor-pointer"
                  >
                    <Copy size={13} />
                  </button>
                )}

                {/* Clear Chat */}
                {chatMessages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearChat}
                    title="Reset Search and Conversation"
                    className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-red-200 dark:border-red-900/60 text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                )}

                {/* Minimize Button */}
                <button
                  type="button"
                  onClick={() => setChatMinimized(true)}
                  title="Minimize Chat Window"
                  className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--primary-gold)]/50 transition-all cursor-pointer"
                >
                  <ChevronUp size={13} />
                </button>

                {/* Fullscreen Toggle */}
                <button
                  type="button"
                  onClick={() => setChatFullscreen(!chatFullscreen)}
                  title={chatFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Workspace"}
                  className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--primary-gold)]/50 transition-all cursor-pointer"
                >
                  {chatFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => {
                    setChatOpen(false);
                    setChatFullscreen(false);
                  }}
                  title="Close Assistant"
                  className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-red-200 dark:border-red-900/60 text-red-500 hover:text-white hover:bg-red-500 transition-all cursor-pointer"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Chat History View */}
            <div className={`overflow-y-auto space-y-4 p-4 sm:p-5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl ${
              chatFullscreen ? 'flex-1 my-2 min-h-[50vh]' : 'max-h-72'
            }`}>
              {chatMessages.length === 0 ? (
                <div className="text-center py-10 text-xs text-[var(--text-muted)] flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--primary-gold)]/10 border border-[var(--primary-gold)]/20 text-[var(--primary-gold)] flex items-center justify-center shadow-xs">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h5 className="font-black text-sm text-[var(--text-primary)] tracking-wide">How can I help you search candidates today?</h5>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1 max-w-md mx-auto">
                      Type your request in natural language or click a suggested prompt below to query skills, experience, location, or domain focus.
                    </p>
                  </div>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#A98B56] to-[#BC9B66] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                        <Bot size={15} />
                      </div>
                    )}
                    
                    <div className={`relative group max-w-[85%] rounded-2xl p-4 text-xs font-medium leading-relaxed shadow-xs ${
                      msg.role === 'user'
                        ? 'bg-[#004564] dark:bg-[#003649] text-white rounded-tr-none border border-[#005472] dark:border-[#002D38]'
                        : 'bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-tl-none'
                    }`}>
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap font-semibold text-white">{msg.text}</p>
                      ) : (
                        <>
                          {/* Individual Message Copy Control */}
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.text, idx)}
                            className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 bg-[var(--bg-secondary)] border border-[var(--border-color)] p-1.5 rounded-lg text-[10px] text-[var(--text-muted)] hover:text-[var(--primary-gold)] transition-all cursor-pointer shadow-2xs"
                            title="Copy message to clipboard"
                          >
                            {copiedIndex === idx ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                          </button>
                          
                          <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed space-y-2 [&_h1]:text-sm [&_h1]:font-black [&_h1]:text-[var(--text-primary)] [&_h2]:text-xs [&_h2]:font-black [&_h2]:text-[var(--primary-gold)] [&_h2]:mt-3 [&_h2]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_code]:bg-[var(--bg-secondary)] [&_code]:text-[var(--primary-gold)] [&_code]:border [&_code]:border-[var(--border-color)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:font-mono [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--primary-gold)] [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:my-2 [&_blockquote]:text-[var(--text-muted)]">
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                          </div>
                        </>
                      )}
                      
                      {msg.matchedIds && msg.matchedIds.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[var(--border-color)] flex flex-col gap-2">
                          <span className="text-[10px] uppercase font-black text-[var(--primary-gold)] tracking-wider flex items-center gap-1.5">
                            <Sparkles size={11} /> Found Candidate Matches ({msg.matchedIds.length}):
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {candidates.filter(c => msg.matchedIds?.includes(c.id)).map(cand => (
                              <button
                                type="button"
                                key={cand.id}
                                onClick={() => {
                                  onSelect?.(cand);
                                  if (chatFullscreen) {
                                    setChatFullscreen(false);
                                  }
                                }}
                                className="px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl hover:border-[var(--primary-gold)] hover:bg-[var(--primary-gold)] hover:text-white transition-all text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-2xs flex items-center gap-1.5"
                              >
                                <User size={10} />
                                {cand.fullName}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                        <User size={15} />
                      </div>
                    )}
                  </div>
                ))
              )}

              {chatLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-xl bg-[var(--primary-gold)]/20 text-[var(--primary-gold)] flex items-center justify-center shrink-0 mt-0.5 animate-pulse border border-[var(--primary-gold)]/30">
                    <Bot size={15} />
                  </div>
                  <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl rounded-tl-none px-4 py-3 text-xs font-bold text-[var(--text-muted)] shadow-xs flex items-center gap-2.5">
                    <RefreshCw size={13} className="animate-spin text-[var(--primary-gold)]" />
                    <span>Searching repository with Gemini AI ({searchPrecision === 'exact' ? 'Exact Mode' : 'Semantic Mode'})...</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Chips suggestions */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Suggested Queries:</span>
              {[
                'Find React Developers',
                'Candidates in Healthcare',
                'React & TypeScript experts',
                'Candidates in IT sector'
              ].map((chip) => (
                <button
                  type="button"
                  key={chip}
                  disabled={chatLoading}
                  onClick={() => {
                    setChatInput(chip);
                  }}
                  className="px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl text-[10px] font-bold hover:border-[var(--primary-gold)] hover:text-[var(--primary-gold)] hover:bg-[var(--card-bg)] transition-all cursor-pointer shadow-2xs"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input Form area */}
            <form onSubmit={handleChatSubmit} className="flex gap-2 items-center bg-[var(--bg-secondary)] border border-[var(--border-color)] focus-within:border-[var(--primary-gold)] focus-within:ring-2 focus-within:ring-[var(--primary-gold)]/20 rounded-2xl p-1.5 transition-all">
              <input
                type="text"
                value={chatInput}
                disabled={chatLoading}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={searchPrecision === 'exact' ? "Strict exact keyword search (e.g. 'React, TypeScript')..." : "Ask AI to find candidates (e.g. 'Show me candidates in IT with React skills')..."}
                className="flex-1 bg-transparent border-none px-3 py-2 text-xs font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="px-5 py-2.5 crm-btn-gold text-white font-black rounded-xl hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-xs gap-1.5 text-xs"
              >
                <Send size={13} />
                <span>Send</span>
              </button>
            </form>
          </div>
        )}

        {/* Minimized Dock Bar */}
        {chatOpen && chatMinimized && (
          <div className="border border-[var(--border-color)] bg-[var(--card-bg)] rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--primary-gold)]/15 border border-[var(--primary-gold)]/30 text-[var(--primary-gold)] flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                <Bot size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                  AI CV Finder Assistant (Minimized)
                </h4>
                <p className="text-[10px] text-[var(--text-muted)] font-medium">
                  {chatMessages.length} message(s) • {aiFilterActive ? `${aiMatchedIds.length} candidate match filter active` : 'No filter active'} • {searchPrecision === 'exact' ? 'Exact Match Mode' : 'Semantic Mode'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setChatMinimized(false)}
                className="px-3.5 py-1.5 crm-btn-gold text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer shadow-2xs"
              >
                Restore Chat
              </button>
              <button
                type="button"
                onClick={() => {
                  setChatOpen(false);
                  setChatMinimized(false);
                }}
                className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-all cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {aiFilterActive && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--primary-gold)]/30 rounded-2xl p-4 flex items-center justify-between gap-4 animate-in fade-in duration-300 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <Sparkles className="text-[var(--primary-gold)] animate-pulse shrink-0" size={16} />
              <p className="text-xs font-bold text-[var(--text-primary)]">
                AI Filter Active: <span className="text-[var(--primary-gold)] italic font-semibold">"{currentAiQuery}"</span> ({aiMatchedIds.length} candidate matches found)
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setAiFilterActive(false);
                setAiMatchedIds([]);
                setCurrentAiQuery('');
              }}
              className="text-[10px] font-black uppercase text-red-500 hover:text-red-600 hover:underline cursor-pointer tracking-wider px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
            >
              Clear AI Filter
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search (Name, Skill, AND, OR, NOT)..."
              className="w-full bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="flex flex-col justify-center">
            <Select 
              options={DOMAIN_OPTIONS}
              value={isMultiDomain ? selectedDomains : (selectedDomains[0] || null)}
              onChange={(selected) => {
                if (!selected) {
                  setSelectedDomains([]);
                } else if (Array.isArray(selected)) {
                  setSelectedDomains(selected);
                } else {
                  setSelectedDomains([selected]);
                }
              }}
              isMulti={isMultiDomain}
              placeholder="Filter by Domain Focus..."
              styles={customSelectStyles}
              isSearchable
            />
          </div>
        </div>

        {/* Filter Badges and Single/Multi toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[var(--border-color)]/50">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Mode:</span>
            <button
              onClick={() => {
                setIsMultiDomain(!isMultiDomain);
                setSelectedDomains([]); // Clear selections on toggle to prevent array/object conflicts
              }}
              className="px-3 py-1.5 bg-[var(--sidebar-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-xl text-xs font-bold hover:bg-[var(--bg-primary)] hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer"
            >
              {isMultiDomain ? 'Switch to Single Select' : 'Switch to Multi Select'}
            </button>
          </div>

          {selectedDomains.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Active Domains:</span>
              {selectedDomains.map((dom) => (
                <span
                  key={dom.value}
                  className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900 text-[10px] font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  {dom.label}
                  <button
                    onClick={() => setSelectedDomains(selectedDomains.filter(d => d.value !== dom.value))}
                    className="text-indigo-400 hover:text-red-500 font-extrabold focus:outline-none"
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                onClick={() => setSelectedDomains([])}
                className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Grid of Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedCandidates.map(c => {
          const d = (c.domainFocus || c.domain || '').trim();
          const normalizedDom = (!d) ? 'Unknown Domain' : (d === 'IT' ? 'IT / Software' : d === 'Other' ? 'Others' : d);

          return (
            <div 
              key={c.id} 
              onClick={() => onSelect?.(c)}
              className="crm-card p-6 flex flex-col gap-4 shadow-sm hover:border-[var(--primary-gold)] transition-all cursor-pointer group justify-between"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--primary-gold)] shrink-0 group-hover:bg-[var(--primary-gold)] group-hover:text-white transition-colors">
                  <FileText size={32} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-[var(--text-primary)] truncate transition-colors group-hover:text-[var(--primary-gold)] leading-tight mb-1">{c.fullName}</h4>
                  
                  <div className="mb-2">
                    <span className="inline-block px-2 py-0.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--primary-gold)] text-[9px] font-black uppercase tracking-wider rounded-md">
                      {normalizedDom}
                    </span>
                  </div>
                  
                  <p className="text-xs text-[var(--text-muted)] truncate mb-2">{c.fileName || 'document.pdf'}</p>
                </div>
              </div>

              <div className="border-t border-[var(--border-color)] pt-3 flex items-center justify-between mt-auto">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] min-w-0">
                    <Mail size={12} className="shrink-0 text-[var(--primary-gold)]" />
                    <span className="truncate">{c.email || 'Not Provided'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    <Calendar size={12} className="shrink-0 text-[var(--primary-gold)]" />
                    <span>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>

                <div className="flex gap-1.5 shrink-0 pl-2" onClick={(e) => e.stopPropagation()}>
                  {(c.url || c.cid || c.cvBase64) && (
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => onSelect?.(c)}
                          className="flex items-center justify-center p-2 rounded-xl bg-[var(--bg-secondary)] text-[var(--primary-gold)] border border-[var(--border-color)] hover:bg-[var(--primary-gold)] hover:text-white transition-all shadow-sm"
                          title="View Candidate Detail"
                        >
                            <ExternalLink size={14} />
                        </button>
                        <button 
                          onClick={() => {
                            const fileName = `${c.fullName?.replace(/\s+/g, '_') || 'Candidate'}_CV`;
                            if (c.cvBase64) {
                              const link = document.createElement('a');
                              link.href = c.cvBase64;
                              link.setAttribute('download', `${fileName}.pdf`);
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            } else {
                              const finalUrl = c.url;
                              if (finalUrl) {
                                const link = document.createElement('a');
                                link.href = finalUrl;
                                  link.setAttribute('download', fileName);
                                  link.setAttribute('target', '_blank');
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                              } else {
                                onSelect?.(c);
                              }
                            }
                          }}
                          className="flex items-center justify-center p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                          title="Download CV"
                        >
                            <Download size={14} />
                        </button>
                      </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCandidates.length > 20 && (
        <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
          <Pagination
            page={currentPage}
            rowsPerPage={rowsPerPage}
            totalCount={filteredCandidates.length}
            onPageChange={() => {}}
            onRowsPerPageChange={(rows) => setRowsPerPage(rows)}
            setPage={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
