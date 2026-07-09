import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, BarChart2, Bell, Settings, LogOut, ChevronLeft, ChevronRight, Sparkles, Layers, Receipt } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar({ isOpen, setIsOpen, activeTab, setActiveTab }: { isOpen: boolean; setIsOpen: (val: boolean) => void; activeTab: string; setActiveTab: (tab: string) => void }) {
  const { role } = useAuth();
  
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', id: 'home' },
    ...(role === 'client' || role === 'admin' || role === 'developer' ? [{ icon: Layers, label: 'Pipeline', id: 'pipeline' }] : []),
    { icon: Users, label: 'Candidates', id: 'candidates' },
    { icon: FileText, label: 'CV Repository', id: 'repository' },
    { icon: Receipt, label: 'Invoices', id: 'invoices' },
    { icon: BarChart2, label: 'Analytics', id: 'analytics' },
    { icon: Bell, label: 'Notifications', id: 'notifications' },
    { icon: Settings, label: 'Settings', id: 'settings' },
  ];

  return (
    <div className={`h-screen ${isOpen ? 'w-64' : 'w-20'} bg-[var(--sidebar-bg)] text-slate-100 border-r border-blue-3649/80 transition-all duration-300 flex flex-col shrink-0 shadow-xl`}>
      <div className="h-16 flex items-center justify-between px-6 border-b border-blue-3649/80">
        {isOpen && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gold-a98b flex items-center justify-center shadow-lg shadow-gold-a98b/30 animate-float">
              <Sparkles className="text-white" size={16} />
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-gold-bc9b to-gold-a98b bg-clip-text text-transparent">Aurrum</span>
          </div>
        )}
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-lg text-blue-200/60 hover:bg-blue-3e51/60 hover:text-white transition-colors">
          {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>
      
      <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-4.5 p-3.5 w-full rounded-xl transition-all duration-200 text-left ${
                isActive 
                  ? 'bg-gold-a98b text-white font-semibold shadow-lg shadow-gold-a98b/40 translate-x-1' 
                  : 'text-white/85 hover:text-white hover:bg-white/10'
              }`}
            >
              <item.icon size={20} className={isActive ? 'text-white' : 'text-white/85 group-hover:text-white'} />
              {isOpen && <span className="text-sm font-semibold">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button 
          onClick={() => auth.signOut()} 
          className="flex items-center gap-4.5 p-3.5 w-full rounded-xl hover:bg-rose-950/50 text-white/70 hover:text-rose-200 transition-all duration-200"
        >
          <LogOut size={20} />
          {isOpen && <span className="text-sm font-semibold">Logout</span>}
        </button>
      </div>
    </div>
  );
}
