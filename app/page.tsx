'use client';

import { useState } from 'react';
import { getDashboardData, DateRange, Channel } from '@/lib/data';
import FilterBar from '@/components/FilterBar';
import MetricCard from '@/components/MetricCard';
import AlertItem from '@/components/AlertItem';
import FunnelChart from '@/components/FunnelChart';

export default function CultGrowthDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [channel, setChannel] = useState<Channel>('All Channels');

  // All data recomputed synchronously on every render (mock data, <1ms)
  const data = getDashboardData(dateRange, channel);
  const { metrics, funnel, alerts } = data;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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

      {/* ── Section 1: Overview Cards ── */}
      <section aria-label="Daily Overview Metrics">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6b7280] mb-3">
          Overview
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <MetricCard
            label="WAU"
            metric={metrics.wau}
            changeLabel="WoW"
          />
          <MetricCard
            label="NSM"
            metric={metrics.nsm}
            changeLabel="WoW"
            tooltip="North Star Metric: users completing 3 workouts × 4 weeks. Primary health KPI."
          />
          <MetricCard
            label="Blended CAC"
            metric={metrics.blendedCac}
            changeLabel="MoM"
          />
          <MetricCard
            label="ARPU"
            metric={metrics.arpu}
            changeLabel="MoM"
          />
          <MetricCard
            label="Revenue MTD"
            metric={metrics.revenueMtd}
            changeLabel="WoW"
          />
        </div>
      </section>

      {/* ── Section 2: Red Alert Zone ── */}
      <section aria-label="Alerts and Actions">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6b7280]">
            Alerts &amp; Actions
          </h2>
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
            {alerts.map((alert) => (
              <AlertItem key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </section>

      {/* ── Section 3: Acquisition Funnel ── */}
      <section aria-label="Acquisition Funnel">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6b7280]">
            Acquisition Funnel
          </h2>
          <div className="flex items-center gap-4 text-xs text-[#6b7280]">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#4ade80]" />
              Healthy
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#f97316]" />
              High drop-off
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#ef4444]" />
              Biggest leak
            </span>
          </div>
        </div>

        <div className="bg-[#2d2d2d] border border-[#3a3a3a] rounded-xl p-4 sm:p-6">
          <FunnelChart stages={funnel} />

          {/* Bottleneck callout */}
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

      {/* ── Footer ── */}
      <footer className="text-center text-xs text-[#4b5563] pb-4">
        Cult.fit Growth Dashboard · Phase 1 · Data as of Apr 11, 2026
      </footer>
    </main>
  );
}
