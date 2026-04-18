'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { GlobalFilters } from '@/lib/queryHelpers';

interface TrendRow  { week: string; mrr: number; }
interface FreqRow   { bucket: string; label: string; mrr: number; users: number; pct: number; color: string; }

function fmtRev(v: number): string {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000)   return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000)     return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v}`;
}

function formatWeek(w: string) {
  const [year, weekPart] = w.split('-W');
  const weekNum = parseInt(weekPart, 10);
  const d = new Date(parseInt(year, 10), 0, 1 + (weekNum - 1) * 7);
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
  return `W${weekNum} ${mon}`;
}

// Custom donut label: show pct inside segments
function DonutLabel({ cx, cy, midAngle, innerRadius, outerRadius, pct }: {
  cx: number; cy: number; midAngle: number;
  innerRadius: number; outerRadius: number; pct: number;
}) {
  if (pct < 8) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={11} fontWeight={700}>
      {pct}%
    </text>
  );
}

export default function RevenueDetailChart({ filters }: { filters: GlobalFilters }) {
  const [trend, setTrend]           = useState<TrendRow[]>([]);
  const [byFreq, setByFreq]         = useState<FreqRow[]>([]);
  const [currentMrr, setCurrentMrr] = useState(0);
  const [mrrGrowth, setMrrGrowth]   = useState(0);
  const [loading, setLoading]       = useState(true);

  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams(filters as Record<string, string>);
    fetch(`/api/revenue-breakdown?${qs}`)
      .then(r => r.json())
      .then(d => {
        setTrend(d.trend ?? []);
        setByFreq(d.byFrequency ?? []);
        setCurrentMrr(d.currentMrr ?? 0);
        setMrrGrowth(d.mrrGrowth ?? 0);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  if (loading || trend.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-[#1a1a1a] rounded-lg animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-[#1a1a1a] rounded-lg animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 h-[260px] bg-[#1a1a1a] rounded-lg animate-pulse" />
          <div className="lg:col-span-2 h-[260px] bg-[#1a1a1a] rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  const topCohort  = [...byFreq].sort((a, b) => b.mrr - a.mrr)[0];
  const nsmCohort  = byFreq.find(r => r.bucket === '3x+');
  const growthDir  = mrrGrowth >= 0 ? 'up' : 'down';
  const insight    = `${topCohort?.label ?? '—'} drives ${topCohort?.pct ?? 0}% of MRR. NSM completers (3x+) represent ${nsmCohort?.pct ?? 0}% of paid revenue — MRR is ${growthDir} ${Math.abs(mrrGrowth)}% WoW.`;

  return (
    <div className="space-y-4">

      {/* Insight */}
      <div className="bg-[#0f2d1f] border border-[#10b981]/30 rounded-lg px-4 py-3">
        <p className="text-[10px] font-bold text-[#10b981] uppercase tracking-wider mb-1">Auto Insight</p>
        <p className="text-sm text-[#d1fae5]">{insight}</p>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3">
          <p className="text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">Current MRR</p>
          <p className="text-xl font-bold text-white">{fmtRev(currentMrr)}</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3">
          <p className="text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">MRR Growth WoW</p>
          <p className="text-xl font-bold" style={{ color: mrrGrowth >= 0 ? '#10b981' : '#ef4444' }}>
            {mrrGrowth >= 0 ? '+' : ''}{mrrGrowth}%
          </p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3">
          <p className="text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">NSM → MRR</p>
          <p className="text-xl font-bold text-[#10b981]">{nsmCohort?.pct ?? 0}%</p>
          <p className="text-[10px] text-[#4b5563] mt-0.5">of paid revenue</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* MRR trend line */}
        <div className="lg:col-span-3">
          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
            MRR trend — cumulative weekly
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trend} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
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
                width={52}
                tickFormatter={fmtRev}
              />
              <Tooltip
                contentStyle={{ background: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: 8, fontSize: 12 }}
                labelFormatter={l => formatWeek(String(l))}
                formatter={(val) => [fmtRev(Number(val ?? 0)), 'MRR']}
              />
              <Line
                type="monotone"
                dataKey="mrr"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* MRR by workout frequency — donut */}
        <div className="lg:col-span-2">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
              MRR by workout frequency
            </p>
            <span className="text-[10px] text-[#4b5563] bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-2 py-1 flex-shrink-0">
              4-wk rolling avg
            </span>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={byFreq}
                cx="50%"
                cy="50%"
                innerRadius="50%"
                outerRadius="78%"
                dataKey="mrr"
                nameKey="label"
                paddingAngle={2}
                isAnimationActive={false}
                labelLine={false}
                label={(props) => <DonutLabel cx={props.cx ?? 0} cy={props.cy ?? 0} midAngle={props.midAngle ?? 0} innerRadius={props.innerRadius ?? 0} outerRadius={props.outerRadius ?? 0} pct={(props.payload as FreqRow).pct} />}
              >
                {byFreq.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: 8, fontSize: 12 }}
                formatter={(val, _name, entry) => [
                  `${fmtRev(Number(val ?? 0))} (${(entry.payload as FreqRow).pct}%)`,
                  (entry.payload as FreqRow).label,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend with MRR values */}
          <div className="space-y-1.5 mt-1">
            {byFreq.map(r => (
              <div key={r.bucket} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
                  <span className="text-[#9ca3af]">{r.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#6b7280]">{r.users.toLocaleString()} users</span>
                  <span className="text-white font-semibold tabular-nums">{fmtRev(r.mrr)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
