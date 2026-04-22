'use client';

import { useEffect, useState } from 'react';

type LinkedMetric = '48h' | 'week1' | 'timeToSecond' | 'neverActivated' | 'funnel';

interface VariantData {
  label: string;
  n: number;
  conv_rate: number;
  conversions: number;
}

interface Experiment {
  id: string;
  name: string;
  hypothesis: string;
  goal: string;
  linkedMetric: LinkedMetric;
  status: 'running' | 'concluded';
  winner: 'control' | 'treatment' | null;
  started_at: string;
  ended_at: string | null;
  control: VariantData;
  treatment: VariantData;
  lift: number;
  z: number;
  significant: boolean;
  confidence: number;
  projectedNsmLift: number | null;
}

const METRIC_META: Record<LinkedMetric, { label: string; color: string; bg: string; border: string }> = {
  '48h':           { label: '1st workout ≤48h',      color: '#a78bfa', bg: '#a78bfa18', border: '#7c3aed40' },
  'week1':         { label: '≥2 workouts week 1',     color: '#10b981', bg: '#10b98118', border: '#10b98140' },
  'timeToSecond':  { label: 'Median days → 2nd',      color: '#60a5fa', bg: '#60a5fa18', border: '#3b82f640' },
  'neverActivated':{ label: '0 workouts week 1 ↓',    color: '#ef4444', bg: '#ef444418', border: '#ef444440' },
  'funnel':        { label: 'Trial → Paid conv.',      color: '#818cf8', bg: '#818cf818', border: '#6366f140' },
};

function fmt(n: number) {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function MetricBadge({ metric }: { metric: LinkedMetric }) {
  const m = METRIC_META[metric];
  return (
    <span
      className="text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 whitespace-nowrap"
      style={{ color: m.color, background: m.bg, borderColor: m.border }}
    >
      {m.label}
    </span>
  );
}

function StatusPill({ status }: { status: 'running' | 'concluded' }) {
  return status === 'running' ? (
    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      Running
    </span>
  ) : (
    <span className="flex items-center gap-1 text-[10px] font-bold text-[#9ca3af] bg-[#9ca3af]/10 border border-[#9ca3af]/20 px-2 py-0.5 rounded-full shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-[#9ca3af]" />
      Concluded
    </span>
  );
}

function LiftBadge({ lift }: { lift: number }) {
  const color = lift >= 20 ? 'text-emerald-400' : lift >= 10 ? 'text-yellow-400' : 'text-[#9ca3af]';
  return (
    <span className={`text-[11px] font-bold ${color}`}>
      {lift > 0 ? '+' : ''}{lift}%
    </span>
  );
}

function SigBadge({ significant, confidence, status }: { significant: boolean; confidence: number; status: string }) {
  if (status === 'concluded' || significant) {
    return (
      <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-400/10 border border-indigo-400/20 px-1.5 py-0.5 rounded">
        {confidence}% CI
      </span>
    );
  }
  return (
    <span className="text-[10px] text-[#6b7280] bg-[#1e1e1e] border border-[#2a2a2a] px-1.5 py-0.5 rounded">
      Not yet sig.
    </span>
  );
}

function VariantBar({ label, rate, n, conversions, color, isWinner }: {
  label: string; rate: number; n: number; conversions: number;
  color: string; isWinner: boolean;
}) {
  const pct = Math.round(rate * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="w-[148px] shrink-0 flex items-center gap-1.5">
        {isWinner && <span className="text-[10px]">👑</span>}
        <span className="text-[11px] font-medium text-[#d1d5db] truncate">{label}</span>
      </div>
      <div className="flex-1 bg-[#111] rounded-full h-4 overflow-hidden">
        <div
          className="h-full rounded-full flex items-center justify-end pr-2"
          style={{ width: `${pct}%`, background: color, minWidth: 32 }}
        >
          <span className="text-[10px] font-bold text-white">{pct}%</span>
        </div>
      </div>
      <span className="text-[10px] text-[#6b7280] w-24 shrink-0 text-right">
        {fmt(conversions)} / {fmt(n)}
      </span>
    </div>
  );
}

function ExperimentRow({ exp }: { exp: Experiment }) {
  const [open, setOpen] = useState(false);
  const m = METRIC_META[exp.linkedMetric];
  const ctrlColor = exp.winner === 'control'   ? '#10b981' : '#4b5563';
  const trtColor  = exp.winner === 'treatment' ? m.color   : '#6366f1';

  return (
    <div
      className="bg-[#1a1a1a] rounded-lg overflow-hidden border"
      style={{ borderColor: open ? m.border : '#2a2a2a' }}
    >
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[#1e1e1e] transition-colors"
      >
        <div className="flex flex-col gap-1.5 shrink-0 pt-0.5">
          <StatusPill status={exp.status} />
          <MetricBadge metric={exp.linkedMetric} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-white leading-tight">{exp.name}</p>
          <p className="text-[10px] text-[#6b7280] mt-1">Goal: <span style={{ color: m.color }}>{exp.goal}</span></p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <LiftBadge lift={exp.lift} />
          <SigBadge significant={exp.significant} confidence={exp.confidence} status={exp.status} />
          <span className="text-[#4b5563] text-[10px] ml-1">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-[#2a2a2a] pt-3 space-y-3">
          <p className="text-[11px] text-[#6b7280] italic leading-relaxed">{exp.hypothesis}</p>

          <div className="space-y-2">
            <VariantBar
              label={exp.control.label}
              rate={exp.control.conv_rate}
              n={exp.control.n}
              conversions={exp.control.conversions}
              color={ctrlColor}
              isWinner={exp.winner === 'control'}
            />
            <VariantBar
              label={exp.treatment.label}
              rate={exp.treatment.conv_rate}
              n={exp.treatment.n}
              conversions={exp.treatment.conversions}
              color={trtColor}
              isWinner={exp.winner === 'treatment'}
            />
          </div>

          {exp.projectedNsmLift !== null && (
            <div className="bg-[#0a1f14] border border-[#10b981]/25 rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shrink-0" />
              <span className="text-[10px] text-[#6b7280]">Projected NSM lift if treatment wins:</span>
              <span className="text-[11px] font-bold text-[#10b981]">+{exp.projectedNsmLift}pp</span>
              <span className="text-[9px] text-[#4b5563]">in 3x/week completers*</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[#6b7280] pt-1 border-t border-[#2a2a2a]">
            <span>Started {exp.started_at}</span>
            {exp.ended_at && <span>Ended {exp.ended_at}</span>}
            <span>z = {exp.z}</span>
            <span className="ml-auto font-medium" style={{ color: exp.significant ? m.color : '#6b7280' }}>
              {exp.significant
                ? `Significant at ${exp.confidence}% confidence`
                : `${exp.confidence}% confidence — need more data`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExperimentsCard() {
  const [data, setData] = useState<Experiment[] | null>(null);

  useEffect(() => {
    fetch('/api/experiments').then(r => r.json()).then(setData);
  }, []);

  if (!data) {
    return (
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 sm:p-5 space-y-3">
        <div className="h-5 w-48 rounded shimmer" />
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-14 rounded-lg shimmer" />
        ))}
      </div>
    );
  }

  const running   = data.filter(e => e.status === 'running').length;
  const concluded = data.filter(e => e.status === 'concluded').length;

  return (
    <div>
      <div className="flex items-center justify-end mb-3">
        <span className="text-[10px] font-semibold text-[#9ca3af] bg-[#1e1e1e] border border-[#3a3a3a] px-2.5 py-1 rounded-full">
          {running} running · {concluded} concluded
        </span>
      </div>

      {/* Metric legend */}
      <div className="flex flex-wrap gap-2 mb-4 pb-3 border-b border-[#2a2a2a]">
        {(Object.entries(METRIC_META) as [LinkedMetric, typeof METRIC_META[LinkedMetric]][]).map(([key, m]) => (
          <span key={key} className="text-[9px] font-semibold px-2 py-0.5 rounded-full border"
            style={{ color: m.color, background: m.bg, borderColor: m.border }}>
            {m.label}
          </span>
        ))}
      </div>

      <div className="space-y-2">
        {data.map(exp => (
          <ExperimentRow key={exp.id} exp={exp} />
        ))}
      </div>
    </div>
  );
}
