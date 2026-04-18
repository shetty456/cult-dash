import { NextRequest } from 'next/server';
import db, { SCALE } from '@/lib/db';
import { parseFilters, jsonResponse } from '@/lib/queryHelpers';

const ANCHOR = '2026-04-17T23:59:59Z';

export async function GET(req: NextRequest) {
  const f    = parseFilters(req.nextUrl.searchParams);
  const to   = f.to   ?? ANCHOR;
  const from = f.from ?? new Date(new Date(to).getTime() - 30 * 86400000).toISOString();

  // ── Sign-up cohort CTE (reused across queries) ────────────────────────────
  // Users who signed up in the filter window — all subsequent workout events
  // are unrestricted so week-1 behavior isn't clipped by the filter end date.

  // ── 1. % 1st workout within 48h ──────────────────────────────────────────
  type CountRow = { c: number };
  const cohortSize = (db.prepare(`
    SELECT COUNT(DISTINCT user_id) as c FROM events
    WHERE type = 'sign_up' AND timestamp >= @from AND timestamp <= @to
  `).get({ from, to }) as CountRow).c;

  const did48h = (db.prepare(`
    SELECT COUNT(DISTINCT w.user_id) as c
    FROM events w
    JOIN (
      SELECT user_id, MIN(timestamp) as signup_t
      FROM events WHERE type = 'sign_up' AND timestamp >= @from AND timestamp <= @to
      GROUP BY user_id
    ) su ON su.user_id = w.user_id
    WHERE w.type = 'workout_completed'
      AND julianday(w.timestamp) - julianday(su.signup_t) BETWEEN 0 AND 2
  `).get({ from, to }) as CountRow).c;

  const pct48h = cohortSize > 0 ? Math.round((did48h / cohortSize) * 1000) / 10 : 0;

  // ── 2. % users with ≥2 workouts in week 1 ────────────────────────────────
  const twoInWeek1 = (db.prepare(`
    SELECT COUNT(*) as c FROM (
      SELECT su.user_id
      FROM (
        SELECT user_id, MIN(timestamp) as signup_t
        FROM events WHERE type = 'sign_up' AND timestamp >= @from AND timestamp <= @to
        GROUP BY user_id
      ) su
      JOIN events w ON w.user_id = su.user_id
        AND w.type = 'workout_completed'
        AND julianday(w.timestamp) - julianday(su.signup_t) BETWEEN 0 AND 7
      GROUP BY su.user_id HAVING COUNT(*) >= 2
    )
  `).get({ from, to }) as CountRow).c;

  const pctTwoWeek1 = cohortSize > 0 ? Math.round((twoInWeek1 / cohortSize) * 1000) / 10 : 0;

  // ── 3. Week-1 workout distribution (0, 1, 2, 3, 4+ workouts) ─────────────
  type DistRow = { bucket: string; users: number };
  const distRaw = db.prepare(`
    SELECT
      CASE WHEN wc=0 THEN '0' WHEN wc=1 THEN '1' WHEN wc=2 THEN '2'
           WHEN wc=3 THEN '3' ELSE '4+' END as bucket,
      COUNT(*) as users
    FROM (
      SELECT su.user_id, COALESCE(w.cnt, 0) as wc
      FROM (
        SELECT user_id, MIN(timestamp) as signup_t
        FROM events WHERE type = 'sign_up' AND timestamp >= @from AND timestamp <= @to
        GROUP BY user_id
      ) su
      LEFT JOIN (
        SELECT w.user_id, COUNT(*) as cnt
        FROM events w
        JOIN (
          SELECT user_id, MIN(timestamp) as signup_t
          FROM events WHERE type = 'sign_up' AND timestamp >= @from AND timestamp <= @to
          GROUP BY user_id
        ) su2 ON su2.user_id = w.user_id
        WHERE w.type = 'workout_completed'
          AND julianday(w.timestamp) - julianday(su2.signup_t) BETWEEN 0 AND 7
        GROUP BY w.user_id
      ) w ON w.user_id = su.user_id
    )
    GROUP BY bucket ORDER BY bucket
  `).all({ from, to }) as DistRow[];

  // Add cumulative %
  const distTotal = distRaw.reduce((s, r) => s + r.users, 0);
  let cumUsers = 0;
  const week1Distribution = distRaw.map(r => {
    cumUsers += r.users;
    return {
      bucket: r.bucket,
      users:  r.users * SCALE,
      pct:    distTotal > 0 ? Math.round((r.users / distTotal) * 1000) / 10 : 0,
      cumPct: distTotal > 0 ? Math.round((cumUsers / distTotal) * 1000) / 10 : 0,
    };
  });

  // ── 4. Time to 2nd workout — day-by-day distribution (day 0–14) ──────────
  type DayRow = { day: number; users: number };
  const timeRaw = db.prepare(`
    SELECT
      CAST(julianday(w2.timestamp) - julianday(su.signup_t) AS INTEGER) as day,
      COUNT(*) as users
    FROM (
      SELECT user_id, MIN(timestamp) as signup_t
      FROM events WHERE type = 'sign_up' AND timestamp >= @from AND timestamp <= @to
      GROUP BY user_id
    ) su
    JOIN (
      SELECT user_id, timestamp FROM (
        SELECT user_id, timestamp,
               ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY timestamp) as rn
        FROM events WHERE type = 'workout_completed'
      ) WHERE rn = 2
    ) w2 ON w2.user_id = su.user_id
    WHERE julianday(w2.timestamp) - julianday(su.signup_t) BETWEEN 0 AND 14
    GROUP BY day ORDER BY day
  `).all({ from, to }) as DayRow[];

  // Fill missing days, add cumulative %
  const secondTotal = timeRaw.reduce((s, r) => s + r.users, 0);
  let cumSecond = 0;
  const dayMap = new Map(timeRaw.map(r => [r.day, r.users]));
  const timeToSecondWorkout = Array.from({ length: 15 }, (_, day) => {
    const users = dayMap.get(day) ?? 0;
    cumSecond += users;
    return {
      day,
      users:  users * SCALE,
      cumPct: secondTotal > 0 ? Math.round((cumSecond / secondTotal) * 1000) / 10 : 0,
    };
  });

  const medianDaysToSecond = (() => {
    const sorted = timeRaw.flatMap(r => Array(r.users).fill(r.day));
    if (!sorted.length) return null;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  })();

  // ── 5. Weekly trend (by sign-up week) ────────────────────────────────────
  type TrendRaw = { week: string; cohort: number; did48: number; twoWeek1: number };
  const trendRaw = db.prepare(`
    SELECT
      strftime('%Y-W%W', su.signup_t) as week,
      COUNT(*) as cohort,
      SUM(CASE WHEN julianday(fw.min_t) - julianday(su.signup_t) BETWEEN 0 AND 2 THEN 1 ELSE 0 END) as did48,
      SUM(CASE WHEN COALESCE(wk1.cnt, 0) >= 2 THEN 1 ELSE 0 END) as twoWeek1
    FROM (
      SELECT user_id, MIN(timestamp) as signup_t
      FROM events WHERE type = 'sign_up' AND timestamp >= @from AND timestamp <= @to
      GROUP BY user_id
    ) su
    LEFT JOIN (
      SELECT user_id, MIN(timestamp) as min_t FROM events
      WHERE type = 'workout_completed' GROUP BY user_id
    ) fw ON fw.user_id = su.user_id
    LEFT JOIN (
      SELECT w.user_id, COUNT(*) as cnt
      FROM events w
      JOIN (
        SELECT user_id, MIN(timestamp) as signup_t
        FROM events WHERE type = 'sign_up' AND timestamp >= @from AND timestamp <= @to
        GROUP BY user_id
      ) su2 ON su2.user_id = w.user_id
      WHERE w.type = 'workout_completed'
        AND julianday(w.timestamp) - julianday(su2.signup_t) BETWEEN 0 AND 7
      GROUP BY w.user_id
    ) wk1 ON wk1.user_id = su.user_id
    GROUP BY week ORDER BY week
  `).all({ from, to }) as TrendRaw[];

  const trend = trendRaw.map(r => ({
    week:         r.week,
    cohortSize:   r.cohort,
    pct48h:       r.cohort > 0 ? Math.round((r.did48    / r.cohort) * 1000) / 10 : 0,
    pctTwoWeek1:  r.cohort > 0 ? Math.round((r.twoWeek1 / r.cohort) * 1000) / 10 : 0,
  }));

  const zeroWorkoutPct = (() => {
    const zeroRow = distRaw.find(r => r.bucket === '0');
    return distTotal > 0 && zeroRow
      ? Math.round((zeroRow.users / distTotal) * 1000) / 10
      : 0;
  })();

  return jsonResponse({
    summary: {
      cohortSize:         cohortSize * SCALE,
      pct48h,
      pctTwoWeek1,
      medianDaysToSecond,
      zeroWorkoutPct,
    },
    trend,
    week1Distribution,
    timeToSecondWorkout,
  });
}
