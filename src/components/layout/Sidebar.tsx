import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, BarChart2, Bell, Settings, LogOut, ChevronLeft, ChevronRight, Sparkles, Layers, Receipt, Linkedin } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar({ isOpen, setIsOpen, activeTab, setActiveTab }: { isOpen: boolean; setIsOpen: (val: boolean) => void; activeTab: string; setActiveTab: (tab: string) => void }) {
  const { role } = useAuth();
  
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', id: 'home' },
    ...(role === 'client' || role === 'admin' || role === 'developer' ? [{ icon: Layers, label: 'Pipeline', id: 'pipeline' }] : []),
    { icon: Users, label: 'Candidates', id: 'candidates' },
    { icon: Linkedin, label: 'LinkedIn Search', id: 'linkedin-search' },
    { icon: FileText, label: 'CV Repository', id: 'repository' },
    ...(role === 'developer' || role === 'admin' || role === 'team_leader' ? [{ icon: Receipt, label: 'Invoices', id: 'invoices' }] : []),
    { icon: BarChart2, label: 'Analytics', id: 'analytics' },
    { icon: Bell, label: 'Notifications', id: 'notifications' },
    { icon: Settings, label: 'Settings', id: 'settings' },
  ];

  return (
    <div className={`h-screen ${isOpen ? 'w-64' : 'w-20'} bg-[var(--sidebar-bg)] text-white transition-all duration-300 flex flex-col shrink-0`}>
      <div className="h-20 flex items-center justify-between px-6">
        {isOpen && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--primary-gold)] flex items-center justify-center shadow-lg">
              <Sparkles className="text-white" size={20} />
            </div>
            <span className="font-extrabold text-xl tracking-tight">Aurrum</span>
          </div>
        )}
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-colors">
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>
      
      <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-4 p-4 w-full rounded-2xl transition-all duration-200 text-left ${
                isActive 
                  ? 'bg-white/10 text-white font-semibold border-l-4 border-[var(--primary-gold)]' 
                  : 'text-[#CBD5E1] hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={22} className={isActive ? 'text-[var(--primary-gold)]' : ''} />
              {isOpen && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-6 border-t border-white/10">
        <button 
          onClick={() => auth.signOut()} 
          className="flex items-center gap-4 p-4 w-full rounded-2xl hover:bg-white/5 text-[#CBD5E1] hover:text-rose-400 transition-all duration-200"
        >
          <LogOut size={22} />
          {isOpen && <span className="text-sm font-semibold">Logout</span>}
        </button>
      </div>
    </div>
  );
}
