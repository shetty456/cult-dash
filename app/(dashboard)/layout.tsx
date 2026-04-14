'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { FilterProvider, useFilters } from '@/lib/FilterContext';
import Sidebar from '@/components/Sidebar';
import GlobalFilterBar from '@/components/GlobalFilterBar';
import UserProfile from '@/components/UserProfile';

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  '/':         { title: 'Growth Overview',  sub: 'Key metrics, funnel health, and live activity at a glance' },
  '/events':   { title: 'Event Stream',     sub: 'Real-time feed of all user actions — Mixpanel-style' },
  '/users':    { title: 'User Explorer',    sub: 'Browse, search, and drill into individual user journeys' },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <FilterProvider>
      <Shell>{children}</Shell>
    </FilterProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { filters, setFilters, profileUserId, setProfileUserId } = useFilters();
  const pathname = usePathname();
  const meta = PAGE_TITLES[pathname] ?? PAGE_TITLES['/'];

  return (
    <div className="flex h-screen bg-[#0f0f0f] overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 lg:ml-[220px] flex flex-col min-w-0 overflow-hidden">
        {/* ── Sticky header ── */}
        <div className="flex-shrink-0 sticky top-0 z-20 bg-[#0f0f0f] border-b border-[#1e1e1e]">
          {/* Top row */}
          <div className="px-4 sm:px-6 py-3 flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              className="lg:hidden flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-[#6b7280] hover:text-white hover:bg-[#1e1e1e] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>

            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-white truncate">{meta.title}</h1>
              <p className="text-[10px] text-[#4b5563] hidden sm:block truncate">{meta.sub}</p>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
              <span className="text-[11px] text-[#4b5563] hidden sm:block">Live</span>
            </div>
          </div>

          {/* Filter row */}
          <div className="px-4 sm:px-6 pb-3">
            <GlobalFilterBar filters={filters} onChange={setFilters} />
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>

      <UserProfile userId={profileUserId} onClose={() => setProfileUserId(null)} />
    </div>
  );
}
