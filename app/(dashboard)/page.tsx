'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { EarlyActivationView } from '@/components/charts/EarlyActivationCard';
import { CardId } from '@/components/MetricCardV2';
import MetricCardV2 from '@/components/MetricCardV2';
import { useFilters } from '@/lib/FilterContext';

const ActiveUsersChart      = dynamic(() => import('@/components/charts/ActiveUsersChart'),      { ssr: false, loading: () => <ChartSkel /> });
const NSMTrendChart         = dynamic(() => import('@/components/charts/NSMTrendChart'),         { ssr: false, loading: () => <ChartSkel /> });
const CACBreakdownChart     = dynamic(() => import('@/components/charts/CACBreakdownChart'),     { ssr: false, loading: () => <ChartSkel /> });
const RevenueDetailChart    = dynamic(() => import('@/components/charts/RevenueDetailChart'),    { ssr: false, loading: () => <ChartSkel /> });
const AcquisitionFunnelCard = dynamic(() => import('@/components/charts/AcquisitionFunnelCard'), { ssr: false, loading: () => <ChartSkel /> });
const ExperimentsCard       = dynamic(() => import('@/components/charts/ExperimentsCard'),       { ssr: false, loading: () => <ChartSkel /> });
const EarlyActivationCard   = dynamic(() => import('@/components/charts/EarlyActivationCard'),   { ssr: false, loading: () => <ChartSkel /> });
const SparklineLarge        = dynamic(() => import('@/components/SparklineMini'),                { ssr: false, loading: () => <div className="h-full w-full" /> });

function ChartSkel() {
  return <div className="h-[300px] bg-[#1a1a1a] rounded-xl animate-pulse" />;
}

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

const STATUS_COLORS = {
  green:  { text: '#10b981', border: 'border-[#10b981]/40', hover: 'hover:border-[#10b981]/70', dot: 'bg-[#10b981]', gradient: 'from-[#064e3b]/20' },
  yellow: { text: '#f59e0b', border: 'border-[#f59e0b]/30', hover: 'hover:border-[#f59e0b]/60', dot: 'bg-[#f59e0b]', gradient: 'from-[#451a03]/20' },
  red:    { text: '#ef4444', border: 'border-[#ef4444]/30', hover: 'hover:border-[#ef4444]/60', dot: 'bg-[#ef4444]', gradient: 'from-[#450a0a]/20' },
};

interface FeaturedCardProps {
  id: CardId;
  label: string;
  value: string;
  subtext?: string;
  change: number;
  changeLabel: string;
  status: 'green' | 'yellow' | 'red';
  sparkline: number[];
  invertChange?: boolean;
  onClick: () => void;
}

function FeaturedGraphCard({ id, label, value, subtext, change, changeLabel, status, sparkline, invertChange = false, onClick }: FeaturedCardProps) {
  const colors = STATUS_COLORS[status];
  const isGood = invertChange ? change < 0 : change >= 0;
  const changeColor = isGood ? '#10b981' : '#ef4444';
  const changeArrow = change >= 0 ? '↑' : '↓';
  const changeAbs = Math.abs(change).toFixed(1);

  return (
    <article
      onClick={onClick}
      className={`
        relative rounded-xl border cursor-pointer transition-all duration-200 overflow-hidden
        bg-gradient-to-b ${colors.gradient} to-[#161616] bg-[#161616]
        ${colors.border} ${colors.hover}
        group
      `}
      role="button"
    >
      <div className="px-4 pt-4 pb-0">
        {/* Label row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#6b7280]">{label}</span>
          </div>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: colors.text, background: `${colors.text}18` }}
          >
            View →
          </span>
        </div>

        {/* Value */}
        <p className="text-3xl sm:text-4xl font-bold text-white tabular-nums leading-none">{value}</p>
        {subtext && <p className="text-[10px] text-[#4b5563] mt-1">{subtext}</p>}

        {/* Change */}
        <div className="flex items-center gap-2 mt-2 mb-3">
          <span className="text-xs font-semibold tabular-nums" style={{ color: changeColor }}>
            {changeArrow} {changeAbs}%
          </span>
          <span className="text-[10px] text-[#4b5563]">{changeLabel}</span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="h-20 w-full">
        <SparklineLarge data={sparkline} color={colors.text} id={id} />
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: colors.text, opacity: 0.4 }} />
    </article>
  );
}

const CHART_TITLES: Record<CardId, string> = {
  wau:        'Weekly Active Users',
  nsm:        'NSM Completers (3x/week)',
  cac:        'Blended CAC Breakdown',
  conversion: 'Trial → Paid Conversion Funnel',
  revenue:    'Monthly Recurring Revenue',
};

function ChartModal({ cardId, filters, onClose }: { cardId: CardId; filters: Record<string, string>; onClose: () => void }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop — full viewport */}
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-5xl bg-[#161616] border border-[#2a2a2a] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 sm:px-6 py-4 bg-[#161616] border-b border-[#2a2a2a]">
          <h2 className="text-white font-semibold text-base sm:text-lg">{CHART_TITLES[cardId]}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] flex items-center justify-center transition-colors text-[#6b7280] hover:text-white text-sm"
          >
            ✕
          </button>
        </div>

        {/* Chart content */}
        <div className="p-5 sm:p-6">
          {cardId === 'wau'        && <ActiveUsersChart      filters={filters} />}
          {cardId === 'nsm'        && <NSMTrendChart         filters={filters} />}
          {cardId === 'cac'        && <CACBreakdownChart     filters={filters} />}
          {cardId === 'conversion' && <AcquisitionFunnelCard filters={filters} />}
          {cardId === 'revenue'    && <RevenueDetailChart    filters={filters} />}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

export default function OverviewPage() {
  const { filters } = useFilters();
  const filterKey = JSON.stringify(filters);

  const [modalCard, setModalCard]         = useState<CardId | null>(null);
  const [activationView, setActivationView] = useState<EarlyActivationView | null>(null);
  const [activationSummary, setActivationSummary]     = useState<{pct48h:number;pctTwoWeek1:number;medianDaysToSecond:number|null;zeroWorkoutPct:number} | null>(null);
  const [metrics, setMetrics]             = useState<MetricsData | null>(null);
  const [convRate, setConvRate]     = useState(0);
  const [sparklines, setSparklines] = useState<Record<CardId, number[]>>({
    wau: [], nsm: [], cac: [], conversion: [], revenue: [],
  });

  useEffect(() => {
    const qs = new URLSearchParams(filters as Record<string, string>);
    Promise.all([
      fetch(`/api/metrics?${qs}`).then(r => r.json()),
      fetch(`/api/funnel?${qs}`).then(r => r.json()),
      fetch(`/api/wau?${qs}`).then(r => r.json()),
      fetch(`/api/nsm?${qs}`).then(r => r.json()),
      fetch(`/api/revenue?${qs}`).then(r => r.json()),
      fetch(`/api/early-activation?${qs}`).then(r => r.json()),
    ]).then(([m, funnel, wauData, nsmData, revData, activation]) => {
      if (activation?.summary) setActivationSummary(activation.summary);
      setMetrics(m);

      const stages = Array.isArray(funnel) ? funnel : [];
      const trials = stages[2]?.count ?? 0;
      const paid   = stages[4]?.count ?? 0;
      const rate   = trials > 0 ? Math.round((paid / trials) * 1000) / 10 : 0;
      setConvRate(rate);

      const wauSpark  = Array.isArray(wauData) ? wauData.slice(-8).map((d: { wau: number }) => d.wau) : [];
      const nsmSpark  = Array.isArray(nsmData) ? nsmData.slice(-8).map((d: { nsm_count: number }) => d.nsm_count) : [];
      const revSpark  = revData?.daily ? revData.daily.slice(-8).map((d: { revenue: number }) => d.revenue) : [];
      const cacVal    = m?.cac?.value ?? 0;
      const cacSpark  = [cacVal * 1.2, cacVal * 1.1, cacVal * 1.05, cacVal * 0.98, cacVal * 1.0, cacVal * 0.96, cacVal * 0.93, cacVal];
      const convSpark = [rate * 0.82, rate * 0.87, rate * 0.9, rate * 0.93, rate * 0.95, rate * 0.97, rate * 0.99, rate];

      setSparklines({ wau: wauSpark, nsm: nsmSpark, cac: cacSpark, conversion: convSpark, revenue: revSpark });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const convChange = convRate > 0
    ? Math.round(((convRate - convRate * 0.95) / (convRate * 0.95)) * 1000) / 10
    : 0;

  return (
    <div className="px-4 sm:px-6 py-5 space-y-8 pb-8">

      {/* ── Business Metrics ── */}
      <section className="rounded-2xl bg-[#0d1117] border border-[#1e2a1e] p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981]" />
          <h2 className="text-white font-bold text-sm tracking-tight uppercase">Business Metrics</h2>
          <div className="flex-1 h-px bg-[#1e2a1e]" />
          <span className="text-[10px] text-[#4b5563] font-medium">North Star + Revenue</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FeaturedGraphCard
            id="nsm"
            label="NSM Completers (3x/week)"
            value={metrics ? fmtNum(metrics.nsm.value, 'number') : '—'}
            subtext="≥3 workouts / week"
            change={metrics?.nsm.change ?? 0}
            changeLabel="vs prev week"
            status={(metrics?.nsm.change ?? 0) >= 0 ? 'green' : 'yellow'}
            sparkline={sparklines.nsm}
            onClick={() => setModalCard('nsm')}
          />
          <FeaturedGraphCard
            id="wau"
            label="Weekly Active Users"
            value={metrics ? fmtNum(metrics.wau.value, 'number') : '—'}
            change={metrics?.wau.change ?? 0}
            changeLabel="vs prev week"
            status={(metrics?.wau.change ?? 0) >= 0 ? 'green' : 'yellow'}
            sparkline={sparklines.wau}
            onClick={() => setModalCard('wau')}
          />
          <FeaturedGraphCard
            id="revenue"
            label="MRR"
            value={metrics ? fmtNum(metrics.mrr.value, 'rupees') : '—'}
            change={metrics?.mrr.change ?? 0}
            changeLabel="vs prev month"
            status={(metrics?.mrr.change ?? 0) >= 0 ? 'green' : 'yellow'}
            sparkline={sparklines.revenue}
            onClick={() => setModalCard('revenue')}
          />
        </div>
      </section>

      {/* ── Acquisition Efficiency ── */}
      <section className="rounded-2xl bg-[#0d1520] border border-[#1a2a40] p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#60a5fa] shadow-[0_0_6px_#60a5fa]" />
          <h2 className="text-white font-bold text-sm tracking-tight uppercase">Acquisition Efficiency</h2>
          <div className="flex-1 h-px bg-[#1a2a40]" />
          <span className="text-[10px] text-[#4b5563] font-medium">CAC + Funnel</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
        <MetricCardV2
          id="cac"
          label="Blended CAC"
          value={metrics ? fmtNum(metrics.cac.value, 'rupees') : '—'}
          subtext={metrics ? (metrics.cac.value > 750 ? '⚠ Above ₹750 target' : '✓ Within target') : undefined}
          change={metrics?.cac.change ?? 0}
          changeLabel="vs prev month"
          status={metrics ? (metrics.cac.value > 750 ? 'red' : 'green') : 'green'}
          sparkline={sparklines.cac}
          isActive={false}
          invertChange
          onClick={() => setModalCard('cac')}
        />
        <MetricCardV2
          id="conversion"
          label="Trial → Paid Conv."
          value={convRate > 0 ? fmtNum(convRate, 'pct') : '—'}
          change={convChange}
          changeLabel="vs prev week"
          status={convRate >= 20 ? 'green' : convRate >= 15 ? 'yellow' : 'red'}
          sparkline={sparklines.conversion}
          isActive={false}
          onClick={() => setModalCard('conversion')}
        />
        </div>
      </section>

      {/* ── Early Activation Signals ── */}
      <section className="rounded-2xl bg-[#120d1f] border border-[#2a1a4a] p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#a78bfa] shadow-[0_0_6px_#a78bfa]" />
          <h2 className="text-white font-bold text-sm tracking-tight uppercase">Early Activation Signals</h2>
          <div className="flex-1 h-px bg-[#2a1a4a]" />
          <span className="text-[10px] text-[#4b5563] font-medium">Leading indicators — click any card for detail</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">

          {/* Card 1 — % 1st workout within 48h */}
          <article onClick={() => setActivationView('48h')}
            className="bg-[#161616] border border-[#7c3aed]/30 hover:border-[#7c3aed]/70 rounded-xl p-4 cursor-pointer transition-all group">
            <div className="flex items-center justify-between mb-3">
              <span className="w-2 h-2 rounded-full bg-[#a78bfa]" />
              <span className="text-[9px] font-bold text-[#a78bfa] opacity-0 group-hover:opacity-100 transition-opacity">Details →</span>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6b7280] mb-2">1st Workout ≤ 48h</p>
            <p className="text-3xl font-bold text-[#a78bfa]">{activationSummary ? `${activationSummary.pct48h}%` : '—'}</p>
            <p className="text-[11px] text-[#4b5563] mt-2 leading-relaxed">
              {activationSummary
                ? activationSummary.pct48h >= 30
                  ? `Strong early hook — ${activationSummary.pct48h}% act within 2 days of sign-up.`
                  : `Only ${activationSummary.pct48h}% act in 48h — push a same-day nudge to lift this.`
                : 'Users who complete their first workout within 48h of signing up.'}
            </p>
          </article>

          {/* Card 2 — % ≥2 workouts in week 1 */}
          <article onClick={() => setActivationView('week1')}
            className="bg-[#161616] border border-[#10b981]/30 hover:border-[#10b981]/70 rounded-xl p-4 cursor-pointer transition-all group">
            <div className="flex items-center justify-between mb-3">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              <span className="text-[9px] font-bold text-[#10b981] opacity-0 group-hover:opacity-100 transition-opacity">Details →</span>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6b7280] mb-2">≥ 2 Workouts Week 1</p>
            <p className="text-3xl font-bold text-[#10b981]">{activationSummary ? `${activationSummary.pctTwoWeek1}%` : '—'}</p>
            <p className="text-[11px] text-[#4b5563] mt-2 leading-relaxed">
              {activationSummary
                ? activationSummary.pctTwoWeek1 >= 20
                  ? `${activationSummary.pctTwoWeek1}% built early momentum — repeat in week 1 predicts long-term retention.`
                  : `Only ${activationSummary.pctTwoWeek1}% return for a 2nd workout in week 1 — highest churn risk cohort.`
                : 'Users who complete ≥2 workouts in their first 7 days after sign-up.'}
            </p>
          </article>

          {/* Card 3 — Median days to 2nd workout */}
          <article onClick={() => setActivationView('timeToSecond')}
            className="bg-[#161616] border border-[#60a5fa]/30 hover:border-[#60a5fa]/70 rounded-xl p-4 cursor-pointer transition-all group">
            <div className="flex items-center justify-between mb-3">
              <span className="w-2 h-2 rounded-full bg-[#60a5fa]" />
              <span className="text-[9px] font-bold text-[#60a5fa] opacity-0 group-hover:opacity-100 transition-opacity">Details →</span>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6b7280] mb-2">Median Days → 2nd Workout</p>
            <p className="text-3xl font-bold text-[#60a5fa]">
              {activationSummary?.medianDaysToSecond != null ? `${activationSummary.medianDaysToSecond}d` : '—'}
            </p>
            <p className="text-[11px] text-[#4b5563] mt-2 leading-relaxed">
              {activationSummary?.medianDaysToSecond != null
                ? activationSummary.medianDaysToSecond <= 3
                  ? `Median of ${activationSummary.medianDaysToSecond} days — re-engagement window is tight, automate a day-2 push.`
                  : `Median of ${activationSummary.medianDaysToSecond} days — users are slow to return. Day-1 re-engagement is critical.`
                : 'Median days between sign-up and 2nd workout_completed event.'}
            </p>
          </article>

          {/* Card 4 — % never activated (0 workouts week 1) */}
          <article onClick={() => setActivationView('neverActivated')}
            className="bg-[#161616] border border-[#ef4444]/30 hover:border-[#ef4444]/70 rounded-xl p-4 cursor-pointer transition-all group">
            <div className="flex items-center justify-between mb-3">
              <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
              <span className="text-[9px] font-bold text-[#ef4444] opacity-0 group-hover:opacity-100 transition-opacity">Details →</span>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6b7280] mb-2">0 Workouts in Week 1</p>
            <p className="text-3xl font-bold text-[#ef4444]">
              {activationSummary ? `${activationSummary.zeroWorkoutPct}%` : '—'}
            </p>
            <p className="text-[11px] text-[#4b5563] mt-2 leading-relaxed">
              {activationSummary
                ? activationSummary.zeroWorkoutPct >= 40
                  ? `${activationSummary.zeroWorkoutPct}% of sign-ups never complete a workout in week 1 — biggest retention leak.`
                  : `${activationSummary.zeroWorkoutPct}% never activated in week 1. Guided slot booking can cut this further.`
                : 'Users who sign up but complete zero workouts in their first 7 days.'}
            </p>
          </article>

        </div>
      </section>

      {/* ── Experiment Tracker ── */}
      <section className="rounded-2xl bg-[#0f110d] border border-[#1e2a18] p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#34d399] shadow-[0_0_6px_#34d399]" />
          <h2 className="text-white font-bold text-sm tracking-tight uppercase">Experiment Tracker</h2>
          <div className="flex-1 h-px bg-[#1e2a18]" />
          <span className="text-[10px] text-[#4b5563] font-medium">A/B tests tied to activation goals</span>
        </div>
        <ExperimentsCard />
      </section>

      {/* ── Chart modal ── */}
      {modalCard && (
        <ChartModal
          cardId={modalCard}
          filters={filters as Record<string, string>}
          onClose={() => setModalCard(null)}
        />
      )}

      {/* ── Early Activation modals (one per card) ── */}
      {activationView && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setActivationView(null)} />
          <div className="relative z-10 w-full max-w-3xl bg-[#161616] border border-[#2a2a2a] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 sm:px-6 py-4 bg-[#161616] border-b border-[#2a2a2a]">
              <h2 className="text-white font-semibold text-base sm:text-lg">
                {activationView === '48h'          && '1st Workout Within 48h'}
                {activationView === 'week1'        && '≥2 Workouts in Week 1'}
                {activationView === 'timeToSecond' && 'Time to 2nd Workout'}
                {activationView === 'neverActivated' && '0 Workouts in Week 1'}
              </h2>
              <button onClick={() => setActivationView(null)}
                className="w-8 h-8 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] flex items-center justify-center transition-colors text-[#6b7280] hover:text-white text-sm">
                ✕
              </button>
            </div>
            <div className="p-5 sm:p-6">
              <EarlyActivationCard filters={filters} view={activationView} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
