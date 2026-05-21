import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Search, ChevronDown, ChevronUp, HelpCircle, 
  Play, LifeBuoy, AlertCircle, MessageSquare, Users, Bell, 
  LayoutGrid, FileText, Star, Clock 
} from 'lucide-react';

interface HelpSection {
  id: string;
  title: string;
  content: string;
  order: number;
  roles: string[];
}

const SECTION_ICONS: Record<string, React.ElementType> = {
  'getting-started': Star,
  'cv-parsing': FileText,
  'candidate-management': Users,
  'follow-up': Clock,
  'notifications': Bell,
  'dashboard': LayoutGrid,
  'chat': MessageSquare,
  'logs': FileText,
  'faq': AlertCircle,
};

export default function HelpCenter() {
  const { role } = useAuth();
  const [sections, setSections] = useState<HelpSection[]>([]);
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'help_sections'), orderBy('order'));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HelpSection));
      setSections(data);
    });
  }, []);

  const filteredSections = useMemo(() => {
    return sections.filter(s => {
      const matchesRole = !s.roles || s.roles.length === 0 || (role && s.roles.includes(role));
      const matchesSearch = s.title.toLowerCase().includes(search.toLowerCase()) || 
                            s.content.toLowerCase().includes(search.toLowerCase());
      return matchesRole && matchesSearch;
    });
  }, [sections, search, role]);

  const progress = sections.length > 0 ? Math.round((filteredSections.length / sections.length) * 100) : 0;

  return (
    <div className="flex flex-col lg:flex-row h-full w-full gap-6 p-6">
      <aside className="w-full lg:w-64 shrink-0 space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Completed Guide</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm font-bold text-slate-700">{progress}%</span>
          </div>
        </div>

        <nav className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm space-y-1">
          {filteredSections.map(s => {
            const Icon = SECTION_ICONS[s.id] || BookOpen;
            return (
              <button 
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeId === s.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Icon size={18} />
                {s.title}
              </button>
            )
          })}
        </nav>
      </aside>

      <main className="flex-1 min-w-0 space-y-6">
        <header className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">User Guide</h1>
            <p className="text-slate-500 text-sm">Last updated: May 21, 2026</p>
          </div>
          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search help..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </header>

        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {filteredSections.map((section) => (
              <motion.div 
                key={section.id}
                layout
                className="border border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden"
              >
                <button 
                  className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
                  onClick={() => setActiveId(activeId === section.id ? null : section.id)}
                >
                  <span className="font-semibold text-slate-900 text-lg">{section.title}</span>
                  {activeId === section.id ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                </button>
                <AnimatePresence>
                  {activeId === section.id && (
                    <motion.div 
                      className="px-6 pb-6 text-slate-600 whitespace-pre-line leading-relaxed"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      {section.content}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button className="flex items-center justify-center gap-2 p-4 bg-white border rounded-2xl text-sm font-semibold hover:bg-slate-50 transition-colors">
            <Play size={16} /> Watch Tutorial
          </button>
          <button className="flex items-center justify-center gap-2 p-4 bg-white border rounded-2xl text-sm font-semibold hover:bg-slate-50 transition-colors">
            <LifeBuoy size={16} /> Contact Support
          </button>
          <button className="flex items-center justify-center gap-2 p-4 bg-white border rounded-2xl text-sm font-semibold hover:bg-slate-50 transition-colors">
            <AlertCircle size={16} /> Report Issue
          </button>
        </div>
      </main>
    </div>
  );
}
