'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { GlobalFilters } from '@/lib/queryHelpers';

export type EarlyActivationView = '48h' | 'week1' | 'timeToSecond' | 'neverActivated';

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

const DIST_COLORS: Record<string, string> = {
  '0': '#ef4444', '1': '#f59e0b', '2': '#a3e635', '3': '#10b981', '4+': '#059669',
};

function Skel() {
  return (
    <div className="space-y-4">
      {[1, 2].map(i => <div key={i} className="h-[200px] bg-[#1a1a1a] rounded-lg animate-pulse" />)}
    </div>
  );
}

function DefBox({ rows }: { rows: { label: string; def: string }[] }) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 mb-5">
      <p className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider mb-2">Definitions</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-[11px]">
        {rows.map(r => (
          <div key={r.label}>
            <span className="text-white font-semibold">{r.label}: </span>
            <span className="text-[#6b7280]">{r.def}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EarlyActivationCard({
  filters,
  view,
}: {
  filters: GlobalFilters;
  view: EarlyActivationView;
}) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend]     = useState<TrendRow[]>([]);
  const [dist, setDist]       = useState<DistRow[]>([]);
  const [time2, setTime2]     = useState<Day2Row[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading || !summary) return <Skel />;

  const zeroWorkoutPct = dist.find(d => d.bucket === '0')?.pct ?? 0;
  const cliffDay = time2.reduce((best, d) => d.users > (time2[best]?.users ?? 0) ? d.day : best, 0);
  const after7 = time2.filter(d => d.day > 7).reduce((s, d) => s + d.users, 0);
  const total2 = time2.reduce((s, d) => s + d.users, 0);
  const after7Pct = total2 > 0 ? Math.round((after7 / total2) * 100) : 0;

  // ── View: % 1st workout within 48h ────────────────────────────────────────
  if (view === '48h') {
    const insight = summary.pct48h >= 30
      ? `Strong early hook — ${summary.pct48h}% of sign-ups complete their first workout within 48h. This is your highest-leverage activation moment.`
      : `Only ${summary.pct48h}% of sign-ups work out in 48h. A same-day push notification at hour 4 could meaningfully lift this.`;
    return (
      <div className="space-y-5">
        <div className="bg-[#1a0f2e] border border-[#7c3aed]/30 rounded-lg px-4 py-3">
          <p className="text-[10px] font-bold text-[#a78bfa] uppercase tracking-wider mb-1">Insight</p>
          <p className="text-sm text-[#ddd6fe]">{insight}</p>
        </div>
        <DefBox rows={[
          { label: 'Cohort', def: 'Users whose sign_up event fired within the selected date window.' },
          { label: '48h window', def: 'Measured from sign_up timestamp. Workout events unrestricted by filter end date.' },
        ]} />
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-4 inline-block mb-1">
          <p className="text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">1st Workout ≤ 48h</p>
          <p className="text-4xl font-bold text-[#a78bfa]">{summary.pct48h}%</p>
          <p className="text-[10px] text-[#4b5563] mt-1">of {summary.cohortSize.toLocaleString()} sign-ups</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
            % 1st workout within 48h — by sign-up week
          </p>
          <ResponsiveContainer width="100%" height={240}>
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
      </div>
    );
  }

  // ── View: ≥2 workouts in week 1 ───────────────────────────────────────────
  if (view === 'week1') {
    const insight = summary.pctTwoWeek1 >= 20
      ? `${summary.pctTwoWeek1}% of sign-ups complete ≥2 workouts in week 1 — strong early momentum predicts long-term retention.`
      : `Only ${summary.pctTwoWeek1}% return for a 2nd workout in week 1. This cohort has the highest churn risk — automate a day-3 re-engagement.`;
    return (
      <div className="space-y-5">
        <div className="bg-[#0a1f18] border border-[#10b981]/30 rounded-lg px-4 py-3">
          <p className="text-[10px] font-bold text-[#10b981] uppercase tracking-wider mb-1">Insight</p>
          <p className="text-sm text-[#a7f3d0]">{insight}</p>
        </div>
        <DefBox rows={[
          { label: 'Cohort', def: 'Users whose sign_up event fired within the selected date window.' },
          { label: 'Week 1', def: 'First 7 days after sign-up (not a calendar week).' },
        ]} />
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-4 inline-block mb-1">
          <p className="text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">≥ 2 Workouts Week 1</p>
          <p className="text-4xl font-bold text-[#10b981]">{summary.pctTwoWeek1}%</p>
          <p className="text-[10px] text-[#4b5563] mt-1">of {summary.cohortSize.toLocaleString()} sign-ups</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
            % ≥2 workouts in week 1 — by sign-up week
          </p>
          <ResponsiveContainer width="100%" height={240}>
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
    );
  }

  // ── View: Time to 2nd workout ─────────────────────────────────────────────
  if (view === 'timeToSecond') {
    const insight = summary.medianDaysToSecond != null
      ? summary.medianDaysToSecond <= 3
        ? `Median of ${summary.medianDaysToSecond} days to 2nd workout — re-engagement window is tight. Automate a day-2 push to capture momentum.`
        : `Median of ${summary.medianDaysToSecond} days — users are slow to return. A day-1 nudge is critical; ${after7Pct}% of 2nd workouts happen after day 7.`
      : `Peak 2nd workout day is day ${cliffDay}. ${after7Pct}% of 2nd workouts happen after day 7 — re-engage before this window closes.`;
    return (
      <div className="space-y-5">
        <div className="bg-[#0e1b2e] border border-[#60a5fa]/30 rounded-lg px-4 py-3">
          <p className="text-[10px] font-bold text-[#60a5fa] uppercase tracking-wider mb-1">Insight</p>
          <p className="text-sm text-[#bfdbfe]">{insight}</p>
        </div>
        <DefBox rows={[
          { label: '2nd workout', def: '2nd workout_completed event per user, tracked up to day 14 post sign-up.' },
          { label: 'Cohort', def: 'Users whose sign_up event fired within the selected date window.' },
        ]} />
        <div className="flex gap-4 flex-wrap mb-1">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-4">
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">Median Days → 2nd</p>
            <p className="text-4xl font-bold text-[#60a5fa]">{summary.medianDaysToSecond ?? '—'}</p>
            <p className="text-[10px] text-[#4b5563] mt-1">days from sign-up</p>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-4">
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">Peak Day</p>
            <p className="text-4xl font-bold text-[#f59e0b]">Day {cliffDay}</p>
            <p className="text-[10px] text-[#4b5563] mt-1">most 2nd workouts</p>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-4">
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">After Day 7</p>
            <p className="text-4xl font-bold text-[#9ca3af]">{after7Pct}%</p>
            <p className="text-[10px] text-[#4b5563] mt-1">of 2nd workouts</p>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
            Days to 2nd workout — day-by-day distribution (drop-off curve)
          </p>
          <ResponsiveContainer width="100%" height={260}>
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
        </div>
      </div>
    );
  }

  // ── View: 0 workouts in week 1 (never activated) ─────────────────────────
  const insight = `${zeroWorkoutPct}% of sign-ups never complete a workout in week 1 — your biggest retention leak. The distribution shows how users spread across 0–4+ workouts.`;
  return (
    <div className="space-y-5">
      <div className="bg-[#1f0e0e] border border-[#ef4444]/30 rounded-lg px-4 py-3">
        <p className="text-[10px] font-bold text-[#ef4444] uppercase tracking-wider mb-1">Insight</p>
        <p className="text-sm text-[#fca5a5]">{insight}</p>
      </div>
      <DefBox rows={[
        { label: 'Week 1', def: 'First 7 days after sign-up (not a calendar week).' },
        { label: 'Buckets', def: '0 = never activated · 1 = tried once · 2–3 = building · 4+ = habit-forming.' },
      ]} />
      <div className="flex gap-4 flex-wrap mb-1">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-4">
          <p className="text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">0 Workouts Week 1</p>
          <p className="text-4xl font-bold text-[#ef4444]">{zeroWorkoutPct}%</p>
          <p className="text-[10px] text-[#4b5563] mt-1">never activated</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-4">
          <p className="text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">4+ Workouts Week 1</p>
          <p className="text-4xl font-bold text-[#059669]">{dist.find(d => d.bucket === '4+')?.pct ?? 0}%</p>
          <p className="text-[10px] text-[#4b5563] mt-1">habit-forming pace</p>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
          Week-1 workout distribution + cumulative %
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dist} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis dataKey="bucket" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={v => v === '0' ? '0 workouts' : v === '4+' ? '4+ workouts' : `${v} workout${v === '1' ? '' : 's'}`} />
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
    </div>
  );
}
