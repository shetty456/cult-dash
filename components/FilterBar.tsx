'use client';

import { Channel, DateRange, FILTER_OPTIONS } from '@/lib/data';

interface FilterBarProps {
  dateRange: DateRange;
  channel: Channel;
  onDateRangeChange: (r: DateRange) => void;
  onChannelChange: (c: Channel) => void;
}

export default function FilterBar({
  dateRange,
  channel,
  onDateRangeChange,
  onChannelChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Date range pills */}
      <div className="flex items-center gap-1 bg-[#2d2d2d] rounded-lg p-1">
        {FILTER_OPTIONS.dateRanges.map((r) => (
          <button
            key={r}
            onClick={() => onDateRangeChange(r)}
            className={`
              px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150
              ${dateRange === r
                ? 'bg-[#10b981] text-black font-semibold'
                : 'text-[#9ca3af] hover:text-white hover:bg-[#3a3a3a]'
              }
            `}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Channel selector */}
      <div className="relative">
        <select
          value={channel}
          onChange={(e) => onChannelChange(e.target.value as Channel)}
          className="
            appearance-none bg-[#2d2d2d] text-white text-sm
            border border-[#3a3a3a] rounded-lg
            px-4 py-2 pr-8
            hover:border-[#4a4a4a] focus:outline-none focus:border-[#10b981]
            transition-colors duration-150 cursor-pointer
          "
        >
          {FILTER_OPTIONS.channels.map((c) => (
            <option key={c} value={c} className="bg-[#2d2d2d]">
              {c}
            </option>
          ))}
        </select>
        {/* Dropdown arrow */}
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
          <svg className="w-4 h-4 text-[#9ca3af]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-2 ml-auto text-xs text-[#6b7280]">
        <span className="inline-block w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
        As of Apr 11, 2026 · 14:47 IST
      </div>
    </div>
  );
}
