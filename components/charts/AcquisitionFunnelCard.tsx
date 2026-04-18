'use client';

import { useEffect, useState } from 'react';
import { GlobalFilters } from '@/lib/queryHelpers';

interface FunnelRow { stage: string; count: number; pct: number; dropPct: number; }
interface AcquisitionData {
  overall:     FunnelRow[];
  digital:     FunnelRow[];
  physical:    FunnelRow[];
  subChannels: Record<string, FunnelRow[]>;
  insight:     string;
}

const CH_COLOR: Record<string, string> = {
  'Paid Digital': '#818cf8', 'Organic': '#34d399',
  'Referrals':    '#f59e0b', 'Brand/ATL': '#f472b6', 'Corporate': '#38bdf8',
};

const STAGE_DEF: Record<string, string> = {
  'Install':                 'app_install event',
  'Sign-up':                 'sign_up event',
  'Trial Activated':         'trial_booked event',
  'Class Booked':            'class_booked event',
  'First Workout Completed': '≥1 workout_completed',
  'Second Workout':          '≥2 workout_completed',
  'Paid Subscription':       'subscription_purchased',
};

// Stage accent colours — progresses green → teal → blue → purple
const STAGE_COLOR = [
  '#34d399', '#10b981', '#2dd4bf', '#60a5fa', '#818cf8', '#a78bfa', '#c084fc',
];

function fmt(n: number) {
  if (n >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)     return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function convColor(drop: number) {
  if (drop < 20)  return '#10b981';
  if (drop < 45)  return '#f59e0b';
  return '#ef4444';
}

type View = 'overall' | 'digital' | 'physical';

function FunnelViz({ rows }: { rows: FunnelRow[] }) {
  const top = rows[0]?.count || 1;

  return (
    <div className="space-y-1.5">
      {rows.map((row, i) => {
        const widthPct = Math.max(8, (row.count / top) * 100);
        const conv = i > 0
          ? Math.round(((rows[i - 1].count - row.count) / Math.max(1, rows[i - 1].count)) * 100)
          : 0;
        const color = STAGE_COLOR[i] ?? '#818cf8';

        return (
          <div key={row.stage}>
            {/* Connector arrow between stages */}
            {i > 0 && (
              <div className="flex items-center justify-center gap-2 py-0.5 mb-1">
                <div className="flex-1 h-px bg-[#2a2a2a]" />
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border tabular-nums"
                  style={{
                    color: convColor(conv),
                    borderColor: `${convColor(conv)}40`,
                    background: `${convColor(conv)}10`,
                  }}
                >
                  ↓ {conv}% drop
                </span>
                <div className="flex-1 h-px bg-[#2a2a2a]" />
              </div>
            )}

            {/* Stage row */}
            <div className="flex items-center gap-3">
              {/* Stage label */}
              <div className="w-[130px] shrink-0 text-right">
                <p className="text-[11px] font-semibold text-[#d1d5db] leading-tight">{row.stage}</p>
                <p className="text-[9px] text-[#4b5563] mt-0.5">{STAGE_DEF[row.stage] ?? ''}</p>
              </div>

              {/* Funnel bar — centred, tapers naturally */}
              <div className="flex-1 flex justify-center">
                <div
                  className="h-9 rounded-md flex items-center justify-center transition-all duration-500"
                  style={{
                    width: `${widthPct}%`,
                    background: `linear-gradient(90deg, ${color}22, ${color}55)`,
                    border: `1px solid ${color}60`,
                    boxShadow: `0 0 8px ${color}20`,
                  }}
                >
                  <span
                    className="text-[11px] font-bold tabular-nums"
                    style={{ color }}
                  >
                    {fmt(row.count)}
                  </span>
                </div>
              </div>

              {/* % of top and stage index */}
              <div className="w-[56px] shrink-0 text-left">
                <p className="text-[11px] font-semibold tabular-nums" style={{ color }}>
                  {row.pct}%
                </p>
                <p className="text-[9px] text-[#4b5563]">of install</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AcquisitionFunnelCard({ filters }: { filters: GlobalFilters }) {
  const [data, setData]   = useState<AcquisitionData | null>(null);
  const [view, setView]   = useState<View>('overall');
  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    const qs = new URLSearchParams(filters as Record<string, string>);
    fetch(`/api/funnel/acquisition?${qs}`)
      .then(r => r.json())
      .then(setData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  if (!data) {
    return (
      <div className="space-y-3">
        <div className="h-10 bg-[#1a1a1a] rounded-lg animate-pulse" />
        <div className="h-[440px] bg-[#1a1a1a] rounded-lg animate-pulse" />
      </div>
    );
  }

  const rows = view === 'digital' ? data.digital : view === 'physical' ? data.physical : data.overall;

  // Key conversion KPIs
  const install  = rows[0]?.count ?? 1;
  const trial    = rows[2]?.count ?? 0;
  const paid     = rows[6]?.count ?? 0;
  const topToPaid   = install > 0 ? ((paid / install) * 100).toFixed(1) : '0';
  const trialToPaid = trial  > 0 ? ((paid / trial)   * 100).toFixed(1) : '0';
  const biggestLeak = [...rows].filter(r => r.dropPct > 0).sort((a, b) => b.dropPct - a.dropPct)[0];

  return (
    <div className="space-y-5">

      {/* Insight */}
      <div className="bg-[#0f1f2e] border border-[#1d4ed8]/30 rounded-lg px-4 py-3">
        <p className="text-[10px] font-bold text-[#60a5fa] uppercase tracking-wider mb-1">Auto Insight</p>
        <p className="text-sm text-[#bfdbfe]">{data.insight}</p>
      </div>

      {/* KPI pills */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-3 text-center">
          <p className="text-[9px] text-[#6b7280] uppercase tracking-wider mb-1">Install → Paid</p>
          <p className="text-xl font-bold text-[#34d399]">{topToPaid}%</p>
          <p className="text-[9px] text-[#4b5563] mt-0.5">overall conversion</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-3 text-center">
          <p className="text-[9px] text-[#6b7280] uppercase tracking-wider mb-1">Trial → Paid</p>
          <p className="text-xl font-bold text-[#818cf8]">{trialToPaid}%</p>
          <p className="text-[9px] text-[#4b5563] mt-0.5">post-trial conversion</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-3 text-center">
          <p className="text-[9px] text-[#6b7280] uppercase tracking-wider mb-1">Biggest Leak</p>
          <p className="text-xl font-bold text-[#ef4444]">↓ {biggestLeak?.dropPct ?? 0}%</p>
          <p className="text-[9px] text-[#4b5563] mt-0.5 truncate">{biggestLeak?.stage ?? '—'}</p>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        {(['overall', 'digital', 'physical'] as View[]).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`text-[11px] font-semibold px-3 py-1 rounded-md border transition-colors capitalize ${
              view === v
                ? 'bg-[#1d4ed8]/20 border-[#60a5fa]/50 text-[#60a5fa]'
                : 'border-[#2a2a2a] text-[#6b7280] hover:text-[#9ca3af] hover:border-[#3a3a3a]'
            }`}>
            {v === 'overall' ? 'All Channels' : v === 'digital' ? 'Digital' : 'Physical'}
          </button>
        ))}
      </div>

      {/* Funnel visualisation */}
      <FunnelViz rows={rows} />

      {/* Channel breakdown table (collapsed by default) */}
      <ChannelTable data={data} />

    </div>
  );
}

function ChannelTable({ data }: { data: AcquisitionData }) {
  const [open, setOpen] = useState(false);
  const channels = ['Paid Digital', 'Organic', 'Referrals', 'Brand/ATL', 'Corporate'];

  return (
    <div className="border border-[#2a2a2a] rounded-lg overflow-hidden">
      <button onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#1e1e1e] transition-colors text-left">
        <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Channel Breakdown — Install → Paid</span>
        <span className="text-[#4b5563] text-[10px]">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] min-w-[520px]">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left px-4 py-2 text-[#4b5563] font-semibold uppercase tracking-wider">Channel</th>
                <th className="text-right px-3 py-2 text-[#4b5563] font-semibold">Install</th>
                <th className="text-right px-3 py-2 text-[#4b5563] font-semibold">Trial</th>
                <th className="text-right px-3 py-2 text-[#4b5563] font-semibold">Paid</th>
                <th className="text-right px-3 py-2 text-[#4b5563] font-semibold">Conv %</th>
              </tr>
            </thead>
            <tbody>
              {channels.map(ch => {
                const rows = data.subChannels[ch];
                if (!rows) return null;
                const install = rows[0]?.count ?? 0;
                const trial   = rows[2]?.count ?? 0;
                const paid    = rows[6]?.count ?? 0;
                const conv    = install > 0 ? ((paid / install) * 100).toFixed(1) : '0';
                const color   = CH_COLOR[ch] ?? '#6b7280';
                return (
                  <tr key={ch} className="border-b border-[#1e1e1e] hover:bg-[#1a1a1a]">
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                        <span className="text-[#d1d5db] font-medium">{ch}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-[#9ca3af] tabular-nums">{fmt(install)}</td>
                    <td className="px-3 py-2.5 text-right text-[#9ca3af] tabular-nums">{fmt(trial)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums" style={{ color }}>{fmt(paid)}</td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums" style={{ color }}>{conv}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
