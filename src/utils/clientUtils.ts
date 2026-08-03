export interface ClientItem {
  id: string;
  name: string;
  email?: string;
}

/**
 * Checks if a candidate is assigned to any client.
 */
export const isAssignedToAnyClient = (c: any): boolean => {
  if (!c) return false;
  return Boolean(
    (c.clientId && String(c.clientId).trim() !== '') ||
    (c.assignedToClient && String(c.assignedToClient).trim() !== '') ||
    (c.clientEmail && String(c.clientEmail).trim() !== '') ||
    (c.clientName && String(c.clientName).trim() !== '')
  );
};

/**
 * Checks if a candidate is assigned to a specific client user or client ID.
 */
export const isCandidateForClient = (c: any, clientIdOrUser: string | any): boolean => {
  if (!c || !clientIdOrUser) return false;

  let targetId = '';
  let targetEmail = '';
  let targetName = '';

  if (typeof clientIdOrUser === 'string') {
    targetId = clientIdOrUser.toLowerCase();
  } else {
    targetId = (clientIdOrUser.uid || clientIdOrUser.id || '').toLowerCase();
    targetEmail = (clientIdOrUser.email || '').toLowerCase();
    targetName = (clientIdOrUser.displayName || clientIdOrUser.name || '').toLowerCase();
  }

  if (!targetId && !targetEmail && !targetName) return false;

  const candClientId = (c.clientId || '').toLowerCase();
  const candAssignedTo = (c.assignedToClient || '').toLowerCase();
  const candEmail = (c.clientEmail || '').toLowerCase();
  const candName = (c.clientName || '').toLowerCase();

  // Match by ID
  if (targetId && (candClientId === targetId || candAssignedTo === targetId)) {
    return true;
  }
  // Match by Email
  if (targetEmail && candEmail && candEmail === targetEmail) {
    return true;
  }
  // Match by Name
  if (targetName && candName && candName === targetName) {
    return true;
  }
  // If targetId was passed as a name string or email string:
  if (targetId && (candEmail === targetId || candName === targetId)) {
    return true;
  }

  return false;
};

/**
 * Extract unique clients from fullTeamList and candidates array.
 */
export const getAvailableClients = (candidates: any[] = [], fullTeamList: any[] = []): ClientItem[] => {
  const map = new Map<string, ClientItem>();

  // 1. Add clients from fullTeamList
  (fullTeamList || []).forEach(u => {
    if (u.role === 'client') {
      const id = u.uid || u.id;
      if (id) {
        map.set(id, {
          id,
          name: u.displayName || u.name || u.email || 'Client',
          email: u.email
        });
      }
    }
  });

  // 2. Add clients found on candidates
  (candidates || []).forEach(c => {
    if (isAssignedToAnyClient(c)) {
      const id = c.clientId || c.assignedToClient || c.clientEmail || c.clientName;
      if (id && !map.has(id)) {
        map.set(id, {
          id,
          name: c.clientName || c.clientEmail || `Client (${id.slice(0, 8)})`,
          email: c.clientEmail
        });
      }
    }
  });

  return Array.from(map.values());
};

/**
 * Main helper to filter candidates for Client Portal views:
 * - Returns ONLY candidates assigned to a client.
 * - If user is a client (role === 'client'): returns only candidates assigned to THIS client.
 * - If non-client role: returns candidates for selected client ID or all client-assigned candidates.
 */
export const filterClientPortalCandidates = (
  candidates: any[] = [],
  user: any,
  role: string | null,
  selectedClientId: string = 'all'
): any[] => {
  // If user is a client, strictly show only candidates assigned to this client
  if (role === 'client') {
    return candidates.filter(c => isAssignedToAnyClient(c) && isCandidateAssignedToUser(c, user));
  }

  // For non-client roles (admin, developer, recruiter, team leader):
  // Filter to candidates assigned to ANY client
  const clientOnlyCandidates = candidates.filter(c => isAssignedToAnyClient(c));

  if (selectedClientId === 'all' || !selectedClientId) {
    return clientOnlyCandidates;
  }

  return clientOnlyCandidates.filter(c => isCandidateForClient(c, selectedClientId));
};

export function isCandidateAssignedToUser(c: any, user: any): boolean {
  if (!user) return false;
  const uid = (user.uid || user.id || '').toLowerCase();
  const email = (user.email || '').toLowerCase();
  const name = (user.displayName || user.name || '').toLowerCase();

  const candClientId = (c.clientId || '').toLowerCase();
  const candAssignedTo = (c.assignedToClient || '').toLowerCase();
  const candEmail = (c.clientEmail || '').toLowerCase();
  const candName = (c.clientName || '').toLowerCase();

  if (uid && (candClientId === uid || candAssignedTo === uid)) return true;
  if (email && candEmail && candEmail === email) return true;
  if (name && candName && candName === name) return true;

  return false;
}
