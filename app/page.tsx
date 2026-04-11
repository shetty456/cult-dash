'use client';

import { useState } from 'react';
import {
  getDashboardData, DateRange, Channel,
  CHANNEL_TABLE_DATA, AGE_SEGMENTS, PAYMENT_SEGMENTS,
  RETENTION_CURVES, NSM_MILESTONES,
} from '@/lib/data';
import FilterBar from '@/components/FilterBar';
import MetricCard from '@/components/MetricCard';
import AlertItem from '@/components/AlertItem';
import FunnelChart from '@/components/FunnelChart';
import ChannelTable from '@/components/ChannelTable';
import SegmentationTables from '@/components/SegmentationTables';
import RetentionChart from '@/components/RetentionChart';
import NSMMilestones from '@/components/NSMMilestones';

export default function CultGrowthDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [channel, setChannel] = useState<Channel>('All Channels');

  // Phase 1 data — synchronous, <1ms
  const data = getDashboardData(dateRange, channel);
  const { metrics, funnel, alerts } = data;

  // Phase 2/3 data is static (channel/date range filtering is simulated at Phase 1 layer;
  // segmentation + retention are channel-agnostic for this phase)
  const channelTableData = CHANNEL_TABLE_DATA;
  const ageSegments      = AGE_SEGMENTS;
  const paymentSegments  = PAYMENT_SEGMENTS;
  const retentionCurves  = RETENTION_CURVES;
  const nsmMilestones    = NSM_MILESTONES;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

      {/* ── Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl font-black tracking-tight text-white">cult</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#10b981] bg-[#064e3b] px-2 py-0.5 rounded-full">
              Growth
            </span>
          </div>
          <p className="text-xs text-[#6b7280] font-medium">
            Daily Overview · {channel} · {dateRange === '7d' ? 'Last 7 days' : dateRange === '30d' ? 'Last 30 days' : 'Last 90 days'}
          </p>
        </div>

        <FilterBar
          dateRange={dateRange}
          channel={channel}
          onDateRangeChange={setDateRange}
          onChannelChange={setChannel}
        />
      </header>

      {/* ═══════════════════════════════════════════════════
          PHASE 1
      ═══════════════════════════════════════════════════ */}

      {/* ── Section 1: Overview Cards ── */}
      <section aria-label="Daily Overview Metrics">
        <SectionHeader label="Overview" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <MetricCard label="WAU"         metric={metrics.wau}        changeLabel="WoW" />
          <MetricCard label="NSM"         metric={metrics.nsm}        changeLabel="WoW"
            tooltip="North Star Metric: users completing 3 workouts × 4 weeks. Primary health KPI." />
          <MetricCard label="Blended CAC" metric={metrics.blendedCac} changeLabel="MoM" />
          <MetricCard label="ARPU"        metric={metrics.arpu}       changeLabel="MoM" />
          <MetricCard label="Revenue MTD" metric={metrics.revenueMtd} changeLabel="WoW" />
        </div>
      </section>

      {/* ── Section 2: Red Alert Zone ── */}
      <section aria-label="Alerts and Actions">
        <div className="flex items-center gap-2 mb-3">
          <SectionHeader label="Alerts & Actions" className="mb-0" />
          {alerts.length > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#ef4444] text-white text-[10px] font-bold">
              {alerts.length}
            </span>
          )}
        </div>

        {alerts.length === 0 ? (
          <div className="bg-[#2d2d2d] border border-[#3a3a3a] rounded-xl p-6 text-center">
            <span className="text-2xl">✅</span>
            <p className="text-sm text-[#9ca3af] mt-2">No active alerts for this channel &amp; range.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {alerts.map(alert => <AlertItem key={alert.id} alert={alert} />)}
          </div>
        )}
      </section>

      {/* ── Section 3: Acquisition Funnel ── */}
      <section aria-label="Acquisition Funnel" id="funnel">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <SectionHeader label="Acquisition Funnel" className="mb-0" />
          <div className="flex items-center gap-4 text-xs text-[#6b7280]">
            <LegendDot color="#4ade80" label="Healthy" />
            <LegendDot color="#f97316" label="High drop-off" />
            <LegendDot color="#ef4444" label="Biggest leak" />
          </div>
        </div>

        <div className="bg-[#2d2d2d] border border-[#3a3a3a] rounded-xl p-4 sm:p-6">
          <FunnelChart stages={funnel} />
          {funnel.find(s => s.isBiggestLeak) && (
            <div className="mt-4 flex items-start gap-2 bg-[#2a1515] border border-[#ef4444]/30 rounded-lg px-4 py-3">
              <span className="text-[#ef4444] text-sm mt-0.5">⚠</span>
              <p className="text-xs text-[#fca5a5] leading-relaxed">
                <span className="font-semibold text-[#ef4444]">Biggest leak: </span>
                {(() => {
                  const leak = funnel.find(s => s.isBiggestLeak)!;
                  const prev = funnel[funnel.indexOf(leak) - 1];
                  return `${prev?.label} → ${leak.label} (${leak.dropOffRate}% drop-off). Focus here for maximum funnel impact.`;
                })()}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          PHASE 2
      ═══════════════════════════════════════════════════ */}

      {/* ── Section 4: Channel Performance Matrix ── */}
      <section aria-label="Channel Performance" id="channel-breakdown">
        <SectionHeader label="Channel Performance" badge="Phase 2" />
        <div className="bg-[#2d2d2d] border border-[#3a3a3a] rounded-xl overflow-hidden">
          <ChannelTable data={channelTableData} />
        </div>
      </section>

      {/* ── Section 5: User Segmentation ── */}
      <section aria-label="User Segmentation">
        <SectionHeader label="User Segmentation" />
        <SegmentationTables ageBands={ageSegments} paymentSegments={paymentSegments} />
      </section>

      {/* ═══════════════════════════════════════════════════
          PHASE 3
      ═══════════════════════════════════════════════════ */}

      {/* ── Section 6: Retention Curves ── */}
      <section aria-label="Retention Curves" id="retention">
        <SectionHeader label="Retention Curves" badge="Phase 3" />
        <div className="bg-[#2d2d2d] border border-[#3a3a3a] rounded-xl p-4 sm:p-6">
          <RetentionChart data={retentionCurves} />
        </div>
      </section>

      {/* ── Section 7: NSM Milestones ── */}
      <section aria-label="NSM Habit Milestones">
        <SectionHeader label="NSM Habit Milestones" />
        <div className="bg-[#2d2d2d] border border-[#3a3a3a] rounded-xl p-4 sm:p-6">
          <NSMMilestones data={nsmMilestones} />
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="text-center text-xs text-[#4b5563] pb-4 border-t border-[#2a2a2a] pt-6">
        Cult.fit Growth Dashboard · Phase 1–3 · Data as of Apr 11, 2026
      </footer>
    </main>
  );
}

// ── Shared helper components ──

function SectionHeader({ label, badge, className = 'mb-3' }: { label: string; badge?: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6b7280]">{label}</h2>
      {badge && (
        <span className="text-[9px] font-bold uppercase tracking-wider text-[#6b7280] bg-[#2d2d2d] border border-[#3a3a3a] px-1.5 py-0.5 rounded">
          {badge}
        </span>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1 text-[#6b7280]">
      <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
