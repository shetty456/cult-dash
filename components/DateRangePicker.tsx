'use client';

import { useState } from 'react';
import { GlobalFilters } from '@/lib/queryHelpers';

type DateKey = 'custom' | 'today' | '1d' | '7d' | '30d' | '3m' | '6m' | '12m';

const PILLS: { key: DateKey; label: string }[] = [
  { key: 'custom', label: 'Custom'    },
  { key: 'today',  label: 'Today'     },
  { key: '1d',     label: 'Yesterday' },
  { key: '7d',     label: '7D'        },
  { key: '30d',    label: '30D'       },
  { key: '3m',     label: '3M'        },
  { key: '6m',     label: '6M'        },
  { key: '12m',    label: '12M'       },
];

function getBounds(key: DateKey): { from?: string; to?: string } {
  if (key === 'custom') return {};
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ago   = (days: number) => new Date(today.getTime() - days * 86400000).toISOString();
  switch (key) {
    case 'today': return { from: today.toISOString(),  to: now.toISOString() };
    case '1d':    return { from: ago(1),                to: today.toISOString() };
    case '7d':    return { from: ago(7),                to: now.toISOString() };
    case '30d':   return { from: ago(30),               to: now.toISOString() };
    case '3m':    return { from: ago(90),               to: now.toISOString() };
    case '6m':    return { from: ago(180),              to: now.toISOString() };
    case '12m':   return { from: ago(365),              to: now.toISOString() };
  }
}

interface Props {
  filters: GlobalFilters;
  onChange: (f: GlobalFilters) => void;
}

export default function DateRangePicker({ filters, onChange }: Props) {
  const [activeKey, setActiveKey] = useState<DateKey>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');

  function select(key: DateKey) {
    setActiveKey(key);
    if (key !== 'custom') {
      onChange(getBounds(key));
    }
  }

  function applyCustom() {
    if (customFrom && customTo) {
      onChange({ from: new Date(customFrom).toISOString(), to: new Date(customTo + 'T23:59:59').toISOString() });
    }
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {PILLS.map(p => (
        <button
          key={p.key}
          onClick={() => select(p.key)}
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors ${
            activeKey === p.key
              ? 'bg-[#10b981] text-black'
              : 'text-[#6b7280] hover:text-[#9ca3af] hover:bg-[#1e1e1e]'
          }`}
        >
          {p.label}
        </button>
      ))}

      {activeKey === 'custom' && (
        <div className="flex items-center gap-1.5 ml-1">
          <input
            type="date"
            value={customFrom}
            onChange={e => setCustomFrom(e.target.value)}
            className="text-[11px] bg-[#1a1a1a] border border-[#2a2a2a] text-[#9ca3af] rounded-md px-2 py-1 focus:outline-none focus:border-[#3a3a3a] [color-scheme:dark]"
          />
          <span className="text-[#4b5563] text-[11px]">→</span>
          <input
            type="date"
            value={customTo}
            onChange={e => setCustomTo(e.target.value)}
            className="text-[11px] bg-[#1a1a1a] border border-[#2a2a2a] text-[#9ca3af] rounded-md px-2 py-1 focus:outline-none focus:border-[#3a3a3a] [color-scheme:dark]"
          />
          <button
            onClick={applyCustom}
            disabled={!customFrom || !customTo}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-[#10b981] text-black disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
