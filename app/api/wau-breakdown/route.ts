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
    FROM events e JOIN users u ON u.id = e.user_id
    ${wauType}
    GROUP BY week ORDER BY week ASC LIMIT 13
  `).all(params) as WauRow[];

  // Per-week workout frequency buckets (only users with workout_completed events)
  const addType = clause
    ? clause.replace('WHERE ', `WHERE e.type='workout_completed' AND `)
    : `WHERE e.type='workout_completed'`;

  type BucketRow = { week: string; fx1: number; fx2: number; fx3: number };
  const bucketRows = db.prepare(`
    SELECT
      week,
      SUM(CASE WHEN workout_count = 1 THEN 1 ELSE 0 END) * ${SCALE} as fx1,
      SUM(CASE WHEN workout_count = 2 THEN 1 ELSE 0 END) * ${SCALE} as fx2,
      SUM(CASE WHEN workout_count >= 3 THEN 1 ELSE 0 END) * ${SCALE} as fx3
    FROM (
      SELECT strftime('%Y-W%W', e.timestamp) as week,
             e.user_id,
             COUNT(*) as workout_count
      FROM events e JOIN users u ON u.id = e.user_id
      ${addType}
      GROUP BY week, e.user_id
    )
    GROUP BY week ORDER BY week ASC LIMIT 13
  `).all(params) as BucketRow[];

  const bucketMap = new Map(bucketRows.map(r => [r.week, r]));

  const result = wauRows.map(w => {
    const b = bucketMap.get(w.week) ?? { fx1: 0, fx2: 0, fx3: 0 };
    return {
      week:   w.week,
      wau:    w.wau,
      fx1:    b.fx1,
      fx2:    b.fx2,
      fx3:    b.fx3,
    };
  });

  return jsonResponse(result);
}
