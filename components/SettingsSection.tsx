'use client';

import { useEffect, useState } from 'react';
import { GlobalFilters } from '@/lib/queryHelpers';

interface DbStats {
  userCount: number;
  eventCount: number;
  eventTypes: { type: string; c: number }[];
  dbSizeMb: number;
  firstEvent: string;
  lastEvent: string;
}

const DATE_PRESETS = [
  { label: 'Last 7d',  from: '2026-04-04', to: '2026-04-11' },
  { label: 'Last 14d', from: '2026-03-28', to: '2026-04-11' },
  { label: 'Last 30d', from: '2026-03-12', to: '2026-04-11' },
  { label: 'Last 90d', from: '2026-01-11', to: '2026-04-11' },
  { label: 'All time', from: '',            to: ''            },
];

const EVENT_COLORS: Record<string, string> = {
  app_open: '#6b7280', page_view: '#818cf8', workout_started: '#f59e0b',
  workout_completed: '#10b981', trial_booked: '#60a5fa', trial_completed: '#34d399',
  subscription_purchased: '#4ade80', subscription_cancelled: '#ef4444',
  referral_sent: '#a78bfa', class_booked: '#34d399', meal_logged: '#fb923c',
};

export default function SettingsSection({
  filters,
  onChange,
}: {
  filters: GlobalFilters;
  onChange: (f: GlobalFilters) => void;
}) {
  const [stats, setStats] = useState<DbStats | null>(null);
  const [activePreset, setActivePreset] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats);
  }, []);

  function applyPreset(idx: number) {
    const p = DATE_PRESETS[idx];
    setActivePreset(idx);
    onChange({ ...filters, from: p.from || undefined, to: p.to || undefined });
  }

  function handleFrom(e: React.ChangeEvent<HTMLInputElement>) {
    setActivePreset(null);
    onChange({ ...filters, from: e.target.value || undefined });
  }

  function handleTo(e: React.ChangeEvent<HTMLInputElement>) {
    setActivePreset(null);
    onChange({ ...filters, to: e.target.value || undefined });
  }

  const maxEventCount = stats ? Math.max(...stats.eventTypes.map(t => t.c)) : 1;

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Date Range */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-4 rounded-full bg-[#f59e0b]" />
          <p className="text-sm font-bold text-white">Date Window</p>
        </div>
        <p className="text-[11px] text-[#4b5563] mb-4">
          Sets the global <span className="text-[#9ca3af] font-mono">from</span> / <span className="text-[#9ca3af] font-mono">to</span> filter applied across all charts and the event stream.
        </p>

        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {DATE_PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => applyPreset(i)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                activePreset === i
                  ? 'bg-[#0f2d1f] border-[#10b981]/60 text-[#10b981]'
                  : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#6b7280] hover:text-[#9ca3af] hover:border-[#3a3a3a]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Manual date inputs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div>
            <p className="text-[10px] text-[#4b5563] mb-1">From</p>
            <input
              type="date"
              value={filters.from ?? ''}
              onChange={handleFrom}
              className="text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-[#9ca3af] rounded-lg px-3 py-2 focus:outline-none focus:border-[#10b981]"
            />
          </div>
          <div>
            <p className="text-[10px] text-[#4b5563] mb-1">To</p>
            <input
              type="date"
              value={filters.to ?? ''}
              onChange={handleTo}
              className="text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-[#9ca3af] rounded-lg px-3 py-2 focus:outline-none focus:border-[#10b981]"
            />
          </div>
          {(filters.from || filters.to) && (
            <div className="flex items-end">
              <button
                onClick={() => { setActivePreset(null); onChange({ ...filters, from: undefined, to: undefined }); }}
                className="text-xs text-[#ef4444] hover:text-[#fca5a5] px-3 py-2 border border-[#450a0a] hover:border-[#ef4444]/50 rounded-lg transition-colors"
              >
                × Clear dates
              </button>
            </div>
          )}
        </div>

        {(filters.from || filters.to) && (
          <p className="text-[11px] text-[#10b981] mt-3">
            Active window: {filters.from ?? '…'} → {filters.to ?? '…'}
          </p>
        )}
      </div>

      {/* Database Stats */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-4 rounded-full bg-[#60a5fa]" />
          <p className="text-sm font-bold text-white">Database Info</p>
        </div>

        {!stats ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-8 bg-[#1a1a1a] rounded-lg animate-pulse" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Users',        value: stats.userCount.toLocaleString(),  color: 'text-[#10b981]' },
                { label: 'Events',       value: stats.eventCount.toLocaleString(), color: 'text-[#60a5fa]' },
                { label: 'DB Size',      value: `${stats.dbSizeMb} MB`,           color: 'text-[#f59e0b]' },
                { label: 'Scale Factor', value: '×25',                             color: 'text-[#a78bfa]' },
              ].map(s => (
                <div key={s.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
                  <p className="text-[10px] text-[#4b5563] mb-1">{s.label}</p>
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            <p className="text-[10px] font-bold uppercase tracking-widest text-[#3a3a3a] mb-3">Event Breakdown</p>
            <div className="space-y-2">
              {stats.eventTypes.map(et => (
                <div key={et.type} className="flex items-center gap-3">
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0 min-w-[110px] text-center"
                    style={{ color: EVENT_COLORS[et.type] ?? '#6b7280', background: `${EVENT_COLORS[et.type] ?? '#6b7280'}22` }}
                  >
                    {et.type.replace(/_/g, ' ')}
                  </span>
                  <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.round((et.c / maxEventCount) * 100)}%`, background: EVENT_COLORS[et.type] ?? '#6b7280' }}
                    />
                  </div>
                  <span className="text-[11px] text-[#6b7280] tabular-nums w-14 text-right">{et.c.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-[#1e1e1e]">
              <p className="text-[10px] text-[#3a3a3a]">
                Data window: {stats.firstEvent?.slice(0, 10)} → {stats.lastEvent?.slice(0, 10)}
                &nbsp;·&nbsp;Anchor date: 2026-04-11
              </p>
            </div>
          </>
        )}
      </div>

      {/* Scale info */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 rounded-full bg-[#a78bfa]" />
          <p className="text-sm font-bold text-white">Scale Model</p>
        </div>
        <p className="text-[11px] text-[#4b5563] leading-relaxed">
          The database stores <span className="text-white font-semibold">2,000 representative users</span> and ~70K events.
          All metric cards, charts, and event stream counts are multiplied by&nbsp;
          <span className="text-[#a78bfa] font-mono font-bold">×25</span> to represent
          a <span className="text-white font-semibold">50,000-user</span> real-world cohort from 500K monthly app visitors.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { raw: '2,000 users', scaled: '50,000 sign-ups', color: '#10b981' },
            { raw: '589 trials',  scaled: '~14,700 trials',  color: '#60a5fa' },
            { raw: '1,398 paid',  scaled: '~2,800 paid',     color: '#f59e0b' },
          ].map(r => (
            <div key={r.raw} className="bg-[#1a1a1a] rounded-lg p-3">
              <p className="text-[10px] text-[#4b5563] mb-0.5">Raw DB</p>
              <p className="text-xs font-mono text-[#6b7280]">{r.raw}</p>
              <p className="text-[10px] text-[#3a3a3a] my-0.5">→ shown as</p>
              <p className="text-xs font-bold" style={{ color: r.color }}>{r.scaled}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
