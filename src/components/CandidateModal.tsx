import React from 'react';
import { X, Download, Star, StarOff, Briefcase, GraduationCap, Mail, Phone, Code, Globe } from 'lucide-react';

interface CandidateModalProps {
  candidate: any;
  isOpen: boolean;
  onClose: () => void;
  onShortlist: (id: string, currentStatus: boolean) => void;
}

export default function CandidateModal({ candidate, isOpen, onClose, onShortlist }: CandidateModalProps) {
  if (!isOpen || !candidate) return null;

  const handleDownload = () => {
    if (!candidate.fileData) {
      // Fallback: Generate a simple text file if source data is missing
      const blob = new Blob([candidate.rawText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${candidate.fullName}_resume.txt`;
      a.click();
      return;
    }
    
    // Check if it's base64 (contains data URI prefix)
    if (candidate.fileData.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = candidate.fileData;
      a.download = `${candidate.fullName}_resume`;
      a.click();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2.5rem] shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <header className="p-8 border-b border-slate-100 flex justify-between items-start">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-indigo-100 uppercase">
              {candidate.fullName.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-serif text-slate-800">{candidate.fullName}</h2>
                <button 
                  onClick={() => onShortlist(candidate.id, candidate.isShortlisted)}
                  className={`p-1.5 rounded-full transition-colors ${candidate.isShortlisted ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-slate-400'}`}
                >
                  {candidate.isShortlisted ? <Star fill="currentColor" size={20} /> : <StarOff size={20} />}
                </button>
              </div>
              <p className="text-indigo-600 font-bold text-sm uppercase tracking-widest mt-1">
                {candidate.domain || 'Uncategorized Domain'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleDownload}
              className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-100 transition-all border border-slate-200"
            >
              <Download size={18} /> Download CV
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
            >
              <X size={24} />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="md:col-span-2 space-y-8">
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <Globe size={12} /> Professional Summary
              </h3>
              <p className="text-slate-600 leading-relaxed text-sm italic border-l-2 border-indigo-100 pl-4">
                "{candidate.summary || 'No summary extracted.'}"
              </p>
            </section>

            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <Briefcase size={12} /> Work Experience
              </h3>
              <div className="space-y-6">
                {candidate.experience?.map((exp: any, i: number) => (
                  <div key={i} className="relative pl-6 border-l border-slate-100">
                    <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white" />
                    <h4 className="font-bold text-slate-800 text-sm">{exp.role}</h4>
                    <p className="text-indigo-600 text-xs font-semibold">{exp.company} • {exp.duration}</p>
                    <p className="text-slate-500 text-xs mt-2 leading-relaxed">{exp.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <GraduationCap size={12} /> Education
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {candidate.education?.map((edu: any, i: number) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <h4 className="font-bold text-slate-800 text-xs">{edu.degree}</h4>
                    <p className="text-slate-500 text-[10px] font-medium">{edu.school}</p>
                    <p className="text-indigo-500 text-[10px] font-black mt-1">{edu.year}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-8">
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <Code size={12} /> Skills & Tools
              </h3>
              <div className="flex flex-wrap gap-2">
                {candidate.skills?.map((skill: string) => (
                  <span key={skill} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {skill}
                  </span>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <Mail size={12} /> Contact Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <Mail className="text-indigo-500" size={16} />
                  <p className="text-xs font-medium text-slate-700 truncate">{candidate.email}</p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <Phone className="text-indigo-500" size={16} />
                  <p className="text-xs font-medium text-slate-700">{candidate.phone || 'N/A'}</p>
                </div>
              </div>
            </section>

            <section className="bg-slate-900 p-6 rounded-3xl text-white">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Metadata</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Indexed on</span>
                  <span className="font-mono">{new Date(candidate.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Shortlisted</span>
                  <span className={candidate.isShortlisted ? 'text-amber-400' : 'text-slate-400'}>
                    {candidate.isShortlisted ? 'YES' : 'NO'}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
