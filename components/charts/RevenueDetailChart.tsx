'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { GlobalFilters } from '@/lib/queryHelpers';

interface DailyRow { date: string; revenue: number; mrr: number; }
interface PlanRow  { plan: string; revenue: number; users: number; pct: number; color: string; }

function formatRev(v: number): string {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000)   return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000)     return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v}`;
}

function formatDate(d: string) {
  const dt = new Date(d);
  return `${dt.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()]}`;
}

function Skeleton() {
  return <div className="h-[240px] bg-[#1a1a1a] rounded-lg animate-pulse" />;
}

export default function RevenueDetailChart({ filters }: { filters: GlobalFilters }) {
  const [daily, setDaily]     = useState<DailyRow[]>([]);
  const [byPlan, setByPlan]   = useState<PlanRow[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [currentMrr, setCurrentMrr]    = useState(0);
  const [mrrGrowth, setMrrGrowth]      = useState(0);
  const [loading, setLoading]          = useState(true);

  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams(filters as Record<string, string>);
    fetch(`/api/revenue?${qs}`)
      .then(r => r.json())
      .then(d => {
        setDaily(d.daily ?? []);
        setByPlan(d.byPlan ?? []);
        setTotalRevenue(d.totalRevenue ?? 0);
        setCurrentMrr(d.currentMrr ?? 0);
        setMrrGrowth(d.mrrGrowth ?? 0);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  if (loading || daily.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-[#1a1a1a] rounded-lg animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-[#1a1a1a] rounded-lg animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3"><Skeleton /></div>
          <div className="lg:col-span-2"><Skeleton /></div>
        </div>
      </div>
    );
  }

  const topPlan = byPlan[0];
  const insight = `${topPlan?.plan ?? '—'} plans generate ${topPlan?.pct ?? 0}% of revenue. MRR trend: ${mrrGrowth >= 0 ? 'up' : 'down'} ${Math.abs(mrrGrowth)}% WoW.`;

  // Downsample to every 3 days for area chart
  const revSampled = daily.filter((_, i) => i % 3 === 0);

  return (
    <div className="space-y-4">
      <div className="bg-[#0f2d1f] border border-[#10b981]/30 rounded-lg px-4 py-3">
        <p className="text-[10px] font-bold text-[#10b981] uppercase tracking-wider mb-1">Auto Insight</p>
        <p className="text-sm text-[#d1fae5]">{insight}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
          <p className="text-[11px] text-[#6b7280] mb-1">Current MRR</p>
          <p className="text-xl font-bold text-white">{formatRev(currentMrr)}</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
          <p className="text-[11px] text-[#6b7280] mb-1">MRR Growth WoW</p>
          <p className={`text-xl font-bold ${mrrGrowth >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>{mrrGrowth >= 0 ? '+' : ''}{mrrGrowth}%</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
          <p className="text-[11px] text-[#6b7280] mb-1">Total Revenue (90d)</p>
          <p className="text-xl font-bold text-white">{formatRev(totalRevenue)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">Daily Revenue + MRR — Last 90 Days</p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revSampled} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={d => { const dt = new Date(d); return dt.getDate() === 1 || dt.getDate() === 15 ? formatDate(d) : ''; }}
                interval={0}
              />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={50} tickFormatter={formatRev} />
              <Tooltip
                contentStyle={{ background: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: 8, fontSize: 12 }}
                labelFormatter={(label) => formatDate(String(label))}
                formatter={(val, name) => [formatRev(Number(val ?? 0)), name === 'revenue' ? 'Daily Revenue' : 'MRR']}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} formatter={v => v === 'revenue' ? 'Daily Revenue' : 'MRR'} />
              <Area type="monotone" dataKey="mrr" stroke="#60a5fa" strokeWidth={2} fill="url(#mrrGrad)" dot={false} isAnimationActive={false} />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#revGrad)" dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2">
          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">Revenue by Plan Type</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={byPlan}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="80%"
                dataKey="revenue"
                nameKey="plan"
                isAnimationActive={false}
                paddingAngle={2}
              >
                {byPlan.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: 8, fontSize: 12 }}
                formatter={(val, name, entry) => [
                  `${formatRev(Number(val ?? 0))} (${(entry.payload as {pct:number}).pct}%)`,
                  name,
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: '#9ca3af' }}
                formatter={(value, entry) => `${value} ${(entry.payload as {pct:number}).pct}%`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
