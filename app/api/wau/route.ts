import { NextRequest } from 'next/server';
import db, { SCALE } from '@/lib/db';
import { parseFilters, joinedWhere, jsonResponse } from '@/lib/queryHelpers';

export async function GET(req: NextRequest) {
  const f = parseFilters(req.nextUrl.searchParams);
  const { clause, params } = joinedWhere(f);

  // WAU = users who completed ≥1 workout in the week (visits alone don't count)
  const addType = clause
    ? clause.replace('WHERE ', `WHERE e.type='workout_completed' AND `)
    : `WHERE e.type='workout_completed'`;

  type Row = { week: string; wau: number };
  const rows = db.prepare(`
    SELECT
      strftime('%Y-W%W', e.timestamp) as week,
      COUNT(DISTINCT e.user_id) * ${SCALE} as wau
    FROM events e
    JOIN users u ON u.id = e.user_id
    ${addType}
    GROUP BY week
    ORDER BY week ASC
    LIMIT 13
  `).all(params) as Row[];

  return jsonResponse(rows);
}
