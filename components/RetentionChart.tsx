'use client';

import { useState, useCallback, useMemo } from 'react';
import { RetentionCurves } from '@/lib/data';

interface RetentionChartProps {
  data: RetentionCurves;
}

// Chart layout constants (SVG viewBox units)
const VW = 860;
const VH = 280;
const PAD = { top: 20, right: 20, bottom: 50, left: 52 };
const CW = VW - PAD.left - PAD.right;
const CH = VH - PAD.top - PAD.bottom;

const DAYS = [1, 7, 14, 30, 60];
const Y_TICKS = [0, 20, 40, 60, 80, 100];

// Channel line styles
const LINE_CONFIG: Record<string, { color: string; dash?: string; width?: number }> = {
  blended:        { color: '#9ca3af', width: 2.5 },
  Referrals:      { color: '#10b981' },
  'Organic Search': { color: '#60a5fa' },
  'Paid Digital': { color: '#ef4444' },
  'Brand/ATL':    { color: '#2dd4bf' },
  Corporate:      { color: '#f59e0b' },
};

function xPos(dayIndex: number) {
  return PAD.left + (dayIndex / (DAYS.length - 1)) * CW;
}

function yPos(ret: number) {
  return PAD.top + CH - (ret / 100) * CH;
}

interface TooltipState {
  x: number;
  y: number;
  day: number;
  lines: { key: string; retention: number; color: string }[];
}

export default function RetentionChart({ data }: RetentionChartProps) {
  const allKeys = useMemo(() => ['blended', ...Object.keys(data.byChannel)], [data.byChannel]);
  const [hidden, setHidden]     = useState<Set<string>>(new Set());
  const [tooltip, setTooltip]   = useState<TooltipState | null>(null);

  function toggleLine(key: string) {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  }

  // Build polyline points for a series
  function buildPoints(points: { day: number; retention: number }[]) {
    return points
      .map((p, i) => `${xPos(i).toFixed(1)},${yPos(p.retention).toFixed(1)}`)
      .join(' ');
  }

  // Hover over chart area → find nearest day
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svgRect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const rawX = ((e.clientX - svgRect.left) / svgRect.width) * VW;
    const chartX = rawX - PAD.left;

    // Find nearest day index
    const idx = DAYS.reduce((best, _d, i) => {
      const px = (i / (DAYS.length - 1)) * CW;
      return Math.abs(chartX - px) < Math.abs(chartX - (best / (DAYS.length - 1)) * CW) ? i : best;
    }, 0);

    if (idx < 0 || idx >= DAYS.length) { setTooltip(null); return; }

    const day = DAYS[idx];
    const lines = allKeys
      .filter(k => !hidden.has(k))
      .map(k => {
        const pts = k === 'blended' ? data.blended : data.byChannel[k];
        const pt = pts.find(p => p.day === day);
        return { key: k, retention: pt?.retention ?? 0, color: LINE_CONFIG[k]?.color ?? '#fff' };
      });

    setTooltip({
      x: xPos(idx),
      y: yPos(Math.max(...lines.map(l => l.retention))),
      day,
      lines,
    });
  }, [allKeys, data, hidden]);

  return (
    <div className="space-y-4">
      <div
        className="overflow-x-auto"
        onMouseLeave={() => setTooltip(null)}
      >
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Retention curves by channel"
          onMouseMove={handleMouseMove}
          style={{ minWidth: 480, cursor: 'crosshair' }}
        >
          {/* Y-axis grid lines + labels */}
          {Y_TICKS.map(pct => {
            const y = yPos(pct);
            return (
              <g key={pct}>
                <line
                  x1={PAD.left} y1={y}
                  x2={PAD.left + CW} y2={y}
                  stroke={pct === 0 ? '#3a3a3a' : '#2a2a2a'}
                  strokeWidth={pct === 0 ? 1.5 : 1}
                />
                <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#6b7280">
                  {pct}%
                </text>
              </g>
            );
          })}

          {/* Y-axis label */}
          <text
            transform={`rotate(-90) translate(${-(PAD.top + CH / 2)}, 14)`}
            textAnchor="middle" fontSize="10" fill="#6b7280"
          >
            Retention %
          </text>

          {/* X-axis day labels */}
          {DAYS.map((day, i) => (
            <text
              key={day}
              x={xPos(i)} y={VH - PAD.bottom + 16}
              textAnchor="middle" fontSize="11" fill="#6b7280"
            >
              D{day}
            </text>
          ))}

          {/* Day tick marks */}
          {DAYS.map((_, i) => (
            <line
              key={i}
              x1={xPos(i)} y1={PAD.top + CH}
              x2={xPos(i)} y2={PAD.top + CH + 5}
              stroke="#3a3a3a" strokeWidth="1"
            />
          ))}

          {/* Data lines */}
          {allKeys.map(key => {
            if (hidden.has(key)) return null;
            const pts = key === 'blended' ? data.blended : data.byChannel[key];
            const cfg = LINE_CONFIG[key] ?? { color: '#888' };
            return (
              <polyline
                key={key}
                points={buildPoints(pts)}
                fill="none"
                stroke={cfg.color}
                strokeWidth={cfg.width ?? 1.8}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={0.9}
              />
            );
          })}

          {/* Data points (circles on each day) */}
          {allKeys.map(key => {
            if (hidden.has(key)) return null;
            const pts = key === 'blended' ? data.blended : data.byChannel[key];
            const cfg = LINE_CONFIG[key] ?? { color: '#888' };
            return pts.map((p, i) => (
              <circle
                key={`${key}-${i}`}
                cx={xPos(i)} cy={yPos(p.retention)}
                r="3.5"
                fill="#1a1a1a"
                stroke={cfg.color}
                strokeWidth="1.5"
              />
            ));
          })}

          {/* Tooltip vertical line */}
          {tooltip && (
            <line
              x1={tooltip.x} y1={PAD.top}
              x2={tooltip.x} y2={PAD.top + CH}
              stroke="#ffffff" strokeWidth="1" opacity="0.15"
              strokeDasharray="3,3"
            />
          )}

          {/* Tooltip box */}
          {tooltip && (() => {
            const BOX_W = 148;
            const BOX_H = 16 + tooltip.lines.length * 17;
            const bx = Math.min(tooltip.x + 10, VW - PAD.right - BOX_W);
            const by = Math.max(PAD.top + 4, tooltip.y - BOX_H / 2);
            return (
              <g>
                <rect x={bx} y={by} width={BOX_W} height={BOX_H} rx="6" fill="#1a1a1a" stroke="#3a3a3a" strokeWidth="1" />
                <text x={bx + 8} y={by + 13} fontSize="10" fontWeight="bold" fill="#9ca3af">D{tooltip.day} Retention</text>
                {tooltip.lines.map((l, i) => (
                  <g key={l.key}>
                    <circle cx={bx + 12} cy={by + 24 + i * 17} r="3" fill={l.color} />
                    <text x={bx + 20} y={by + 28 + i * 17} fontSize="10" fill="#ffffff">
                      {l.key === 'blended' ? 'Blended' : l.key}: {l.retention}%
                    </text>
                  </g>
                ))}
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Legend — click to toggle */}
      <div className="flex flex-wrap gap-3 px-1">
        {allKeys.map(key => {
          const cfg = LINE_CONFIG[key] ?? { color: '#888' };
          const isHidden = hidden.has(key);
          return (
            <button
              key={key}
              onClick={() => toggleLine(key)}
              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-all duration-150 ${
                isHidden
                  ? 'opacity-40 hover:opacity-60 bg-[#2d2d2d]'
                  : 'bg-[#2d2d2d] hover:brightness-125'
              }`}
            >
              <span
                className="inline-block rounded-full flex-shrink-0"
                style={{ width: 8, height: 8, background: cfg.color }}
              />
              <span className="text-[#9ca3af]">{key === 'blended' ? 'Blended (all)' : key}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
