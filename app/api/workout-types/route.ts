import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { parseFilters, joinedWhere, jsonResponse } from '@/lib/queryHelpers';

export async function GET(req: NextRequest) {
  const f = parseFilters(req.nextUrl.searchParams);
  const { clause, params } = joinedWhere(f);

  const addType = clause
    ? clause.replace('WHERE ', `WHERE e.type='workout_completed' AND `)
    : `WHERE e.type='workout_completed'`;

  type Row = { workout_type: string; count: number };
  const rows = db.prepare(`
    SELECT json_extract(e.properties, '$.workout_type') as workout_type, COUNT(*) as count
    FROM events e JOIN users u ON u.id=e.user_id
    ${addType}
    GROUP BY workout_type
    ORDER BY count DESC
  `).all(params) as Row[];

  const total = rows.reduce((s, r) => s + r.count, 0);
  const result = rows.map(r => ({
    type: r.workout_type,
    count: r.count,
    pct: total > 0 ? Math.round((r.count / total) * 1000) / 10 : 0,
  }));

  return jsonResponse(result);
}
