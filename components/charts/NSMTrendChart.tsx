'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts';
import { GlobalFilters } from '@/lib/queryHelpers';

interface NsmRow { week: string; wau: number; nsm_count: number; nsm_rate: number; }
interface WorkoutRow { type: string; count: number; pct: number; }

const WORKOUT_COLORS = ['#10b981','#4ade80','#60a5fa','#f59e0b','#a78bfa','#f97316','#ec4899','#34d399'];

function Skeleton() {
  return <div className="h-[260px] bg-[#1a1a1a] rounded-lg animate-pulse" />;
}

export default function NSMTrendChart({ filters }: { filters: GlobalFilters }) {
  const [nsm, setNsm] = useState<NsmRow[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [loading, setLoading] = useState(true);

  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams(filters as Record<string, string>);
    Promise.all([
      fetch(`/api/nsm?${qs}`).then(r => r.json()),
      fetch(`/api/workout-types?${qs}`).then(r => r.json()),
    ]).then(([nsmData, workoutData]) => {
      setNsm(Array.isArray(nsmData) ? nsmData : []);
      setWorkouts(Array.isArray(workoutData) ? workoutData : []);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  if (loading || nsm.length === 0) {
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

  const recent = nsm.slice(-4);
  const rateFirst = recent[0]?.nsm_rate ?? 0;
  const rateLast = recent[recent.length - 1]?.nsm_rate ?? 0;
  const rateDelta = Math.round((rateLast - rateFirst) * 10) / 10;
  const direction = rateDelta >= 0 ? 'up' : 'down';
  const topWorkout = workouts[0];
  const insight = `NSM rate is ${direction} ${Math.abs(rateDelta)}% over 4 weeks. ${topWorkout?.type ?? '—'} drives ${topWorkout?.pct ?? 0}% of habit completions.`;

  return (
    <div className="space-y-4">
      <div className="bg-[#0f2d1f] border border-[#10b981]/30 rounded-lg px-4 py-3">
        <p className="text-[10px] font-bold text-[#10b981] uppercase tracking-wider mb-1">Auto Insight</p>
        <p className="text-sm text-[#d1fae5]">{insight}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">NSM Trend — Weekly Habit Completers</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={nsm} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="week" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="count" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
              <YAxis yAxisId="rate" orientation="right" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={35} tickFormatter={v => `${v}%`} />
              <Tooltip
                contentStyle={{ background: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: 8, fontSize: 12 }}
                formatter={(val, name) => [
                  name === 'nsm_count' ? Number(val ?? 0).toLocaleString() : `${Number(val ?? 0)}%`,
                  name === 'nsm_count' ? 'NSM Count' : 'NSM Rate',
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} formatter={v => v === 'nsm_count' ? 'NSM Count' : 'NSM Rate %'} />
              <Line yAxisId="count" type="monotone" dataKey="nsm_count" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} isAnimationActive={false} />
              <Line yAxisId="rate" type="monotone" dataKey="nsm_rate" stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2">
          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">Workout Types — Completions</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={workouts} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="type" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={65} />
              <Tooltip
                contentStyle={{ background: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: 8, fontSize: 12 }}
                formatter={(val, _name, entry) => [`${Number(val ?? 0)} (${(entry.payload as {pct:number}).pct}%)`, 'Workouts']}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {workouts.map((_, idx) => (
                  <Cell key={idx} fill={WORKOUT_COLORS[idx % WORKOUT_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
