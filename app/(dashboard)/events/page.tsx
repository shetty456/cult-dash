'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFilters } from '@/lib/FilterContext';
import EventStream from '@/components/EventStream';

// ── Types ─────────────────────────────────────────────────────────────────────

type DateKey = 'custom' | 'today' | '1d' | '7d' | '30d' | '3m' | '6m' | '12m';

// ── Constants ─────────────────────────────────────────────────────────────────

const DATE_PILLS: { key: DateKey; label: string }[] = [
  { key: 'custom', label: 'Custom'    },
  { key: 'today',  label: 'Today'     },
  { key: '1d',     label: 'Yesterday' },
  { key: '7d',     label: '7D'        },
  { key: '30d',    label: '30D'       },
  { key: '3m',     label: '3M'        },
  { key: '6m',     label: '6M'        },
  { key: '12m',    label: '12M'       },
];

const EVENT_TYPES = [
  { value: 'app_open',               label: 'App Open',       color: '#9ca3af' },
  { value: 'page_view',              label: 'Page View',      color: '#818cf8' },
  { value: 'workout_started',        label: 'Workout Start',  color: '#f59e0b' },
  { value: 'workout_completed',      label: 'Workout Done',   color: '#10b981' },
  { value: 'trial_booked',           label: 'Trial Booked',   color: '#60a5fa' },
  { value: 'trial_completed',        label: 'Trial Done',     color: '#34d399' },
  { value: 'subscription_purchased', label: 'Subscribed',     color: '#4ade80' },
  { value: 'subscription_cancelled', label: 'Cancelled',      color: '#f87171' },
  { value: 'referral_sent',          label: 'Referral Sent',  color: '#a78bfa' },
  { value: 'class_booked',           label: 'Class Booked',   color: '#38bdf8' },
  { value: 'meal_logged',            label: 'Meal Logged',    color: '#fb923c' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDateBounds(key: DateKey): { from?: string; to?: string } {
  if (key === 'custom') return {};
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ago   = (d: number) => new Date(today.getTime() - d * 86400000).toISOString();
  switch (key) {
    case 'today': return { from: today.toISOString(), to: now.toISOString() };
    case '1d':    return { from: ago(1), to: today.toISOString() };
    case '7d':    return { from: ago(7),   to: now.toISOString() };
    case '30d':   return { from: ago(30),  to: now.toISOString() };
    case '3m':    return { from: ago(90),  to: now.toISOString() };
    case '6m':    return { from: ago(180), to: now.toISOString() };
    case '12m':   return { from: ago(365), to: now.toISOString() };
    default:      return {};
  }
}

function relUpdated(ms: number): string {
  const diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 60)  return `Updated ${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `Updated ${m} minute${m === 1 ? '' : 's'} ago`;
  return `Updated ${Math.floor(m / 60)}h ago`;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function RefreshIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M11.5 6.5a5 5 0 1 1-1.44-3.56M11.5 1.5v3.5H8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
      className={`transition-transform duration-150 ${open ? '' : '-rotate-90'}`}>
      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#3a3a3a] pointer-events-none">
      <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 8l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const { filters, setProfileUserId } = useFilters();

  const [dateKey,      setDateKey]      = useState<DateKey>('custom');
  const [eventType,    setEventType]    = useState('');
  const [search,       setSearch]       = useState('');
  const [selectOpen,   setSelectOpen]   = useState(true);
  const [filtersOpen,  setFiltersOpen]  = useState(false);
  const [total,        setTotal]        = useState<number | null>(null);
  const [refreshKey,   setRefreshKey]   = useState(0);
  const [updatedMs,    setUpdatedMs]    = useState(Date.now());
  const [updatedLabel, setUpdatedLabel] = useState('Updated just now');

  // Tick the "Updated X ago" label
  useEffect(() => {
    const tick = () => setUpdatedLabel(relUpdated(updatedMs));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [updatedMs]);

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const handleDataLoaded = useCallback(() => {
    setUpdatedMs(Date.now());
    setUpdatedLabel('Updated just now');
  }, []);

  const dateBounds     = useMemo(() => getDateBounds(dateKey), [dateKey]);
  const mergedFilters  = {
    ...filters,
    ...(dateBounds.from ? { from: dateBounds.from } : {}),
    ...(dateBounds.to   ? { to:   dateBounds.to   } : {}),
  };

  return (
    <div className="px-4 sm:px-6 py-5 pb-10 space-y-3 min-h-0">

      {/* ── Header row ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Left: title + refresh + updated */}
        <div className="flex items-center gap-2">
          <h1 className="text-[15px] font-semibold text-white tracking-tight">Events</h1>
          <button
            onClick={handleRefresh}
            className="text-[#3a3a3a] hover:text-[#9ca3af] transition-colors mt-px"
            title="Refresh"
          >
            <RefreshIcon />
          </button>
          <span className="text-[11px] text-[#3a3a3a]">{updatedLabel}</span>
        </div>

        {/* Right: search */}
        <div className="relative">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search events"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-[#111] border border-[#1e1e1e] text-[12px] text-[#d1d5db] placeholder-[#2a2a2a] rounded-lg pl-7 pr-3 py-1.5 w-48 focus:outline-none focus:border-[#3a3a3a] transition-colors"
          />
        </div>
      </div>

      {/* ── Date range pills ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 flex-wrap">
        {DATE_PILLS.map(p => (
          <button
            key={p.key}
            onClick={() => setDateKey(p.key)}
            className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
              dateKey === p.key
                ? 'bg-[#1e1e1e] text-white border border-[#2a2a2a]'
                : 'text-[#3a3a3a] hover:text-[#6b7280]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── SELECT EVENT accordion ───────────────────────────────────────── */}
      <div className="border border-[#1a1a1a] rounded-xl overflow-hidden">
        <button
          onClick={() => setSelectOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-semibold text-[#3a3a3a] uppercase tracking-widest hover:bg-[#0f0f0f] transition-colors"
        >
          <span>Select Event</span>
          <ChevronDown open={selectOpen} />
        </button>

        {selectOpen && (
          <div className="border-t border-[#1a1a1a] px-4 py-3 bg-[#090909]">
            <div className="flex items-center gap-1.5 flex-wrap">

              {/* All Events chip */}
              <button
                onClick={() => setEventType('')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                  !eventType
                    ? 'bg-[#0d2318] border-[#10b981]/40 text-[#10b981]'
                    : 'bg-[#111] border-[#1e1e1e] text-[#4b5563] hover:text-[#9ca3af] hover:border-[#2a2a2a]'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-bold"
                  style={!eventType ? { background: '#10b981', color: '#000' } : { background: '#1e1e1e', color: '#6b7280' }}
                >
                  A
                </span>
                All Events
              </button>

              {/* Per-event-type chips */}
              {EVENT_TYPES.map(et => (
                <button
                  key={et.value}
                  onClick={() => setEventType(v => v === et.value ? '' : et.value)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                    eventType === et.value
                      ? 'bg-[#1a1a1a] border-[#2a2a2a] text-white'
                      : 'bg-[#111] border-[#1a1a1a] text-[#4b5563] hover:text-[#9ca3af] hover:border-[#1e1e1e]'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: et.color }} />
                  {et.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── FILTERS accordion ────────────────────────────────────────────── */}
      <div className="border border-[#1a1a1a] rounded-xl overflow-hidden">
        <button
          onClick={() => setFiltersOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-semibold text-[#3a3a3a] uppercase tracking-widest hover:bg-[#0f0f0f] transition-colors"
        >
          <span>Filters</span>
          <ChevronDown open={filtersOpen} />
        </button>

        {filtersOpen && (
          <div className="border-t border-[#1a1a1a] px-4 py-3 bg-[#090909]">
            <p className="text-[11px] text-[#3a3a3a]">
              Global filters (channel, city, device, plan) apply via the sidebar. No additional property filters active.
            </p>
          </div>
        )}
      </div>

      {/* ── Results count ────────────────────────────────────────────────── */}
      {total !== null && (
        <p className="text-[12px] text-[#4b5563]">
          Showing 100 most recent results of{' '}
          <span className="text-[#9ca3af] font-medium">{total.toLocaleString()}</span> matches
        </p>
      )}

      {/* ── Events table ─────────────────────────────────────────────────── */}
      <EventStream
        filters={mergedFilters}
        eventType={eventType}
        search={search}
        refreshKey={refreshKey}
        onTotalChange={setTotal}
        onUserClick={setProfileUserId}
        onDataLoaded={handleDataLoaded}
      />

    </div>
  );
}
