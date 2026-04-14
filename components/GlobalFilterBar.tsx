'use client';

import { useEffect, useState } from 'react';
import { GlobalFilters } from '@/lib/queryHelpers';

interface FilterOptions {
  utmSources: string[];
  utmMediums: string[];
  deviceTypes: string[];
  cities: string[];
  plans: string[];
  channels: string[];
}

interface GlobalFilterBarProps {
  filters: GlobalFilters;
  onChange: (f: GlobalFilters) => void;
}

const FILTER_LABELS: Record<string, string> = {
  utm_source: 'UTM Source', utm_medium: 'UTM Medium',
  device_type: 'Device', city: 'City', plan: 'Plan', channel: 'Channel',
};

function FilterSelect({
  label, value, options, onChange,
}: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const hasValue = !!value;
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`
          appearance-none text-[11px] font-medium px-3 py-1.5 pr-6 rounded-lg border cursor-pointer
          focus:outline-none transition-colors duration-150
          ${hasValue
            ? 'bg-[#0f2d1f] border-[#10b981]/60 text-[#10b981]'
            : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#6b7280] hover:text-[#9ca3af] hover:border-[#3a3a3a]'
          }
        `}
      >
        <option value="">{label}</option>
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      {/* Chevron */}
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-current opacity-60">▾</span>
    </div>
  );
}

export default function GlobalFilterBar({ filters, onChange }: GlobalFilterBarProps) {
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch('/api/filter-options').then(r => r.json()).then(setOptions);
  }, []);

  function set(key: keyof GlobalFilters, val: string) {
    onChange({ ...filters, [key]: val || undefined });
  }

  function clear() {
    onChange({});
  }

  const activeCount = Object.values(filters).filter(Boolean).length;

  if (!options) return null;

  return (
    <>
      {/* Desktop filter bar */}
      <div className="hidden md:flex items-center gap-2 flex-wrap">
        <FilterSelect label="UTM Source"  value={filters.utm_source ?? ''} options={options.utmSources}  onChange={v => set('utm_source', v)} />
        <FilterSelect label="UTM Medium"  value={filters.utm_medium ?? ''} options={options.utmMediums}  onChange={v => set('utm_medium', v)} />
        <FilterSelect label="Device"      value={filters.device_type ?? ''} options={options.deviceTypes} onChange={v => set('device_type', v)} />
        <FilterSelect label="City"        value={filters.city ?? ''}        options={options.cities}      onChange={v => set('city', v)} />
        <FilterSelect label="Plan"        value={filters.plan ?? ''}        options={options.plans}       onChange={v => set('plan', v)} />
        <FilterSelect label="Channel"     value={filters.channel ?? ''}     options={options.channels}    onChange={v => set('channel', v)} />
        {activeCount > 0 && (
          <button
            onClick={clear}
            className="text-[11px] font-semibold text-[#ef4444] hover:text-[#fca5a5] px-2 py-1.5 rounded-lg border border-[#450a0a] hover:border-[#ef4444]/50 transition-colors"
          >
            × Clear {activeCount}
          </button>
        )}
      </div>

      {/* Mobile: filter button → sheet */}
      <div className="md:hidden relative">
        <button
          onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-colors ${
            activeCount > 0
              ? 'bg-[#0f2d1f] border-[#10b981]/60 text-[#10b981]'
              : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#6b7280]'
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 3h10M3 6h6M5 9h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Filters
          {activeCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#10b981] text-black text-[9px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-9 z-50 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 shadow-xl min-w-[240px] space-y-2">
              {(['utm_source','utm_medium','device_type','city','plan','channel'] as (keyof GlobalFilters)[]).map(key => {
                const optsMap: Record<string, string[]> = {
                  utm_source: options.utmSources, utm_medium: options.utmMediums,
                  device_type: options.deviceTypes, city: options.cities,
                  plan: options.plans, channel: options.channels,
                };
                return (
                  <div key={key}>
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-[#4b5563] mb-1">{FILTER_LABELS[key]}</p>
                    <select
                      value={(filters[key] as string) ?? ''}
                      onChange={e => { set(key, e.target.value); }}
                      className="w-full text-xs bg-[#252525] border border-[#3a3a3a] text-[#9ca3af] rounded-lg px-2 py-1.5 focus:outline-none"
                    >
                      <option value="">All</option>
                      {optsMap[key].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                );
              })}
              {activeCount > 0 && (
                <button onClick={() => { clear(); setOpen(false); }} className="w-full text-xs text-[#ef4444] py-1.5 border border-[#450a0a] rounded-lg">
                  × Clear all
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {(Object.entries(filters) as [keyof GlobalFilters, string][]).filter(([, v]) => v).map(([k, v]) => (
            <span
              key={k}
              className="flex items-center gap-1 text-[10px] font-semibold bg-[#0f2d1f] border border-[#10b981]/40 text-[#10b981] px-2 py-0.5 rounded-full"
            >
              {FILTER_LABELS[k]}: {v}
              <button onClick={() => set(k, '')} className="hover:text-white ml-0.5">×</button>
            </span>
          ))}
        </div>
      )}
    </>
  );
}
