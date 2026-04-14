'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useFilters } from '@/lib/FilterContext';
import EventStream from '@/components/EventStream';

// ── Config ────────────────────────────────────────────────────────────────────

const EVENT_CFG: Record<string, { label: string; color: string }> = {
  workout_completed:      { label: 'Workout Done',   color: '#10b981' },
  workout_started:        { label: 'Workout Start',  color: '#f59e0b' },
  subscription_purchased: { label: 'Subscribed',     color: '#4ade80' },
  subscription_cancelled: { label: 'Cancelled',      color: '#ef4444' },
  trial_booked:           { label: 'Trial Booked',   color: '#60a5fa' },
  trial_completed:        { label: 'Trial Done',     color: '#34d399' },
  referral_sent:          { label: 'Referral',       color: '#a78bfa' },
  class_booked:           { label: 'Class Booked',   color: '#34d399' },
  meal_logged:            { label: 'Meal Logged',    color: '#fb923c' },
  app_open:               { label: 'App Open',       color: '#6b7280' },
  page_view:              { label: 'Page View',      color: '#818cf8' },
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface EventTypeStat {
  type: string;
  count: number;
  unique_users: number;
  pct: number;
  trend: number;
}

interface EventStats {
  summary: { total_events: number; unique_users: number };
  byType: EventTypeStat[];
  daily: { day: string; count: number }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function fmtDay(d: string) {
  const [, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m) - 1]} ${parseInt(day)}`;
}

function TrendBadge({ trend }: { trend: number }) {
  if (trend === 0) return <span className="text-[#4b5563] text-[10px]">—</span>;
  const up = trend > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums ${up ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
      {up ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
    </span>
  );
}

function deriveInsights(data: EventStats): { text: string; highlight: string; tone: 'up' | 'down' | 'info' }[] {
  const out: { text: string; highlight: string; tone: 'up' | 'down' | 'info' }[] = [];
  const { byType } = data;

  const gainers = [...byType].filter(e => e.trend > 5).sort((a, b) => b.trend - a.trend);
  if (gainers[0]) {
    const cfg = EVENT_CFG[gainers[0].type];
    out.push({
      highlight: `${cfg?.label ?? gainers[0].type} +${gainers[0].trend.toFixed(0)}%`,
      text: 'vs last week — keep this momentum going',
      tone: 'up',
    });
  }

  const losers = [...byType].filter(e => e.trend < -5).sort((a, b) => a.trend - b.trend);
  if (losers[0]) {
    const cfg = EVENT_CFG[losers[0].type];
    out.push({
      highlight: `${cfg?.label ?? losers[0].type} ${losers[0].trend.toFixed(0)}%`,
      text: 'this week — worth investigating',
      tone: 'down',
    });
  }

  if (byType[0]) {
    const cfg = EVENT_CFG[byType[0].type];
    out.push({
      highlight: cfg?.label ?? byType[0].type,
      text: `is your highest-volume event at ${byType[0].pct}% of all activity`,
      tone: 'info',
    });
  }

  const sub = byType.find(e => e.type === 'subscription_purchased');
  const trial = byType.find(e => e.type === 'trial_booked');
  if (sub && trial && trial.count > 0) {
    const rate = Math.round((sub.count / trial.count) * 100);
    out.push({
      highlight: `${rate}%`,
      text: 'of trial bookings converted to paid — benchmark is 25%+',
      tone: rate >= 25 ? 'up' : 'info',
    });
  }

  return out.slice(0, 4);
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-[76px] bg-[#161616] border border-[#1e1e1e] rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="h-[220px] bg-[#161616] border border-[#1e1e1e] rounded-xl animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 bg-[#161616] border border-[#1e1e1e] rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="h-[280px] bg-[#161616] border border-[#1e1e1e] rounded-xl animate-pulse" />
    </div>
  );
}

// ── Analytics view ────────────────────────────────────────────────────────────

function Analytics({ data }: { data: EventStats }) {
  const { summary, byType, daily } = data;
  const insights = deriveInsights(data);
  const topEvent = byType[0];
  const topCfg = topEvent ? (EVENT_CFG[topEvent.type] ?? { label: topEvent.type, color: '#6b7280' }) : null;
  const chartData = daily.map(d => ({ ...d, label: fmtDay(d.day) }));

  return (
    <div className="space-y-4">

      {/* ── Stat chips ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { label: 'Total Events',  value: fmt(summary.total_events), sub: 'in selected period',   color: undefined },
          { label: 'Unique Users',  value: fmt(summary.unique_users), sub: 'performed ≥1 event',   color: undefined },
          { label: 'Event Types',   value: String(byType.length),     sub: 'distinct types tracked', color: undefined },
          { label: 'Top Event',     value: topCfg?.label ?? '—',      sub: `${topEvent?.pct ?? 0}% of all events`, color: topCfg?.color },
        ] as { label: string; value: string; sub: string; color?: string }[]).map(s => (
          <div key={s.label} className="bg-[#161616] border border-[#1e1e1e] rounded-xl px-4 py-3.5">
            <p className="text-[10px] text-[#4b5563] font-semibold uppercase tracking-wider">{s.label}</p>
            <p className="text-[22px] font-black mt-1 leading-none truncate" style={{ color: s.color ?? 'white' }}>{s.value}</p>
            <p className="text-[10px] text-[#3a3a3a] mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Volume chart ── */}
      <div className="bg-[#161616] border border-[#1e1e1e] rounded-xl p-4 sm:p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-bold text-white">Event Volume</p>
            <p className="text-[10px] text-[#4b5563] mt-0.5">Total events per day — last 14 days</p>
          </div>
        </div>
        {chartData.length === 0 ? (
          <div className="h-[180px] flex items-center justify-center text-[#3a3a3a] text-xs">No data for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={18} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: '#4b5563', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={v => fmt(v)}
                tick={{ fill: '#4b5563', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip
                cursor={{ fill: '#ffffff08' }}
                contentStyle={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: '#9ca3af', marginBottom: 4, fontSize: 10 }}
                itemStyle={{ color: '#10b981' }}
                formatter={(v) => [fmt(Number(v)), 'Events']}
              />
              <Bar dataKey="count" fill="#10b981" radius={[3, 3, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Auto insights ── */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {insights.map((ins, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
                ins.tone === 'up'
                  ? 'bg-[#061a10] border-[#10b981]/20'
                  : ins.tone === 'down'
                  ? 'bg-[#1a0606] border-[#ef4444]/20'
                  : 'bg-[#161616] border-[#1e1e1e]'
              }`}
            >
              <span className={`text-sm mt-px flex-shrink-0 ${
                ins.tone === 'up' ? 'text-[#10b981]' : ins.tone === 'down' ? 'text-[#ef4444]' : 'text-[#4b5563]'
              }`}>
                {ins.tone === 'up' ? '↑' : ins.tone === 'down' ? '↓' : '·'}
              </span>
              <p className="text-[11px] text-[#6b7280] leading-snug">
                <span className={`font-semibold ${
                  ins.tone === 'up' ? 'text-[#10b981]' : ins.tone === 'down' ? 'text-[#ef4444]' : 'text-white'
                }`}>
                  {ins.highlight}
                </span>{' '}
                {ins.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Breakdown table ── */}
      <div className="bg-[#161616] border border-[#1e1e1e] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1e1e1e]">
          <p className="text-xs font-bold text-white">Event Breakdown</p>
          <p className="text-[10px] text-[#4b5563] mt-0.5">All event types · sorted by volume · WoW = week-over-week change</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-[#1a1a1a]">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#4b5563] uppercase tracking-wider">Event</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-[#4b5563] uppercase tracking-wider">Count</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-[#4b5563] uppercase tracking-wider">Unique Users</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-[#4b5563] uppercase tracking-wider w-36">% of Total</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-[#4b5563] uppercase tracking-wider">WoW</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {byType.map(row => {
                const cfg = EVENT_CFG[row.type] ?? { label: row.type, color: '#6b7280' };
                return (
                  <tr key={row.type} className="hover:bg-[#1a1a1a] transition-colors duration-100">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                        <span className="text-[12px] font-medium text-white">{cfg.label}</span>
                        <span className="text-[9px] font-mono text-[#2a2a2a] hidden sm:inline">{row.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-[12px] font-semibold text-white tabular-nums">{fmt(row.count)}</td>
                    <td className="px-4 py-3 text-right text-[12px] text-[#9ca3af] tabular-nums">{fmt(row.unique_users)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 h-1 bg-[#252525] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.min(row.pct, 100)}%`, background: cfg.color, opacity: 0.6 }}
                          />
                        </div>
                        <span className="text-[11px] text-[#9ca3af] tabular-nums w-9 text-right">{row.pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <TrendBadge trend={row.trend} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const { filters, setProfileUserId } = useFilters();
  const filterKey = JSON.stringify(filters);

  const [tab, setTab] = useState<'analytics' | 'feed'>('analytics');
  const [data, setData] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams(filters as Record<string, string>);
    fetch(`/api/event-stats?${qs}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  return (
    <div className="px-4 sm:px-6 py-5 pb-8">
      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-[#1e1e1e] mb-5">
        {([
          { id: 'analytics', label: 'Analytics' },
          { id: 'feed',      label: 'Live Feed' },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors duration-150 ${
              tab === t.id
                ? 'text-white border-[#10b981]'
                : 'text-[#6b7280] border-transparent hover:text-[#9ca3af]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {tab === 'feed' ? (
        <EventStream filters={filters} onUserClick={setProfileUserId} />
      ) : loading || !data ? (
        <Skeleton />
      ) : (
        <Analytics data={data} />
      )}
    </div>
  );
}
