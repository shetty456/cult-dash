import { NextRequest } from 'next/server';
import db, { SCALE } from '@/lib/db';
import { parseFilters, eventWhere, jsonResponse } from '@/lib/queryHelpers';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const f = parseFilters(sp);
  const { clause, params } = eventWhere(f);

  // Helper: append an AND condition to the existing WHERE clause
  const and = (cond: string) =>
    clause ? `${clause} AND ${cond}` : `WHERE ${cond}`;

  // ── Summary ──────────────────────────────────────────────────────
  const summary = db.prepare(`
    SELECT COUNT(*) as total_events, COUNT(DISTINCT user_id) as unique_users
    FROM events e ${clause}
  `).get(params) as { total_events: number; unique_users: number };

  // ── Per-type breakdown ───────────────────────────────────────────
  const byTypeRaw = db.prepare(`
    SELECT type, COUNT(*) as count, COUNT(DISTINCT user_id) as unique_users
    FROM events e ${clause}
    GROUP BY type ORDER BY count DESC
  `).all(params) as { type: string; count: number; unique_users: number }[];

  const grandTotal = byTypeRaw.reduce((s, r) => s + r.count, 0);

  // ── Week-over-week per type ──────────────────────────────────────
  const thisWeekRaw = db.prepare(`
    SELECT type, COUNT(*) as count FROM events e
    ${and("e.timestamp >= date('now', '-7 days')")}
    GROUP BY type
  `).all(params) as { type: string; count: number }[];

  const lastWeekRaw = db.prepare(`
    SELECT type, COUNT(*) as count FROM events e
    ${and("e.timestamp >= date('now', '-14 days') AND e.timestamp < date('now', '-7 days')")}
    GROUP BY type
  `).all(params) as { type: string; count: number }[];

  const thisWeekMap = Object.fromEntries(thisWeekRaw.map(r => [r.type, r.count]));
  const lastWeekMap = Object.fromEntries(lastWeekRaw.map(r => [r.type, r.count]));

  // ── Daily totals (last 14 days) for chart ────────────────────────
  const dailyRaw = db.prepare(`
    SELECT date(e.timestamp) as day, COUNT(*) as count
    FROM events e
    ${and("e.timestamp >= date('now', '-14 days')")}
    GROUP BY day ORDER BY day
  `).all(params) as { day: string; count: number }[];

  return jsonResponse({
    summary: {
      total_events: summary.total_events * SCALE,
      unique_users: summary.unique_users * SCALE,
    },
    byType: byTypeRaw.map(r => {
      const tw = thisWeekMap[r.type] ?? 0;
      const lw = lastWeekMap[r.type] ?? 0;
      const trend = lw > 0
        ? Math.round(((tw - lw) / lw) * 1000) / 10
        : tw > 0 ? 100 : 0;
      return {
        type: r.type,
        count: r.count * SCALE,
        unique_users: r.unique_users * SCALE,
        pct: grandTotal > 0 ? Math.round((r.count / grandTotal) * 1000) / 10 : 0,
        trend,
      };
    }),
    daily: dailyRaw.map(r => ({ day: r.day, count: r.count * SCALE })),
  });
}
