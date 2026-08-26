import React, { useState, useEffect } from 'react';
import { Globe, RefreshCw, FileText, Mail, Phone, Building, Calendar, CheckCircle2, AlertCircle, ExternalLink, Download, Search } from 'lucide-react';

interface WebsiteLeadsViewProps {
  candidates: any[];
  onRefresh: () => void;
}

export default function WebsiteLeadsView({ candidates = [], onRefresh }: WebsiteLeadsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [pollerLogs, setPollerLogs] = useState<any>(null);
  const [liveLeads, setLiveLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [parsingStates, setParsingStates] = useState<Record<string | number, { status: 'idle' | 'parsing' | 'success' | 'error'; message?: string; qualityScore?: number; candidateId?: string }>>({});

  useEffect(() => {
    fetchLogs();
    fetchLiveLeads();
  }, []);

  const handleParseResume = async (lead: any) => {
    const leadId = lead.id;
    const resumeUrl = lead.resume_url || lead.resumeUrl;
    if (!resumeUrl) return;

    setParsingStates(prev => ({ ...prev, [leadId]: { status: 'parsing', message: 'Parsing...' } }));

    try {
      let res = await fetch('/api/wordpress/parse-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          resumeUrl: resumeUrl,
          email: lead.email,
          firstName: lead.first_name || lead.firstName,
          lastName: lead.last_name || lead.lastName,
          phone: lead.phone,
          company: lead.company,
          service: lead.service,
          country: lead.country,
          message: lead.message,
          leadType: lead.lead_type || lead.leadType,
          resumeFileName: lead.resume_file_name || lead.resumeFileName || 'resume.pdf',
          resumeFileType: lead.resume_file_type || lead.resumeFileType || 'application/pdf',
          resumeSize: lead.resume_size || lead.resumeSize || 0
        })
      });

      if (!res.ok) {
        res = await fetch('/api/wordpress/parse-lead-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: lead.id,
            resumeUrl: resumeUrl,
            email: lead.email,
            firstName: lead.first_name || lead.firstName,
            lastName: lead.last_name || lead.lastName,
            phone: lead.phone,
            company: lead.company,
            service: lead.service,
            country: lead.country,
            message: lead.message,
            leadType: lead.lead_type || lead.leadType,
            resumeFileName: lead.resume_file_name || lead.resumeFileName || 'resume.pdf',
            resumeFileType: lead.resume_file_type || lead.resumeFileType || 'application/pdf',
            resumeSize: lead.resume_size || lead.resumeSize || 0
          })
        });
      }

      const data = await res.json();
      if (data.success) {
        setParsingStates(prev => ({
          ...prev,
          [leadId]: {
            status: 'success',
            message: data.message || 'Resume Parsed Successfully',
            qualityScore: data.qualityScore || 85,
            candidateId: data.candidateId
          }
        }));
        if (data.parsedResume) {
          lead.parsedResume = data.parsedResume;
        }
        onRefresh();
      } else {
        setParsingStates(prev => ({
          ...prev,
          [leadId]: {
            status: 'error',
            message: data.error || 'Resume parsing could not be completed. The resume has been queued for retry.'
          }
        }));
      }
    } catch (err: any) {
      setParsingStates(prev => ({
        ...prev,
        [leadId]: {
          status: 'error',
          message: 'Resume parsing could not be completed. The resume has been queued for retry.'
        }
      }));
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/wordpress/poller-logs');
      const data = await res.json();
      setPollerLogs(data);
    } catch (err) {
      console.error('Failed to fetch poller logs:', err);
    }
  };

  const fetchLiveLeads = async () => {
    setLoadingLeads(true);
    try {
      let res = await fetch('/api/wordpress/crm-leads');
      if (!res.ok) {
        res = await fetch('/api/wordpress/live-leads');
      }
      const data = await res.json();
      if (data && Array.isArray(data.leads)) {
        setLiveLeads(data.leads);
      } else if (Array.isArray(data)) {
        setLiveLeads(data);
      }
    } catch (err) {
      console.error('Failed to fetch live leads:', err);
    } finally {
      setLoadingLeads(false);
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
      await fetchLiveLeads();
      onRefresh();
    } catch (err: any) {
      setSyncResult({ success: false, error: err.message });
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter leads directly fetched from API
  const filteredList = liveLeads.filter(item => {
    const query = searchTerm.toLowerCase();
    const name = (`${item.first_name || item.firstName || ''} ${item.last_name || item.lastName || item.name || ''}`).toLowerCase();
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

      {/* Section Title & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-extrabold text-[var(--text-primary)]">Aurrum Website Form Leads</h2>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--primary-gold)]/10 text-[var(--primary-gold)]">
            {liveLeads.length} Total
          </span>
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

              {/* Resume / Parsed Info & Parse Resume Button */}
              {(lead.resume_url || lead.resumeUrl) && (() => {
                const leadId = lead.id;
                const pState = parsingStates[leadId] || { status: 'idle' };
                const isParsed = lead.parsedResume || pState.status === 'success';
                const isParsing = pState.status === 'parsing';
                const hasError = pState.status === 'error';
                const resumeUrl = lead.resume_url || lead.resumeUrl;
                const resumeFileName = lead.resume_file_name || lead.resumeFileName || 'resume.pdf';
                const resumeFileType = lead.resume_file_type || lead.resumeFileType || 'application/pdf';

                return (
                  <div className="border-t border-[var(--border-color)] pt-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <FileText size={15} className="text-[var(--primary-gold)]" />
                        <div>
                          <p className="font-bold text-[var(--text-primary)]">{resumeFileName}</p>
                          <p className="text-[10px] text-[var(--text-secondary)] font-mono uppercase">{resumeFileType}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)] text-xs font-bold flex items-center gap-1.5 border border-[var(--border-color)] transition-colors"
                        >
                          <Download size={13} />
                          View Resume
                        </a>
                      </div>
                    </div>

                    {/* Status & Parse Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--border-color)]">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isParsed ? 'bg-emerald-500' : isParsing ? 'bg-amber-500 animate-pulse' : hasError ? 'bg-rose-500' : 'bg-slate-400'}`} />
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          Status: {isParsed ? 'Parsed' : isParsing ? 'Parsing...' : hasError ? 'Failed (Queued for Retry)' : 'Not Parsed'}
                        </span>
                        {pState.qualityScore && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[10px] font-extrabold">
                            Quality: {pState.qualityScore}%
                          </span>
                        )}
                      </div>

                      {!isParsed && (
                        <button
                          onClick={() => handleParseResume(lead)}
                          disabled={isParsing}
                          className="crm-btn-gold px-3.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm disabled:opacity-50 flex items-center gap-1.5 justify-center transition-all hover:scale-[1.02]"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isParsing ? 'animate-spin' : ''}`} />
                          {isParsing ? 'Parsing...' : 'Parse Resume'}
                        </button>
                      )}

                      {isParsed && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                          Resume Parsed Successfully ✓
                        </span>
                      )}
                    </div>

                    {hasError && (
                      <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-700 rounded-xl text-xs">
                        {pState.message || 'Resume parsing could not be completed. The resume has been queued for retry.'}
                      </div>
                    )}

                    {/* Parsed Insights */}
                    {lead.parsedResume && (
                      <div className="space-y-2 bg-[var(--card-bg)] p-3.5 rounded-xl border border-[var(--border-color)]">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-[var(--text-primary)] uppercase tracking-wider">Parsed Candidate Insights</span>
                          {pState.candidateId && (
                            <span className="text-[10px] font-mono text-[var(--text-secondary)]">Candidate ID: {pState.candidateId}</span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{lead.parsedResume.summary || lead.parsedResume.profile || 'No summary available.'}</p>
                        {Array.isArray(lead.parsedResume.skills) && lead.parsedResume.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {lead.parsedResume.skills.slice(0, 6).map((skill: string, idx: number) => (
                              <span key={idx} className="px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] text-[var(--text-primary)] text-[10px] font-medium border border-[var(--border-color)]">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
