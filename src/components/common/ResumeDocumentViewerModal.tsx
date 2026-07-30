import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  Globe, 
  ExternalLink, 
  Sparkles, 
  BookOpen, 
  AlertCircle,
  Briefcase,
  GraduationCap,
  Award
} from 'lucide-react';
import LZString from 'lz-string';

interface ResumeDocumentViewerModalProps {
  candidate: any;
  isOpen: boolean;
  onClose: () => void;
  user?: any;
  role?: string;
}

export const ResumeDocumentViewerModal: React.FC<ResumeDocumentViewerModalProps> = ({
  candidate,
  isOpen,
  onClose,
  user,
  role
}) => {
  const [activeTab, setActiveTab] = useState<'original' | 'parsed'>('original');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !candidate) return null;

  const originalName = candidate.originalFileName || candidate.fileName || 'Resume';
  const finalUrl = candidate.cvUrl || candidate.url || candidate.fileUrl;
  const extension = (finalUrl || originalName || 'file.pdf').split('?')[0].split('.').pop()?.toLowerCase() || 'pdf';
  const isPdf = extension === 'pdf' || (candidate.cvBase64 && candidate.cvBase64.includes('application/pdf'));

  // Get raw text fallback
  const rawText = candidate.rawResumeText || 
    (candidate.compressedText ? LZString.decompressFromUTF16(candidate.compressedText) : '') ||
    candidate.summary || 'No resume text available.';

  const handleDownload = () => {
    const fileName = `${candidate.fullName?.replace(/\s+/g, '_') || 'Candidate'}_CV.${extension}`;
    
    if (candidate.cvBase64) {
      try {
        const link = document.createElement('a');
        link.href = candidate.cvBase64;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      } catch (err) {
        console.error('Base64 download error:', err);
      }
    }

    if (finalUrl) {
      try {
        const link = document.createElement('a');
        link.href = finalUrl;
        link.setAttribute('download', fileName);
        link.setAttribute('target', '_blank');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        window.open(finalUrl, '_blank');
      }
    } else {
      const blob = new Blob([rawText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.txt`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  const handlePrint = () => {
    if (candidate.cvBase64 || finalUrl) {
      const printWindow = window.open(candidate.cvBase64 || finalUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } else {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`<html><head><title>Resume - ${candidate.fullName}</title><style>body{font-family:sans-serif;padding:40px;line-height:1.6;}</style></head><body><h1>${candidate.fullName}</h1><pre>${rawText}</pre></body></html>`);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine viewer source url
  const getEmbedUrl = () => {
    if (candidate.cvBase64) return candidate.cvBase64;
    if (!finalUrl) return '';

    if (isPdf) {
      return finalUrl;
    } else {
      // For Word/Doc/Docx, use Google Docs viewer embed or Microsoft Office viewer
      return `https://docs.google.com/gview?url=${encodeURIComponent(finalUrl)}&embedded=true`;
    }
  };

  const embedSrc = getEmbedUrl();

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[1200] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] max-w-5xl w-full h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-secondary)] shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#A98B56]/15 border border-[#A98B56]/30 text-[#A98B56] flex items-center justify-center font-bold">
              <FileText size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-bold text-[var(--text-primary)] flex items-center gap-2">
                {candidate.fullName || 'Candidate'} — Resume Document
              </h2>
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-medium">
                <span className="uppercase px-1.5 py-0.5 rounded bg-[var(--card-bg)] border border-[var(--border-color)] text-[10px] font-bold">
                  {extension.toUpperCase()}
                </span>
                <span>•</span>
                <span>{candidate.currentJobTitle || candidate.domain || 'Professional Candidate'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tab Toggles */}
            <div className="hidden sm:flex items-center bg-[var(--card-bg)] border border-[var(--border-color)] p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('original')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'original'
                    ? 'crm-btn-gold shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <FileText size={13} /> Original Document
              </button>
              <button
                onClick={() => setActiveTab('parsed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'parsed'
                    ? 'crm-btn-gold shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Sparkles size={13} /> AI Parsed Details
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)] rounded-xl transition-all cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Mobile Tab Toggles */}
        <div className="sm:hidden flex items-center bg-[var(--bg-secondary)] border-b border-[var(--border-color)] p-2 gap-2">
          <button
            onClick={() => setActiveTab('original')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'original' ? 'crm-btn-gold' : 'bg-[var(--card-bg)] text-[var(--text-secondary)]'
            }`}
          >
            <FileText size={13} /> Original Document
          </button>
          <button
            onClick={() => setActiveTab('parsed')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'parsed' ? 'crm-btn-gold' : 'bg-[var(--card-bg)] text-[var(--text-secondary)]'
            }`}
          >
            <Sparkles size={13} /> AI Parsed Details
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden bg-[var(--bg-secondary)] relative flex flex-col">
          {activeTab === 'original' ? (
            <div className="flex-1 w-full h-full relative flex flex-col p-4">
              {embedSrc ? (
                <div className="w-full h-full rounded-2xl overflow-hidden border border-[var(--border-color)] shadow-inner bg-white dark:bg-slate-900 relative">
                  <iframe
                    src={embedSrc}
                    title={`${candidate.fullName} Resume`}
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4 crm-card m-auto max-w-lg">
                  <AlertCircle size={40} className="text-[#A98B56]" />
                  <h3 className="text-base font-bold text-[var(--text-primary)]">Original File URL Unavailable</h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    The original binary document file is not directly linked in cloud storage, but AI extracted text and structured details are fully preserved below.
                  </p>
                  <button
                    onClick={() => setActiveTab('parsed')}
                    className="px-4 py-2 crm-btn-gold text-xs font-bold uppercase rounded-xl cursor-pointer"
                  >
                    View Parsed Details & Text
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 custom-scrollbar">
              {/* Summary Card */}
              <div className="crm-card p-5 sm:p-6 space-y-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#A98B56] flex items-center gap-2">
                  <Sparkles size={14} /> Executive Summary
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed italic">
                  "{candidate.summary || 'No summary extracted.'}"
                </p>
              </div>

              {/* Skills Card */}
              {Array.isArray(candidate.skills) && candidate.skills.length > 0 && (
                <div className="crm-card p-5 sm:p-6 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Core Skills & Expertise</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.map((skill: string, idx: number) => (
                      <span key={idx} className="px-2.5 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg text-xs font-bold">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience Card */}
              {Array.isArray(candidate.experience) && candidate.experience.length > 0 && (
                <div className="crm-card p-5 sm:p-6 space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                    <Briefcase size={14} className="text-[#A98B56]" /> Professional Experience
                  </h3>
                  <div className="space-y-4">
                    {candidate.experience.map((exp: any, idx: number) => (
                      <div key={idx} className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl space-y-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <h4 className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)]">{exp.role || exp.title}</h4>
                          <span className="text-[10px] font-bold text-[#A98B56] bg-[#A98B56]/10 px-2 py-0.5 rounded">
                            {exp.duration || exp.period || 'Present'}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-[var(--text-secondary)]">{exp.company || exp.employer}</p>
                        {exp.description && (
                          <p className="text-xs text-[var(--text-secondary)] leading-relaxed pt-1">{exp.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw Resume Text fallback */}
              <div className="crm-card p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Extracted Raw Text</h3>
                  <button
                    onClick={handleCopyText}
                    className="px-3 py-1 bg-[var(--bg-secondary)] hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy Text'}
                  </button>
                </div>
                <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl font-mono text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {rawText}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Bar */}
        <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleDownload}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-primary)] hover:border-[#A98B56] rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
            >
              <Download size={15} className="text-emerald-500" /> Download Original Resume
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-primary)] hover:border-[#A98B56] rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
              title="Print Resume Document"
            >
              <Printer size={15} className="text-[#A98B56]" /> <span className="hidden sm:inline">Print</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 crm-btn-gold text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-sm"
          >
            Close Viewer
          </button>
        </div>

      </div>
    </div>
  );
};

export default ResumeDocumentViewerModal;
