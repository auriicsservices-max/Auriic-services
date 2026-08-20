import React from 'react';

export function DashboardHomeSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Welcome banner skeleton */}
      <div className="crm-card p-6 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-[var(--border-color)]/50 rounded-md"></div>
          <div className="h-4 w-72 bg-[var(--border-color)]/30 rounded-md"></div>
        </div>
        <div className="h-10 w-36 bg-[var(--border-color)]/40 rounded-xl"></div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="crm-card p-5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-4 w-24 bg-[var(--border-color)]/40 rounded-md"></div>
              <div className="h-8 w-8 bg-[var(--border-color)]/50 rounded-xl"></div>
            </div>
            <div className="h-8 w-16 bg-[var(--border-color)]/60 rounded-md"></div>
            <div className="h-3 w-32 bg-[var(--border-color)]/30 rounded-md"></div>
          </div>
        ))}
      </div>

      {/* Chart and Recent activity grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 crm-card p-6 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-5 w-36 bg-[var(--border-color)]/50 rounded-md"></div>
            <div className="h-8 w-28 bg-[var(--border-color)]/40 rounded-lg"></div>
          </div>
          <div className="h-64 w-full bg-[var(--border-color)]/20 rounded-xl"></div>
        </div>
        <div className="crm-card p-6 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl space-y-4">
          <div className="h-5 w-32 bg-[var(--border-color)]/50 rounded-md"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-[var(--border-color)]/30 last:border-0">
                <div className="h-9 w-9 rounded-xl bg-[var(--border-color)]/40 shrink-0"></div>
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-full bg-[var(--border-color)]/50 rounded-md"></div>
                  <div className="h-3 w-20 bg-[var(--border-color)]/30 rounded-md"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CandidateTableSkeleton() {
  return (
    <div className="crm-card bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl overflow-hidden animate-pulse">
      <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center">
        <div className="h-6 w-40 bg-[var(--border-color)]/50 rounded-md"></div>
        <div className="h-9 w-48 bg-[var(--border-color)]/40 rounded-xl"></div>
      </div>
      <div className="divide-y divide-[var(--border-color)]/40">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[var(--border-color)]/40"></div>
              <div className="space-y-1.5">
                <div className="h-4 w-36 bg-[var(--border-color)]/50 rounded-md"></div>
                <div className="h-3 w-24 bg-[var(--border-color)]/30 rounded-md"></div>
              </div>
            </div>
            <div className="h-6 w-20 bg-[var(--border-color)]/40 rounded-full"></div>
            <div className="h-4 w-28 bg-[var(--border-color)]/30 rounded-md hidden sm:block"></div>
            <div className="h-8 w-20 bg-[var(--border-color)]/40 rounded-lg"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PipelineSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-6 w-48 bg-[var(--border-color)]/50 rounded-md"></div>
        <div className="h-10 w-40 bg-[var(--border-color)]/40 rounded-xl"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((col) => (
          <div key={col} className="crm-card bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-4 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-[var(--border-color)]">
              <div className="h-4 w-28 bg-[var(--border-color)]/50 rounded-md"></div>
              <div className="h-6 w-6 rounded-full bg-[var(--border-color)]/40"></div>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((card) => (
                <div key={card} className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
                  <div className="h-4 w-32 bg-[var(--border-color)]/60 rounded-md"></div>
                  <div className="h-3 w-20 bg-[var(--border-color)]/40 rounded-md"></div>
                  <div className="flex justify-between pt-2">
                    <div className="h-6 w-16 bg-[var(--border-color)]/40 rounded-full"></div>
                    <div className="h-6 w-6 rounded-lg bg-[var(--border-color)]/40"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RepositorySkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-6 w-44 bg-[var(--border-color)]/50 rounded-md"></div>
        <div className="h-10 w-60 bg-[var(--border-color)]/40 rounded-xl"></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="crm-card p-6 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-[var(--border-color)]/50"></div>
              <div className="space-y-2 flex-1">
                <div className="h-4 w-36 bg-[var(--border-color)]/60 rounded-md"></div>
                <div className="h-3 w-24 bg-[var(--border-color)]/40 rounded-md"></div>
              </div>
            </div>
            <div className="h-12 w-full bg-[var(--border-color)]/20 rounded-xl"></div>
            <div className="flex justify-between pt-2">
              <div className="h-8 w-24 bg-[var(--border-color)]/40 rounded-lg"></div>
              <div className="h-8 w-24 bg-[var(--border-color)]/40 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InvoicesSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-6 w-36 bg-[var(--border-color)]/50 rounded-md"></div>
        <div className="h-10 w-36 bg-[var(--border-color)]/40 rounded-xl"></div>
      </div>
      <div className="crm-card bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-[var(--border-color)]/30 last:border-0">
              <div className="space-y-1.5">
                <div className="h-4 w-32 bg-[var(--border-color)]/60 rounded-md"></div>
                <div className="h-3 w-20 bg-[var(--border-color)]/30 rounded-md"></div>
              </div>
              <div className="h-6 w-20 bg-[var(--border-color)]/40 rounded-full"></div>
              <div className="h-4 w-20 bg-[var(--border-color)]/50 rounded-md"></div>
              <div className="h-8 w-24 bg-[var(--border-color)]/40 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="h-6 w-48 bg-[var(--border-color)]/50 rounded-md"></div>
      <div className="crm-card p-8 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-32 bg-[var(--border-color)]/60 rounded-md"></div>
            <div className="h-12 w-full bg-[var(--border-color)]/20 rounded-xl"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="max-w-3xl mx-auto crm-card p-8 space-y-8 animate-pulse">
      <div className="flex items-center gap-6 pb-6 border-b border-[var(--border-color)]">
        <div className="w-20 h-20 rounded-2xl bg-[var(--border-color)]/50"></div>
        <div className="space-y-2">
          <div className="h-6 w-40 bg-[var(--border-color)]/60 rounded-md"></div>
          <div className="h-4 w-56 bg-[var(--border-color)]/40 rounded-md"></div>
        </div>
      </div>
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-4 w-24 bg-[var(--border-color)]/50 rounded-md"></div>
          <div className="h-12 w-full bg-[var(--border-color)]/20 rounded-xl"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 w-32 bg-[var(--border-color)]/50 rounded-md"></div>
          <div className="h-12 w-full bg-[var(--border-color)]/20 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="crm-card p-6 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-[var(--border-color)]/50 rounded-md"></div>
          <div className="h-4 w-64 bg-[var(--border-color)]/30 rounded-md"></div>
        </div>
        <div className="h-10 w-32 bg-[var(--border-color)]/40 rounded-xl"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="crm-card p-6 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl space-y-4">
          <div className="h-5 w-36 bg-[var(--border-color)]/50 rounded-md"></div>
          <div className="h-64 w-full bg-[var(--border-color)]/20 rounded-xl"></div>
        </div>
        <div className="crm-card p-6 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl space-y-4">
          <div className="h-5 w-36 bg-[var(--border-color)]/50 rounded-md"></div>
          <div className="h-64 w-full bg-[var(--border-color)]/20 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
}

export function NotificationSkeleton() {
  return (
    <div className="space-y-4 animate-pulse max-w-4xl mx-auto">
      <div className="h-6 w-48 bg-[var(--border-color)]/50 rounded-md"></div>
      <div className="crm-card p-6 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <div className="w-10 h-10 rounded-xl bg-[var(--border-color)]/50 shrink-0"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 w-1/3 bg-[var(--border-color)]/60 rounded-md"></div>
              <div className="h-3 w-3/4 bg-[var(--border-color)]/40 rounded-md"></div>
            </div>
            <div className="h-3 w-16 bg-[var(--border-color)]/30 rounded-md"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

