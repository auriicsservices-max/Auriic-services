import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  Activity, 
  Sparkles, 
  ArrowRight, 
  FileText, 
  MessageSquare, 
  Briefcase, 
  UserCheck, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  Eye,
  Download,
  Filter,
  BarChart2,
  Phone,
  Mail,
  User,
  Star,
  MapPin
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { filterClientPortalCandidates, getAvailableClients } from '../../utils/clientUtils';
import { ClientSelectorBar } from './ClientSelectorBar';

interface ClientDashboardHomeProps {
  candidates: any[];
  user: any;
  role: string | null;
  fullTeamList?: any[];
  onNavigate: (tab: string) => void;
  onSelectCandidate?: (candidate: any) => void;
  selectedClientId?: string;
  onSelectClient?: (clientId: string) => void;
}

export const ClientDashboardHome: React.FC<ClientDashboardHomeProps> = ({
  candidates,
  user,
  role,
  fullTeamList = [],
  onNavigate,
  onSelectCandidate,
  selectedClientId = 'all',
  onSelectClient
}) => {
  // Available clients list for admin selector
  const availableClients = useMemo(() => {
    return getAvailableClients(candidates, fullTeamList);
  }, [candidates, fullTeamList]);

  // Filter candidates specifically assigned to clients / client-wise
  const clientCandidates = useMemo(() => {
    return filterClientPortalCandidates(candidates, user, role, selectedClientId);
  }, [candidates, user, role, selectedClientId]);

  // Compute status info
  const getClientStatusKey = (c: any): string => {
    const status = (c.clientStatus || '').toLowerCase();
    if (status.includes('accept')) return 'accepted';
    if (status.includes('reject')) return 'rejected';
    if (status.includes('discussion')) return 'discussion';
    if (status.includes('shortlist')) return 'shortlisted';

    const isAssigned = Boolean(
      (user?.uid && (c.clientId === user.uid || c.assignedToClient === user.uid)) ||
      (user?.email && c.clientEmail === user.email) ||
      c.clientStatus === 'pending_review'
    );

    if (isAssigned) return 'pending';
    return 'other';
  };

  // Metrics Counters
  const metrics = useMemo(() => {
    let pending = 0;
    let accepted = 0;
    let rejected = 0;
    let discussion = 0;
    let shortlisted = 0;

    clientCandidates.forEach(c => {
      const key = getClientStatusKey(c);
      if (key === 'accepted') accepted++;
      else if (key === 'rejected') rejected++;
      else if (key === 'discussion') discussion++;
      else if (key === 'shortlisted') shortlisted++;
      else if (key === 'pending') pending++;
    });

    return {
      total: clientCandidates.length,
      pending,
      accepted,
      rejected,
      discussion,
      shortlisted,
      interviews: shortlisted + clientCandidates.filter(c => (c.pipelineStage || '').toLowerCase().includes('interview')).length
    };
  }, [clientCandidates]);

  // Recharts Data for Status Distribution Pie Chart
  const pieChartData = useMemo(() => {
    return [
      { name: 'Pending Review', value: metrics.pending, color: '#F59E0B' },
      { name: 'Accepted', value: metrics.accepted, color: '#22C55E' },
      { name: 'Under Discussion', value: metrics.discussion, color: '#3B82F6' },
      { name: 'Shortlisted', value: metrics.shortlisted, color: '#A98B56' },
      { name: 'Rejected', value: metrics.rejected, color: '#EF4444' }
    ].filter(d => d.value > 0 || clientCandidates.length === 0);
  }, [metrics, clientCandidates.length]);

  // Recharts Data for Stage Pipeline Distribution
  const barChartData = useMemo(() => {
    const domainCounts: Record<string, { pending: number; accepted: number; shortlisted: number }> = {};
    clientCandidates.forEach(c => {
      const domain = c.domainFocus || c.domain || 'General';
      if (!domainCounts[domain]) {
        domainCounts[domain] = { pending: 0, accepted: 0, shortlisted: 0 };
      }
      const statusKey = getClientStatusKey(c);
      if (statusKey === 'accepted') domainCounts[domain].accepted++;
      else if (statusKey === 'shortlisted') domainCounts[domain].shortlisted++;
      else domainCounts[domain].pending++;
    });

    return Object.entries(domainCounts).slice(0, 6).map(([domain, counts]) => ({
      domain: domain.length > 14 ? `${domain.slice(0, 12)}...` : domain,
      'Pending Review': counts.pending,
      'Accepted': counts.accepted,
      'Shortlisted': counts.shortlisted
    }));
  }, [clientCandidates]);

  // Upcoming Interviews List
  const upcomingInterviews = useMemo(() => {
    return clientCandidates.filter(c => {
      const statusKey = getClientStatusKey(c);
      const stage = (c.pipelineStage || '').toLowerCase();
      return statusKey === 'shortlisted' || stage.includes('interview') || stage.includes('shortlist');
    }).slice(0, 5);
  }, [clientCandidates]);

  // Recent Activity Feed
  const recentActivities = useMemo(() => {
    const activities: any[] = [];
    clientCandidates.forEach(c => {
      if (Array.isArray(c.clientInteractions)) {
        c.clientInteractions.forEach((act: any) => {
          activities.push({
            ...act,
            candidateName: c.fullName,
            candidateId: c.id,
            candidateDomain: c.domainFocus || c.domain || 'Software'
          });
        });
      }
    });

    // If no interactions recorded yet, create synthetic items from candidate timestamps
    if (activities.length === 0) {
      clientCandidates.slice(0, 5).forEach(c => {
        activities.push({
          id: `created_${c.id}`,
          action: 'Candidate Assigned for Review',
          status: c.clientStatus || 'pending_review',
          feedback: `Assigned to ${user?.displayName || 'Client Portal'} by recruitment team`,
          timestamp: c.createdAt || new Date().toISOString(),
          userName: 'Recruitment Team',
          candidateName: c.fullName,
          candidateId: c.id,
          candidateDomain: c.domainFocus || c.domain || 'Software'
        });
      });
    }

    return activities.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()).slice(0, 6);
  }, [clientCandidates, user?.displayName]);

  // Assigned Recruiter Team Partner
  const assignedRecruiter = useMemo(() => {
    if (fullTeamList.length > 0) {
      const recruiter = fullTeamList.find(u => u.role === 'recruiter' || u.role === 'team_leader' || u.role === 'admin');
      if (recruiter) return recruiter;
    }
    return {
      displayName: 'Aurrum Talent Advisory Team',
      email: 'recruitment@aurrumcrm.com',
      role: 'Account Director'
    };
  }, [fullTeamList]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {onSelectClient && (
        <ClientSelectorBar
          availableClients={availableClients}
          selectedClientId={selectedClientId}
          onSelectClient={onSelectClient}
          role={role}
          totalClientCandidatesCount={clientCandidates.length}
        />
      )}

      {/* Client Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#003649] via-[#004564] to-[#002D38] p-8 text-white shadow-xl border border-white/10">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-96 h-96 bg-[#A98B56]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#A98B56]/20 border border-[#A98B56]/40 text-[#BC9B66] text-xs font-bold uppercase tracking-widest">
              <Sparkles size={14} /> Client Portal Executive Overview
            </div>
            <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
              Welcome back, {user?.displayName || user?.email?.split('@')[0] || 'Valued Client Partner'}
            </h1>
            <p className="text-sm text-[#DCE6EC] leading-relaxed">
              Track candidate submissions, evaluate shortlisted talent profiles, and collaborate directly with your dedicated Aurrum recruitment team.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('client-portal')}
              className="px-5 py-3 crm-btn-gold text-xs uppercase font-black tracking-widest rounded-xl shadow-lg transition-all hover:scale-105 flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 size={16} /> Review Pending ({metrics.pending})
            </button>
            <button
              onClick={() => onNavigate('candidates')}
              className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs uppercase font-black tracking-widest rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <Users size={16} /> View All Candidates
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            title: 'Assigned Candidates',
            count: metrics.total,
            subtext: 'Total Profiles Sourced',
            icon: Users,
            iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
            badge: 'Total Directory',
            onClick: () => onNavigate('candidates')
          },
          {
            title: 'Pending Reviews',
            count: metrics.pending,
            subtext: 'Requires Action',
            icon: Clock,
            iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
            badge: metrics.pending > 0 ? 'Action Needed' : 'Up to date',
            badgeStyle: metrics.pending > 0 ? 'bg-amber-500/20 text-amber-600 font-bold' : 'bg-emerald-500/20 text-emerald-600',
            onClick: () => onNavigate('client-portal')
          },
          {
            title: 'Accepted Candidates',
            count: metrics.accepted,
            subtext: 'Approved for Next Steps',
            icon: CheckCircle2,
            iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
            badge: `${Math.round((metrics.accepted / (metrics.total || 1)) * 100)}% Conversion`,
            onClick: () => onNavigate('client-portal')
          },
          {
            title: 'Upcoming Interviews',
            count: metrics.interviews,
            subtext: 'Shortlisted / Scheduled',
            icon: Calendar,
            iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
            badge: 'Interview Pipeline',
            onClick: () => onNavigate('client-portal')
          },
        ].map((item, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -3 }}
            onClick={item.onClick}
            className="crm-card p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:border-[#A98B56]/50 group"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className={`p-3 rounded-2xl border ${item.iconBg} transition-transform group-hover:scale-110`}>
                <item.icon size={22} />
              </div>
              <span className={`text-[9px] uppercase font-black px-2.5 py-1 rounded-full border border-current ${item.badgeStyle || 'bg-black/5 dark:bg-white/5 text-[var(--text-muted)]'}`}>
                {item.badge}
              </span>
            </div>

            <div>
              <p className="text-[10px] uppercase font-extrabold tracking-widest text-[var(--text-muted)]">{item.title}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">{item.count}</h3>
                <span className="text-xs font-semibold text-[var(--text-muted)]">{item.subtext}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-[10px] font-bold text-[#A98B56] group-hover:translate-x-1 transition-transform">
              <span>Explore Details</span>
              <ChevronRight size={14} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Analytics & Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Status Distribution Pie Chart */}
        <div className="lg:col-span-5 crm-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)] mb-4">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <BarChart2 size={18} className="text-[#A98B56]" /> Candidate Review Status
              </h3>
              <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Breakdown of submitted talent reviews</p>
            </div>
            <span className="text-xs font-bold text-[#A98B56] bg-[#A98B56]/10 px-2.5 py-1 rounded-lg">
              {metrics.total} Total
            </span>
          </div>

          <div className="h-64 w-full relative flex items-center justify-center">
            {clientCandidates.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--card-bg)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card-bg)', 
                      borderColor: 'var(--border-color)', 
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      fontWeight: 'bold',
                      fontSize: '12px'
                    }} 
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    formatter={(value) => <span style={{ color: 'var(--text-primary)', fontSize: '11px', fontWeight: 'bold' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-[var(--text-muted)] font-medium text-xs">
                No candidate metrics recorded yet
              </div>
            )}
          </div>
        </div>

        {/* Domain Distribution Bar Chart */}
        <div className="lg:col-span-7 crm-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)] mb-4">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Briefcase size={18} className="text-[#A98B56]" /> Sourced Domain Distribution
              </h3>
              <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Candidate volume across specialization verticals</p>
            </div>
            <button
              onClick={() => onNavigate('candidates')}
              className="text-xs font-bold text-[#A98B56] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Full List <ArrowRight size={12} />
            </button>
          </div>

          <div className="h-64 w-full">
            {barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
                  <XAxis dataKey="domain" stroke="var(--text-muted)" fontSize={10} tick={{ fill: 'var(--text-muted)' }} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} tick={{ fill: 'var(--text-muted)' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card-bg)', 
                      borderColor: 'var(--border-color)', 
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }} 
                  />
                  <Bar dataKey="Pending Review" stackId="a" fill="#F59E0B" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="Accepted" stackId="a" fill="#22C55E" />
                  <Bar dataKey="Shortlisted" stackId="a" fill="#A98B56" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-xs font-medium">
                No domain data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Middle Grid: Upcoming Interviews & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upcoming Interviews Queue */}
        <div className="lg:col-span-6 crm-card p-6 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)] mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-500/10 text-purple-600 rounded-xl">
                <Calendar size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Upcoming Interview Queue</h3>
                <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Shortlisted candidates pending schedule</p>
              </div>
            </div>
            <span className="text-xs font-black text-purple-600 bg-purple-500/10 px-2.5 py-1 rounded-full">
              {upcomingInterviews.length} Scheduled
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
            {upcomingInterviews.length > 0 ? (
              upcomingInterviews.map((c) => (
                <div 
                  key={c.id} 
                  onClick={() => onSelectCandidate && onSelectCandidate(c)}
                  className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[#A98B56] transition-all flex items-center justify-between gap-4 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#004564] to-[#002D38] text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs">
                      {c.fullName ? c.fullName.substring(0, 2).toUpperCase() : 'CA'}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-extrabold text-[var(--text-primary)] group-hover:text-[#A98B56] transition-colors truncate">
                        {c.fullName}
                      </h4>
                      <p className="text-[11px] font-medium text-[var(--text-muted)] truncate">
                        {c.position || c.domainFocus || c.domain || 'Software Engineer'}
                      </p>
                      {c.locationInfo && (
                        <div className="flex items-center gap-1 text-[9px] text-[#A98B56] font-bold mt-0.5">
                          <MapPin size={10} />
                          <span>{c.locationInfo.city || c.locationInfo.country || 'Remote'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0 gap-1">
                    <span className="text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
                      Shortlisted
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectCandidate) onSelectCandidate(c);
                      }}
                      className="text-[10px] font-bold text-[#A98B56] hover:underline flex items-center gap-1"
                    >
                      View Profile <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-[var(--text-muted)] font-medium text-xs">
                <Calendar size={32} className="mx-auto mb-2 opacity-30" />
                No upcoming interviews scheduled yet. Review pending candidates to shortlist them!
              </div>
            )}
          </div>
        </div>

        {/* Recent Client Activity Timeline */}
        <div className="lg:col-span-6 crm-card p-6 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)] mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl">
                <Activity size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Client Activity Stream</h3>
                <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Real-time candidate submissions and feedback</p>
              </div>
            </div>
            <button 
              onClick={() => onNavigate('client-portal')}
              className="text-xs font-bold text-[#A98B56] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Review Queue <ArrowRight size={12} />
            </button>
          </div>

          <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[380px] pr-1">
            {recentActivities.length > 0 ? (
              recentActivities.map((act, i) => (
                <div key={act.id || i} className="flex gap-3 text-xs">
                  <div className="relative flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center text-[#A98B56] shrink-0 font-bold text-[10px]">
                      {act.action?.includes('ACCEPT') ? (
                        <CheckCircle2 size={14} className="text-emerald-500" />
                      ) : act.action?.includes('REJECT') ? (
                        <XCircle size={14} className="text-rose-500" />
                      ) : (
                        <MessageSquare size={13} className="text-sky-500" />
                      )}
                    </div>
                    {i < recentActivities.length - 1 && (
                      <div className="w-0.5 flex-1 bg-[var(--border-color)] my-1" />
                    )}
                  </div>

                  <div className="flex-1 bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--border-color)] space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-[var(--text-primary)]">
                        {act.candidateName}
                      </span>
                      <span className="text-[9px] text-[var(--text-muted)] font-mono">
                        {act.timestamp ? new Date(act.timestamp).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>

                    <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                      {act.action || 'Activity recorded'} {act.feedback ? `- "${act.feedback}"` : ''}
                    </p>

                    <div className="flex items-center gap-2 pt-1 text-[9px] text-[var(--text-muted)] font-bold uppercase">
                      <span>{act.userName || 'System'}</span>
                      <span>•</span>
                      <span>{act.candidateDomain}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-[var(--text-muted)] font-medium text-xs">
                <Activity size={32} className="mx-auto mb-2 opacity-30" />
                No recent activity logged yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Account Partnership Card */}
      <div className="crm-card p-6 border-l-4 border-l-[#A98B56] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#004564] to-[#002D38] text-white flex items-center justify-center font-black text-lg shrink-0 shadow-md">
            <ShieldCheck size={24} className="text-[#A98B56]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-extrabold text-[var(--text-primary)]">{assignedRecruiter.displayName}</h4>
              <span className="text-[9px] uppercase font-extrabold px-2 py-0.5 rounded bg-[#A98B56]/10 text-[#A98B56]">
                {assignedRecruiter.role || 'Advisory Lead'}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">
              Your dedicated talent acquisition contact for recruitment requests, salary benchmarking, and pipeline questions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <a
            href={`mailto:${assignedRecruiter.email}`}
            className="flex-1 sm:flex-none px-4 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--card-hover-bg)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            <Mail size={14} className="text-[#A98B56]" /> Email Partner
          </a>
          <button
            onClick={() => onNavigate('client-portal')}
            className="flex-1 sm:flex-none px-4 py-2 crm-btn-gold text-xs uppercase font-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            Review Candidates <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
