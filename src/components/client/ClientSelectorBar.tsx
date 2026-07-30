import React from 'react';
import { Building2, Filter, Users, CheckCircle2 } from 'lucide-react';
import { ClientItem } from '../../utils/clientUtils';

interface ClientSelectorBarProps {
  availableClients: ClientItem[];
  selectedClientId: string;
  onSelectClient: (clientId: string) => void;
  role: string | null;
  totalClientCandidatesCount: number;
}

export const ClientSelectorBar: React.FC<ClientSelectorBarProps> = ({
  availableClients,
  selectedClientId,
  onSelectClient,
  role,
  totalClientCandidatesCount
}) => {
  // If user is a client, do not show selector (they automatically view only their own candidates)
  if (role === 'client') return null;

  const currentSelectedClient = availableClients.find(c => c.id === selectedClientId);

  return (
    <div className="crm-card p-4 mb-6 bg-gradient-to-r from-[var(--card-bg)] to-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xs rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#A98B56]/10 text-[#A98B56] flex items-center justify-center font-bold shrink-0">
          <Building2 size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-[var(--text-primary)]">Client Portal View</h3>
            <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-[#004564]/10 dark:bg-sky-500/10 text-[#004564] dark:text-sky-300 border border-[#004564]/20">
              {role === 'admin' ? 'Admin Mode' : role === 'developer' ? 'Developer Mode' : 'Recruiter Mode'}
            </span>
          </div>
          <p className="text-xs font-medium text-[var(--text-muted)]">
            Showing candidates assigned client-wise ({totalClientCandidatesCount} total assigned)
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="flex items-center gap-2 bg-[var(--bg-primary)] px-3 py-2 rounded-xl border border-[var(--border-color)] w-full sm:w-auto shadow-xs">
          <Filter size={15} className="text-[#A98B56] shrink-0" />
          <span className="text-xs font-bold text-[var(--text-muted)] shrink-0">Filter Client:</span>
          <select
            value={selectedClientId}
            onChange={(e) => onSelectClient(e.target.value)}
            className="bg-transparent text-xs font-extrabold text-[var(--text-primary)] focus:outline-none cursor-pointer w-full sm:w-48 py-0.5"
          >
            <option value="all" className="bg-[var(--card-bg)] text-[var(--text-primary)]">
              All Assigned Clients ({availableClients.length} Clients)
            </option>
            {availableClients.map((client) => (
              <option key={client.id} value={client.id} className="bg-[var(--card-bg)] text-[var(--text-primary)]">
                {client.name} {client.email ? `(${client.email})` : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedClientId !== 'all' && currentSelectedClient && (
          <button
            onClick={() => onSelectClient('all')}
            className="text-xs font-bold text-[#A98B56] hover:underline shrink-0 px-2 py-1 rounded-lg hover:bg-[#A98B56]/10 transition-colors"
          >
            Clear Filter
          </button>
        )}
      </div>
    </div>
  );
};
