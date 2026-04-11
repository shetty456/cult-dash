'use client';

import { useState } from 'react';
import {
  getDashboardData, DateRange, Channel,
  CHANNEL_TABLE_DATA, AGE_SEGMENTS, PAYMENT_SEGMENTS,
  RETENTION_CURVES, NSM_MILESTONES,
} from '@/lib/data';
import FilterBar from '@/components/FilterBar';
import TabNav from '@/components/TabNav';
import MetricCard from '@/components/MetricCard';
import AlertItem from '@/components/AlertItem';
import FunnelChart from '@/components/FunnelChart';
import ChannelTable from '@/components/ChannelTable';
import SegmentationTables from '@/components/SegmentationTables';
import RetentionChart from '@/components/RetentionChart';
import NSMMilestones from '@/components/NSMMilestones';
import RecommendationsPanel from '@/components/RecommendationsPanel';

type TabId = 'pulse' | 'funnel' | 'channels' | 'retention' | 'recommendations';

export default function CultGrowthDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [channel, setChannel]     = useState<Channel>('All Channels');
  const [activeTab, setActiveTab] = useState<TabId>('pulse');

  const data = getDashboardData(dateRange, channel);
  const { metrics, funnel, alerts } = data;

  const tabs = [
    { id: 'pulse',           label: "Today's Pulse",   badge: alerts.length },
    { id: 'funnel',          label: 'Funnel' },
    { id: 'channels',        label: 'Channels' },
    { id: 'retention',       label: 'Retention & NSM' },
    { id: 'recommendations', label: 'Recommendations' },
  ];

  const rangeLabel = dateRange === '7d' ? 'Last 7 days' : dateRange === '30d' ? 'Last 30 days' : 'Last 90 days';

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col">

      {/* ── Sticky top chrome ── */}
      <div className="sticky top-0 z-20 bg-[#1a1a1a] border-b border-[#2a2a2a]">
        {/* Brand + filters row */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-lg font-black tracking-tight text-white">cult</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#10b981] bg-[#064e3b] px-2 py-0.5 rounded-full">
              Growth
            </span>
            <span className="hidden sm:block text-xs text-[#4b5563]">{channel} · {rangeLabel}</span>
          </div>
          <FilterBar
            dateRange={dateRange}
            channel={channel}
            onDateRangeChange={setDateRange}
            onChannelChange={setChannel}
          />
        </div>

        {/* Tab row */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <TabNav
            tabs={tabs}
            active={activeTab}
            onChange={id => setActiveTab(id as TabId)}
          />
        </div>
      </div>

      {/* ── Page content ── */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">

        {/* ══════════════════════════════════════════
            TAB 1: TODAY'S PULSE
            One job: "Is anything on fire?"
        ══════════════════════════════════════════ */}
        {activeTab === 'pulse' && (
          <div className="space-y-6">
            <PageTitle
              title="Today's Pulse"
              subtitle="Apr 11, 2026 · scan these in order"
            />

            {/* Alerts first — if there's a fire, surface it before metrics */}
            {alerts.length > 0 && (
              <section aria-label="Active alerts">
                <Label text={`${alerts.length} active alert${alerts.length > 1 ? 's' : ''} — needs attention`} urgent />
                <div className="flex flex-col gap-3">
                  {alerts.map(a => <AlertItem key={a.id} alert={a} />)}
                </div>
              </section>
            )}

            {/* 5 key metrics */}
            <section aria-label="Key metrics">
              <Label text="Key metrics" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <MetricCard label="WAU"         metric={metrics.wau}        changeLabel="WoW" />
                <MetricCard label="NSM"         metric={metrics.nsm}        changeLabel="WoW"
                  tooltip="Habit Completers: 3 workouts × 4 weeks. Primary North Star." />
                <MetricCard label="Blended CAC" metric={metrics.blendedCac} changeLabel="MoM" />
                <MetricCard label="ARPU"        metric={metrics.arpu}       changeLabel="MoM" />
                <MetricCard label="Revenue MTD" metric={metrics.revenueMtd} changeLabel="WoW" />
              </div>
            </section>

            {alerts.length === 0 && (
              <div className="flex items-center gap-3 bg-[#0f2d1f] border border-[#10b981]/30 rounded-xl px-5 py-4">
                <span className="text-xl">✅</span>
                <p className="text-sm text-[#6ee7b7]">All metrics within range. No active alerts for {channel}.</p>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB 2: FUNNEL
            One job: "Where are we losing people?"
        ══════════════════════════════════════════ */}
        {activeTab === 'funnel' && (
          <div className="space-y-6">
            <PageTitle
              title="Acquisition Funnel"
              subtitle={`${((funnel[funnel.length - 1].count / funnel[0].count) * 100).toFixed(1)}% of installs become paid subscribers`}
            />

            <div className="bg-[#2d2d2d] border border-[#3a3a3a] rounded-xl p-4 sm:p-6">
              {/* Legend — minimal */}
              <div className="flex items-center gap-4 mb-4 text-xs text-[#6b7280]">
                <LegendDot color="#4ade80" label="Healthy stage" />
                <LegendDot color="#ef4444" label="Biggest leak" />
              </div>

              <FunnelChart stages={funnel} />
            </div>

            {/* Single focused callout */}
            {(() => {
              const leak = funnel.find(s => s.isBiggestLeak);
              const prev = leak ? funnel[funnel.indexOf(leak) - 1] : null;
              if (!leak || !prev) return null;
              const lost = prev.count - leak.count;
              return (
                <div className="bg-[#2a1515] border border-[#ef4444]/30 rounded-xl px-5 py-4">
                  <p className="text-xs font-semibold text-[#ef4444] uppercase tracking-wider mb-1">Biggest leak</p>
                  <p className="text-sm text-white font-medium mb-1">
                    {prev.label} → {leak.label}: {leak.dropOffRate}% drop-off
                  </p>
                  <p className="text-xs text-[#9ca3af]">
                    {lost.toLocaleString()} users lost here each month.
                    Fixing this step has the highest return of any funnel intervention.
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB 3: CHANNELS
            One job: "Which channels are working?"
        ══════════════════════════════════════════ */}
        {activeTab === 'channels' && (
          <div className="space-y-6">
            {(() => {
              const best  = [...CHANNEL_TABLE_DATA].sort((a, b) => a.cac - b.cac)[0];
              const worst = [...CHANNEL_TABLE_DATA].sort((a, b) => b.cac - a.cac)[0];
              return (
                <PageTitle
                  title="Channel Performance"
                  subtitle={`${best.name} has the best unit economics (₹${best.cac} CAC). ${worst.name} is most expensive (₹${worst.cac.toLocaleString()}).`}
                />
              );
            })()}

            <div className="bg-[#2d2d2d] border border-[#3a3a3a] rounded-xl overflow-hidden">
              <ChannelTable data={CHANNEL_TABLE_DATA} />
            </div>

            {/* Column guide — one line, not a legend */}
            <p className="text-xs text-[#4b5563] text-center">
              Click any column header to sort · Trial Conv = sign-up → trial · Paid Conv = trial → subscription · NSM = habit completion rate
            </p>

            {/* Segmentation — collapsed by default */}
            <SegmentSection
              title="User segments"
              subtitle="Age band and payment type breakdown"
            >
              <SegmentationTables ageBands={AGE_SEGMENTS} paymentSegments={PAYMENT_SEGMENTS} />
            </SegmentSection>
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB 4: RETENTION & NSM
            One job: "Are habits forming?"
        ══════════════════════════════════════════ */}
        {activeTab === 'retention' && (
          <div className="space-y-8">
            <PageTitle
              title="Retention & NSM"
              subtitle="Are users coming back, and are they forming the 3×4 workout habit?"
            />

            {/* Retention curves */}
            <section aria-label="Retention curves" id="retention">
              <Label text="Retention by channel — D1 to D60" />
              <div className="bg-[#2d2d2d] border border-[#3a3a3a] rounded-xl p-4 sm:p-6">
                <RetentionChart data={RETENTION_CURVES} />
              </div>
              <p className="text-xs text-[#4b5563] mt-2 text-center">
                Corporate retains best (48% at D60). Paid Digital drops fastest (26% at D60). Hover for exact values.
              </p>
            </section>

            {/* NSM milestones */}
            <section aria-label="NSM milestones">
              <Label text="NSM habit funnel — where does the habit break?" />
              <div className="bg-[#2d2d2d] border border-[#3a3a3a] rounded-xl p-4 sm:p-6">
                <NSMMilestones data={NSM_MILESTONES} />
              </div>
            </section>
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB 5: RECOMMENDATIONS
            One job: "What do I do today?"
        ══════════════════════════════════════════ */}
        {activeTab === 'recommendations' && (
          <div className="space-y-6">
            <PageTitle
              title="3 things to do this week"
              subtitle="Prioritised by impact. Start with #1."
            />
            <RecommendationsPanel
              alerts={alerts}
              channelData={CHANNEL_TABLE_DATA}
              funnel={funnel}
              nsm={NSM_MILESTONES}
            />
          </div>
        )}

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[#2a2a2a] py-4 text-center">
        <p className="text-xs text-[#3a3a3a]">Cult.fit Growth · Data as of Apr 11, 2026</p>
      </footer>
    </div>
  );
}

// ── Small shared components ─────────────────────────────────────────────────

function PageTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="pb-2">
      <h1 className="text-xl font-bold text-white">{title}</h1>
      <p className="text-sm text-[#6b7280] mt-1">{subtitle}</p>
    </div>
  );
}

function Label({ text, urgent }: { text: string; urgent?: boolean }) {
  return (
    <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${urgent ? 'text-[#ef4444]' : 'text-[#6b7280]'}`}>
      {text}
    </p>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
      <span>{label}</span>
    </span>
  );
}

// Collapsible section wrapper — shows a summary line, expands on click
function SegmentSection({ title, subtitle, children }: {
  title: string; subtitle: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#3a3a3a] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#2d2d2d] transition-colors duration-150"
      >
        <div>
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="text-xs text-[#6b7280] mt-0.5">{subtitle}</p>
        </div>
        <span className={`text-[#6b7280] transition-transform duration-200 text-lg leading-none ${open ? 'rotate-180' : ''}`}>
          ↓
        </span>
      </button>
      {open && (
        <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-[#2a2a2a] bg-[#2d2d2d]">
          {children}
        </div>
      )}
    </div>
  );
}
