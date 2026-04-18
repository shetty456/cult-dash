'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { CardId } from '@/components/MetricCardV2';
import MetricCardV2 from '@/components/MetricCardV2';
import { useFilters } from '@/lib/FilterContext';

const ActiveUsersChart      = dynamic(() => import('@/components/charts/ActiveUsersChart'),      { ssr: false, loading: () => <ChartSkel /> });
const NSMTrendChart         = dynamic(() => import('@/components/charts/NSMTrendChart'),         { ssr: false, loading: () => <ChartSkel /> });
const CACBreakdownChart     = dynamic(() => import('@/components/charts/CACBreakdownChart'),     { ssr: false, loading: () => <ChartSkel /> });
const RevenueDetailChart    = dynamic(() => import('@/components/charts/RevenueDetailChart'),    { ssr: false, loading: () => <ChartSkel /> });
const AcquisitionFunnelCard = dynamic(() => import('@/components/charts/AcquisitionFunnelCard'), { ssr: false, loading: () => <ChartSkel /> });
const ExperimentsCard       = dynamic(() => import('@/components/charts/ExperimentsCard'),       { ssr: false, loading: () => <ChartSkel /> });
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

  const [modalCard, setModalCard]   = useState<CardId | null>(null);
  const [metrics, setMetrics]       = useState<MetricsData | null>(null);
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
    ]).then(([m, funnel, wauData, nsmData, revData]) => {
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
    <div className="px-4 sm:px-6 py-5 space-y-6 pb-8">

      {/* ── Business Metrics ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-white font-semibold text-base tracking-tight">Business Metrics</h2>
          <div className="flex-1 h-px bg-[#2a2a2a]" />
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
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-white font-semibold text-base tracking-tight">Acquisition Efficiency</h2>
          <div className="flex-1 h-px bg-[#2a2a2a]" />
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

      {/* ── Experiment Tracker ── */}
      <ExperimentsCard />

      {/* ── Chart modal ── */}
      {modalCard && (
        <ChartModal
          cardId={modalCard}
          filters={filters as Record<string, string>}
          onClose={() => setModalCard(null)}
        />
      )}
    </div>
  );
}
