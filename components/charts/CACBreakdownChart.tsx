'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine, Legend,
} from 'recharts';
import { GlobalFilters } from '@/lib/queryHelpers';

interface ChannelRow { channel: string; cac: number; users: number; color: string; }
interface TrendRow { month: string; blended: number; paid: number; organic: number; }

function Skeleton() {
  return <div className="h-[260px] bg-[#1a1a1a] rounded-lg animate-pulse" />;
}

export default function CACBreakdownChart({ filters }: { filters: GlobalFilters }) {
  const [byChannel, setByChannel] = useState<ChannelRow[]>([]);
  const [trend, setTrend] = useState<TrendRow[]>([]);
  const [loading, setLoading] = useState(true);

  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams(filters as Record<string, string>);
    fetch(`/api/cac?${qs}`)
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
        <div className="h-12 bg-[#1a1a1a] rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2"><Skeleton /></div>
          <div className="lg:col-span-3"><Skeleton /></div>
        </div>
      </div>
    );
  }

  const sorted = [...byChannel].sort((a, b) => a.cac - b.cac);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const blendedAvg = Math.round(byChannel.reduce((s, c) => s + c.cac * c.users, 0) / byChannel.reduce((s, c) => s + c.users, 0));
  const bestDiff = Math.round(((blendedAvg - best.cac) / blendedAvg) * 100);
  const worstDiff = Math.round(((worst.cac - blendedAvg) / blendedAvg) * 100);
  const insight = `${best.channel} is ${bestDiff}% below blended CAC. ${worst.channel} is ${worstDiff}% above — cut or optimize.`;

  return (
    <div className="space-y-4">
      <div className="bg-[#2a1515] border border-[#ef4444]/30 rounded-lg px-4 py-3">
        <p className="text-[10px] font-bold text-[#ef4444] uppercase tracking-wider mb-1">Auto Insight</p>
        <p className="text-sm text-[#fecaca]">{insight}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">CAC by Channel (₹) — Target ₹750</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byChannel} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="channel" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} angle={-25} textAnchor="end" />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={40} tickFormatter={v => `₹${v}`} />
              <Tooltip
                contentStyle={{ background: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: 8, fontSize: 12 }}
                formatter={(val) => [`₹${Number(val ?? 0).toLocaleString()}`, 'CAC']}
              />
              <ReferenceLine y={750} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'Target ₹750', position: 'insideTopRight', fill: '#f59e0b', fontSize: 10 }} />
              <Bar dataKey="cac" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {byChannel.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-3">
          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">CAC Trend — Last 6 Months (₹)</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={40} tickFormatter={v => `₹${v}`} />
              <Tooltip
                contentStyle={{ background: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: 8, fontSize: 12 }}
                formatter={(val, name) => [`₹${Number(val ?? 0).toLocaleString()}`, String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} formatter={v => v.charAt(0).toUpperCase() + v.slice(1)} />
              <Line type="monotone" dataKey="blended" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="paid" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="organic" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
