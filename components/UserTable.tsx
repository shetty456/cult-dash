'use client';

import { useState, useEffect, useCallback } from 'react';
import { GlobalFilters } from '@/lib/queryHelpers';

interface ApiUser {
  id: string; name: string; city: string; state: string;
  age: number; gender: string; plan: string; channel: string;
  utm_source: string; utm_medium: string;
  device_type: string; os: string;
  joined_at: string; last_active: string;
  workouts_completed: number; status: string; ltv: number; nsm_reached: number;
}

const ANCHOR = new Date('2026-04-11T14:47:00Z').getTime();

type SortKey = 'name' | 'city' | 'age' | 'plan' | 'channel' | 'workouts_completed' | 'ltv' | 'status' | 'last_active';

const PLAN_COLORS: Record<string, string> = {
  free:      'text-[#6b7280] bg-[#252525]',
  monthly:   'text-[#60a5fa] bg-[#1e3a5f]',
  quarterly: 'text-[#10b981] bg-[#064e3b]',
  annual:    'text-[#f59e0b] bg-[#451a03]',
};

const STATUS_COLORS: Record<string, string> = {
  active:   'text-[#10b981] bg-[#064e3b]',
  'at-risk': 'text-[#f59e0b] bg-[#451a03]',
  churned:  'text-[#ef4444] bg-[#450a0a]',
};

function formatDaysAgo(iso: string): string {
  const diff = ANCHOR - new Date(iso).getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return 'Today';
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function SortTh({ label, sortKey, active, dir, onSort }: {
  label: string; sortKey: SortKey;
  active: boolean; dir: 'asc' | 'desc';
  onSort: (k: SortKey) => void;
}) {
  return (
    <th
      className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6b7280] cursor-pointer hover:text-white transition-colors whitespace-nowrap select-none"
      onClick={() => onSort(sortKey)}
    >
      {label} <span className="opacity-50">{active ? (dir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </th>
  );
}

interface UserTableProps {
  filters?: GlobalFilters;
  pageSize?: number;
  onUserClick?: (userId: string) => void;
}

export default function UserTable({ filters = {}, pageSize = 10, onUserClick }: UserTableProps) {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('ltv');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');

  const filterKey = JSON.stringify(filters);

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams(filters as Record<string, string>);
    qs.set('limit', String(pageSize));
    qs.set('offset', String(page * pageSize));
    qs.set('sort', sortKey);
    qs.set('dir', sortDir);
    if (search) qs.set('search', search);
    if (statusFilter) qs.set('status', statusFilter);
    if (planFilter) qs.set('plan', planFilter);
    fetch(`/api/users?${qs}`)
      .then(r => r.json())
      .then(d => {
        setUsers(d.users ?? []);
        setTotal(d.total ?? 0);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, sortKey, sortDir, page, pageSize, search, statusFilter, planFilter]);

  useEffect(() => { load(); }, [load]);

  function handleSort(k: SortKey) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
    setPage(0);
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3 flex-shrink-0">
        <input
          type="text"
          placeholder="Search name or city..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="flex-1 bg-[#1e1e1e] border border-[#2a2a2a] text-white text-xs placeholder-[#4b5563] rounded-lg px-3 py-2 focus:outline-none focus:border-[#3a3a3a]"
        />
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
            className="flex-1 sm:flex-none text-xs bg-[#1e1e1e] border border-[#2a2a2a] text-[#9ca3af] rounded-lg px-2 py-2 focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="at-risk">At-Risk</option>
            <option value="churned">Churned</option>
          </select>
          <select
            value={planFilter}
            onChange={e => { setPlanFilter(e.target.value); setPage(0); }}
            className="flex-1 sm:flex-none text-xs bg-[#1e1e1e] border border-[#2a2a2a] text-[#9ca3af] rounded-lg px-2 py-2 focus:outline-none"
          >
            <option value="">All Plans</option>
            <option value="free">Free</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1 rounded-xl border border-[#2a2a2a]">
        <table className="w-full text-xs min-w-[900px]">
          <thead className="bg-[#161616] sticky top-0 z-10">
            <tr>
              <SortTh label="User"       sortKey="name"               active={sortKey==='name'}               dir={sortDir} onSort={handleSort} />
              <SortTh label="City"       sortKey="city"               active={sortKey==='city'}               dir={sortDir} onSort={handleSort} />
              <SortTh label="Age"        sortKey="age"                active={sortKey==='age'}                dir={sortDir} onSort={handleSort} />
              <SortTh label="Plan"       sortKey="plan"               active={sortKey==='plan'}               dir={sortDir} onSort={handleSort} />
              <SortTh label="Channel"    sortKey="channel"            active={sortKey==='channel'}            dir={sortDir} onSort={handleSort} />
              <SortTh label="Workouts"   sortKey="workouts_completed" active={sortKey==='workouts_completed'} dir={sortDir} onSort={handleSort} />
              <SortTh label="LTV"        sortKey="ltv"                active={sortKey==='ltv'}                dir={sortDir} onSort={handleSort} />
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6b7280] whitespace-nowrap">NSM</th>
              <SortTh label="Status"     sortKey="status"             active={sortKey==='status'}             dir={sortDir} onSort={handleSort} />
              <SortTh label="Last Active" sortKey="last_active"       active={sortKey==='last_active'}        dir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: pageSize }, (_, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#1e1e1e]'}>
                  {Array.from({ length: 10 }, (_, j) => (
                    <td key={j} className="px-3 py-3">
                      <div className="h-4 bg-[#252525] rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.map((u, i) => (
              <tr
                key={u.id}
                onClick={() => onUserClick?.(u.id)}
                className={`${i % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#1e1e1e]'} hover:bg-[#252525] transition-colors duration-100 ${onUserClick ? 'cursor-pointer' : ''}`}
              >
                <td className="px-3 py-3">
                  <div>
                    <p className="font-semibold text-white">{u.name}</p>
                    <p className="text-[10px] text-[#4b5563]">{u.id} · {u.gender}</p>
                  </div>
                </td>
                <td className="px-3 py-3 text-[#9ca3af]">{u.city}</td>
                <td className="px-3 py-3 text-[#9ca3af] tabular-nums">{u.age}</td>
                <td className="px-3 py-3">
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${PLAN_COLORS[u.plan] ?? 'text-[#6b7280] bg-[#252525]'}`}>
                    {u.plan}
                  </span>
                </td>
                <td className="px-3 py-3 text-[#9ca3af] text-[11px]">{u.channel}</td>
                <td className="px-3 py-3 text-white font-semibold tabular-nums text-center">{u.workouts_completed}</td>
                <td className="px-3 py-3 text-white font-semibold tabular-nums">
                  {u.ltv > 0 ? `₹${u.ltv.toLocaleString()}` : '—'}
                </td>
                <td className="px-3 py-3 text-center">
                  {u.nsm_reached ? (
                    <span className="text-[#10b981] font-bold">✓</span>
                  ) : (
                    <span className="text-[#3a3a3a]">—</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${STATUS_COLORS[u.status] ?? ''}`}>
                    {u.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-[#6b7280] tabular-nums text-[11px]">{formatDaysAgo(u.last_active)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-3 flex-shrink-0">
        <p className="text-[11px] text-[#4b5563]">
          {total.toLocaleString()} users · Page {page + 1} of {Math.max(1, totalPages)}
        </p>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setPage(0)} disabled={page === 0}
            className="px-2 py-1 text-[11px] text-[#6b7280] hover:text-white disabled:opacity-30 transition-colors">«</button>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-2 py-1 text-[11px] text-[#6b7280] hover:text-white disabled:opacity-30 transition-colors">‹</button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pg = Math.min(Math.max(page - 2, 0), Math.max(0, totalPages - 5)) + i;
            return (
              <button
                key={pg}
                onClick={() => setPage(pg)}
                className={`w-7 h-7 text-[11px] rounded-md transition-colors ${pg === page ? 'bg-[#10b981] text-black font-bold' : 'text-[#6b7280] hover:text-white hover:bg-[#2a2a2a]'}`}
              >
                {pg + 1}
              </button>
            );
          })}
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="px-2 py-1 text-[11px] text-[#6b7280] hover:text-white disabled:opacity-30 transition-colors">›</button>
          <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}
            className="px-2 py-1 text-[11px] text-[#6b7280] hover:text-white disabled:opacity-30 transition-colors">»</button>
        </div>
      </div>
    </div>
  );
}
