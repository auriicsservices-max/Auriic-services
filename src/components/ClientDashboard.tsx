import React, { useState } from 'react';
import { ClientDashboardHome } from './client/ClientDashboardHome';
import { ClientCandidateReview } from './client/ClientCandidateReview';
import { ClientPipelineView } from './client/ClientPipelineView';
import { ClientAssignedCandidates } from './client/ClientAssignedCandidates';
import { ClientShortlist } from './client/ClientShortlist';
import { ClientTalentInsights } from './client/ClientTalentInsights';
import { ClientCvRepository } from './client/ClientCvRepository';
import { ClientProfile } from './client/ClientProfile';
import { ClientNotifications } from './client/ClientNotifications';

export { 
  ClientDashboardHome, 
  ClientCandidateReview, 
  ClientPipelineView,
  ClientAssignedCandidates,
  ClientShortlist,
  ClientTalentInsights,
  ClientCvRepository,
  ClientProfile,
  ClientNotifications
};

interface ClientDashboardProps {
  candidates: any[];
  user: any;
  role: string | null;
  fullTeamList?: any[];
  onSelectCandidate?: (candidate: any) => void;
  activeTab?: string;
  onNavigate?: (tab: string) => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  candidates,
  user,
  role,
  fullTeamList = [],
  onSelectCandidate,
  activeTab = 'home',
  onNavigate = () => {}
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string>('all');

  if (activeTab === 'home') {
    return (
      <ClientDashboardHome
        candidates={candidates}
        user={user}
        role={role}
        fullTeamList={fullTeamList}
        onNavigate={onNavigate}
        onSelectCandidate={onSelectCandidate}
        selectedClientId={selectedClientId}
        onSelectClient={setSelectedClientId}
      />
    );
  }

  if (activeTab === 'client-portal') {
    return (
      <ClientCandidateReview
        candidates={candidates}
        user={user}
        role={role}
        fullTeamList={fullTeamList}
        onSelectCandidate={onSelectCandidate}
        selectedClientId={selectedClientId}
        onSelectClient={setSelectedClientId}
      />
    );
  }

  if (activeTab === 'pipeline') {
    return (
      <ClientPipelineView
        candidates={candidates}
        user={user}
        role={role}
        fullTeamList={fullTeamList}
        onSelectCandidate={onSelectCandidate}
        selectedClientId={selectedClientId}
        onSelectClient={setSelectedClientId}
      />
    );
  }

  if (activeTab === 'candidates' || activeTab === 'assigned-candidates') {
    return (
      <ClientAssignedCandidates
        candidates={candidates}
        user={user}
        role={role}
        fullTeamList={fullTeamList}
        onSelectCandidate={onSelectCandidate}
        selectedClientId={selectedClientId}
        onSelectClient={setSelectedClientId}
      />
    );
  }

  if (activeTab === 'shortlist') {
    return (
      <ClientShortlist
        candidates={candidates}
        user={user}
        role={role}
        fullTeamList={fullTeamList}
        onSelectCandidate={onSelectCandidate}
        selectedClientId={selectedClientId}
        onSelectClient={setSelectedClientId}
      />
    );
  }

  if (activeTab === 'analytics') {
    return (
      <ClientTalentInsights
        candidates={candidates}
        user={user}
        role={role}
        fullTeamList={fullTeamList}
        selectedClientId={selectedClientId}
        onSelectClient={setSelectedClientId}
      />
    );
  }

  if (activeTab === 'repository') {
    return (
      <ClientCvRepository
        candidates={candidates}
        user={user}
        role={role}
        fullTeamList={fullTeamList}
        onSelectCandidate={onSelectCandidate}
        selectedClientId={selectedClientId}
        onSelectClient={setSelectedClientId}
      />
    );
  }

  if (activeTab === 'profile') {
    return (
      <ClientProfile
        user={user}
        role={role}
      />
    );
  }

  if (activeTab === 'notifications') {
    return (
      <ClientNotifications
        user={user}
      />
    );
  }

  // Default fallback
  return (
    <ClientDashboardHome
      candidates={candidates}
      user={user}
      role={role}
      fullTeamList={fullTeamList}
      onNavigate={onNavigate}
      onSelectCandidate={onSelectCandidate}
      selectedClientId={selectedClientId}
      onSelectClient={setSelectedClientId}
    />
  );
};

export default ClientDashboard;
