'use client';

import { Alert } from '@/lib/data';

interface AlertItemProps {
  alert: Alert;
}

const SEVERITY_STYLES = {
  'High': {
    border: 'border-l-[#ef4444]',
    badge: 'bg-[#ef4444] text-white',
    icon: '🔴',
    bg: 'bg-[#2a1515]',
  },
  'Medium': {
    border: 'border-l-[#f59e0b]',
    badge: 'bg-[#f59e0b] text-black',
    icon: '🟡',
    bg: 'bg-[#2a2015]',
  },
  'Medium Watch': {
    border: 'border-l-[#f97316]',
    badge: 'bg-[#f97316] text-white',
    icon: '🟡',
    bg: 'bg-[#2a1d12]',
  },
};

export default function AlertItem({ alert }: AlertItemProps) {
  const styles = SEVERITY_STYLES[alert.severity];

  return (
    <div
      className={`
        flex items-start gap-4 p-4 rounded-xl
        border-l-4 ${styles.border} border border-[#3a3a3a]
        ${styles.bg}
        transition-all duration-150 hover:brightness-110
      `}
    >
      {/* Severity badge */}
      <div className="flex-shrink-0 mt-0.5">
        <span
          className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded-md
            text-xs font-bold uppercase tracking-wider
            ${styles.badge}
          `}
        >
          {alert.severity === 'High' ? 'HIGH' : 'MEDIUM'}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white mb-0.5">{alert.title}</p>
        <p className="text-xs text-[#9ca3af] leading-relaxed">{alert.detail}</p>
      </div>

      {/* Drill-down link */}
      <div className="flex-shrink-0">
        <a
          href={alert.drillHref}
          className="
            text-xs text-[#60a5fa] hover:text-[#93c5fd]
            underline underline-offset-2 whitespace-nowrap
            transition-colors duration-150
          "
          onClick={(e) => e.preventDefault()} // placeholder until Phase 2
        >
          {alert.drillLabel} →
        </a>
      </div>
    </div>
  );
}
