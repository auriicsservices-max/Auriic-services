import React from 'react';
import IPWhitelistManager from './IPWhitelistManager';

export default function SecurityManagement() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif text-[var(--text-primary)]">Security Settings</h2>
      <IPWhitelistManager />
    </div>
  );
}
