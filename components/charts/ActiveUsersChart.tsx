'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { GlobalFilters } from '@/lib/queryHelpers';

interface WeekRow { week: string; wau: number; fx1: number; fx2: number; fx3: number; }

function formatWeek(w: string) {
  const [year, weekPart] = w.split('-W');
  const weekNum = parseInt(weekPart, 10);
  const d = new Date(parseInt(year, 10), 0, 1 + (weekNum - 1) * 7);
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
  return `W${weekNum} ${mon}`;
}

function fmtK(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v);
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const get = (name: string) => payload.find(p => p.name === name)?.value ?? 0;
  const wau  = get('wau');
  const fx1  = get('fx1');
  const fx2  = get('fx2');
  const fx3  = get('fx3');

  const pct = (n: number) => wau > 0 ? `${Math.round((n / wau) * 100)}%` : '—';

  return (
    <div className="bg-[#1e1e1e] border border-[#3a3a3a] rounded-xl px-4 py-3 shadow-xl text-xs min-w-[200px]">
      <p className="text-[#6b7280] font-semibold mb-3">{label ? formatWeek(String(label)) : ''}</p>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-6">
          <span className="text-[#4b5563] text-[10px]">Active users (≥1 workout)</span>
          <span className="text-white font-bold">{wau.toLocaleString()}</span>
        </div>

        <div className="border-t border-[#2a2a2a] pt-2 space-y-2">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#60a5fa]" />
              <span className="text-[#9ca3af]">1x / week</span>
            </div>
            <div className="text-right">
              <span className="text-white font-bold">{fx1.toLocaleString()}</span>
              <span className="text-[#4b5563] ml-1.5">{pct(fx1)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
              <span className="text-[#9ca3af]">2x / week</span>
            </div>
            <div className="text-right">
              <span className="text-white font-bold">{fx2.toLocaleString()}</span>
              <span className="text-[#4b5563] ml-1.5">{pct(fx2)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              <span className="text-[#9ca3af]">3x+ / week (NSM)</span>
            </div>
            <div className="text-right">
              <span className="text-[#10b981] font-bold">{fx3.toLocaleString()}</span>
              <span className="text-[#4b5563] ml-1.5">{pct(fx3)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ActiveUsersChart({ filters }: { filters: GlobalFilters }) {
  const [rows, setRows]       = useState<WeekRow[]>([]);
  const [loading, setLoading] = useState(true);
  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams(filters as Record<string, string>);
    fetch(`/api/wau-breakdown?${qs}`)
      .then(r => r.json())
      .then(d => {
        setRows(Array.isArray(d) ? d : []);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  if (loading || rows.length === 0) {
    return <div className="h-[360px] bg-[#1a1a1a] rounded-lg animate-pulse" />;
  }

  const latest = rows[rows.length - 1];
  const { wau, fx1, fx2, fx3 } = latest;
  const pct = (n: number) => wau > 0 ? Math.round((n / wau) * 100) : 0;
  const nsm_pct = pct(fx3);
  const nsmColor = nsm_pct >= 30 ? '#10b981' : nsm_pct >= 20 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-4">

      {/* Insight */}
      <div className="bg-[#0f2d1f] border border-[#10b981]/30 rounded-lg px-4 py-3">
        <p className="text-[10px] font-bold text-[#10b981] uppercase tracking-wider mb-1">Auto Insight</p>
        <p className="text-sm text-[#d1fae5]">
          This week {nsm_pct}% of WAU hit NSM (3x+). {pct(fx2)}% are at 2x — one nudge away from habit formation. {pct(fx1)}% completed just 1 workout.
        </p>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-[#1a1a1a] rounded-lg px-3 py-3">
          <p className="text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">Total WAU</p>
          <p className="text-lg font-bold text-white">{fmtK(wau)}</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg px-3 py-3">
          <p className="text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">1x / week</p>
          <p className="text-lg font-bold text-[#60a5fa]">{fmtK(fx1)}</p>
          <p className="text-[10px] text-[#4b5563] mt-0.5">{pct(fx1)}% of WAU</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg px-3 py-3">
          <p className="text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">2x / week</p>
          <p className="text-lg font-bold text-[#f59e0b]">{fmtK(fx2)}</p>
          <p className="text-[10px] text-[#4b5563] mt-0.5">{pct(fx2)}% of WAU</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg px-3 py-3">
          <p className="text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">3x+ / week</p>
          <p className="text-lg font-bold" style={{ color: nsmColor }}>{fmtK(fx3)}</p>
          <p className="text-[10px] text-[#4b5563] mt-0.5">{nsm_pct}% of WAU</p>
        </div>
      </div>

      {/* Line chart */}
      <div>
        <div className="flex items-start justify-between mb-3 gap-4">
          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
            Workout frequency — weekly active users
          </p>
          <span className="flex-shrink-0 text-[10px] text-[#4b5563] bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-2.5 py-1">
            Active = completed ≥1 workout session
          </span>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={rows} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis
              dataKey="week"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickFormatter={formatWeek}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={38}
              tickFormatter={fmtK}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, color: '#9ca3af' }}
              formatter={(v: string) => ({ fx1: '1x / week', fx2: '2x / week', fx3: '3x+ / week (NSM)' } as Record<string, string>)[v] ?? v}
            />
            <Line
              type="monotone" dataKey="fx1"
              stroke="#60a5fa" strokeWidth={2}
              dot={{ r: 3, fill: '#60a5fa', strokeWidth: 0 }} activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone" dataKey="fx2"
              stroke="#f59e0b" strokeWidth={2}
              dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }} activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone" dataKey="fx3"
              stroke="#10b981" strokeWidth={2.5}
              dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
