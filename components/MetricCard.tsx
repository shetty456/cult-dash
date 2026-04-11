'use client';

import { MetricValue, MetricStatus, buildSparklinePath } from '@/lib/data';

interface MetricCardProps {
  label: string;
  metric: MetricValue;
  changeLabel?: 'WoW' | 'MoM';
  tooltip?: string;
}

const STATUS_COLORS: Record<MetricStatus, { border: string; badge: string; badgeText: string; spark: string }> = {
  green:  { border: 'border-l-[#10b981]', badge: 'bg-[#064e3b] text-[#34d399]', badgeText: 'text-[#34d399]', spark: '#10b981' },
  yellow: { border: 'border-l-[#f59e0b]', badge: 'bg-[#451a03] text-[#fbbf24]', badgeText: 'text-[#fbbf24]', spark: '#f59e0b' },
  red:    { border: 'border-l-[#ef4444]', badge: 'bg-[#450a0a] text-[#f87171]', badgeText: 'text-[#f87171]', spark: '#ef4444' },
};

function TrendArrow({ change }: { change: number }) {
  if (change > 0) return <span>↑</span>;
  if (change < 0) return <span>↓</span>;
  return <span>→</span>;
}

export default function MetricCard({ label, metric, changeLabel, tooltip }: MetricCardProps) {
  const colors = STATUS_COLORS[metric.status];

  // Pick which change to display: prefer WoW, fallback to MoM
  const changeValue = changeLabel === 'MoM' ? metric.momChange : (metric.wowChange ?? metric.momChange);
  const changeSuffix = changeLabel ?? (metric.wowChange !== null ? 'WoW' : 'MoM');
  const absChange = changeValue !== null ? Math.abs(changeValue) : null;

  const sparkPath = buildSparklinePath(metric.sparkline);

  return (
    <article
      className={`
        group relative bg-[#2d2d2d] rounded-xl p-5
        border-l-4 ${colors.border} border border-[#3a3a3a]
        transition-all duration-200
        hover:bg-[#333333] hover:shadow-xl hover:shadow-black/40 hover:-translate-y-0.5
        cursor-default select-none
      `}
    >
      {/* Label row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#9ca3af]">
            {label}
          </span>
          {tooltip && (
            <div className="relative group/tooltip">
              <span className="text-[#6b7280] text-xs cursor-help">ⓘ</span>
              <div className="
                absolute left-0 top-5 z-10 hidden group-hover/tooltip:block
                bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-2.5
                text-xs text-[#9ca3af] w-52 shadow-xl
              ">
                {tooltip}
              </div>
            </div>
          )}
        </div>

        {/* Sparkline — revealed on hover */}
        <svg
          width="80" height="28"
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          aria-hidden="true"
        >
          <polyline
            points={sparkPath}
            fill="none"
            stroke={colors.spark}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Main value */}
      <div className="text-[28px] font-bold text-white leading-none mb-2 tracking-tight">
        {metric.formatted}
      </div>

      {/* Progress bar (Revenue MTD only) */}
      {metric.progress !== undefined && (
        <div className="mb-2">
          <div className="h-1.5 bg-[#3a3a3a] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#10b981] rounded-full transition-all duration-500"
              style={{ width: `${metric.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Trend badge + subtext */}
      <div className="flex items-center justify-between mt-2">
        {absChange !== null ? (
          <span className={`text-sm font-medium ${colors.badgeText}`}>
            <TrendArrow change={changeValue!} />
            {' '}{absChange.toFixed(1)}% {changeSuffix}
          </span>
        ) : (
          <span className="text-sm text-[#6b7280]">—</span>
        )}

        {metric.subtext && (
          <span className="text-xs text-[#6b7280] text-right max-w-[120px] leading-tight">
            {metric.subtext}
          </span>
        )}
      </div>
    </article>
  );
}
