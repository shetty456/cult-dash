'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { GlobalFilters } from '@/lib/queryHelpers';

interface ChannelRow {
  channel: string; color: string;
  totalUsers: number; spend: number;
  activated: number; engaged: number; habit: number;
  costPerActivated: number | null;
  costPerEngaged:   number | null;
  costPerHabit:     number | null;
}
interface TrendRow { month: string; blended: number; paid: number; organic: number; }

function fmtRupee(v: number) {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000)   return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v}`;
}

// Tooltip for the grouped bar chart
function QualityTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; fill: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1e1e1e] border border-[#3a3a3a] rounded-xl px-4 py-3 shadow-xl text-xs min-w-[200px]">
      <p className="text-[#6b7280] font-semibold mb-3">{label}</p>
      <div className="space-y-2">
        {payload.map(p => (
          <div key={p.name} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
              <span className="text-[#9ca3af]">{p.name}</span>
            </div>
            <span className="text-white font-bold">{p.value ? fmtRupee(p.value) : '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Definitions shown in the modal
const DEFINITIONS = [
  {
    tier: 'Activated',
    color: '#60a5fa',
    def: '≥1 workout_completed in the selected date window.',
    assumption: 'Filter window used as-is.',
  },
  {
    tier: 'Engaged (3x/wk)',
    color: '#f59e0b',
    def: '≥3 workout_completed events in at least one calendar week within the selected window.',
    assumption: 'Weekly bucket = ISO calendar week. A user counts once even if they hit 3x in multiple weeks.',
  },
  {
    tier: 'Habit (3x × 4wk)',
    color: '#10b981',
    def: '≥3 workout_completed events in each of ≥4 distinct weeks within a fixed 28-day lookback from the "to" date.',
    assumption: 'Always uses a 28-day rolling window (not the filter range) — habit formation requires 4 full weeks regardless of the selected period.',
  },
];

const COST_NOTE = 'Cost per tier = total channel spend (all-time CAC rate × total users acquired from that channel) ÷ users who reached that tier in the window. This reflects the effective cost of producing a quality outcome from each channel.';

export default function CACBreakdownChart({ filters }: { filters: GlobalFilters }) {
  const [byChannel, setByChannel] = useState<ChannelRow[]>([]);
  const [trend, setTrend]         = useState<TrendRow[]>([]);
  const [loading, setLoading]     = useState(true);

  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams(filters as Record<string, string>);
    fetch(`/api/cac-breakdown?${qs}`)
      .then(r => r.json())
      .then(d => {
        setByChannel(d.byChannel ?? []);
        setTrend(d.trend ?? []);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  if (loading || byChannel.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-[#1a1a1a] rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 h-[280px] bg-[#1a1a1a] rounded-lg animate-pulse" />
          <div className="lg:col-span-2 h-[280px] bg-[#1a1a1a] rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  // Best channel by cost per habit (lowest)
  const habitSorted = byChannel.filter(c => c.costPerHabit !== null).sort((a, b) => (a.costPerHabit ?? 0) - (b.costPerHabit ?? 0));
  const bestHabit   = habitSorted[0];
  const worstHabit  = habitSorted[habitSorted.length - 1];
  const insight     = bestHabit && worstHabit
    ? `${bestHabit.channel} produces habit users at ${fmtRupee(bestHabit.costPerHabit!)} — most efficient. ${worstHabit.channel} costs ${fmtRupee(worstHabit.costPerHabit!)} per habit user — ${Math.round(((worstHabit.costPerHabit! - bestHabit.costPerHabit!) / bestHabit.costPerHabit!) * 100)}% more.`
    : 'Insufficient data to compare habit user costs across channels.';

  // Prepare chart data — one row per channel, three cost columns
  const chartData = byChannel.map(c => ({
    channel:          c.channel,
    'Cost / Activated':   c.costPerActivated ?? 0,
    'Cost / Engaged':     c.costPerEngaged   ?? 0,
    'Cost / Habit':       c.costPerHabit     ?? 0,
  }));

  return (
    <div className="space-y-4">

      {/* Insight */}
      <div className="bg-[#2a1515] border border-[#ef4444]/30 rounded-lg px-4 py-3">
        <p className="text-[10px] font-bold text-[#ef4444] uppercase tracking-wider mb-1">Auto Insight</p>
        <p className="text-sm text-[#fecaca]">{insight}</p>
      </div>

      {/* Definition box */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 space-y-3">
        <p className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider">Metric Definitions & Assumptions</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {DEFINITIONS.map(d => (
            <div key={d.tier} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                <span className="text-xs font-semibold text-white">{d.tier}</span>
              </div>
              <p className="text-[11px] text-[#9ca3af] leading-relaxed">{d.def}</p>
              <p className="text-[10px] text-[#4b5563] italic">{d.assumption}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[#4b5563] border-t border-[#2a2a2a] pt-2">{COST_NOTE}</p>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Grouped bar: cost per quality tier by channel */}
        <div className="lg:col-span-3">
          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
            Cost per quality tier by channel (₹)
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 40 }} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="channel" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={52} tickFormatter={fmtRupee} />
              <Tooltip content={<QualityTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
              <Bar dataKey="Cost / Activated" fill="#60a5fa" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="Cost / Engaged"   fill="#f59e0b" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="Cost / Habit"     fill="#10b981" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* CAC trend */}
        <div className="lg:col-span-2">
          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">Blended CAC trend (₹)</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={44} tickFormatter={v => `₹${v}`} />
              <Tooltip
                contentStyle={{ background: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: 8, fontSize: 12 }}
                formatter={(val, name) => [`₹${Number(val ?? 0).toLocaleString()}`, String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} formatter={v => v.charAt(0).toUpperCase() + v.slice(1)} />
              <Line type="monotone" dataKey="blended" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="paid"    stroke="#ef4444" strokeWidth={2} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="organic" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-channel funnel table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[560px]">
          <thead>
            <tr className="border-b border-[#2a2a2a]">
              <th className="text-left py-2 px-3 text-[#4b5563] font-semibold uppercase tracking-wider">Channel</th>
              <th className="text-right py-2 px-3 text-[#4b5563] font-semibold uppercase tracking-wider">Users</th>
              <th className="text-right py-2 px-3 text-[#60a5fa] font-semibold uppercase tracking-wider">Activated</th>
              <th className="text-right py-2 px-3 text-[#f59e0b] font-semibold uppercase tracking-wider">Engaged</th>
              <th className="text-right py-2 px-3 text-[#10b981] font-semibold uppercase tracking-wider">Habit</th>
            </tr>
          </thead>
          <tbody>
            {byChannel.map(c => (
              <tr key={c.channel} className="border-b border-[#1e1e1e] hover:bg-[#1a1a1a]">
                <td className="py-2.5 px-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                  <span className="text-[#9ca3af]">{c.channel}</span>
                </td>
                <td className="py-2.5 px-3 text-right text-[#6b7280] tabular-nums">{c.totalUsers.toLocaleString()}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">
                  <span className="text-white">{c.activated.toLocaleString()}</span>
                  <span className="text-[#4b5563] ml-1">({c.totalUsers > 0 ? Math.round((c.activated / c.totalUsers) * 100) : 0}%)</span>
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums">
                  <span className="text-white">{c.engaged.toLocaleString()}</span>
                  <span className="text-[#4b5563] ml-1">({c.totalUsers > 0 ? Math.round((c.engaged / c.totalUsers) * 100) : 0}%)</span>
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums">
                  <span className="text-[#10b981] font-semibold">{c.habit.toLocaleString()}</span>
                  <span className="text-[#4b5563] ml-1">({c.totalUsers > 0 ? Math.round((c.habit / c.totalUsers) * 100) : 0}%)</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
