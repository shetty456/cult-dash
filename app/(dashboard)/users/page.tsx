'use client';

import { useEffect, useState } from 'react';
import { useFilters } from '@/lib/FilterContext';
import UserTable from '@/components/UserTable';

interface StatsRow { total: number; active: number; atRisk: number; churned: number; nsmReached: number; }

export default function UsersPage() {
  const { filters, setProfileUserId } = useFilters();
  const [stats, setStats] = useState<StatsRow | null>(null);
  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    const qs = new URLSearchParams(filters as Record<string, string>);
    fetch(`/api/users?${qs}&limit=1&offset=0`)
      .then(r => r.json())
      .then(d => {
        if (d.stats) setStats(d.stats);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const s = stats;

  return (
    <div className="px-4 sm:px-6 py-5 space-y-4 pb-8">
      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Users',  value: s ? s.total.toLocaleString()     : '—', color: '#10b981' },
          { label: 'Active',       value: s ? s.active.toLocaleString()    : '—', color: '#4ade80' },
          { label: 'At-Risk',      value: s ? s.atRisk.toLocaleString()    : '—', color: '#f59e0b' },
          { label: 'NSM Reached',  value: s ? s.nsmReached.toLocaleString(): '—', color: '#60a5fa' },
        ].map(c => (
          <div key={c.label} className="bg-[#161616] border border-[#2a2a2a] rounded-xl px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#4b5563] mb-1">{c.label}</p>
            <p className="text-xl font-bold tabular-nums" style={{ color: c.color }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <UserTable filters={filters} onUserClick={setProfileUserId} />
      </div>
    </div>
  );
}
