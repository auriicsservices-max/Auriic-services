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
    ...(role === 'developer' || role === 'admin' || role === 'team_leader' ? [{ icon: Receipt, label: 'Invoices', id: 'invoices' }] : []),
    { icon: BarChart2, label: 'Analytics', id: 'analytics' },
    { icon: Bell, label: 'Notifications', id: 'notifications' },
    { icon: Settings, label: 'Settings', id: 'settings' },
  ];

  return (
    <div className={`h-screen ${isOpen ? 'w-64' : 'w-20'} bg-[var(--sidebar-bg)] text-[var(--text-primary)] border-r border-[var(--border-color)] transition-all duration-300 flex flex-col shrink-0`}>
      <div className="h-20 flex items-center justify-between px-6">
        {isOpen && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--primary-gold)] flex items-center justify-center shadow-lg">
              <Sparkles className="text-white" size={20} />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-[var(--primary-blue)]">Aurrum</span>
          </div>
        )}
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-primary)] transition-colors">
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
                  ? 'bg-[var(--primary-blue)] text-white font-semibold' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
              }`}
            >
              <item.icon size={22} className={isActive ? 'text-[var(--primary-gold)]' : ''} />
              {isOpen && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-6 border-t border-[var(--border-color)]">
        <button 
          onClick={() => auth.signOut()} 
          className="flex items-center gap-4 p-4 w-full rounded-2xl hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-rose-600 transition-all duration-200"
        >
          <LogOut size={22} />
          {isOpen && <span className="text-sm font-semibold">Logout</span>}
        </button>
      </div>
    </div>
  );
}
