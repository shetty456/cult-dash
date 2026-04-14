'use client';

import dynamic from 'next/dynamic';

// Micro sparkline uses recharts — must be client-only
const Sparkline = dynamic(() => import('./SparklineMini'), { ssr: false, loading: () => <div className="h-12 w-full" /> });

export type CardId = 'wau' | 'nsm' | 'cac' | 'conversion' | 'revenue';

interface MetricCardV2Props {
  id: CardId;
  label: string;
  value: string;
  subtext?: string;
  change: number;        // percent — positive = good (except CAC where negative = good)
  changeLabel: string;
  status: 'green' | 'yellow' | 'red';
  sparkline: number[];
  isActive: boolean;
  invertChange?: boolean; // for CAC: down is good
  onClick: () => void;
}

const STATUS_COLORS = {
  green:  { text: '#10b981', bg: 'bg-[#064e3b]/30', border: 'border-[#10b981]/60', activeBorder: 'border-[#10b981]', dot: 'bg-[#10b981]' },
  yellow: { text: '#f59e0b', bg: 'bg-[#451a03]/30', border: 'border-[#f59e0b]/40', activeBorder: 'border-[#f59e0b]', dot: 'bg-[#f59e0b]' },
  red:    { text: '#ef4444', bg: 'bg-[#450a0a]/30', border: 'border-[#ef4444]/40', activeBorder: 'border-[#ef4444]', dot: 'bg-[#ef4444]' },
};

export default function MetricCardV2({
  id, label, value, subtext, change, changeLabel, status,
  sparkline, isActive, invertChange = false, onClick,
}: MetricCardV2Props) {
  const colors = STATUS_COLORS[status];

  // For inverted metrics (CAC): negative change is good
  const isGood = invertChange ? change < 0 : change >= 0;
  const changeColor = isGood ? '#10b981' : '#ef4444';
  const changeArrow = change >= 0 ? '↑' : '↓';
  const changeAbs = Math.abs(change).toFixed(1);

  return (
    <article
      onClick={onClick}
      className={`
        relative rounded-xl border cursor-pointer transition-all duration-200 overflow-hidden
        ${isActive
          ? `${colors.activeBorder} bg-[#0f1f17] shadow-lg shadow-black/40`
          : `border-[#2a2a2a] bg-[#1e1e1e] hover:border-[#3a3a3a] hover:bg-[#222]`
        }
      `}
      role="button"
      aria-expanded={isActive}
    >
      {/* Active bottom accent bar */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: colors.text }} />
      )}

      <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2 sm:pb-3">
        {/* Label row */}
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-[#6b7280] truncate">{label}</span>
          </div>
          {isActive && (
            <span className="text-[9px] sm:text-[10px] font-bold text-[#10b981] bg-[#064e3b] px-1.5 py-0.5 rounded flex-shrink-0 ml-1">OPEN</span>
          )}
        </div>

        {/* Value */}
        <p className="text-xl sm:text-2xl font-bold text-white tabular-nums leading-none mb-1">{value}</p>
        {subtext && <p className="text-[9px] sm:text-[10px] text-[#4b5563] mt-0.5 truncate">{subtext}</p>}

        {/* Change badge */}
        <div className="flex items-center gap-1.5 mt-1.5 sm:mt-2">
          <span className="text-[11px] sm:text-xs font-semibold tabular-nums" style={{ color: changeColor }}>
            {changeArrow} {changeAbs}%
          </span>
          <span className="text-[9px] sm:text-[10px] text-[#4b5563]">{changeLabel}</span>
        </div>
      </div>

      {/* Sparkline — slightly shorter on mobile */}
      <div className="px-2 pb-2 h-10 sm:h-12">
        <Sparkline data={sparkline} color={colors.text} id={id} />
      </div>
    </article>
  );
}
