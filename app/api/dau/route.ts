import { NextRequest } from 'next/server';
import db, { SCALE } from '@/lib/db';
import { parseFilters, joinedWhere, userWhere, jsonResponse } from '@/lib/queryHelpers';

export async function GET(req: NextRequest) {
  const f = parseFilters(req.nextUrl.searchParams);
  const { clause, params } = joinedWhere(f);

  type Row = { date: string; dau: number; new_users: number };
  const rows = db.prepare(`
    SELECT
      date(e.timestamp) as date,
      COUNT(DISTINCT e.user_id) * ${SCALE} as dau,
      COUNT(DISTINCT CASE WHEN date(u.joined_at) = date(e.timestamp) THEN u.id END) * ${SCALE} as new_users
    FROM events e
    JOIN users u ON u.id = e.user_id
    ${clause}
    GROUP BY date(e.timestamp)
    ORDER BY date ASC
    LIMIT 90
  `).all(params) as Row[];

  // City breakdown from users table (same global filters, user-level)
  const { clause: uc, params: up } = userWhere(f);
  type CityRow = { city: string; users: number };
  const byCity = (db.prepare(`
    SELECT u.city, COUNT(*) * ${SCALE} as users
    FROM users u ${uc}
    GROUP BY u.city ORDER BY users DESC
  `).all(up) as CityRow[]);

  return jsonResponse({ rows, byCity });
}
