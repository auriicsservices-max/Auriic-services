import React, { useState, useEffect } from 'react';
import { Globe, RefreshCw, FileText, Mail, Phone, Building, Calendar, CheckCircle2, AlertCircle, ExternalLink, Download, Search } from 'lucide-react';

interface WebsiteLeadsViewProps {
  candidates: any[];
  onRefresh: () => void;
}

export default function WebsiteLeadsView({ candidates, onRefresh }: WebsiteLeadsViewProps) {
  const [activeTab, setActiveTab] = useState<'candidates' | 'general'>('candidates');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [pollerLogs, setPollerLogs] = useState<any>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/wordpress/poller-logs');
      const data = await res.json();
      setPollerLogs(data);
    } catch (err) {
      console.error('Failed to fetch poller logs:', err);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/wordpress/poll-now', { method: 'POST' });
      const data = await res.json();
      setSyncResult(data);
      await fetchLogs();
      onRefresh();
    } catch (err: any) {
      setSyncResult({ success: false, error: err.message });
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter website-sourced candidates
  const websiteLeads = candidates.filter(c => c.source === 'website' || c.source === 'wordpress_poller' || c.leadType);
  const candidateApplications = websiteLeads.filter(c => c.leadType === 'find_a_job_service_lead' || c.resumeUrl || c.parsedResume);
  const generalInquiries = websiteLeads.filter(c => c.leadType === 'website_contact_form_lead' || (!c.resumeUrl && !c.parsedResume));

  const currentList = activeTab === 'candidates' ? candidateApplications : generalInquiries;
  const filteredList = currentList.filter(item => {
    const query = searchTerm.toLowerCase();
    const name = (item.name || `${item.firstName || ''} ${item.lastName || ''}`).toLowerCase();
    const email = (item.email || '').toLowerCase();
    const company = (item.company || '').toLowerCase();
    const message = (item.message || '').toLowerCase();
    return name.includes(query) || email.includes(query) || company.includes(query) || message.includes(query);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--card-bg)] border border-[var(--border-color)] p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-[var(--primary-gold)]">
              <Globe size={22} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[var(--text-primary)]">Website Leads & Integrations</h1>
              <p className="text-xs text-[var(--text-secondary)]">Automated CRM sync from aurrum.co WordPress leads API</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="crm-btn-gold px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 text-white shadow-md disabled:opacity-50 transition-all hover:scale-[1.02]"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing WordPress Leads...' : 'Sync Now (Poll API)'}
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {pollerLogs && (
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${pollerLogs.apiKeyConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <div>
              <p className="font-bold text-[var(--text-primary)]">
                API Endpoint: <span className="font-normal text-[var(--text-secondary)]">{pollerLogs.targetUrl}</span>
              </p>
              <p className="text-[var(--text-secondary)]">
                API Key: <span className="font-semibold">{pollerLogs.apiKeyConfigured ? `Configured (${pollerLogs.apiKeySource})` : 'Not Configured'}</span> | Total Recorded Polls: {pollerLogs.totalRecordedRuns}
              </p>
            </div>
          </div>
          {pollerLogs.last5Runs?.[0] && (
            <div className="text-right">
              <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${pollerLogs.last5Runs[0].success ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                Last Run: {pollerLogs.last5Runs[0].success ? `Success (${pollerLogs.last5Runs[0].leadsFetched} leads)` : `Failed: ${pollerLogs.last5Runs[0].error}`}
              </span>
              <p className="text-[10px] text-[var(--text-secondary)] mt-1">{new Date(pollerLogs.last5Runs[0].timestamp).toLocaleString()}</p>
            </div>
          )}
        </div>
      )}

      {syncResult && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-3 ${syncResult.success !== false ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-700 border border-rose-500/20'}`}>
          {syncResult.success !== false ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
          <div>
            <p className="font-bold">Manual Sync Result:</p>
            <p>{syncResult.message || syncResult.result?.error || 'Sync completed successfully.'}</p>
          </div>
        </div>
      )}

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('candidates')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'candidates' ? 'bg-[var(--primary-gold)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)]'}`}
          >
            Candidate Applications ({candidateApplications.length})
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'general' ? 'bg-[var(--primary-gold)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)]'}`}
          >
            General Inquiries ({generalInquiries.length})
          </button>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search leads by name, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-gold)]"
          />
        </div>
      </div>

      {/* Leads List */}
      {filteredList.length === 0 ? (
        <div className="text-center py-16 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl">
          <FileText className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">No leads found</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">No leads have been received in this category yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredList.map((lead) => (
            <div key={lead.id} className="crm-card bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${lead.leadType === 'find_a_job_service_lead' ? 'bg-amber-500/10 text-[var(--primary-gold)]' : 'bg-blue-500/10 text-blue-600'}`}>
                    {lead.leadType === 'find_a_job_service_lead' ? 'Candidate Application' : 'General Inquiry'}
                  </span>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] mt-1.5">
                    {lead.name || `${lead.firstName || ''} ${lead.lastName || ''}` || 'Unnamed Lead'}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1 justify-end">
                    <Calendar size={12} />
                    {lead.submittedAt ? new Date(lead.submittedAt).toLocaleDateString() : 'Recent'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-[var(--text-secondary)]">
                {lead.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-[var(--primary-gold)] shrink-0" />
                    <span className="text-[var(--text-primary)] font-medium">{lead.email}</span>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-[var(--primary-gold)] shrink-0" />
                    <span>{lead.phone}</span>
                  </div>
                )}
                {lead.company && (
                  <div className="flex items-center gap-2">
                    <Building size={14} className="text-[var(--primary-gold)] shrink-0" />
                    <span>{lead.company}</span>
                  </div>
                )}
                {lead.service && (
                  <div className="text-xs bg-[var(--bg-secondary)] px-3 py-1.5 rounded-xl border border-[var(--border-color)]">
                    <strong className="text-[var(--text-primary)]">Service Interested:</strong> {lead.service}
                  </div>
                )}
                {lead.message && (
                  <div className="text-xs bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--border-color)] italic text-[var(--text-primary)]">
                    "{lead.message}"
                  </div>
                )}
              </div>

              {/* Resume / Parsed Info */}
              {lead.parsedResume && (
                <div className="border-t border-[var(--border-color)] pt-3 space-y-2">
                  <p className="text-[11px] font-bold text-[var(--text-primary)]">Parsed Resume Insights:</p>
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{lead.parsedResume.summary || 'No summary available.'}</p>
                  {Array.isArray(lead.parsedResume.skills) && lead.parsedResume.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {lead.parsedResume.skills.slice(0, 5).map((skill: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] text-[var(--text-primary)] text-[10px] font-medium border border-[var(--border-color)]">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {lead.resumeUrl && (
                <div className="border-t border-[var(--border-color)] pt-3 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[var(--text-secondary)] truncate max-w-[200px]">
                    {lead.resumeFileName || 'resume.pdf'}
                  </span>
                  <a
                    href={lead.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)] text-xs font-bold flex items-center gap-1.5 border border-[var(--border-color)] transition-colors"
                  >
                    <Download size={13} />
                    View Resume
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
