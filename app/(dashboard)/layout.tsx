'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { FilterProvider, useFilters } from '@/lib/FilterContext';
import Sidebar from '@/components/Sidebar';
import DateRangePicker from '@/components/DateRangePicker';
import UserProfile from '@/components/UserProfile';

const PAGE_TITLES: Record<string, string> = {
  '/':       'Growth Overview',
  '/events': 'Events',
  '/users':  'User Explorer',
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
  const title = PAGE_TITLES[pathname] ?? PAGE_TITLES['/'];

  return (
    <div className="flex h-screen bg-[#0f0f0f] overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 lg:ml-[220px] flex flex-col min-w-0 overflow-hidden">
        {/* ── Sticky header — hidden on Events page (it owns its own header) ── */}
        {pathname !== '/events' && (
          <div className="flex-shrink-0 sticky top-0 z-20 bg-[#0f0f0f] border-b border-[#1e1e1e]">
            {/* Row 1: menu + title + live */}
            <div className="px-4 sm:px-6 pt-3 pb-2 flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                className="lg:hidden flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-[#6b7280] hover:text-white hover:bg-[#1e1e1e] transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>

              <h1 className="text-sm font-bold text-white flex-shrink-0">{title}</h1>

              <div className="flex-1" />

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                <span className="text-[11px] text-[#4b5563]">Live</span>
              </div>
            </div>

            {/* Row 2: date picker — full width, scrollable on mobile */}
            <div className="px-4 sm:px-6 pb-2.5 overflow-x-auto scrollbar-none">
              <DateRangePicker filters={filters} onChange={setFilters} />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {children}
          <div className="px-4 sm:px-6 py-3 border-t border-[#1a1a1a]">
            <p className="text-[10px] text-[#3a3a3a]">
              Counts shown are scaled (sample DB × 25 ≈ 100K users). Not for external reporting.
            </p>
          </div>
        </div>
      </main>

      <UserProfile userId={profileUserId} onClose={() => setProfileUserId(null)} />
    </div>
  );
}
