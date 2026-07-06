import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, BarChart2, Bell, Settings, LogOut, ChevronLeft, ChevronRight, Sparkles, Layers } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar({ isOpen, setIsOpen, activeTab, setActiveTab }: { isOpen: boolean; setIsOpen: (val: boolean) => void; activeTab: string; setActiveTab: (tab: string) => void }) {
  const { role } = useAuth();
  
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', id: 'home' },
    ...(role === 'client' ? [{ icon: Layers, label: 'Pipeline', id: 'pipeline' }] : []),
    { icon: Users, label: 'Candidates', id: 'candidates' },
    { icon: FileText, label: 'CV Repository', id: 'repository' },
    { icon: BarChart2, label: 'Analytics', id: 'analytics' },
    { icon: Bell, label: 'Notifications', id: 'notifications' },
    { icon: Settings, label: 'Settings', id: 'settings' },
  ];

  return (
    <div className={`h-screen ${isOpen ? 'w-64' : 'w-20'} bg-[#111827] text-slate-100 border-r border-slate-800/80 transition-all duration-300 flex flex-col shrink-0 shadow-xl`}>
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80">
        {isOpen && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-900/30">
              <Sparkles className="text-white" size={16} />
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">Aurrum</span>
          </div>
        )}
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors">
          {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>
      
      <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-4.5 p-3 w-full rounded-xl transition-all duration-200 text-left ${
                isActive 
                  ? 'bg-teal-600 text-white font-semibold shadow-lg shadow-teal-900/40 translate-x-1' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <item.icon size={20} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-100'} />
              {isOpen && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800/80">
        <button 
          onClick={() => auth.signOut()} 
          className="flex items-center gap-4.5 p-3 w-full rounded-xl hover:bg-rose-950/30 text-slate-400 hover:text-rose-400 transition-all duration-200"
        >
          <LogOut size={20} />
          {isOpen && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );
}
