
import React, { useMemo } from 'react';
import { Trash2 } from 'lucide-react';

export default function DuplicateCandidates({ candidates, onPermanentDelete, formatDate, teamMembers }: {
    candidates: any[],
    onPermanentDelete: (e: React.MouseEvent, id: string) => Promise<void>,
    formatDate: (date: any) => string,
    teamMembers: Record<string, string>
}) {
    const duplicates = useMemo(() => {
        const map = new Map<string, any[]>();
        candidates.forEach(c => {
            const keys = [c.email, c.phone, c.linkedin].filter(k => k && k && k !== 'pending@aurrum.co');
            keys.forEach(key => {
                const list = map.get(key) || [];
                list.push(c);
                map.set(key, list);
            });
        });
        const result = new Map<string, any>();
        map.forEach((list, key) => {
            if (list.length > 1) {
                list.forEach(c => result.set(c.id, c));
            }
        });
        return Array.from(result.values());
    }, [candidates]);

    return (
        <div className="p-8">
            <h2 className="text-xl font-bold mb-6 text-[var(--text-primary)]">Candidate Duplicates Check</h2>
            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-[var(--sidebar-bg)] border-b border-[var(--border-color)]">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Candidate Name</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Email</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">LinkedIn</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Created</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                        {duplicates.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-sm font-medium text-[var(--text-muted)]">No duplicate candidates found.</td>
                            </tr>
                        ) : (
                            duplicates.map(c => (
                                <tr key={c.id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 transition-all">
                                    <td className="px-6 py-4 font-bold text-sm tracking-tight">{c.fullName}</td>
                                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{c.email}</td>
                                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{c.linkedin}</td>
                                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{formatDate(c.createdAt)}</td>
                                    <td className="px-6 py-4">
                                        <button 
                                            onClick={(e) => onPermanentDelete(e, c.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
