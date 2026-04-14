'use client';

import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { GlobalFilters } from '@/lib/queryHelpers';

interface DauRow { date: string; dau: number; new_users: number; }

function fmt(d: string) {
  const dt = new Date(d);
  return `${dt.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()]}`;
}

export default function DAUMini({ filters }: { filters: GlobalFilters }) {
  const [rows, setRows] = useState<DauRow[]>([]);
  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    const qs = new URLSearchParams(filters as Record<string, string>);
    fetch(`/api/dau?${qs}`).then(r => r.json()).then(d => setRows(d.rows ?? []));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  if (rows.length === 0) return <div className="h-[180px] bg-[#1a1a1a] rounded-lg animate-pulse" />;

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={rows} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="dauMiniGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="newMiniGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tick={{ fill: '#4b5563', fontSize: 9 }}
          tickFormatter={d => {
            const dt = new Date(d);
            return dt.getDate() === 1 || dt.getDate() === 15 ? fmt(d) : '';
          }}
          interval={0}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={{ fill: '#4b5563', fontSize: 9 }} axisLine={false} tickLine={false} width={30} />
        <Tooltip
          contentStyle={{ background: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: 6, fontSize: 11 }}
          labelFormatter={l => fmt(String(l))}
          formatter={(val, name) => [Number(val ?? 0).toLocaleString(), name === 'dau' ? 'DAU' : 'New']}
        />
        <Area type="monotone" dataKey="dau" stroke="#10b981" strokeWidth={1.5} fill="url(#dauMiniGrad)" dot={false} isAnimationActive={false} />
        <Area type="monotone" dataKey="new_users" stroke="#60a5fa" strokeWidth={1} fill="url(#newMiniGrad)" dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
