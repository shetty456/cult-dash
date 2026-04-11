'use client';

import { useMemo, useState } from 'react';
import { AgeBand, PaymentSegment } from '@/lib/data';

interface SegmentationTablesProps {
  ageBands: AgeBand[];
  paymentSegments: PaymentSegment[];
}

// Color-code a retention % cell
function retCell(val: number) {
  if (val >= 40) return 'bg-[#064e3b]/40 text-[#34d399]';
  if (val >= 30) return 'bg-[#451a03]/40 text-[#fbbf24]';
  return 'bg-[#450a0a]/40 text-[#f87171]';
}

function churnColor(rate: number) {
  if (rate < 5) return 'text-[#10b981]';
  if (rate <= 6) return 'text-[#f97316]';
  return 'text-[#ef4444] font-semibold';
}

function Trend({ val }: { val: number }) {
  const color = val > 0 ? 'text-[#10b981]' : val < 0 ? 'text-[#ef4444]' : 'text-[#f59e0b]';
  const arrow = val > 0 ? '↑' : val < 0 ? '↓' : '→';
  return <span className={`${color} text-xs ml-1`}>{arrow} {Math.abs(val).toFixed(1)}%</span>;
}

function formatK(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);
}

// Insight auto-generation from data
function buildInsights(ages: AgeBand[], payments: PaymentSegment[]): string[] {
  const insights: string[] = [];

  // Best LTV:CAC
  const bestPayment = [...payments].sort((a, b) => b.ltvCacRatio - a.ltvCacRatio)[0];
  const worstPayment = [...payments].sort((a, b) => a.ltvCacRatio - b.ltvCacRatio)[0];
  insights.push(
    `${bestPayment.type} users have ${bestPayment.ltvCacRatio}:1 LTV:CAC vs. ${worstPayment.ltvCacRatio}:1 for ${worstPayment.type} — scale the ${bestPayment.type} channel`
  );

  // Largest age cohort
  const totalUsers = ages.reduce((s, a) => s + a.users, 0);
  const largest = [...ages].sort((a, b) => b.users - a.users)[0];
  const pct = ((largest.users / totalUsers) * 100).toFixed(0);
  insights.push(
    `${largest.band} is the largest segment (${pct}% of users) with strong NSM — focus retention programs here`
  );

  // Highest churn
  const highChurn = [...ages].sort((a, b) => b.churnRate - a.churnRate)[0];
  if (highChurn.churnRate > 6) {
    insights.push(
      `${highChurn.band} has highest churn at ${highChurn.churnRate}% — build social & community loops for this cohort`
    );
  }

  return insights;
}

export default function SegmentationTables({ ageBands, paymentSegments }: SegmentationTablesProps) {
  type AgeSort  = 'users' | 'd30Retention' | 'nsm' | 'churnRate';
  type PaySort  = 'users' | 'ltvCacRatio';

  const [ageSort, setAgeSort]   = useState<AgeSort>('users');
  const [ageSortDir, setAgeSortDir] = useState<'asc' | 'desc'>('desc');
  const [paySort, setPaySort]   = useState<PaySort>('ltvCacRatio');

  const sortedAge = useMemo(
    () => [...ageBands].sort((a, b) => ageSortDir === 'desc' ? b[ageSort] - a[ageSort] : a[ageSort] - b[ageSort]),
    [ageBands, ageSort, ageSortDir]
  );

  const sortedPay = useMemo(
    () => [...paymentSegments].sort((a, b) => b[paySort] - a[paySort]),
    [paymentSegments, paySort]
  );

  function toggleAgeSort(k: AgeSort) {
    if (ageSort === k) setAgeSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setAgeSort(k); setAgeSortDir('desc'); }
  }

  function SortTh({ label, onSort, active, dir, right = true }: {
    label: string; onSort: () => void;
    active: boolean; dir: 'asc' | 'desc'; right?: boolean;
  }) {
    return (
      <th
        scope="col"
        onClick={onSort}
        className={`px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] cursor-pointer select-none hover:text-white transition-colors whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}
      >
        {label} <span className="opacity-60">{active ? (dir === 'desc' ? '↓' : '↑') : '↕'}</span>
      </th>
    );
  }

  const insights = useMemo(() => buildInsights(ageBands, paymentSegments), [ageBands, paymentSegments]);

  return (
    <div className="space-y-6">
      {/* Tables side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Age Band Table ── */}
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#6b7280] mb-2">
            By Age Band
          </h3>
          <div className="overflow-x-auto rounded-xl border border-[#3a3a3a]">
            <table className="w-full text-xs min-w-[480px]" aria-label="Segmentation by Age Band">
              <thead className="bg-[#252525] sticky top-0">
                <tr>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Age</th>
                  <SortTh label="Users" onSort={() => toggleAgeSort('users')}        active={ageSort === 'users'}        dir={ageSortDir} />
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">D7</th>
                  <SortTh label="D30"   onSort={() => toggleAgeSort('d30Retention')} active={ageSort === 'd30Retention'} dir={ageSortDir} />
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">D60</th>
                  <SortTh label="NSM %" onSort={() => toggleAgeSort('nsm')}          active={ageSort === 'nsm'}          dir={ageSortDir} />
                  <SortTh label="Churn" onSort={() => toggleAgeSort('churnRate')}    active={ageSort === 'churnRate'}    dir={ageSortDir} />
                </tr>
              </thead>
              <tbody>
                {sortedAge.map((row, i) => (
                  <tr key={row.band} className={`${i % 2 === 0 ? 'bg-[#2d2d2d]' : 'bg-[#313131]'} hover:brightness-125 transition-all duration-150 cursor-pointer`}>
                    <td className="px-3 py-2.5 font-semibold text-white">{row.band}</td>
                    <td className="px-3 py-2.5 text-right text-white tabular-nums">
                      {formatK(row.users)}
                      <Trend val={row.usersWoW} />
                    </td>
                    <td className={`px-3 py-2.5 text-right tabular-nums text-xs font-medium rounded-sm ${retCell(row.d7Retention)}`}>{row.d7Retention}%</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums text-xs font-medium ${retCell(row.d30Retention)}`}>{row.d30Retention}%</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums text-xs font-medium ${retCell(row.d60Retention)}`}>{row.d60Retention}%</td>
                    <td className="px-3 py-2.5 text-right font-bold text-[#60a5fa] tabular-nums">{row.nsm}%</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums ${churnColor(row.churnRate)}`}>{row.churnRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Payment Type Table ── */}
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#6b7280] mb-2">
            By Payment Type
          </h3>
          <div className="overflow-x-auto rounded-xl border border-[#3a3a3a]">
            <table className="w-full text-xs min-w-[420px]" aria-label="Segmentation by Payment Type">
              <thead className="bg-[#252525] sticky top-0">
                <tr>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Type</th>
                  <SortTh label="Users" onSort={() => setPaySort('users')} active={paySort === 'users'} dir="desc" />
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">D7</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">D30</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">D60</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">NSM %</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">ARPU</th>
                  <SortTh label="LTV:CAC" onSort={() => setPaySort('ltvCacRatio')} active={paySort === 'ltvCacRatio'} dir="desc" />
                </tr>
              </thead>
              <tbody>
                {sortedPay.map((row, i) => (
                  <tr key={row.type} className={`${i % 2 === 0 ? 'bg-[#2d2d2d]' : 'bg-[#313131]'} hover:brightness-125 transition-all duration-150 cursor-pointer`}>
                    <td className="px-3 py-2.5 font-semibold text-white">{row.type}</td>
                    <td className="px-3 py-2.5 text-right text-white tabular-nums">
                      {formatK(row.users)}
                      <Trend val={row.usersWoW} />
                    </td>
                    <td className={`px-3 py-2.5 text-right tabular-nums ${retCell(row.d7Retention)}`}>{row.d7Retention}%</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums ${retCell(row.d30Retention)}`}>{row.d30Retention}%</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums ${retCell(row.d60Retention)}`}>{row.d60Retention}%</td>
                    <td className="px-3 py-2.5 text-right font-bold text-[#60a5fa] tabular-nums">{row.nsm}%</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-white tabular-nums">₹{row.arpu}</td>
                    <td className={`px-3 py-2.5 text-right font-bold tabular-nums ${row.ltvCacRatio >= 3 ? 'text-[#10b981]' : 'text-[#f97316]'}`}>
                      {row.ltvCacRatio}:1
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Key Insights Callout ── */}
      <div className="bg-[#1e2a1e] border border-[#10b981]/30 rounded-xl px-5 py-4">
        <p className="text-xs font-bold text-[#10b981] uppercase tracking-widest mb-3">💡 Key Insights</p>
        <ul className="space-y-2">
          {insights.map((ins, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-[#9ca3af] leading-relaxed">
              <span className="text-[#10b981] mt-0.5 flex-shrink-0">├─</span>
              {ins}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
