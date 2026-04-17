import { NextRequest } from 'next/server';
import db, { SCALE } from '@/lib/db';
import { parseFilters, joinedWhere, jsonResponse } from '@/lib/queryHelpers';

const PLAN_COLORS: Record<string, string> = {
  monthly: '#60a5fa', quarterly: '#10b981', annual: '#f59e0b', free: '#4b5563',
};

export async function GET(req: NextRequest) {
  const f = parseFilters(req.nextUrl.searchParams);
  const { clause, params } = joinedWhere(f);

  // Daily revenue from subscription_purchased events in the date window
  type DailyRow = { date: string; revenue: number };
  const dailyRaw = db.prepare(`
    SELECT date(e.timestamp) as date, SUM(u.ltv) as revenue
    FROM events e
    JOIN users u ON u.id = e.user_id
    ${clause ? clause + " AND e.type='subscription_purchased'" : "WHERE e.type='subscription_purchased'"}
    GROUP BY date(e.timestamp)
    ORDER BY date ASC
  `).all(params) as DailyRow[];

  // Build cumulative MRR proxy
  let cumulativeMrr = 0;
  const daily = dailyRaw.map(d => {
    cumulativeMrr += d.revenue * SCALE;
    return {
      date: d.date,
      revenue: Math.round(d.revenue * SCALE),
      mrr: Math.round(cumulativeMrr * 0.15), // MRR = ~15% of cumulative (monthly portion)
    };
  });

  // Revenue by plan (subscribers who purchased in the date window)
  type PlanRow = { plan: string; revenue: number; cnt: number };
  const planRows = db.prepare(`
    SELECT u.plan, SUM(u.ltv) * ${SCALE} as revenue, COUNT(DISTINCT u.id) as cnt
    FROM events e
    JOIN users u ON u.id = e.user_id
    ${clause ? clause + " AND e.type='subscription_purchased' AND u.plan != 'free'" : "WHERE e.type='subscription_purchased' AND u.plan != 'free'"}
    GROUP BY u.plan
  `).all(params) as PlanRow[];

  const totalRev = planRows.reduce((s, r) => s + r.revenue, 0);
  const byPlan = planRows.map(r => ({
    plan: r.plan.charAt(0).toUpperCase() + r.plan.slice(1),
    revenue: Math.round(r.revenue),
    users: r.cnt,
    pct: totalRev > 0 ? Math.round((r.revenue / totalRev) * 100) : 0,
    color: PLAN_COLORS[r.plan] ?? '#6b7280',
  })).sort((a, b) => b.revenue - a.revenue);

  // Summary stats
  const totalRevenue = daily.reduce((s, d) => s + d.revenue, 0);
  const currentMrr = daily[daily.length - 1]?.mrr ?? 0;
  const prevMrr = daily[daily.length - 8]?.mrr ?? daily[0]?.mrr ?? 0;
  const mrrGrowth = prevMrr > 0 ? Math.round(((currentMrr - prevMrr) / prevMrr) * 1000) / 10 : 0;

  return jsonResponse({ daily, byPlan, totalRevenue, currentMrr, mrrGrowth });
}
