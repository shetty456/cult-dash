'use client';

import { useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { GlobalFilters } from '@/lib/queryHelpers';

// ── Types ──────────────────────────────────────────────────────────
interface ReportRow { key: string; value: number; pct: number; }
interface ReportResult { rows: ReportRow[]; total: number; metric: string; groupBy: string; }

interface QueryConfig {
  metric: string;
  event_type: string;
  group_by: string;
  status: string;
  label: string;
}

// ── Presets ────────────────────────────────────────────────────────
const PRESETS: QueryConfig[] = [
  { label: 'Workouts by Channel',       metric: 'count_events',  event_type: 'workout_completed',       group_by: 'channel',    status: '' },
  { label: 'Trials by UTM Source',      metric: 'count_events',  event_type: 'trial_booked',            group_by: 'utm_source', status: '' },
  { label: 'Revenue by Plan',           metric: 'sum_ltv',       event_type: '',                        group_by: 'plan',       status: '' },
  { label: 'Revenue over Time',         metric: 'sum_ltv',       event_type: '',                        group_by: 'week',       status: '' },
  { label: 'WAU by Week',               metric: 'unique_users',  event_type: '',                        group_by: 'week',       status: '' },
  { label: 'Active Users by City',      metric: 'unique_users',  event_type: '',                        group_by: 'city',       status: 'active' },
  { label: 'Cancellations by Channel',  metric: 'count_events',  event_type: 'subscription_cancelled',  group_by: 'channel',    status: '' },
  { label: 'Referrals by Device',       metric: 'count_events',  event_type: 'referral_sent',           group_by: 'device',     status: '' },
];

const METRIC_LABELS: Record<string, string> = {
  count_events:  'Event Count',
  unique_users:  'Unique Users',
  sum_ltv:       'Total LTV (₹)',
};

const EVENT_TYPES = [
  'app_open','page_view','workout_started','workout_completed',
  'trial_booked','trial_completed','subscription_purchased',
  'subscription_cancelled','referral_sent','class_booked','meal_logged',
];

const GROUP_BY_OPTIONS = [
  { value: 'channel',    label: 'Channel' },
  { value: 'city',       label: 'City' },
  { value: 'plan',       label: 'Plan' },
  { value: 'device',     label: 'Device' },
  { value: 'utm_source', label: 'UTM Source' },
  { value: 'status',     label: 'Status' },
  { value: 'gender',     label: 'Gender' },
  { value: 'week',       label: 'Week' },
  { value: 'day',        label: 'Day' },
];

const BAR_COLORS = ['#10b981','#60a5fa','#f59e0b','#a78bfa','#f97316','#ef4444','#34d399','#ec4899'];

function formatValue(v: number, metric: string): string {
  if (metric === 'sum_ltv') {
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
    if (v >= 100000)   return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000)     return `₹${(v / 1000).toFixed(0)}K`;
    return `₹${v}`;
  }
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000)    return `${(v / 1000).toFixed(0)}K`;
  return v.toLocaleString();
}

// ── Component ──────────────────────────────────────────────────────
export default function ReportsSection({ filters }: { filters: GlobalFilters }) {
  const [query, setQuery] = useState<QueryConfig>(PRESETS[0]);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activePreset, setActivePreset] = useState(0);
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const runQuery = useCallback(async (q: QueryConfig) => {
    setLoading(true);
    const qs = new URLSearchParams({
      ...filters as Record<string, string>,
      metric:     q.metric,
      group_by:   q.group_by,
      event_type: q.event_type,
      status:     q.status,
    });
    const data = await fetch(`/api/reports?${qs}`).then(r => r.json());
    setResult(data);
    setLoading(false);
  }, [filters]);

  function loadPreset(idx: number) {
    setActivePreset(idx);
    const p = PRESETS[idx];
    setQuery(p);
    runQuery(p);
  }

  function set(key: keyof QueryConfig, val: string) {
    setQuery(q => ({ ...q, [key]: val }));
  }

  const displayRows = result
    ? [...result.rows].sort((a, b) => sortDir === 'desc' ? b.value - a.value : a.value - b.value)
    : [];

  const isTimeSeries = query.group_by === 'week' || query.group_by === 'day';

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">

      {/* ── Left: presets ── */}
      <div className="lg:w-56 flex-shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#3a3a3a] mb-2 px-1">Saved Queries</p>
        <div className="space-y-0.5">
          {PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => loadPreset(i)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors ${
                activePreset === i && result
                  ? 'bg-[#0f2d1f] text-[#10b981] font-semibold'
                  : 'text-[#6b7280] hover:text-[#9ca3af] hover:bg-[#1e1e1e]'
              }`}
            >
              <span className="block truncate">{p.label}</span>
              <span className="text-[10px] opacity-60">{METRIC_LABELS[p.metric]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right: builder + results ── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Query builder */}
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#3a3a3a] mb-3">Query Builder</p>
          <div className="flex flex-wrap gap-3 items-end">

            <div>
              <p className="text-[10px] text-[#4b5563] mb-1">Metric</p>
              <select value={query.metric} onChange={e => set('metric', e.target.value)}
                className="text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-[#9ca3af] rounded-lg px-3 py-2 focus:outline-none focus:border-[#10b981]">
                <option value="count_events">Event Count</option>
                <option value="unique_users">Unique Users</option>
                <option value="sum_ltv">Total LTV (₹)</option>
              </select>
            </div>

            <div>
              <p className="text-[10px] text-[#4b5563] mb-1">Event Type</p>
              <select value={query.event_type} onChange={e => set('event_type', e.target.value)}
                className="text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-[#9ca3af] rounded-lg px-3 py-2 focus:outline-none focus:border-[#10b981]">
                <option value="">All Types</option>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>

            <div>
              <p className="text-[10px] text-[#4b5563] mb-1">Group By</p>
              <select value={query.group_by} onChange={e => set('group_by', e.target.value)}
                className="text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-[#9ca3af] rounded-lg px-3 py-2 focus:outline-none focus:border-[#10b981]">
                {GROUP_BY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <p className="text-[10px] text-[#4b5563] mb-1">Status</p>
              <select value={query.status} onChange={e => set('status', e.target.value)}
                className="text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-[#9ca3af] rounded-lg px-3 py-2 focus:outline-none focus:border-[#10b981]">
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="at-risk">At-Risk</option>
                <option value="churned">Churned</option>
              </select>
            </div>

            <button
              onClick={() => runQuery(query)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#10b981] hover:bg-[#0d9e6f] disabled:opacity-50 text-black text-xs font-bold rounded-lg transition-colors"
            >
              {loading ? (
                <span className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><polygon points="0,0 10,5 0,10"/></svg>
              )}
              Run Query
            </button>
          </div>

          {/* Query summary pill */}
          {result && !loading && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-[#4b5563]">Returned</span>
              <span className="text-[10px] font-bold text-white">{result.rows.length} groups</span>
              <span className="text-[10px] text-[#4b5563]">·</span>
              <span className="text-[10px] font-bold text-[#10b981]">
                {METRIC_LABELS[result.metric]}: {formatValue(result.total, result.metric)}
              </span>
              {filters && Object.values(filters).some(Boolean) && (
                <>
                  <span className="text-[10px] text-[#4b5563]">· filtered by active filters</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        {!result && !loading && (
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl flex items-center justify-center h-48">
            <div className="text-center">
              <p className="text-[#3a3a3a] text-sm mb-1">No query run yet</p>
              <p className="text-[10px] text-[#2a2a2a]">Pick a preset or configure your own query above</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
            <div className="h-64 bg-[#1a1a1a] rounded-lg animate-pulse" />
          </div>
        )}

        {result && !loading && result.rows.length > 0 && (
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 space-y-4">
            {/* Chart */}
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#3a3a3a]">
              {METRIC_LABELS[result.metric]} by {GROUP_BY_OPTIONS.find(o => o.value === result.groupBy)?.label ?? result.groupBy}
            </p>

            <ResponsiveContainer width="100%" height={isTimeSeries ? 220 : Math.max(180, Math.min(displayRows.length * 36, 320))}>
              <BarChart
                data={isTimeSeries ? result.rows : displayRows}
                layout={isTimeSeries ? 'horizontal' : 'vertical'}
                margin={{ top: 0, right: 20, left: isTimeSeries ? 0 : 80, bottom: isTimeSeries ? 20 : 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" horizontal={!isTimeSeries} vertical={isTimeSeries} />
                {isTimeSeries ? (
                  <>
                    <XAxis dataKey="key" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} interval={Math.floor(result.rows.length / 8)} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={50}
                      tickFormatter={v => formatValue(v, result.metric)} />
                  </>
                ) : (
                  <>
                    <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={v => formatValue(v, result.metric)} />
                    <YAxis dataKey="key" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                  </>
                )}
                <Tooltip
                  contentStyle={{ background: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: 8, fontSize: 12 }}
                  formatter={(val, _name, entry) => [
                    `${formatValue(Number(val ?? 0), result.metric)} (${(entry.payload as ReportRow).pct}%)`,
                    METRIC_LABELS[result.metric],
                  ]}
                />
                <Bar dataKey="value" radius={isTimeSeries ? [4, 4, 0, 0] : [0, 4, 4, 0]} isAnimationActive={false}>
                  {(isTimeSeries ? result.rows : displayRows).map((_, idx) => (
                    <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Table */}
            <div className="rounded-lg border border-[#2a2a2a] overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-[#1a1a1a]">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">
                      {GROUP_BY_OPTIONS.find(o => o.value === result.groupBy)?.label ?? result.groupBy}
                    </th>
                    <th
                      className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#6b7280] cursor-pointer hover:text-white"
                      onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                    >
                      {METRIC_LABELS[result.metric]} {sortDir === 'desc' ? '↓' : '↑'}
                    </th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-[#161616]' : 'bg-[#1a1a1a]'}>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: BAR_COLORS[i % BAR_COLORS.length] }} />
                          <span className="text-white font-medium">{row.key}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right text-white font-semibold tabular-nums">
                        {formatValue(row.value, result.metric)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-[#252525] rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[#10b981]" style={{ width: `${row.pct}%` }} />
                          </div>
                          <span className="text-[#6b7280] text-[11px] w-8 text-right">{row.pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {result && !loading && result.rows.length === 0 && (
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl flex items-center justify-center h-32">
            <p className="text-[#4b5563] text-sm">No results for this query</p>
          </div>
        )}
      </div>
    </div>
  );
}
