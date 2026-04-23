'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList, Legend,
} from 'recharts';
import { GlobalFilters } from '@/lib/queryHelpers';
import { CHANNEL_COLORS } from '@/lib/channelColors';

interface FunnelRow { stage: string; count: number; pct: number; dropPct: number; }
interface NsmBridge {
  nsmCompleters: number;
  nsmPaid:       number;
  nsmFree:       number;
  paidAmongNsm:  number;
  upsellMrrOpportunity: number;
}

interface AcquisitionData {
  overall:     FunnelRow[];
  digital:     FunnelRow[];
  physical:    FunnelRow[];
  subChannels: Record<string, FunnelRow[]>;
  nsmBridge:   NsmBridge;
  insight:     string;
}
const CH_LABEL: Record<string, string> = {
  'Paid Digital': 'Paid Digital', 'Organic': 'Organic',
  'Referrals': 'Referrals', 'Brand/ATL': 'Brand/ATL', 'Corporate': 'Corporate',
};
const CH_COLOR = CHANNEL_COLORS;

function fmt(n: number) {
  if (n >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)     return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function dropColor(drop: number) {
  if (drop === 0) return '#10b981';
  if (drop < 30)  return '#22c55e';
  if (drop < 55)  return '#f59e0b';
  return '#ef4444';
}

function FunnelTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1e1e1e] border border-[#3a3a3a] rounded-lg px-3 py-2 text-xs shadow-lg min-w-[160px]">
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

function fmtMrr(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

function NsmBridgePanel({ b, signups, paid }: { b: NsmBridge; signups: number; paid: number }) {
  const signupToNsm = signups > 0 ? ((b.nsmCompleters / signups) * 100).toFixed(1) : '0';
  const paidToNsm   = paid   > 0 ? ((b.nsmPaid / paid)          * 100).toFixed(1) : '0';

  return (
    <div className="rounded-xl border border-[#10b981]/25 bg-gradient-to-br from-[#0a1f14] to-[#0d0f0d] p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981]" />
        <p className="text-[11px] font-bold text-[#10b981] uppercase tracking-widest">Funnel → NSM Connection</p>
        <div className="flex-1 h-px bg-[#10b981]/15" />
      </div>

      {/* Flow diagram */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Sign-ups */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-center min-w-[80px]">
          <p className="text-[9px] text-[#6b7280] uppercase tracking-wide mb-0.5">Sign-ups</p>
          <p className="text-base font-bold text-white">{fmt(signups)}</p>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[9px] text-[#4b5563]">{signupToNsm}% build habit</span>
          <span className="text-[#4b5563] text-sm">→</span>
        </div>

        {/* NSM completers */}
        <div className="bg-[#0a1f14] border border-[#10b981]/40 rounded-lg px-3 py-2 text-center min-w-[90px]">
          <p className="text-[9px] text-[#10b981] uppercase tracking-wide mb-0.5">NSM Completers</p>
          <p className="text-base font-bold text-[#10b981]">{fmt(b.nsmCompleters)}</p>
          <p className="text-[9px] text-[#4b5563]">≥3 workouts/week</p>
        </div>

        <span className="text-[#4b5563] text-sm">→</span>

        {/* Paid among NSM */}
        <div className="bg-[#1a1a1a] border border-[#818cf8]/40 rounded-lg px-3 py-2 text-center min-w-[80px]">
          <p className="text-[9px] text-[#818cf8] uppercase tracking-wide mb-0.5">Paid</p>
          <p className="text-base font-bold text-[#818cf8]">{fmt(b.nsmPaid)}</p>
          <p className="text-[9px] text-[#4b5563]">{b.paidAmongNsm}% of NSM</p>
        </div>

        <span className="text-[#3a3a3a] text-sm">+</span>

        {/* Free NSM — upsell targets */}
        <div className="bg-[#1f1208] border border-[#f59e0b]/40 rounded-lg px-3 py-2 text-center min-w-[80px]">
          <p className="text-[9px] text-[#f59e0b] uppercase tracking-wide mb-0.5">Free NSM</p>
          <p className="text-base font-bold text-[#f59e0b]">{fmt(b.nsmFree)}</p>
          <p className="text-[9px] text-[#4b5563]">not yet paying</p>
        </div>
      </div>

      {/* Insight row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2.5">
          <p className="text-[9px] text-[#6b7280] uppercase tracking-wide mb-1">Paid users hitting NSM</p>
          <p className="text-lg font-bold text-[#818cf8]">{paidToNsm}%</p>
          <p className="text-[9px] text-[#4b5563]">strong habit-payment link</p>
        </div>
        <div className="bg-[#111] border border-[#f59e0b]/30 rounded-lg px-3 py-2.5">
          <p className="text-[9px] text-[#6b7280] uppercase tracking-wide mb-1">Free NSM — upsell target</p>
          <p className="text-lg font-bold text-[#f59e0b]">{fmt(b.nsmFree)}</p>
          <p className="text-[9px] text-[#4b5563]">built habit, not yet paid</p>
        </div>
        <div className="bg-[#111] border border-[#10b981]/30 rounded-lg px-3 py-2.5">
          <p className="text-[9px] text-[#6b7280] uppercase tracking-wide mb-1">MRR uplift (30% conv.)</p>
          <p className="text-lg font-bold text-[#10b981]">{fmtMrr(b.upsellMrrOpportunity)}/mo</p>
          <p className="text-[9px] text-[#4b5563]">30% conv. × ₹600 avg/month</p>
        </div>
      </div>
    </div>
  );
}

type View = 'overall' | 'digital' | 'physical' | 'channels';

export default function AcquisitionFunnelCard({ filters }: { filters: GlobalFilters }) {
  const [data, setData] = useState<AcquisitionData | null>(null);
  const [view, setView] = useState<View>('overall');
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
        <div className="h-[360px] bg-[#1a1a1a] rounded-lg animate-pulse" />
      </div>
    );
  }

  const rows = view === 'digital' ? data.digital : view === 'physical' ? data.physical : data.overall;

  // KPI summary
  const install     = rows[0]?.count ?? 1;
  const trial       = rows[2]?.count ?? 0;
  const paid        = rows[4]?.count ?? 0;
  const topToPaid   = install > 0 ? ((paid / install) * 100).toFixed(1) : '0';
  const trialToPaid = trial  > 0 ? ((paid / trial)   * 100).toFixed(1) : '0';
  const biggestLeak = [...rows].filter(r => r.dropPct > 0).sort((a, b) => b.dropPct - a.dropPct)[0];

  const subChKeys = ['Paid Digital', 'Organic', 'Referrals', 'Brand/ATL', 'Corporate'];

  // Build chart data
  const chartData = view === 'channels'
    ? data.overall.map((s, i) => {
        const row: Record<string, unknown> = { stage: s.stage };
        for (const ch of subChKeys) row[ch] = data.subChannels[ch]?.[i]?.count ?? 0;
        return row;
      })
    : rows.map(s => ({ stage: s.stage, users: s.count, dropPct: s.dropPct }));

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
          <p className="text-2xl font-bold text-[#34d399]">{topToPaid}%</p>
          <p className="text-[9px] text-[#4b5563] mt-0.5">overall conversion</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-3 text-center">
          <p className="text-[9px] text-[#6b7280] uppercase tracking-wider mb-1">Trial Booked → Paid</p>
          <p className="text-2xl font-bold text-[#818cf8]">{trialToPaid}%</p>
          <p className="text-[9px] text-[#4b5563] mt-0.5">trial_booked → subscription_purchased</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-3 text-center">
          <p className="text-[9px] text-[#6b7280] uppercase tracking-wider mb-1">Biggest Leak</p>
          <p className="text-2xl font-bold text-[#ef4444]">↓ {biggestLeak?.dropPct ?? 0}%</p>
          <p className="text-[9px] text-[#4b5563] mt-0.5 truncate">{biggestLeak?.stage ?? '—'}</p>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'overall',  label: 'All Channels' },
          { key: 'digital',  label: 'Digital' },
          { key: 'physical', label: 'Physical' },
          { key: 'channels', label: 'By Channel' },
        ] as { key: View; label: string }[]).map(v => (
          <button key={v.key} onClick={() => setView(v.key)}
            className={`text-[11px] font-semibold px-3 py-1 rounded-md border transition-colors ${
              view === v.key
                ? 'bg-[#1d4ed8]/20 border-[#60a5fa]/50 text-[#60a5fa]'
                : 'border-[#2a2a2a] text-[#6b7280] hover:text-[#9ca3af] hover:border-[#3a3a3a]'
            }`}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Bar chart */}
      <div className={view === 'channels' ? 'overflow-x-auto' : ''}>
        <div style={view === 'channels' ? { minWidth: 680 } : {}}>
          <ResponsiveContainer width="100%" height={290}>
            <BarChart
              data={chartData}
              barGap={4}
              barCategoryGap={view === 'channels' ? '20%' : '28%'}
              margin={{ top: 28, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
              <XAxis dataKey="stage" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmt} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
              <Tooltip content={<FunnelTooltip />} cursor={{ fill: '#ffffff05' }} />

              {/* Overall / Digital / Physical */}
              {view !== 'channels' && (
                <Bar dataKey="users" name="Users" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {(chartData as { dropPct: number }[]).map((d, i) => (
                    <Cell key={i} fill={dropColor(d.dropPct)} />
                  ))}
                  <LabelList dataKey="dropPct" position="top"
                    style={{ fill: '#9ca3af', fontSize: 10, fontWeight: 600 }}
                    formatter={(v: unknown) => typeof v === 'number' && v > 0 ? `↓${v}%` : ''} />
                </Bar>
              )}

              {/* All 5 channels */}
              {view === 'channels' && (
                <>
                  <Legend wrapperStyle={{ fontSize: 10, color: '#9ca3af' }}
                    formatter={(v: string) => CH_LABEL[v] ?? v} />
                  {subChKeys.map(ch => (
                    <Bar key={ch} dataKey={ch} name={ch} fill={CH_COLOR[ch]} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                      <LabelList dataKey={ch} position="top"
                        style={{ fill: CH_COLOR[ch], fontSize: 8 }}
                        formatter={(v: unknown) => fmt(Number(v))} />
                    </Bar>
                  ))}
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* NSM Bridge */}
      {data.nsmBridge && <NsmBridgePanel b={data.nsmBridge} signups={data.overall[0]?.count ?? 0} paid={data.overall[4]?.count ?? 0} />}

      {/* Stage definitions */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3">
        <p className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider mb-2">Stage Definitions</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5">
          {[
            { stage: 'Install',          def: 'app_install event fired' },
            { stage: 'Sign-up',          def: 'sign_up event fired' },
            { stage: 'Trial Booked',     def: 'trial_booked event fired' },
            { stage: 'Class Booked',     def: 'class_booked event fired' },
            { stage: 'Paid Subscription',def: 'subscription_purchased event' },
          ].map(d => (
            <div key={d.stage} className="flex items-start gap-1.5">
              <span className="text-[10px] font-semibold text-white mt-px shrink-0">{d.stage}:</span>
              <span className="text-[10px] text-[#6b7280]">{d.def}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
