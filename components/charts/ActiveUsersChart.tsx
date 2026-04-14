'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts';
import { GlobalFilters } from '@/lib/queryHelpers';

interface DauRow { date: string; dau: number; new_users: number; }
interface CityRow { city: string; users: number; }

const CITY_COLORS = ['#10b981','#4ade80','#60a5fa','#f59e0b','#a78bfa','#f97316','#ec4899','#34d399'];

function formatDate(d: string) {
  const dt = new Date(d);
  return `${dt.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()]}`;
}

function Skeleton() {
  return <div className="h-[260px] bg-[#1a1a1a] rounded-lg animate-pulse" />;
}

export default function ActiveUsersChart({ filters }: { filters: GlobalFilters }) {
  const [rows, setRows] = useState<DauRow[]>([]);
  const [byCity, setByCity] = useState<CityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams(filters as Record<string, string>);
    fetch(`/api/dau?${qs}`)
      .then(r => r.json())
      .then(d => {
        setRows(d.rows ?? []);
        setByCity(d.byCity ?? []);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  if (loading || rows.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-[#1a1a1a] rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3"><Skeleton /></div>
          <div className="lg:col-span-2"><Skeleton /></div>
        </div>
      </div>
    );
  }

  const peakEntry = rows.reduce((best, d) => d.dau > best.dau ? d : best, rows[0]);
  const topCity = byCity[0];
  const totalUsers = byCity.reduce((s, c) => s + c.users, 0);
  const topPct = totalUsers > 0 && topCity ? Math.round((topCity.users / totalUsers) * 100) : 0;
  const insight = `Peak DAU was ${peakEntry.dau.toLocaleString()} on ${formatDate(peakEntry.date)}. ${topCity?.city ?? '—'} drives ${topPct}% of active users.`;

  return (
    <div className="space-y-4">
      <div className="bg-[#0f2d1f] border border-[#10b981]/30 rounded-lg px-4 py-3">
        <p className="text-[10px] font-bold text-[#10b981] uppercase tracking-wider mb-1">Auto Insight</p>
        <p className="text-sm text-[#d1fae5]">{insight}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">Daily Active Users — Last 90 Days</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={rows} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="newGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickFormatter={d => {
                  const dt = new Date(d);
                  if (dt.getDate() === 1 || dt.getDate() === 15) return formatDate(d);
                  return '';
                }}
                interval={0}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
              <Tooltip
                contentStyle={{ background: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: 8, fontSize: 12 }}
                labelFormatter={(label) => formatDate(String(label))}
                formatter={(val, name) => [Number(val ?? 0).toLocaleString(), name === 'dau' ? 'DAU' : 'New Users']}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} formatter={v => v === 'dau' ? 'Daily Active' : 'New Users'} />
              <Area type="monotone" dataKey="dau" stroke="#10b981" strokeWidth={2} fill="url(#dauGrad)" dot={false} isAnimationActive={false} />
              <Area type="monotone" dataKey="new_users" stroke="#60a5fa" strokeWidth={1.5} fill="url(#newGrad)" dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2">
          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">Users by City</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byCity} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="city" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
              <Tooltip
                contentStyle={{ background: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: 8, fontSize: 12 }}
                formatter={(val) => [Number(val ?? 0).toLocaleString(), 'Users']}
              />
              <Bar dataKey="users" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {byCity.map((_, idx) => (
                  <Cell key={idx} fill={CITY_COLORS[idx % CITY_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
