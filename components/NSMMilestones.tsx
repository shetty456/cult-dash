'use client';

import { useMemo, useState } from 'react';
import { NSMMilestones as NSMMilestonesType, NSM_BY_AGE, NSM_BY_PAYMENT } from '@/lib/data';

interface NSMMilestonesProps {
  data: NSMMilestonesType;
}

type CohortSort = 'nsmPercent' | 'cohortSize' | 'trend';
type CohortSortDir = 'asc' | 'desc';

function Trend({ val }: { val: number }) {
  const color = val > 0 ? 'text-[#10b981]' : val < 0 ? 'text-[#ef4444]' : 'text-[#f59e0b]';
  const arrow = val > 0 ? '↑' : val < 0 ? '↓' : '→';
  return <span className={`${color} font-medium`}>{arrow} {Math.abs(val).toFixed(1)}%</span>;
}

// Width of each funnel step (decreasing for funnel effect)
const STEP_WIDTHS = ['100%', '88%', '76%', '64%', '48%'];

export default function NSMMilestones({ data }: NSMMilestonesProps) {
  const { currentWeek, historicalCohorts } = data;

  const [sortKey, setSortKey]   = useState<CohortSort>('nsmPercent');
  const [sortDir, setSortDir]   = useState<CohortSortDir>('desc');

  const sortedCohorts = useMemo(() => {
    return [...historicalCohorts].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      return sortDir === 'desc' ? vb - va : va - vb;
    });
  }, [historicalCohorts, sortKey, sortDir]);

  function handleSort(k: CohortSort) {
    if (sortKey === k) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(k); setSortDir('desc'); }
  }

  function SortTh({ label, colKey }: { label: string; colKey: CohortSort }) {
    const active = sortKey === colKey;
    return (
      <th
        scope="col"
        onClick={() => handleSort(colKey)}
        className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] cursor-pointer select-none hover:text-white transition-colors whitespace-nowrap"
      >
        {label} <span className="opacity-60">{active ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}</span>
      </th>
    );
  }

  const isBottleneckStage = (name: string) =>
    currentWeek.bottleneck.toLowerCase().includes(name.toLowerCase().split(' ')[0]);

  return (
    <div className="space-y-8">

      {/* ── Part A: Current Week Milestone Funnel ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">NSM Milestone Tracker</h3>
            <p className="text-xs text-[#6b7280] mt-0.5">Week of {currentWeek.week} · {currentWeek.cohortSize.toLocaleString()} new users</p>
          </div>
          <span className="text-xs text-[#9ca3af] bg-[#2d2d2d] border border-[#3a3a3a] rounded-lg px-3 py-1.5">
            NSM = ≥3 workouts / week
          </span>
        </div>

        <div className="flex flex-col items-center gap-1">
          {currentWeek.milestones.map((milestone, i) => {
            const isLast = i === currentWeek.milestones.length - 1;
            const prevCount = i > 0 ? currentWeek.milestones[i - 1].count : milestone.count;
            const dropFromPrev = i > 0 ? ((prevCount - milestone.count) / prevCount * 100).toFixed(0) : null;

            return (
              <div key={milestone.name} className="w-full flex flex-col items-center">
                {/* Drop-off arrow between steps */}
                {dropFromPrev !== null && (
                  <div className="flex items-center gap-2 my-1 text-xs text-[#6b7280]">
                    <span className={parseInt(dropFromPrev) > 50 ? 'text-[#ef4444] font-bold' : 'text-[#6b7280]'}>
                      ↓ -{dropFromPrev}% ({(prevCount - milestone.count).toLocaleString()} users lost)
                    </span>
                  </div>
                )}

                {/* Milestone box */}
                <div
                  style={{ width: STEP_WIDTHS[i] }}
                  className={`
                    relative flex items-center justify-between px-5 py-3 rounded-lg
                    border transition-all duration-200
                    ${isLast
                      ? 'bg-[#1e3a2a] border-[#10b981]/50 text-[#10b981]'
                      : isBottleneckStage(milestone.name)
                        ? 'bg-[#2a1a10] border-[#f59e0b]/40 text-white'
                        : 'bg-[#2d2d2d] border-[#3a3a3a] text-white'
                    }
                  `}
                >
                  <span className="text-sm font-medium">{milestone.name}</span>
                  <div className="text-right">
                    <span className="text-base font-bold tabular-nums">
                      {milestone.count.toLocaleString()}
                    </span>
                    <span className={`text-xs ml-2 ${isLast ? 'text-[#10b981]' : 'text-[#9ca3af]'}`}>
                      ({milestone.percent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottleneck callout */}
        <div className="mt-5 flex items-start gap-2 bg-[#2a1810] border border-[#f59e0b]/30 rounded-lg px-4 py-3">
          <span className="text-[#f59e0b] mt-0.5">⚠</span>
          <div>
            <p className="text-xs text-[#fbbf24] font-semibold">
              Biggest drop: {currentWeek.bottleneck} ({currentWeek.bottleneckPercent}% drop)
            </p>
            <p className="text-xs text-[#9ca3af] mt-0.5">
              Action: Improve streak reminders + community accountability loops for sustained habit formation
            </p>
          </div>
        </div>
      </div>

      {/* ── Part B: Historical Cohort Table ── */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#6b7280] mb-3">
          Historical Cohorts (Last 8 Weeks)
        </h3>
        <div className="overflow-x-auto rounded-xl border border-[#3a3a3a]">
          <table className="w-full text-xs min-w-[580px]" aria-label="NSM Historical Cohorts">
            <thead className="bg-[#252525] sticky top-0">
              <tr>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Week</th>
                <SortTh label="Cohort" colKey="cohortSize" />
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">1st Visit</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">2nd Visit</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">3rd Visit</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">NSM</th>
                <SortTh label="NSM %" colKey="nsmPercent" />
                <SortTh label="Trend" colKey="trend" />
              </tr>
            </thead>
            <tbody>
              {sortedCohorts.map((row, i) => (
                <tr
                  key={row.week}
                  className={`${i % 2 === 0 ? 'bg-[#2d2d2d]' : 'bg-[#313131]'} hover:brightness-125 transition-all duration-150 cursor-pointer`}
                >
                  <td className="px-3 py-2.5 text-white font-medium whitespace-nowrap">{row.week}</td>
                  <td className="px-3 py-2.5 text-right text-[#9ca3af] tabular-nums">{row.cohortSize.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right text-[#9ca3af] tabular-nums">100%</td>
                  <td className="px-3 py-2.5 text-right text-[#9ca3af] tabular-nums">
                    {((row.secondVisit / row.firstVisit) * 100).toFixed(0)}%
                  </td>
                  <td className="px-3 py-2.5 text-right text-[#9ca3af] tabular-nums">
                    {((row.thirdVisit / row.firstVisit) * 100).toFixed(0)}%
                  </td>
                  <td className="px-3 py-2.5 text-right text-white tabular-nums font-medium">{row.nsmCompletion}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-[#60a5fa] tabular-nums">{row.nsmPercent.toFixed(1)}%</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    <Trend val={row.trend} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Part C: NSM by Segment ── */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#6b7280] mb-3">
          NSM by Segment
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* NSM by Age */}
          <div>
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wider mb-2">By Age Band</p>
            <div className="overflow-x-auto rounded-xl border border-[#3a3a3a]">
              <table className="w-full text-xs min-w-[380px]">
                <thead className="bg-[#252525]">
                  <tr>
                    {['Age', '1st', '2nd', '3rd', '4Wk NSM', 'NSM %', 'Trend'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-right first:text-left text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {NSM_BY_AGE.map((row, i) => (
                    <tr key={row.band} className={`${i % 2 === 0 ? 'bg-[#2d2d2d]' : 'bg-[#313131]'} hover:brightness-125 transition-all duration-150`}>
                      <td className="px-3 py-2.5 font-semibold text-white">{row.band}</td>
                      <td className="px-3 py-2.5 text-right text-[#9ca3af] tabular-nums">{row.firstVisit}%</td>
                      <td className="px-3 py-2.5 text-right text-[#9ca3af] tabular-nums">{row.secondVisit}%</td>
                      <td className="px-3 py-2.5 text-right text-[#9ca3af] tabular-nums">{row.thirdVisit}%</td>
                      <td className="px-3 py-2.5 text-right text-[#9ca3af] tabular-nums">{row.fourWkNsm}%</td>
                      <td className="px-3 py-2.5 text-right font-bold text-[#60a5fa] tabular-nums">{row.nsmPct}%</td>
                      <td className="px-3 py-2.5 text-right tabular-nums"><Trend val={row.trend} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* NSM by Payment */}
          <div>
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wider mb-2">By Payment Type</p>
            <div className="overflow-x-auto rounded-xl border border-[#3a3a3a]">
              <table className="w-full text-xs min-w-[380px]">
                <thead className="bg-[#252525]">
                  <tr>
                    {['Type', '1st', '2nd', '3rd', '4Wk NSM', 'NSM %', 'Trend'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-right first:text-left text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {NSM_BY_PAYMENT.map((row, i) => (
                    <tr key={row.type} className={`${i % 2 === 0 ? 'bg-[#2d2d2d]' : 'bg-[#313131]'} hover:brightness-125 transition-all duration-150`}>
                      <td className="px-3 py-2.5 font-semibold text-white">{row.type}</td>
                      <td className="px-3 py-2.5 text-right text-[#9ca3af] tabular-nums">{row.firstVisit}%</td>
                      <td className="px-3 py-2.5 text-right text-[#9ca3af] tabular-nums">{row.secondVisit}%</td>
                      <td className="px-3 py-2.5 text-right text-[#9ca3af] tabular-nums">{row.thirdVisit}%</td>
                      <td className="px-3 py-2.5 text-right text-[#9ca3af] tabular-nums">{row.fourWkNsm}%</td>
                      <td className="px-3 py-2.5 text-right font-bold text-[#60a5fa] tabular-nums">{row.nsmPct}%</td>
                      <td className="px-3 py-2.5 text-right tabular-nums"><Trend val={row.trend} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
