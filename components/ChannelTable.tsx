'use client';

import { useMemo, useState } from 'react';
import { ChannelRow } from '@/lib/data';

interface ChannelTableProps {
  data: ChannelRow[];
}

type SortKey = 'installs' | 'trialConv' | 'paidConv' | 'cac' | 'nsm';
type SortDir = 'asc' | 'desc';

const STATUS_BADGE: Record<ChannelRow['status'], { text: string; class: string }> = {
  healthy: { text: '🟢 Healthy', class: 'text-[#10b981]' },
  watch:   { text: '🟡 Watch',   class: 'text-[#f59e0b]' },
  alert:   { text: '🔴 Alert',   class: 'text-[#ef4444]' },
};

function formatK(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);
}

function Trend({ value, goodDirection = 'up' }: { value: number; goodDirection?: 'up' | 'down' }) {
  const isGood = goodDirection === 'up' ? value >= 0 : value <= 0;
  const color = value === 0 ? '#f59e0b' : isGood ? '#10b981' : '#ef4444';
  const arrow = value > 0 ? '↑' : value < 0 ? '↓' : '→';
  return (
    <span style={{ color }} className="text-xs font-medium ml-1">
      {arrow} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export default function ChannelTable({ data }: ChannelTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('installs');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      return sortDir === 'desc' ? vb - va : va - vb;
    });
  }, [data, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function SortHeader({ label, colKey }: { label: string; colKey: SortKey }) {
    const active = sortKey === colKey;
    return (
      <th
        scope="col"
        role="columnheader"
        aria-sort={active ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
        onClick={() => handleSort(colKey)}
        className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af] cursor-pointer select-none hover:text-white transition-colors whitespace-nowrap"
      >
        {label}
        <span className="ml-1 opacity-60">{active ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}</span>
      </th>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#3a3a3a]">
      <table className="w-full text-sm min-w-[780px]" aria-label="Channel Performance Comparison">
        <thead className="bg-[#252525] sticky top-0 z-10">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af] whitespace-nowrap">
              Channel
            </th>
            <SortHeader label="Installs (WoW)" colKey="installs" />
            <SortHeader label="Trial Conv %" colKey="trialConv" />
            <SortHeader label="Paid Conv %" colKey="paidConv" />
            <SortHeader label="CAC (₹)" colKey="cac" />
            <th scope="col" className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af] whitespace-nowrap">
              Time-to-Visit
            </th>
            <SortHeader label="NSM %" colKey="nsm" />
            <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af]">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            const isAlert = row.status === 'alert';
            const rowBg = i % 2 === 0 ? 'bg-[#2d2d2d]' : 'bg-[#313131]';
            const alertBg = isAlert ? 'bg-[#2a1515]' : rowBg;

            return (
              <tr
                key={row.name}
                className={`${alertBg} hover:brightness-125 transition-all duration-150 cursor-pointer`}
              >
                {/* Channel name */}
                <td className="px-4 py-3 font-medium text-white whitespace-nowrap">
                  {row.name}
                  {isAlert && row.alert && (
                    <span className="ml-2 text-[10px] text-[#ef4444] font-normal">{row.alert}</span>
                  )}
                </td>

                {/* Installs */}
                <td className="px-4 py-3 text-right text-white tabular-nums">
                  {formatK(row.installs)}
                  <Trend value={row.installsWoW} goodDirection="up" />
                </td>

                {/* Trial conv */}
                <td className="px-4 py-3 text-right tabular-nums">
                  <span className={row.trialConv >= 65 ? 'text-[#10b981]' : row.trialConv >= 55 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}>
                    {row.trialConv}%
                  </span>
                </td>

                {/* Paid conv */}
                <td className="px-4 py-3 text-right tabular-nums">
                  <span className={row.paidConv >= 55 ? 'text-[#10b981]' : row.paidConv >= 45 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}>
                    {row.paidConv}%
                  </span>
                </td>

                {/* CAC */}
                <td className="px-4 py-3 text-right tabular-nums">
                  <span className={row.cac <= 750 ? 'text-[#10b981]' : row.cac <= 950 ? 'text-[#f59e0b]' : 'text-[#ef4444] font-semibold'}>
                    ₹{row.cac.toLocaleString()}
                  </span>
                  <Trend value={row.cacMoM} goodDirection="down" />
                </td>

                {/* Time to visit */}
                <td className="px-4 py-3 text-right text-[#9ca3af] tabular-nums">
                  {row.timeToVisit}d
                </td>

                {/* NSM */}
                <td className="px-4 py-3 text-right font-semibold text-[#60a5fa] tabular-nums">
                  {row.nsm}%
                </td>

                {/* Status */}
                <td className={`px-4 py-3 text-sm font-medium ${STATUS_BADGE[row.status].class}`}>
                  {STATUS_BADGE[row.status].text}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
