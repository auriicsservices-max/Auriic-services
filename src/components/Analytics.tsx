import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { TrendingUp, Users, Target, Briefcase, X, User } from 'lucide-react';
import CandidateModal from './CandidateModal';

interface StatsProps {
  candidates: any[];
  onShortlist: (id: string, currentStatus: boolean) => Promise<void>;
  onUpdateFollowUp: (id: string, note: string, date: string) => Promise<void>;
  onUpdateNotes: (id: string, notes: string) => Promise<void>;
}

export default function Analytics({ candidates, onShortlist, onUpdateFollowUp, onUpdateNotes }: StatsProps) {
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);

  // Process domain data
  const domainDataMap = candidates.reduce((acc: any, c) => {
    const domain = c.domain || 'Uncategorized';
    acc[domain] = (acc[domain] || 0) + 1;
    return acc;
  }, {});

  const domainChartData = Object.entries(domainDataMap).map(([name, value]) => ({ name, value }));

  // Process skills data (all)
  const skillsMap = candidates.reduce((acc: any, c) => {
    c.skills?.forEach((skill: string) => {
      const s = skill.trim().toUpperCase();
      acc[s] = (acc[s] || 0) + 1;
    });
    return acc;
  }, {});

  const allSkillsData = Object.entries(skillsMap)
    .sort((a: any, b: any) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];

  const filteredCandidates = selectedSkill 
    ? candidates.filter(c => c.skills?.map((s: string) => s.trim().toUpperCase()).includes(selectedSkill))
    : [];

  const handleSkillClick = (skill: string) => {
    setSelectedSkill(skill);
    setShowModal(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ... top cards ... */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ... domain chart ... */}

        {/* Top Skills List */}
        <section className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm min-h-[400px] flex flex-col transition-colors duration-300">
          <div className="mb-6">
            <h3 className="text-xl font-serif text-slate-800 dark:text-slate-100">In-Demand Skills</h3>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500">Click to view candidates</p>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {allSkillsData.map(({ name, count }: any) => (
              <button 
                key={name}
                onClick={() => handleSkillClick(name)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
              >
                <span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-xs">{name}</span>
                <span className="px-3 py-1 bg-white dark:bg-slate-700 rounded-lg text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shadow-sm">{count} candidates</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Skill Candidates Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[80vh] rounded-[2rem] shadow-2xl flex flex-col p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-serif text-slate-800 dark:text-slate-100">Candidates with <span className="text-indigo-600">{selectedSkill}</span> ({filteredCandidates.length})</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto space-y-4">
              {filteredCandidates.map(c => (
                <button key={c.id} onClick={() => setSelectedCandidate(c)} className="w-full p-4 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center font-bold text-sm text-slate-500">{c.fullName.slice(0,2).toUpperCase()}</div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-sm">{c.fullName}</p>
                    <p className="text-xs text-slate-500">{c.domain}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedCandidate && (
        <CandidateModal 
          isOpen={true}
          candidate={selectedCandidate} 
          onClose={() => setSelectedCandidate(null)} 
          onShortlist={onShortlist} 
          onUpdateFollowUp={onUpdateFollowUp} 
          onUpdateNotes={onUpdateNotes}
        />
      )}
    </div>
  );
}