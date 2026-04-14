import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { parseFilters, userWhere, jsonResponse } from '@/lib/queryHelpers';

const CHANNEL_BASE_CAC: Record<string, number> = {
  'Paid Digital': 1120,
  'Organic': 420,
  'Referrals': 680,
  'Brand/ATL': 890,
  'Corporate': 560,
};
const CHANNEL_COLORS: Record<string, string> = {
  'Paid Digital': '#ef4444',
  'Organic': '#4ade80',
  'Referrals': '#10b981',
  'Brand/ATL': '#f59e0b',
  'Corporate': '#60a5fa',
};

const MONTH_LABELS = ['Oct','Nov','Dec','Jan','Feb','Mar'];

export async function GET(req: NextRequest) {
  const f = parseFilters(req.nextUrl.searchParams);
  const { clause, params } = userWhere(f);

  type ChannelRow = { channel: string; cnt: number };
  const channelRows = db.prepare(`
    SELECT channel, COUNT(*) as cnt FROM users u ${clause} GROUP BY channel
  `).all(params) as ChannelRow[];

  const byChannel = channelRows.map(r => ({
    channel: r.channel,
    cac: CHANNEL_BASE_CAC[r.channel] ?? 750,
    users: r.cnt,
    color: CHANNEL_COLORS[r.channel] ?? '#6b7280',
  })).sort((a, b) => a.cac - b.cac);

  // CAC trend — modelled 6-month history
  const trend = MONTH_LABELS.map((month, i) => ({
    month,
    blended: 780 + i * 8 + (i * 17) % 30,
    paid: 980 + i * 25 + (i * 13) % 50,
    organic: 390 + i * 5 + (i * 7) % 20,
  }));

  return jsonResponse({ byChannel, trend });
}
