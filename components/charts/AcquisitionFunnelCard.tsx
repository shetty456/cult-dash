'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList, Legend, ReferenceLine,
} from 'recharts';
import { GlobalFilters } from '@/lib/queryHelpers';

interface FunnelRow { stage: string; count: number; pct: number; dropPct: number; }
interface AcquisitionData {
  overall:  FunnelRow[];
  digital:  FunnelRow[];
  physical: FunnelRow[];
  subChannels: Record<string, FunnelRow[]>;
  cac: { digital: number; physical: number };
  cacByChannel: Record<string, number>;
  industryBenchmarks: {
    digital:  { cac: number };
    physical: { cac: number };
  };
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

function CacTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1e1e1e] border border-[#3a3a3a] rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-[#9ca3af] font-semibold mb-1">{label}</p>
      <p className="text-white font-bold">₹{(payload[0]?.value ?? 0).toLocaleString()}</p>
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

  // CAC chart data
  const cacChartData = showDetailed
    ? subChKeys.map(ch => ({
        channel:   CH_LABEL[ch] ?? ch,
        fullCh:    ch,
        cac:       data.cacByChannel[ch] ?? 0,
        benchmark: CH_GROUP[ch] === 'Digital'
          ? data.industryBenchmarks.digital.cac
          : data.industryBenchmarks.physical.cac,
        fill: CH_COLOR[ch] ?? '#6b7280',
        ttfv: data.timeByChannel[ch] ?? 0,
      }))
    : [
        { channel: 'Digital',  fullCh: 'Digital',  cac: data.cac.digital,  benchmark: data.industryBenchmarks.digital.cac,  fill: '#818cf8', ttfv: data.timeToFirstVisit.digital },
        { channel: 'Physical', fullCh: 'Physical', cac: data.cac.physical, benchmark: data.industryBenchmarks.physical.cac, fill: '#fb923c', ttfv: data.timeToFirstVisit.physical },
      ];

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

      {/* ── CAC chart ────────────────────────────────────────────────── */}
      {showCac && (
        <div>
          <p className="text-[10px] font-bold text-[#4b5563] uppercase tracking-widest mb-2">
            {showDetailed ? 'CAC per Channel — vs Industry Average' : 'CAC by Channel — vs Industry Average'}
          </p>

          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={cacChartData} barCategoryGap="40%"
              margin={{ top: 18, right: 72, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
              <XAxis dataKey="channel" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`}
                tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<CacTooltip />} cursor={{ fill: '#ffffff06' }} />

              <ReferenceLine y={data.industryBenchmarks.digital.cac} stroke="#818cf8" strokeDasharray="4 3"
                label={{ value: `Dig.avg ₹${data.industryBenchmarks.digital.cac}`, position: 'right', fontSize: 9, fill: '#818cf8' }} />
              <ReferenceLine y={data.industryBenchmarks.physical.cac} stroke="#fb923c" strokeDasharray="4 3"
                label={{ value: `Phys.avg ₹${data.industryBenchmarks.physical.cac}`, position: 'right', fontSize: 9, fill: '#fb923c' }} />

              <Bar dataKey="cac" name="CAC" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {cacChartData.map((d, i) => (
                  <Cell key={i} fill={d.cac <= d.benchmark ? '#10b981' : '#f59e0b'} />
                ))}
                <LabelList dataKey="cac" position="inside"
                  style={{ fill: 'white', fontSize: 11, fontWeight: 700 }}
                  formatter={(v: unknown) => `₹${Number(v).toLocaleString()}`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Time-to-first-visit row */}
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 px-1">
            {cacChartData.map(d => (
              <span key={d.channel} className="text-[11px] text-[#6b7280]">
                <span className="font-semibold" style={{ color: d.fill }}>{d.channel}</span>
                {' '}— 1st visit in <span className="text-white font-semibold">{d.ttfv}d</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
