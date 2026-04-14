'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { GlobalFilters } from '@/lib/queryHelpers';

interface NsmRow { week: string; nsm_count: number; nsm_rate: number; }

export default function NSMMini({ filters }: { filters: GlobalFilters }) {
  const [rows, setRows] = useState<NsmRow[]>([]);
  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    const qs = new URLSearchParams(filters as Record<string, string>);
    fetch(`/api/nsm?${qs}`).then(r => r.json()).then(d => setRows(Array.isArray(d) ? d : []));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  if (rows.length === 0) return <div className="h-[180px] bg-[#1a1a1a] rounded-lg animate-pulse" />;

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={rows} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="week"
          tick={{ fill: '#4b5563', fontSize: 9 }}
          tickFormatter={w => w.replace(/^\d{4}-/, '')}
          axisLine={false}
          tickLine={false}
          interval={1}
        />
        <YAxis tick={{ fill: '#4b5563', fontSize: 9 }} axisLine={false} tickLine={false} width={30} />
        <Tooltip
          contentStyle={{ background: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: 6, fontSize: 11 }}
          formatter={(val, name) => [
            name === 'nsm_count' ? Number(val ?? 0).toLocaleString() : `${Number(val ?? 0).toFixed(1)}%`,
            name === 'nsm_count' ? 'NSM Users' : 'NSM Rate',
          ]}
        />
        <Line type="monotone" dataKey="nsm_count" stroke="#60a5fa" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="nsm_rate" stroke="#a78bfa" strokeWidth={1.5} dot={false} isAnimationActive={false} strokeDasharray="4 2" />
      </LineChart>
    </ResponsiveContainer>
  );
}
