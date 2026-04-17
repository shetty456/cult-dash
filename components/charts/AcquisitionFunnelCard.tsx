'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList, Legend, ReferenceLine,
} from 'recharts';
import { GlobalFilters } from '@/lib/queryHelpers';

interface FunnelRow { stage: string; count: number; pct: number; dropPct: number; }
interface CostEntry { cost: number; cac: number; convRate: number; }
interface AcquisitionData {
  overall:  FunnelRow[];
  digital:  FunnelRow[];
  physical: FunnelRow[];
  subChannels: Record<string, FunnelRow[]>;
  cac: { digital: number; physical: number };
  cacByChannel: Record<string, number>;
  costPerPaidSub: {
    overall: CostEntry; digital: CostEntry; physical: CostEntry;
    byChannel: Record<string, CostEntry>;
    industryAvg: number;
  };
  industryBenchmarks: { digital: { cac: number }; physical: { cac: number } };
  timeToFirstVisit: { digital: number; physical: number };
  timeByChannel: Record<string, number>;
  insight: string;
}

// Channel display config
const CH_LABEL: Record<string, string>  = {
  'Paid Digital': 'Paid Dig.', 'Organic': 'Organic',
  'Referrals': 'Referral',   'Brand/ATL': 'Brand',  'Corporate': 'Corp.',
};
const CH_COLOR: Record<string, string>  = {
  'Paid Digital': '#818cf8', 'Organic': '#34d399',
  'Referrals': '#f59e0b',   'Brand/ATL': '#f472b6', 'Corporate': '#38bdf8',
};
const CH_GROUP: Record<string, string>  = {
  'Paid Digital': 'Digital', 'Organic': 'Digital',
  'Referrals': 'Physical',  'Brand/ATL': 'Physical', 'Corporate': 'Physical',
};

const STAGE_SHORT: Record<string, string> = {
  'App Install':          'Install',
  'Onboarding Started':   'OB Start',
  'Onboarding Completed': 'OB Done',
  'Sign-up':              'Sign-up',
  'Trial Booked':         'Trial',
  'First Visit':          'Visit',
  'Paid Subscriber':      'Paid',
};

function fmt(n: number) {
  if (n >= 500000) return `${(n / 100000).toFixed(0)}L`;
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

function dropColor(drop: number) {
  if (drop === 0)  return '#10b981';
  if (drop < 40)   return '#22c55e';
  if (drop < 65)   return '#f59e0b';
  return '#ef4444';
}

function FunnelTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1e1e1e] border border-[#3a3a3a] rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-[#9ca3af] font-semibold mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.fill }} />
          <span className="text-[#d1d5db]">{p.name}:</span>
          <span className="text-white font-bold">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}


export default function AcquisitionFunnelCard({ filters }: { filters: GlobalFilters }) {
  const [data, setData]               = useState<AcquisitionData | null>(null);
  const [byChannel, setByChannel]     = useState(false);
  const [detailed, setDetailed]       = useState(false);
  const [showCac, setShowCac]         = useState(false);
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
        <div className="h-[260px] bg-[#1a1a1a] rounded-lg animate-pulse" />
      </div>
    );
  }

  // All 5 sub-channel keys in order
  const subChKeys = ['Paid Digital', 'Organic', 'Referrals', 'Brand/ATL', 'Corporate'];

  // Build chart data rows (one per funnel stage)
  const chartData = data.overall.map((s, i) => {
    const row: Record<string, unknown> = {
      stage:     STAGE_SHORT[s.stage] ?? s.stage,
      fullStage: s.stage,
      overall:   s.count,
      digital:   data.digital[i]?.count  ?? 0,
      physical:  data.physical[i]?.count ?? 0,
      dropPct:   s.dropPct,
    };
    for (const ch of subChKeys) {
      row[ch] = data.subChannels[ch]?.[i]?.count ?? 0;
    }
    return row;
  });

  // Mode: which bars to render
  const showDetailed = byChannel && detailed;
  const showBinary   = byChannel && !detailed;

  return (
    <div className="space-y-4">

      {/* Auto-insight */}
      <div className="bg-[#0f1f2e] border border-[#1d4ed8]/30 rounded-lg px-4 py-3">
        <p className="text-[10px] font-bold text-[#60a5fa] uppercase tracking-wider mb-1">Insight</p>
        <p className="text-sm text-[#bfdbfe]">{data.insight}</p>
      </div>

      {/* ── Controls ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-5 flex-wrap">
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input type="checkbox" checked={byChannel} onChange={e => { setByChannel(e.target.checked); if (!e.target.checked) setDetailed(false); }}
            className="w-3.5 h-3.5 accent-indigo-500" />
          <span className="text-xs text-[#9ca3af]">By Channel</span>
        </label>

        {byChannel && (
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" checked={detailed} onChange={e => setDetailed(e.target.checked)}
              className="w-3.5 h-3.5 accent-emerald-500" />
            <span className="text-xs text-[#9ca3af]">Detailed Breakdown</span>
          </label>
        )}

        <label className="flex items-center gap-1.5 cursor-pointer select-none ml-auto">
          <input type="checkbox" checked={showCac} onChange={e => setShowCac(e.target.checked)}
            className="w-3.5 h-3.5 accent-orange-400" />
          <span className="text-xs text-[#9ca3af]">Show CAC vs Industry Avg</span>
        </label>
      </div>

      {/* ── Funnel Bar Chart ─────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold text-[#4b5563] uppercase tracking-widest mb-2">
          {showDetailed ? 'All 5 Channels — per stage'
            : showBinary ? 'Digital vs Physical — per stage'
            : 'Full Acquisition Pipeline'}
        </p>

        {/* Scrollable wrapper for detailed 5-channel view */}
        <div className={showDetailed ? 'overflow-x-auto' : ''}>
        <div style={showDetailed ? { minWidth: 960 } : {}}>
        <ResponsiveContainer width="100%" height={showBinary || showDetailed ? 270 : 240}>
          <BarChart data={chartData} barGap={2} barCategoryGap={showDetailed ? '18%' : '25%'}
            margin={{ top: 28, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
            <XAxis dataKey="stage" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmt} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={42} />
            <Tooltip content={<FunnelTooltip />} cursor={{ fill: '#ffffff06' }} />

            {/* ── Overall (no channel breakdown) ── */}
            {!byChannel && (
              <Bar dataKey="overall" name="Users" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={dropColor(d.dropPct as number)} />
                ))}
                <LabelList dataKey="dropPct" position="top" style={{ fill: '#9ca3af', fontSize: 10, fontWeight: 600 }}
                  formatter={(v: unknown) => typeof v === 'number' && v > 0 ? `↓${v}%` : ''} />
              </Bar>
            )}

            {/* ── Digital vs Physical ── */}
            {showBinary && (
              <>
                <Legend wrapperStyle={{ fontSize: 10, color: '#9ca3af' }}
                  formatter={v => v === 'digital' ? 'Digital (App/Web)' : 'Physical (Walk-in/Referral)'} />
                <Bar dataKey="digital" name="digital" fill="#818cf8" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="digital" position="top" style={{ fill: '#818cf8', fontSize: 9 }}
                    formatter={(v: unknown) => fmt(Number(v))} />
                </Bar>
                <Bar dataKey="physical" name="physical" fill="#fb923c" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="physical" position="top" style={{ fill: '#fb923c', fontSize: 9 }}
                    formatter={(v: unknown) => fmt(Number(v))} />
                </Bar>
              </>
            )}

            {/* ── All 5 sub-channels ── */}
            {showDetailed && (
              <>
                <Legend wrapperStyle={{ fontSize: 10, color: '#9ca3af' }}
                  formatter={v => `${CH_LABEL[v] ?? v} (${CH_GROUP[v] ?? ''})`} />
                {subChKeys.map(ch => (
                  <Bar key={ch} dataKey={ch} name={ch} fill={CH_COLOR[ch]} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    <LabelList dataKey={ch} position="top" style={{ fill: CH_COLOR[ch], fontSize: 8 }}
                      formatter={(v: unknown) => fmt(Number(v))} />
                  </Bar>
                ))}
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
        </div>{/* minWidth wrapper */}
        </div>{/* overflow-x-auto wrapper */}
      </div>

      {/* ── Cost per Paid Subscriber leaderboard ─────────────────── */}
      {showCac && (() => {
        const cpp = data.costPerPaidSub;
        const industryAvg = cpp.industryAvg;

        // Build rows depending on mode
        const rawRows: { label: string; fill: string; cost: number; cac: number; convRate: number; ttfv: number }[] =
          showDetailed
            ? subChKeys.map(ch => ({
                label: CH_LABEL[ch] ?? ch,
                fill:  CH_COLOR[ch] ?? '#6b7280',
                ...cpp.byChannel[ch],
                ttfv: data.timeByChannel[ch] ?? 0,
              }))
            : [
                { label: 'Digital',  fill: '#818cf8', ...cpp.digital,  ttfv: data.timeToFirstVisit.digital  },
                { label: 'Physical', fill: '#fb923c', ...cpp.physical, ttfv: data.timeToFirstVisit.physical },
              ];

        // Sort cheapest → most expensive
        const rows = [...rawRows].sort((a, b) => a.cost - b.cost);
        const blended = cpp.overall.cost;
        const maxCost = Math.max(...rows.map(r => r.cost), industryAvg) * 1.15;

        return (
          <div>
            <div className="flex items-baseline gap-2 mb-3">
              <p className="text-[10px] font-bold text-[#4b5563] uppercase tracking-widest">
                Cost per Paid Subscriber
              </p>
              <p className="text-[10px] text-[#6b7280]">= CAC ÷ Trial→Paid rate — sorted cheapest first</p>
            </div>

            {/* Horizontal leaderboard */}
            <div className="space-y-2">
              {rows.map(r => {
                const barPct = Math.round((r.cost / maxCost) * 100);
                const isGood = r.cost <= blended;
                const barColor = r.cost <= blended ? '#10b981' : r.cost <= industryAvg ? '#f59e0b' : '#ef4444';
                return (
                  <div key={r.label} className="group">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] w-16 shrink-0 font-semibold" style={{ color: r.fill }}>
                        {r.label}
                      </span>
                      <div className="flex-1 bg-[#1e1e1e] rounded-full h-5 overflow-hidden">
                        <div
                          className="h-full rounded-full flex items-center justify-end pr-2 transition-all"
                          style={{ width: `${barPct}%`, background: barColor }}
                        >
                          <span className="text-[10px] font-bold text-white whitespace-nowrap">
                            ₹{r.cost.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {isGood
                        ? <span className="text-[10px] text-emerald-400 w-16 shrink-0">✓ efficient</span>
                        : <span className="text-[10px] text-yellow-400 w-16 shrink-0">↑ above avg</span>
                      }
                    </div>
                    {/* Tooltip-style detail on hover */}
                    <div className="hidden group-hover:flex gap-4 ml-[76px] mt-0.5 text-[10px] text-[#6b7280]">
                      <span>CAC ₹{r.cac.toLocaleString()}</span>
                      <span>Conv Rate {r.convRate}%</span>
                      <span>1st Visit {r.ttfv}d</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reference lines legend */}
            <div className="flex gap-5 mt-4 ml-[76px] text-[10px]">
              <span className="flex items-center gap-1.5 text-[#9ca3af]">
                <span className="inline-block w-6 border-t-2 border-emerald-500 border-dashed" />
                Your avg ₹{blended.toLocaleString()}
              </span>
              <span className="flex items-center gap-1.5 text-[#9ca3af]">
                <span className="inline-block w-6 border-t-2 border-yellow-500 border-dashed" />
                Industry avg ₹{industryAvg.toLocaleString()}
              </span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
