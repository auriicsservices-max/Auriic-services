import React, { useMemo } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  Users, 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  PieChart, 
  Sparkles, 
  Award,
  Layers,
  Star
} from 'lucide-react';

import { filterClientPortalCandidates, getAvailableClients } from '../../utils/clientUtils';
import { ClientSelectorBar } from './ClientSelectorBar';

interface ClientTalentInsightsProps {
  candidates: any[];
  user: any;
  role: string | null;
  selectedClientId?: string;
  onSelectClient?: (clientId: string) => void;
  fullTeamList?: any[];
}

export const ClientTalentInsights: React.FC<ClientTalentInsightsProps> = ({
  candidates,
  user,
  role,
  selectedClientId = 'all',
  onSelectClient,
  fullTeamList = []
}) => {
  // Available clients for selector
  const availableClients = useMemo(() => {
    return getAvailableClients(candidates, fullTeamList);
  }, [candidates, fullTeamList]);

  // Filter assigned client candidates
  const clientCandidates = useMemo(() => {
    return filterClientPortalCandidates(candidates, user, role, selectedClientId);
  }, [candidates, user, role, selectedClientId]);

  // Compute Client Analytics Metrics
  const metrics = useMemo(() => {
    const totalAssigned = clientCandidates.length;
    let pendingCount = 0;
    let acceptedCount = 0;
    let rejectedCount = 0;
    let shortlistedCount = 0;

    const skillsMap: Record<string, number> = {};
    const locationMap: Record<string, number> = {};
    const experienceMap: Record<string, number> = {
      '0-2 Years': 0,
      '3-5 Years': 0,
      '6-8 Years': 0,
      '9+ Years': 0
    };

    clientCandidates.forEach((c: any) => {
      const status = (c.clientStatus || 'pending').toLowerCase();
      if (status.includes('accept')) acceptedCount++;
      else if (status.includes('reject')) rejectedCount++;
      else if (status.includes('shortlist')) shortlistedCount++;
      else pendingCount++;

      // Skills distribution
      if (Array.isArray(c.skills)) {
        c.skills.forEach((s: string) => {
          const skillKey = s.trim().toUpperCase();
          if (skillKey) {
            skillsMap[skillKey] = (skillsMap[skillKey] || 0) + 1;
          }
        });
      }

      // Location
      const loc = c.currentLocation || c.location || 'Remote / Unspecified';
      locationMap[loc] = (locationMap[loc] || 0) + 1;

      // Experience
      const exp = parseInt(c.yearsOfExperience || c.experienceYears || '0', 10);
      if (exp <= 2) experienceMap['0-2 Years']++;
      else if (exp <= 5) experienceMap['3-5 Years']++;
      else if (exp <= 8) experienceMap['6-8 Years']++;
      else experienceMap['9+ Years']++;
    });

    const topSkills = Object.entries(skillsMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const topLocations = Object.entries(locationMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const conversionRate = totalAssigned > 0 
      ? Math.round(((acceptedCount + shortlistedCount) / totalAssigned) * 100)
      : 0;

    return {
      totalAssigned,
      pendingCount,
      acceptedCount,
      rejectedCount,
      shortlistedCount,
      topSkills,
      topLocations,
      experienceMap,
      conversionRate
    };
  }, [clientCandidates]);

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

      {/* Header Banner */}
      <div className="crm-card p-6 border-l-4 border-l-[#A98B56] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#A98B56]/10 text-[#A98B56] rounded-2xl">
            <BarChart2 size={22} />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-[var(--text-primary)]">Talent Insights & Analytics</h1>
            <p className="text-xs text-[var(--text-muted)] font-medium">Hiring funnel stats, skill availability, experience breakdowns, and conversion analytics.</p>
          </div>
        </div>

        <div className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl text-xs font-extrabold flex items-center gap-2 text-[var(--text-primary)]">
          <Sparkles size={16} className="text-[#A98B56]" />
          <span>Client Decision Rate: <strong className="text-[#A98B56]">{metrics.conversionRate}%</strong></span>
        </div>
      </div>

      {/* Quick KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="crm-card p-5 space-y-2 border-t-2 border-t-blue-500">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-bold">
            <span>TOTAL ASSIGNED</span>
            <Users size={16} className="text-blue-500" />
          </div>
          <p className="text-2xl font-serif font-bold text-[var(--text-primary)]">{metrics.totalAssigned}</p>
          <p className="text-[10px] text-[var(--text-muted)]">Active profiles in review queue</p>
        </div>

        <div className="crm-card p-5 space-y-2 border-t-2 border-t-amber-500">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-bold">
            <span>PENDING REVIEW</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-serif font-bold text-[var(--text-primary)]">{metrics.pendingCount}</p>
          <p className="text-[10px] text-[var(--text-muted)]">Awaiting your feedback</p>
        </div>

        <div className="crm-card p-5 space-y-2 border-t-2 border-t-purple-500">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-bold">
            <span>SHORTLISTED</span>
            <Star size={16} className="text-purple-500" />
          </div>
          <p className="text-2xl font-serif font-bold text-[var(--text-primary)]">{metrics.shortlistedCount}</p>
          <p className="text-[10px] text-[var(--text-muted)]">Interview candidate pool</p>
        </div>

        <div className="crm-card p-5 space-y-2 border-t-2 border-t-emerald-500">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-bold">
            <span>ACCEPTED / HIRED</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-serif font-bold text-[var(--text-primary)]">{metrics.acceptedCount}</p>
          <p className="text-[10px] text-[var(--text-muted)]">Approved candidate profiles</p>
        </div>

        <div className="crm-card p-5 space-y-2 border-t-2 border-t-rose-500">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-bold">
            <span>REJECTED</span>
            <TrendingUp size={16} className="text-rose-500" />
          </div>
          <p className="text-2xl font-serif font-bold text-[var(--text-primary)]">{metrics.rejectedCount}</p>
          <p className="text-[10px] text-[var(--text-muted)]">Not moving forward</p>
        </div>
      </div>

      {/* Visual Analytics Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skill Distribution */}
        <div className="crm-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Award size={18} className="text-[#A98B56]" /> Top Skill Distribution
            </h3>
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">In Candidate Pool</span>
          </div>

          <div className="space-y-3">
            {metrics.topSkills.length > 0 ? (
              metrics.topSkills.map(([skill, count]) => {
                const percentage = Math.round((count / (metrics.totalAssigned || 1)) * 100);
                return (
                  <div key={skill} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-[var(--text-primary)]">
                      <span>{skill}</span>
                      <span className="text-[#A98B56]">{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden border border-[var(--border-color)]">
                      <div 
                        className="h-full bg-gradient-to-r from-[#004564] to-[#A98B56] rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(percentage * 2, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-[var(--text-muted)] italic py-6 text-center">No skill data available for assigned candidates yet.</p>
            )}
          </div>
        </div>

        {/* Experience Breakdown */}
        <div className="crm-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Briefcase size={18} className="text-[#A98B56]" /> Experience Seniority Breakdown
            </h3>
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Years in Field</span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            {Object.entries(metrics.experienceMap).map(([label, count]) => (
              <div key={label} className="p-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] space-y-1 text-center">
                <span className="text-[10px] uppercase font-extrabold text-[var(--text-muted)] block">{label}</span>
                <p className="text-2xl font-serif font-bold text-[#A98B56]">{count}</p>
                <span className="text-[9px] text-[var(--text-muted)] font-semibold">candidates</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Location Insights */}
      <div className="crm-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <MapPin size={18} className="text-[#A98B56]" /> Top Candidate Locations
          </h3>
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Geographic Distribution</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {metrics.topLocations.map(([loc, count]) => (
            <div key={loc} className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-1">
              <p className="text-xs font-extrabold text-[var(--text-primary)] truncate">{loc}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--text-muted)] font-bold">Candidates:</span>
                <span className="text-sm font-black text-[#A98B56]">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClientTalentInsights;
