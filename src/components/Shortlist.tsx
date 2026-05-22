import React from 'react';
import { Star, Users, Trash2, FileText, ChevronRight, Clock } from 'lucide-react';

export default function Shortlist({ candidates, onCandidateSelect, onArchive, role }: { 
    candidates: any[], 
    onCandidateSelect: (c: any) => void,
    onArchive: (e: React.MouseEvent, id: string) => void,
    role: string | null
}) {
  const shortlisted = candidates.filter(c => c.isShortlisted && !c.isArchived);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Star size={24} />
            </div>
            <div>
                <h3 className="text-xl font-serif text-[var(--text-primary)]">Shortlist</h3>
                <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">{shortlisted.length} candidates shortlisted</p>
            </div>
        </div>

        <div className="bg-[var(--card-bg)] overflow-hidden border border-[var(--border-color)] rounded-2xl">
            {shortlisted.length === 0 ? (
                <div className="py-20 text-center text-[var(--text-muted)]">
                    <Star size={48} className="mx-auto mb-4 opacity-20" />
                    No candidates shortlisted yet
                </div>
            ) : (
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[var(--sidebar-bg)] text-[10px] uppercase font-bold text-[var(--text-muted)] border-b border-[var(--border-color)]">
                        <tr>
                            <th className="px-6 py-4">Candidate</th>
                            <th className="px-6 py-4">Domain</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                        {shortlisted.map(candidate => (
                            <tr key={candidate.id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 cursor-pointer" onClick={() => onCandidateSelect(candidate)}>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-[var(--text-primary)]">{candidate.fullName}</div>
                                    <div className="text-xs text-[var(--text-muted)]">{candidate.email}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{candidate.domain || 'Unsorted'}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {(role === 'admin' || role === 'developer') && (
                                        <button 
                                            onClick={(e) => onArchive(e, candidate.id)}
                                            className="text-[var(--text-muted)] hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    </div>
  );
}
