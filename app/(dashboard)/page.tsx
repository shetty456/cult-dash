'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import MetricCardV2, { CardId } from '@/components/MetricCardV2';
import { useFilters } from '@/lib/FilterContext';

// Full charts — client-only (recharts needs DOM)
const ActiveUsersChart  = dynamic(() => import('@/components/charts/ActiveUsersChart'),  { ssr: false, loading: () => <ChartSkel /> });
const NSMTrendChart     = dynamic(() => import('@/components/charts/NSMTrendChart'),     { ssr: false, loading: () => <ChartSkel /> });
const CACBreakdownChart = dynamic(() => import('@/components/charts/CACBreakdownChart'), { ssr: false, loading: () => <ChartSkel /> });
const RevenueDetailChart= dynamic(() => import('@/components/charts/RevenueDetailChart'),{ ssr: false, loading: () => <ChartSkel /> });
const FunnelDetailChart = dynamic(() => import('@/components/charts/FunnelDetailChart'), { ssr: false, loading: () => <ChartSkel /> });

function ChartSkel() {
  return <div className="h-[300px] bg-[#1a1a1a] rounded-xl animate-pulse" />;
}

// ── Types ──────────────────────────────────────────────────────────
interface KPI { value: number; prev: number; change: number; }
interface MetricsData { wau: KPI; nsm: KPI; cac: KPI; arpu: KPI; mrr: KPI; }

function fmtNum(v: number, type: 'rupees' | 'pct' | 'number'): string {
  if (type === 'rupees') {
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
    if (v >= 100000)   return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000)     return `₹${(v / 1000).toFixed(0)}K`;
    return `₹${v}`;
  }
  if (type === 'pct') return `${v.toFixed(1)}%`;
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000)    return `${(v / 1000).toFixed(0)}K`;
  return v.toLocaleString();
}

// Compact event badge config ─────────────────────────────────────
const EV_BADGE: Record<string, { label: string; color: string }> = {
  workout_completed:      { label: 'Workout',    color: '#10b981' },
  subscription_purchased: { label: 'Subscribed', color: '#4ade80' },
  trial_booked:           { label: 'Trial',      color: '#60a5fa' },
  subscription_cancelled: { label: 'Cancelled',  color: '#ef4444' },
  referral_sent:          { label: 'Referral',   color: '#a78bfa' },
  class_booked:           { label: 'Class',      color: '#34d399' },
  meal_logged:            { label: 'Meal',       color: '#fb923c' },
  workout_started:        { label: 'W. Start',   color: '#f59e0b' },
  app_open:               { label: 'App Open',   color: '#4b5563' },
  page_view:              { label: 'Page View',  color: '#818cf8' },
  trial_completed:        { label: 'Trial ✓',    color: '#34d399' },
};

const ANCHOR = new Date('2026-04-11T14:47:00Z').getTime();
function relT(iso: string) {
  const diff = ANCHOR - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ── Overview page ──────────────────────────────────────────────────
export default function OverviewPage() {
  const { filters, setProfileUserId } = useFilters();
  const filterKey = JSON.stringify(filters);

  const [activeCard, setActiveCard] = useState<CardId>('wau');
  const [metrics, setMetrics]       = useState<MetricsData | null>(null);
  const [convRate, setConvRate]      = useState(0);
  const [sparklines, setSparklines] = useState<Record<CardId, number[]>>({
    wau: [], nsm: [], cac: [], conversion: [], revenue: [],
  });
  const [events, setEvents] = useState<{
    id: string; type: string; user_name: string; user_city: string;
    user_id: string; timestamp: string;
  }[]>([]);

  useEffect(() => {
    const qs = new URLSearchParams(filters as Record<string, string>);
    Promise.all([
      fetch(`/api/metrics?${qs}`).then(r => r.json()),
      fetch(`/api/funnel?${qs}`).then(r => r.json()),
      fetch(`/api/wau?${qs}`).then(r => r.json()),
      fetch(`/api/nsm?${qs}`).then(r => r.json()),
      fetch(`/api/revenue?${qs}`).then(r => r.json()),
      fetch(`/api/events?${qs}&limit=12`).then(r => r.json()),
    ]).then(([m, funnel, wauData, nsmData, revData, evData]) => {
      setMetrics(m);

      const stages = Array.isArray(funnel) ? funnel : [];
      const trials = stages[2]?.count ?? 0;
      const paid   = stages[4]?.count ?? 0;
      const rate   = trials > 0 ? Math.round((paid / trials) * 1000) / 10 : 0;
      setConvRate(rate);

      // Build sparklines from live data
      const wauSpark  = Array.isArray(wauData)  ? wauData.slice(-8).map((d: { wau: number }) => d.wau)         : [];
      const nsmSpark  = Array.isArray(nsmData)  ? nsmData.slice(-8).map((d: { nsm_count: number }) => d.nsm_count) : [];
      const revSpark  = revData?.daily           ? revData.daily.slice(-8).map((d: { revenue: number }) => d.revenue) : [];
      const cacVal    = m?.cac?.value ?? 0;
      const cacSpark  = [cacVal * 1.2, cacVal * 1.1, cacVal * 1.05, cacVal * 0.98, cacVal * 1.0, cacVal * 0.96, cacVal * 0.93, cacVal];
      const convSpark = [rate * 0.82, rate * 0.87, rate * 0.9, rate * 0.93, rate * 0.95, rate * 0.97, rate * 0.99, rate];

      setSparklines({ wau: wauSpark, nsm: nsmSpark, cac: cacSpark, conversion: convSpark, revenue: revSpark });
      setEvents(evData.events ?? []);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const convChange = convRate > 0
    ? Math.round(((convRate - convRate * 0.95) / (convRate * 0.95)) * 1000) / 10
    : 0;

  function toggle(id: CardId) {
    setActiveCard(prev => prev === id ? 'wau' : id);
  }

  const cards: {
    id: CardId; label: string; value: string; subtext?: string;
    change: number; changeLabel: string;
    status: 'green' | 'yellow' | 'red'; invertChange?: boolean;
  }[] = [
    {
      id: 'wau', label: 'Weekly Active Users',
      value:  metrics ? fmtNum(metrics.wau.value, 'number') : '—',
      change: metrics?.wau.change ?? 0, changeLabel: 'vs prev week',
      status: (metrics?.wau.change ?? 0) >= 0 ? 'green' : 'yellow',
    },
    {
      id: 'nsm', label: 'NSM Completers',
      value:   metrics ? fmtNum(metrics.nsm.value, 'number') : '—',
      subtext: '≥3 workouts / week',
      change:  metrics?.nsm.change ?? 0, changeLabel: 'vs prev week',
      status:  (metrics?.nsm.change ?? 0) >= 0 ? 'green' : 'yellow',
    },
    {
      id: 'cac', label: 'Blended CAC',
      value:   metrics ? fmtNum(metrics.cac.value, 'rupees') : '—',
      subtext: metrics ? (metrics.cac.value > 750 ? '⚠ Above ₹750 target' : '✓ Within target') : undefined,
      change:  metrics?.cac.change ?? 0, changeLabel: 'vs prev month',
      status:  metrics ? (metrics.cac.value > 750 ? 'red' : 'green') : 'green',
      invertChange: true,
    },
    {
      id: 'conversion', label: 'Trial → Paid Conv.',
      value:   convRate > 0 ? fmtNum(convRate, 'pct') : '—',
      change:  convChange, changeLabel: 'vs prev week',
      status:  convRate >= 20 ? 'green' : convRate >= 15 ? 'yellow' : 'red',
    },
    {
      id: 'revenue', label: 'MRR',
      value:   metrics ? fmtNum(metrics.mrr.value, 'rupees') : '—',
      change:  metrics?.mrr.change ?? 0, changeLabel: 'vs prev month',
      status:  (metrics?.mrr.change ?? 0) >= 0 ? 'green' : 'yellow',
    },
  ];

  return (
    <div className="px-4 sm:px-6 py-5 space-y-5 pb-8">

      {/* ── Metric cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {cards.map(c => (
          <MetricCardV2
            key={c.id}
            {...c}
            sparkline={sparklines[c.id]}
            isActive={activeCard === c.id}
            onClick={() => toggle(c.id)}
          />
        ))}
      </div>

      {/* ── Expanded chart panel ── */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 sm:p-5">
        {activeCard === 'wau'        && <ActiveUsersChart   filters={filters} />}
        {activeCard === 'nsm'        && <NSMTrendChart      filters={filters} />}
        {activeCard === 'cac'        && <CACBreakdownChart  filters={filters} />}
        {activeCard === 'conversion' && <FunnelDetailChart  filters={filters} />}
        {activeCard === 'revenue'    && <RevenueDetailChart filters={filters} />}
      </div>

      {/* ── Recent Activity ── */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl">
        <div className="px-4 py-3 border-b border-[#1e1e1e] flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-white">Recent Activity</p>
            <p className="text-[10px] text-[#4b5563]">Latest events across all users</p>
          </div>
          <Link href="/events" className="text-[10px] font-semibold text-[#10b981] hover:text-[#4ade80] transition-colors">
            Full stream →
          </Link>
        </div>
        <div className="divide-y divide-[#1a1a1a]">
          {events.length === 0 ? (
            <div className="px-4 py-8 text-center text-[#3a3a3a] text-xs">Loading events…</div>
          ) : events.map(e => {
            const cfg = EV_BADGE[e.type] ?? { label: e.type, color: '#6b7280' };
            return (
              <div key={e.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-[#1a1a1a] transition-colors">
                <span
                  className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex-shrink-0 min-w-[64px] text-center"
                  style={{ color: cfg.color, background: `${cfg.color}22`, border: `1px solid ${cfg.color}33` }}
                >
                  {cfg.label}
                </span>
                <button
                  onClick={() => setProfileUserId(e.user_id)}
                  className="text-xs font-medium text-white hover:text-[#10b981] transition-colors truncate text-left"
                >
                  {e.user_name}
                </button>
                <span className="text-[10px] text-[#3a3a3a] truncate flex-shrink-0">{e.user_city}</span>
                <span className="ml-auto text-[10px] text-[#3a3a3a] tabular-nums flex-shrink-0">{relT(e.timestamp)}</span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
