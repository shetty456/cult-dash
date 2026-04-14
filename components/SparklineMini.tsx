'use client';

import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface SparklineMiniProps {
  data: number[];
  color: string;
  id: string;
}

export default function SparklineMini({ data, color, id }: SparklineMiniProps) {
  const chartData = data.map((v, i) => ({ i, v }));
  const gradId = `spark-${id}`;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
