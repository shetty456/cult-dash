import { NextRequest } from 'next/server';
import db, { SCALE } from '@/lib/db';
import { parseFilters, joinedWhere, jsonResponse } from '@/lib/queryHelpers';

export async function GET(req: NextRequest) {
  const f = parseFilters(req.nextUrl.searchParams);
  const { clause, params } = joinedWhere(f);

  // WAU = users who completed ≥1 workout that week (visits alone don't count)
  const wauType = clause
    ? clause.replace('WHERE ', `WHERE e.type='workout_completed' AND `)
    : `WHERE e.type='workout_completed'`;

  type WauRow = { week: string; wau: number };
  const wauRows = db.prepare(`
    SELECT strftime('%Y-W%W', e.timestamp) as week,
           COUNT(DISTINCT e.user_id) * ${SCALE} as wau
    FROM events e JOIN users u ON u.id=e.user_id
    ${wauType}
    GROUP BY week ORDER BY week ASC LIMIT 13
  `).all(params) as WauRow[];

  type NsmRow = { week: string; nsm_count: number };
  const addType = clause
    ? clause.replace('WHERE ', `WHERE e.type='workout_completed' AND `)
    : `WHERE e.type='workout_completed'`;

  const nsmRows = db.prepare(`
    SELECT week, COUNT(*) * ${SCALE} as nsm_count FROM (
      SELECT strftime('%Y-W%W', e.timestamp) as week, e.user_id
      FROM events e JOIN users u ON u.id=e.user_id
      ${addType}
      GROUP BY week, e.user_id HAVING COUNT(*) >= 3
    ) GROUP BY week ORDER BY week ASC LIMIT 13
  `).all(params) as NsmRow[];

  const nsmMap = new Map(nsmRows.map(r => [r.week, r.nsm_count]));

  const result = wauRows.map(w => ({
    week: w.week,
    wau: w.wau,
    nsm_count: nsmMap.get(w.week) ?? 0,
    nsm_rate: w.wau > 0 ? Math.round(((nsmMap.get(w.week) ?? 0) / w.wau) * 1000) / 10 : 0,
  }));

  return jsonResponse(result);
}
