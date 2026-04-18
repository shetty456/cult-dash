import { NextRequest } from 'next/server';
import db, { SCALE } from '@/lib/db';
import { parseFilters, joinedWhere, jsonResponse } from '@/lib/queryHelpers';

const ANCHOR = '2026-04-17T23:59:59Z';

// MRR contribution per user based on plan type
const MRR_EXPR = `CASE u.plan
  WHEN 'monthly'   THEN CAST(u.ltv AS REAL)
  WHEN 'quarterly' THEN CAST(u.ltv AS REAL) / 3.0
  WHEN 'annual'    THEN CAST(u.ltv AS REAL) / 12.0
  ELSE 0 END`;

export async function GET(req: NextRequest) {
  const f = parseFilters(req.nextUrl.searchParams);
  const { clause, params } = joinedWhere(f);

  const to   = f.to   ?? ANCHOR;
  const from = f.from ?? new Date(new Date(to).getTime() - 30 * 86400000).toISOString();

  // ── Weekly MRR trend ─────────────────────────────────────────────────────
  // Cumulative MRR: for each week, sum MRR of all paid users who subscribed up to that week
  const subType = clause
    ? clause.replace('WHERE ', `WHERE e.type='subscription_purchased' AND `)
    : `WHERE e.type='subscription_purchased'`;

  type WeeklyMrrRow = { week: string; mrr_added: number };
  const weeklyRaw = db.prepare(`
    SELECT strftime('%Y-W%W', e.timestamp) as week,
           SUM(${MRR_EXPR}) * ${SCALE} as mrr_added
    FROM events e JOIN users u ON u.id = e.user_id
    ${subType}
    GROUP BY week ORDER BY week ASC
  `).all(params) as WeeklyMrrRow[];

  // Build cumulative MRR per week
  let cumulative = 0;
  const trend = weeklyRaw.map(r => {
    cumulative += r.mrr_added;
    return { week: r.week, mrr: Math.round(cumulative) };
  });

  const currentMrr  = trend[trend.length - 1]?.mrr ?? 0;
  const prevMrr     = trend[trend.length - 2]?.mrr ?? trend[0]?.mrr ?? 0;
  const mrrGrowth   = prevMrr > 0 ? Math.round(((currentMrr - prevMrr) / prevMrr) * 1000) / 10 : 0;

  // ── MRR by workout frequency (4-week rolling avg) ────────────────────────
  // Classify each paid user by avg weekly workouts in the 28 days before `to`
  const rollingFrom = new Date(new Date(to).getTime() - 28 * 86400000).toISOString();

  type FreqRow = { bucket: string; mrr: number; users: number };
  const freqRows = db.prepare(`
    SELECT
      CASE
        WHEN COALESCE(w.workout_count, 0) / 4.0 >= 3 THEN '3x+'
        WHEN COALESCE(w.workout_count, 0) / 4.0 >= 2 THEN '2x'
        WHEN COALESCE(w.workout_count, 0) / 4.0 >= 1 THEN '1x'
        ELSE '0x'
      END as bucket,
      SUM(${MRR_EXPR}) * ${SCALE} as mrr,
      COUNT(*) as users
    FROM users u
    LEFT JOIN (
      SELECT user_id, COUNT(*) as workout_count
      FROM events
      WHERE type = 'workout_completed'
        AND timestamp >= @rollingFrom
        AND timestamp <= @to
      GROUP BY user_id
    ) w ON w.user_id = u.id
    WHERE u.plan != 'free'
    GROUP BY bucket
    ORDER BY bucket DESC
  `).all({ rollingFrom, to }) as FreqRow[];

  const totalMrr = freqRows.reduce((s, r) => s + r.mrr, 0);

  const BUCKET_META: Record<string, { label: string; color: string }> = {
    '3x+': { label: '3x+ / week (NSM)',  color: '#10b981' },
    '2x':  { label: '2x / week',         color: '#f59e0b' },
    '1x':  { label: '1x / week',         color: '#60a5fa' },
    '0x':  { label: 'No workouts',       color: '#3f3f46' },
  };

  const byFrequency = freqRows.map(r => ({
    bucket: r.bucket,
    label:  BUCKET_META[r.bucket]?.label ?? r.bucket,
    mrr:    Math.round(r.mrr),
    users:  r.users,
    pct:    totalMrr > 0 ? Math.round((r.mrr / totalMrr) * 100) : 0,
    color:  BUCKET_META[r.bucket]?.color ?? '#6b7280',
  }));

  // ── MRR by plan type ─────────────────────────────────────────────────────
  const PLAN_COLORS: Record<string, string> = {
    monthly: '#60a5fa', quarterly: '#a78bfa', annual: '#f59e0b',
  };

  type PlanRow = { plan: string; mrr: number; users: number };
  const planRows = db.prepare(`
    SELECT u.plan,
           SUM(${MRR_EXPR}) * ${SCALE} as mrr,
           COUNT(*) as users
    FROM users u
    WHERE u.plan != 'free'
    GROUP BY u.plan
    ORDER BY mrr DESC
  `).all() as PlanRow[];

  const totalPlanMrr = planRows.reduce((s, r) => s + r.mrr, 0);
  const byPlan = planRows.map(r => ({
    plan:  r.plan.charAt(0).toUpperCase() + r.plan.slice(1),
    mrr:   Math.round(r.mrr),
    users: r.users,
    pct:   totalPlanMrr > 0 ? Math.round((r.mrr / totalPlanMrr) * 100) : 0,
    color: PLAN_COLORS[r.plan] ?? '#6b7280',
  }));

  return jsonResponse({ trend, byFrequency, byPlan, currentMrr, mrrGrowth });
}
