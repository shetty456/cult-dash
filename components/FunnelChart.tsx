'use client';

import { FunnelStage } from '@/lib/data';
import { useState } from 'react';

interface FunnelChartProps {
  stages: FunnelStage[];
}

// SVG layout constants (in viewBox units)
const VIEW_W = 960;
const VIEW_H = 340;
const CHART_TOP = 60;      // space for labels above bars
const CHART_H = 180;       // usable bar height
const BAR_W = 100;
const GAP = 72;            // gap between bars (holds drop-off annotation)
const N = 5;
const TOTAL_W = BAR_W * N + GAP * (N - 1);
const LEFT = (VIEW_W - TOTAL_W) / 2;
const LABEL_Y = CHART_TOP + CHART_H + 28;  // stage names below bars
const CONV_Y = LABEL_Y + 18;               // conversion % below label

function barX(i: number) {
  return LEFT + i * (BAR_W + GAP);
}

function barHeight(count: number, maxCount: number) {
  return (count / maxCount) * CHART_H;
}

function barColor(stage: FunnelStage) {
  if (stage.isBiggestLeak) return '#ef4444';
  if (stage.dropOffRate && stage.dropOffRate > 50) return '#f97316';
  return '#4ade80';
}

function formatCount(n: number) {
  if (n >= 100000) return `${(n / 1000).toFixed(0)}K`;
  if (n >= 1000)   return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function FunnelChart({ stages }: FunnelChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const maxCount = Math.max(...stages.map(s => s.count));

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        aria-label="Acquisition Funnel"
        style={{ minWidth: 540 }}
      >
        {/* Grid lines */}
        {[25, 50, 75, 100].map(pct => {
          const lineY = CHART_TOP + CHART_H - (pct / 100) * CHART_H;
          return (
            <g key={pct}>
              <line
                x1={LEFT} y1={lineY}
                x2={LEFT + TOTAL_W} y2={lineY}
                stroke="#2d2d2d" strokeWidth="1"
              />
              <text x={LEFT - 8} y={lineY + 4} textAnchor="end" fontSize="10" fill="#4b5563">
                {pct}%
              </text>
            </g>
          );
        })}

        {/* Baseline */}
        <line
          x1={LEFT} y1={CHART_TOP + CHART_H}
          x2={LEFT + TOTAL_W} y2={CHART_TOP + CHART_H}
          stroke="#3a3a3a" strokeWidth="1.5"
        />

        {/* Drop-off annotations between bars */}
        {stages.slice(1).map((stage, i) => {
          const midX = barX(i) + BAR_W + GAP / 2;
          const midY = CHART_TOP + CHART_H / 2;
          const isWorst = stage.isBiggestLeak;

          return (
            <g key={`drop-${i}`}>
              {/* Arrow down */}
              <text
                x={midX} y={midY - 8}
                textAnchor="middle"
                fontSize="16"
                fill={isWorst ? '#ef4444' : '#6b7280'}
              >
                ▼
              </text>
              {/* Drop % */}
              <text
                x={midX} y={midY + 10}
                textAnchor="middle"
                fontSize="11"
                fontWeight={isWorst ? 'bold' : 'normal'}
                fill={isWorst ? '#ef4444' : '#9ca3af'}
              >
                -{stage.dropOffRate}%
              </text>
              {/* Biggest leak badge */}
              {isWorst && (
                <text
                  x={midX} y={midY + 26}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#ef4444"
                  fontWeight="bold"
                >
                  BIGGEST LEAK
                </text>
              )}
            </g>
          );
        })}

        {/* Bars */}
        {stages.map((stage, i) => {
          const bh = barHeight(stage.count, maxCount);
          const bx = barX(i);
          const by = CHART_TOP + CHART_H - bh;
          const isHovered = hoveredIndex === i;
          const color = barColor(stage);

          return (
            <g key={stage.label}>
              {/* Bar */}
              <rect
                x={bx}
                y={by}
                width={BAR_W}
                height={bh}
                rx="6"
                fill={color}
                opacity={isHovered ? 1 : 0.85}
                style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />

              {/* Hover outline */}
              {isHovered && (
                <rect
                  x={bx - 2} y={by - 2}
                  width={BAR_W + 4} height={bh + 4}
                  rx="7" fill="none"
                  stroke={color} strokeWidth="2" opacity="0.6"
                />
              )}

              {/* Count label above bar */}
              <text
                x={bx + BAR_W / 2} y={by - 10}
                textAnchor="middle"
                fontSize="13"
                fontWeight="bold"
                fill="#ffffff"
              >
                {formatCount(stage.count)}
              </text>

              {/* Stage name */}
              <text
                x={bx + BAR_W / 2} y={LABEL_Y}
                textAnchor="middle"
                fontSize="11"
                fill="#9ca3af"
              >
                {stage.label}
              </text>

              {/* Conversion % below name */}
              {stage.convRate !== null && (
                <text
                  x={bx + BAR_W / 2} y={CONV_Y}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#6b7280"
                >
                  {stage.convRate}% conv.
                </text>
              )}

              {/* Hover tooltip */}
              {isHovered && (
                <g>
                  <rect
                    x={bx - 10} y={by - 52}
                    width={120} height={38}
                    rx="6" fill="#1a1a1a"
                    stroke="#3a3a3a" strokeWidth="1"
                  />
                  <text x={bx + 50} y={by - 34} textAnchor="middle" fontSize="11" fill="#fff" fontWeight="bold">
                    {formatCount(stage.count)} {stage.label === 'Install' ? 'Installs' : 'users'}
                  </text>
                  <text x={bx + 50} y={by - 19} textAnchor="middle" fontSize="10" fill={stage.wowChange >= 0 ? '#34d399' : '#f87171'}>
                    {stage.wowChange >= 0 ? '↑' : '↓'} {Math.abs(stage.wowChange).toFixed(1)}% WoW
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Overall conversion label */}
        <text
          x={VIEW_W / 2} y={VIEW_H - 8}
          textAnchor="middle"
          fontSize="11"
          fill="#6b7280"
        >
          Overall: Install → Paid Sub = {((stages[stages.length - 1].count / stages[0].count) * 100).toFixed(1)}% conversion
        </text>
      </svg>
    </div>
  );
}
