import { NextRequest } from 'next/server';
import db, { SCALE } from '@/lib/db';
import { parseFilters, userWhere, jsonResponse } from '@/lib/queryHelpers';

export async function GET(req: NextRequest) {
  const f = parseFilters(req.nextUrl.searchParams);
  const { clause, params } = userWhere(f);

  const count = (sql: string) =>
    (db.prepare(sql).get(params) as { c: number }).c;

  const signups   = count(`SELECT COUNT(*) as c FROM users u ${clause}`);
  const trials    = count(`SELECT COUNT(DISTINCT e.user_id) as c FROM events e JOIN users u ON u.id=e.user_id ${clause ? clause + " AND e.type='trial_booked'" : "WHERE e.type='trial_booked'"}`);
  const firstVisit = count(`SELECT COUNT(DISTINCT e.user_id) as c FROM events e JOIN users u ON u.id=e.user_id ${clause ? clause + " AND e.type='trial_completed'" : "WHERE e.type='trial_completed'"}`);
  const paid      = count(`SELECT COUNT(*) as c FROM users u ${clause ? clause + " AND u.plan != 'free'" : "WHERE u.plan != 'free'"}`);

  // Staged scale: visitors hardcoded, all other stages ×25
  const stages = [
    { stage: 'App Visitors',    count: 500000,             pct: 100 },
    { stage: 'Sign-ups',        count: signups * SCALE,    pct: 10 },
    { stage: 'Trial Booked',    count: trials * SCALE,     pct: null },
    { stage: 'First Visit',     count: firstVisit * SCALE, pct: null },
    { stage: 'Paid Subscriber', count: paid * SCALE,        pct: null },
  ].map((s, i, arr) => ({
    ...s,
    pct: Math.round((s.count / arr[0].count) * 100 * 10) / 10,
    dropPct: i === 0 ? 0 : Math.round(((arr[i - 1].count - s.count) / arr[i - 1].count) * 100),
  }));

  return jsonResponse(stages);
}
