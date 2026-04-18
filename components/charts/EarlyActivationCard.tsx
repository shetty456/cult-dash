'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { GlobalFilters } from '@/lib/queryHelpers';

interface Summary {
  cohortSize: number;
  pct48h: number;
  pctTwoWeek1: number;
  medianDaysToSecond: number | null;
}
interface TrendRow  { week: string; cohortSize: number; pct48h: number; pctTwoWeek1: number; }
interface DistRow   { bucket: string; users: number; pct: number; cumPct: number; }
interface Day2Row   { day: number; users: number; cumPct: number; }

function formatWeek(w: string) {
  const [year, wp] = w.split('-W');
  const n = parseInt(wp, 10);
  const d = new Date(parseInt(year, 10), 0, 1 + (n - 1) * 7);
  return `W${n} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}`;
}
function fmtK(v: number) { return v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v); }

// Bucket colors: 0 = red, 1 = amber, 2 = yellow-green, 3 = green, 4+ = emerald
const DIST_COLORS: Record<string, string> = {
  '0': '#ef4444', '1': '#f59e0b', '2': '#a3e635', '3': '#10b981', '4+': '#059669',
};

export default function EarlyActivationCard({ filters }: { filters: GlobalFilters }) {
  const [summary, setSummary]   = useState<Summary | null>(null);
  const [trend, setTrend]       = useState<TrendRow[]>([]);
  const [dist, setDist]         = useState<DistRow[]>([]);
  const [time2, setTime2]       = useState<Day2Row[]>([]);
  const [loading, setLoading]   = useState(true);

  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams(filters as Record<string, string>);
    fetch(`/api/early-activation?${qs}`)
      .then(r => r.json())
      .then(d => {
        setSummary(d.summary);
        setTrend(d.trend ?? []);
        setDist(d.week1Distribution ?? []);
        setTime2(d.timeToSecondWorkout ?? []);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  if (loading || !summary) {
    return (
      <div className="space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-[200px] bg-[#1a1a1a] rounded-lg animate-pulse" />)}
      </div>
    );
  }

  const zeroWorkoutPct = dist.find(d => d.bucket === '0')?.pct ?? 0;
  const cliffDay = time2.reduce((best, d) => d.users > time2[best]?.users ? d.day : best, 0);
  const after7 = time2.filter(d => d.day > 7).reduce((s, d) => s + d.users, 0);
  const total2 = time2.reduce((s, d) => s + d.users, 0);
  const after7Pct = total2 > 0 ? Math.round((after7 / total2) * 100) : 0;

  const insight = `${summary.pct48h}% of sign-ups complete their first workout within 48h — this is your strongest conversion lever. ${zeroWorkoutPct}% never workout in week 1. Peak re-engagement window for a 2nd workout is day ${cliffDay}; ${after7Pct}% of 2nd workouts happen after day 7.`;

  return (
    <div className="space-y-5">

      {/* Insight */}
      <div className="bg-[#1a0f2e] border border-[#7c3aed]/30 rounded-lg px-4 py-3">
        <p className="text-[10px] font-bold text-[#a78bfa] uppercase tracking-wider mb-1">Auto Insight</p>
        <p className="text-sm text-[#ddd6fe]">{insight}</p>
      </div>

      {/* Definitions */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3">
        <p className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider mb-2">Definitions & Assumptions</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-[11px]">
          <div><span className="text-white font-semibold">Cohort:</span> <span className="text-[#6b7280]">Users whose sign_up event fired within the selected date window.</span></div>
          <div><span className="text-white font-semibold">48h window:</span> <span className="text-[#6b7280]">From sign_up timestamp. Workout events unrestricted by filter end date.</span></div>
          <div><span className="text-white font-semibold">Week 1:</span> <span className="text-[#6b7280]">First 7 days after sign-up (not calendar week).</span></div>
          <div><span className="text-white font-semibold">2nd workout:</span> <span className="text-[#6b7280]">2nd workout_completed event per user, up to day 14 post sign-up.</span></div>
        </div>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-3">
          <p className="text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">1st Workout ≤48h</p>
          <p className="text-2xl font-bold text-[#a78bfa]">{summary.pct48h}%</p>
          <p className="text-[10px] text-[#4b5563] mt-0.5">of sign-up cohort</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-3">
          <p className="text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">≥2 Workouts Week 1</p>
          <p className="text-2xl font-bold text-[#10b981]">{summary.pctTwoWeek1}%</p>
          <p className="text-[10px] text-[#4b5563] mt-0.5">of sign-up cohort</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-3">
          <p className="text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">Median Days → 2nd</p>
          <p className="text-2xl font-bold text-[#60a5fa]">{summary.medianDaysToSecond ?? '—'}</p>
          <p className="text-[10px] text-[#4b5563] mt-0.5">days from sign-up</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-3">
          <p className="text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">0 Workouts Week 1</p>
          <p className="text-2xl font-bold text-[#ef4444]">{zeroWorkoutPct}%</p>
          <p className="text-[10px] text-[#4b5563] mt-0.5">never activated</p>
        </div>
      </div>

      {/* Trend lines — % 48h and % ≥2 week1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
            % 1st workout within 48h — by sign-up week
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="week" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={formatWeek} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={34} tickFormatter={v => `${v}%`} />
              <Tooltip
                contentStyle={{ background: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: 8, fontSize: 12 }}
                labelFormatter={l => formatWeek(String(l))}
                formatter={(val, _, entry) => [`${val}% (cohort: ${(entry.payload as TrendRow).cohortSize})`, '1st workout ≤48h']}
              />
              <Line type="monotone" dataKey="pct48h" stroke="#a78bfa" strokeWidth={2.5}
                dot={{ r: 4, fill: '#a78bfa', strokeWidth: 0 }} activeDot={{ r: 6 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
            % ≥2 workouts in week 1 — by sign-up week
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="week" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={formatWeek} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={34} tickFormatter={v => `${v}%`} />
              <Tooltip
                contentStyle={{ background: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: 8, fontSize: 12 }}
                labelFormatter={l => formatWeek(String(l))}
                formatter={(val, _, entry) => [`${val}% (cohort: ${(entry.payload as TrendRow).cohortSize})`, '≥2 workouts week 1']}
              />
              <Line type="monotone" dataKey="pctTwoWeek1" stroke="#10b981" strokeWidth={2.5}
                dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distribution charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Week-1 workout distribution + cumulative */}
        <div>
          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
            Week-1 workout distribution + cumulative %
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dist} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="bucket" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => v === '0' ? '0 workouts' : v === '4+' ? '4+ workouts' : `${v} workout${v==='1'?'':'s'}`} />
              <YAxis yAxisId="left" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={42} tickFormatter={fmtK} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={34} tickFormatter={v => `${v}%`} />
              <Tooltip
                contentStyle={{ background: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: 8, fontSize: 12 }}
                formatter={(val, name) => name === 'users' ? [fmtK(Number(val)), 'Users'] : [`${val}%`, 'Cumulative %']}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} formatter={v => v === 'users' ? 'Users' : 'Cumulative %'} />
              <Bar yAxisId="left" dataKey="users" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {dist.map((d, i) => <Cell key={i} fill={DIST_COLORS[d.bucket] ?? '#6b7280'} />)}
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="cumPct" stroke="#f59e0b" strokeWidth={2}
                dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Time to 2nd workout — day-by-day distribution + cumulative */}
        <div>
          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
            Days to 2nd workout (drop-off curve)
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={time2} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => `D${v}`} />
              <YAxis yAxisId="left" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={42} tickFormatter={fmtK} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={34} tickFormatter={v => `${v}%`} />
              <Tooltip
                contentStyle={{ background: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: 8, fontSize: 12 }}
                formatter={(val, name) => name === 'users' ? [fmtK(Number(val)), 'Users'] : [`${val}%`, 'Cumulative %']}
                labelFormatter={l => `Day ${l} after sign-up`}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} formatter={v => v === 'users' ? 'Users' : 'Cumulative %'} />
              <Bar yAxisId="left" dataKey="users" fill="#60a5fa" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              <Line yAxisId="right" type="monotone" dataKey="cumPct" stroke="#f59e0b" strokeWidth={2}
                dot={false} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-[#4b5563] mt-2 italic">
            Peak: day {cliffDay} · {after7Pct}% of 2nd workouts happen after day 7 — re-engage before this window closes
          </p>
        </div>
      </div>
    </div>
  );
}
