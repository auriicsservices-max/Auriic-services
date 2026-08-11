import React from 'react';
import { NotificationBadge } from '../NotificationBadge';
import { 
  LayoutDashboard, Users, FileText, BarChart2, Bell, Settings, LogOut, 
  ChevronLeft, ChevronRight, Sparkles, Layers, Receipt, Linkedin, Shield, Star, User, FileSpreadsheet
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import ThemeToggle from '../ThemeToggle';
import Logo from '../Logo';

export default function Sidebar({ 
  isOpen, 
  setIsOpen, 
  activeTab, 
  setActiveTab 
}: { 
  isOpen: boolean; 
  setIsOpen: (val: boolean) => void; 
  activeTab: string; 
  setActiveTab: (tab: string) => void 
}) {
  const { role, user } = useAuth();
  
  // Logical section grouping for enterprise CRM navigation
  const navigationSections = role === 'client' ? [
    {
      title: 'Workspace',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', id: 'home' },
        { icon: Sparkles, label: 'Candidate Review', id: 'client-portal' },
        { icon: Layers, label: 'Pipeline', id: 'pipeline' },
        { icon: Users, label: 'Assigned Candidates', id: 'candidates' },
        { icon: Star, label: 'Shortlist', id: 'shortlist' },
        { icon: BarChart2, label: 'Talent Insights', id: 'analytics' },
        { icon: FileText, label: 'CV Repository', id: 'repository' },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { icon: User, label: 'My Profile', id: 'profile' },
        { icon: Bell, label: 'Notifications', id: 'notifications' },
      ]
    }
  ] : [
    {
      title: 'Core Platform',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', id: 'home' },
        ...(role === 'admin' || role === 'developer' ? [{ icon: Sparkles, label: 'Candidate Review', id: 'client-portal' }] : []),
        { icon: Layers, label: 'Pipeline', id: 'pipeline' },
        { icon: Users, label: 'Candidates', id: 'candidates' },
        { icon: Linkedin, label: 'LinkedIn Search', id: 'linkedin-search' },
        { icon: FileText, label: 'CV Repository', id: 'repository' },
      ]
    },
    {
      title: 'Operations & Insights',
      items: [
        ...(role === 'developer' || role === 'admin' || role === 'team_leader' ? [{ icon: Receipt, label: 'Invoices', id: 'invoices' }] : []),
        { icon: BarChart2, label: 'Analytics', id: 'analytics' },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { icon: Bell, label: 'Notifications', id: 'notifications' },
        ...(role !== 'recruiter' ? [{ icon: Settings, label: 'Settings', id: 'settings' }] : []),
      ]
    }
  ];

  return (
    <aside 
      aria-label="Main Navigation Sidebar"
      className={`h-screen ${isOpen ? 'w-64' : 'w-20'} bg-[var(--sidebar-bg)] text-white transition-all duration-300 ease-in-out flex flex-col shrink-0 z-30 border-r border-white/10 shadow-xl select-none`}
    >
      {/* Brand Header */}
      <div className="h-20 flex items-center justify-between px-5 border-b border-white/10">
        <div className={`flex items-center gap-3 overflow-hidden ${!isOpen && 'justify-center w-full'}`}>
          <Logo collapsed={!isOpen} variant="sidebar" />
        </div>
        
        {isOpen && (
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Collapse Sidebar"
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      {!isOpen && (
        <div className="flex justify-center py-2 border-b border-white/5">
          <button 
            onClick={() => setIsOpen(true)} 
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Expand Sidebar"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
      
      {/* Scrollable Navigation Groups */}
      <nav className="flex-1 py-6 px-3 space-y-6 overflow-y-auto custom-scrollbar">
        {navigationSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {isOpen && (
              <h3 className="px-3 text-[10px] font-bold text-[#A9C2CE] uppercase tracking-wider mb-2">
                {section.title}
              </h3>
            )}
            
            {section.items.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={!isOpen ? item.label : undefined}
                  className={`group relative flex items-center ${isOpen ? 'gap-3 px-3 py-2.5' : 'justify-center p-3'} w-full rounded-xl transition-all duration-200 text-left cursor-pointer ${
                    isActive 
                      ? 'bg-gradient-to-r from-[#A98B56]/20 to-[#BC9B66]/10 text-white font-semibold border border-[#A98B56]/40 shadow-sm' 
                      : 'text-[#DCE6EC] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="relative">
                    <item.icon 
                      size={20} 
                      className={`shrink-0 transition-transform duration-200 ${
                        isActive 
                          ? 'text-[#BC9B66] scale-110' 
                          : 'text-[#A9C2CE] group-hover:text-white group-hover:scale-105'
                      }`} 
                    />
                    {item.id === 'notifications' && <NotificationBadge />}
                  </div>
                  {isOpen ? (
                    <span className="text-sm font-medium tracking-wide truncate">{item.label}</span>
                  ) : (
                    /* Floating Tooltip when collapsed */
                    <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#002D38] text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 border border-[#005472]">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Info & Logout Footer */}
      <div className="p-3 border-t border-white/10 bg-black/10 space-y-2.5">
        {/* Theme Switch positioned directly ABOVE user email */}
        <div className="w-full flex justify-center">
          <ThemeToggle collapsed={!isOpen} variant="sidebar" />
        </div>

        {isOpen && user && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-[#A98B56] text-white flex items-center justify-center font-bold text-xs shrink-0">
              {user.email ? user.email.substring(0, 2).toUpperCase() : 'AU'}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-white truncate">{user.email || 'User'}</span>
              <span className="text-[10px] text-[#A9C2CE] flex items-center gap-1 uppercase font-bold tracking-wider">
                <Shield size={10} className="text-[#BC9B66]" /> {role || 'Recruiter'}
              </span>
            </div>
          </div>
        )}

        <button 
          onClick={() => auth.signOut()} 
          title={!isOpen ? 'Logout' : undefined}
          className={`flex items-center ${isOpen ? 'gap-3 px-3 py-2.5' : 'justify-center p-3'} w-full rounded-xl hover:bg-red-500/10 text-[#DCE6EC] hover:text-red-400 border border-transparent hover:border-red-500/20 transition-all duration-200 cursor-pointer`}
        >
          <LogOut size={20} className="shrink-0 text-red-400" />
          {isOpen && <span className="text-sm font-semibold">Logout</span>}
        </button>
      </div>
    </aside>
  );
}

