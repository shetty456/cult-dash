import { NextRequest } from 'next/server';
import db, { SCALE } from '@/lib/db';
import { parseFilters, userWhere, jsonResponse } from '@/lib/queryHelpers';

const ANCHOR = '2026-04-11T14:47:00Z';
const ANCHOR_7  = `datetime('${ANCHOR}', '-7 days')`;
const ANCHOR_14 = `datetime('${ANCHOR}', '-14 days')`;

const CHANNEL_CAC: Record<string, number> = {
  'Paid Digital': 1120, 'Organic': 420, 'Referrals': 680, 'Brand/ATL': 890, 'Corporate': 560,
};

export async function GET(req: NextRequest) {
  const f = parseFilters(req.nextUrl.searchParams);
  const { clause, params } = userWhere(f);

  // Helpers to build WHERE for event queries that JOIN users
  const andClause = clause ? clause.replace('WHERE ', 'AND ') : '';

  // WAU — distinct users active in last 7 days
  const wau = (db.prepare(`
    SELECT COUNT(DISTINCT e.user_id) as c
    FROM events e JOIN users u ON u.id = e.user_id
    WHERE e.timestamp >= ${ANCHOR_7} ${andClause}
  `).get(params) as { c: number }).c * SCALE;

  // WAU prev week
  const wauPrev = (db.prepare(`
    SELECT COUNT(DISTINCT e.user_id) as c
    FROM events e JOIN users u ON u.id = e.user_id
    WHERE e.timestamp >= ${ANCHOR_14}
      AND e.timestamp < ${ANCHOR_7} ${andClause}
  `).get(params) as { c: number }).c * SCALE;

  const wauChange = wauPrev > 0 ? Math.round(((wau - wauPrev) / wauPrev) * 1000) / 10 : 0;

  // NSM — users with ≥3 workout_completed in last 7 days
  const nsmRaw = (db.prepare(`
    SELECT COUNT(*) as c FROM (
      SELECT e.user_id FROM events e JOIN users u ON u.id = e.user_id
      WHERE e.type = 'workout_completed'
        AND e.timestamp >= ${ANCHOR_7} ${andClause}
      GROUP BY e.user_id HAVING COUNT(*) >= 3
    )
  `).get(params) as { c: number }).c;

  const nsm = nsmRaw * SCALE;
  const nsmPrev = Math.round(nsm * 0.93);
  const nsmChange = nsmPrev > 0 ? Math.round(((nsm - nsmPrev) / nsmPrev) * 1000) / 10 : 0;

  // Blended CAC (weighted by channel user count)
  type ChannelRow = { channel: string; cnt: number };
  const channelCounts = db.prepare(`
    SELECT u.channel, COUNT(*) as cnt FROM users u ${clause} GROUP BY u.channel
  `).all(params) as ChannelRow[];

  let totalUsers = 0; let weightedCac = 0;
  for (const row of channelCounts) {
    totalUsers += row.cnt;
    weightedCac += (CHANNEL_CAC[row.channel] ?? 750) * row.cnt;
  }
  const cac = totalUsers > 0 ? Math.round(weightedCac / totalUsers) : 750;
  const cacPrev = Math.round(cac * 0.92);
  const cacChange = Math.round(((cac - cacPrev) / cacPrev) * 1000) / 10;

  // ARPU
  const arpuRow = db.prepare(`
    SELECT AVG(ltv) as avg FROM users u
    ${clause ? clause + " AND u.plan != 'free'" : "WHERE u.plan != 'free'"}
  `).get(params) as { avg: number | null };
  const arpu = Math.round(arpuRow.avg ?? 0);
  const arpuPrev = Math.round(arpu * 0.96);
  const arpuChange = arpuPrev > 0 ? Math.round(((arpu - arpuPrev) / arpuPrev) * 1000) / 10 : 0;

  // MRR
  const mrrRow = db.prepare(`
    SELECT SUM(CASE plan
      WHEN 'monthly'   THEN ltv
      WHEN 'quarterly' THEN ltv / 3.0
      WHEN 'annual'    THEN ltv / 12.0
      ELSE 0 END) as mrr
    FROM users u
    ${clause ? clause + " AND u.plan != 'free'" : "WHERE u.plan != 'free'"}
  `).get(params) as { mrr: number | null };
  const mrr = Math.round((mrrRow.mrr ?? 0) * SCALE);
  const mrrPrev = Math.round(mrr * 0.93);
  const mrrChange = mrrPrev > 0 ? Math.round(((mrr - mrrPrev) / mrrPrev) * 1000) / 10 : 0;

  return jsonResponse({
    wau:  { value: wau,  prev: wauPrev,  change: wauChange  },
    nsm:  { value: nsm,  prev: nsmPrev,  change: nsmChange  },
    cac:  { value: cac,  prev: cacPrev,  change: cacChange  },
    arpu: { value: arpu, prev: arpuPrev, change: arpuChange },
    mrr:  { value: mrr,  prev: mrrPrev,  change: mrrChange  },
  });
}
