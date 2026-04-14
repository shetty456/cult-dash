'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useFilters } from '@/lib/FilterContext';
import EventStream from '@/components/EventStream';

const EVENT_CFG: Record<string, { label: string; color: string }> = {
  workout_completed:      { label: 'Workout Done',  color: '#10b981' },
  workout_started:        { label: 'Workout Start', color: '#f59e0b' },
  subscription_purchased: { label: 'Subscribed',    color: '#4ade80' },
  subscription_cancelled: { label: 'Cancelled',     color: '#ef4444' },
  trial_booked:           { label: 'Trial Booked',  color: '#60a5fa' },
  trial_completed:        { label: 'Trial Done',    color: '#34d399' },
  referral_sent:          { label: 'Referral',      color: '#a78bfa' },
  class_booked:           { label: 'Class Booked',  color: '#34d399' },
  meal_logged:            { label: 'Meal Logged',   color: '#fb923c' },
  app_open:               { label: 'App Open',      color: '#6b7280' },
  page_view:              { label: 'Page View',     color: '#818cf8' },
};

interface EventTypeStat {
  type: string; count: number; unique_users: number; pct: number; trend: number;
}
interface EventStats {
  summary: { total_events: number; unique_users: number };
  byType: EventTypeStat[];
  daily: { day: string; count: number }[];
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtDay(d: string) {
  const [, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m) - 1]} ${parseInt(day)}`;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-5">
      <div className="h-4 w-56 bg-[#1e1e1e] rounded animate-pulse" />
      <div className="h-[120px] bg-[#161616] border border-[#1e1e1e] rounded-xl animate-pulse" />
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-10 bg-[#161616] border border-[#1e1e1e] rounded-lg animate-pulse"
               style={{ opacity: 1 - i * 0.08 }} />
        ))}
      </div>
    </div>
  );
}

// ── Analytics ─────────────────────────────────────────────────────────────────

function Analytics({ data }: { data: EventStats }) {
  const { summary, byType, daily } = data;
  const maxCount = byType[0]?.count ?? 1;
  const chartData = daily.map(d => ({ count: d.count, label: fmtDay(d.day) }));

  return (
    <div className="space-y-5">

      {/* One-line summary — the only "header" you need */}
      <p className="text-sm text-[#6b7280]">
        <span className="text-white font-semibold">{fmt(summary.total_events)}</span> events from{' '}
        <span className="text-white font-semibold">{fmt(summary.unique_users)}</span> users · last 14 days
      </p>

      {/* Slim volume chart */}
      <div className="bg-[#161616] border border-[#1e1e1e] rounded-xl px-4 pt-3 pb-2">
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={chartData} barSize={14} margin={{ top: 4, right: 0, left: -32, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: '#3a3a3a', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <Tooltip
              cursor={{ fill: '#ffffff06' }}
              contentStyle={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 6, fontSize: 11, padding: '4px 10px' }}
              labelStyle={{ color: '#6b7280', fontSize: 10, marginBottom: 2 }}
              itemStyle={{ color: '#10b981' }}
              formatter={(v) => [fmt(Number(v)), 'events']}
            />
            <Bar dataKey="count" fill="#10b981" radius={[2, 2, 0, 0]} opacity={0.75} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Event list — bar IS the story, count confirms it, trend signals direction */}
      <div className="bg-[#161616] border border-[#1e1e1e] rounded-xl overflow-hidden divide-y divide-[#1a1a1a]">
        {byType.map(row => {
          const cfg = EVENT_CFG[row.type] ?? { label: row.type, color: '#6b7280' };
          const barPct = Math.round((row.count / maxCount) * 100);
          const up = row.trend > 0;
          const noChange = Math.abs(row.trend) < 1;

          return (
            <div key={row.type} className="flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors duration-100">

              {/* Dot + name */}
              <div className="flex items-center gap-2 w-36 flex-shrink-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                <span className="text-[13px] font-medium text-white truncate">{cfg.label}</span>
              </div>

              {/* Volume bar — the visual anchor */}
              <div className="flex-1 h-1.5 bg-[#252525] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${barPct}%`, background: cfg.color, opacity: 0.65 }}
                />
              </div>

              {/* Count */}
              <span className="text-[13px] font-semibold text-white tabular-nums w-14 text-right flex-shrink-0">
                {fmt(row.count)}
              </span>

              {/* Trend — subtle, right-most */}
              <span className={`text-[11px] font-medium w-12 text-right flex-shrink-0 tabular-nums ${
                noChange ? 'text-[#3a3a3a]' : up ? 'text-[#10b981]' : 'text-[#ef4444]'
              }`}>
                {noChange ? '—' : `${up ? '+' : ''}${row.trend.toFixed(0)}%`}
              </span>

            </div>
          );
        })}
      </div>

      {/* Legend hint */}
      <p className="text-[10px] text-[#3a3a3a] text-right">% = week-over-week change</p>

    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const { filters, setProfileUserId } = useFilters();
  const filterKey = JSON.stringify(filters);

  const [tab, setTab]   = useState<'analytics' | 'feed'>('analytics');
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

      {/* Tabs */}
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
