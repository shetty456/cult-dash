import { NextRequest } from 'next/server';
import db, { SCALE } from '@/lib/db';
import { parseFilters, joinedWhere, userWhere, jsonResponse } from '@/lib/queryHelpers';

const ALLOWED_GROUP: Record<string, { expr: string; needsEvents: boolean }> = {
  channel:    { expr: 'u.channel',                             needsEvents: false },
  city:       { expr: 'u.city',                               needsEvents: false },
  plan:       { expr: 'u.plan',                               needsEvents: false },
  device:     { expr: 'u.device_type',                        needsEvents: false },
  utm_source: { expr: 'u.utm_source',                         needsEvents: false },
  status:     { expr: 'u.status',                             needsEvents: false },
  gender:     { expr: 'u.gender',                             needsEvents: false },
  week:       { expr: "strftime('%Y-W%W', e.timestamp)",      needsEvents: true  },
  day:        { expr: "date(e.timestamp)",                    needsEvents: true  },
};

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const metric    = sp.get('metric')     ?? 'count_events'; // count_events | unique_users | sum_ltv
  const groupBy   = sp.get('group_by')   ?? 'channel';
  const eventType = sp.get('event_type') ?? '';
  const status    = sp.get('status')     ?? '';

  const f = parseFilters(sp);
  const group = ALLOWED_GROUP[groupBy] ?? ALLOWED_GROUP.channel;

  // ── Build WHERE ────────────────────────────────────────────────────
  let rows: { key: string; value: number }[] = [];

  if (metric === 'sum_ltv' && !group.needsEvents) {
    // User-table only query
    const { clause, params } = userWhere(f);
    let where = clause;
    const p: Record<string, string> = { ...params };
    if (status) {
      where = where ? `${where} AND u.status = @status` : `WHERE u.status = @status`;
      p.status = status;
    }
    rows = db.prepare(`
      SELECT ${group.expr} as key, SUM(u.ltv) * ${SCALE} as value
      FROM users u ${where}
      GROUP BY ${group.expr} ORDER BY value DESC LIMIT 50
    `).all(p) as { key: string; value: number }[];

  } else if (metric === 'sum_ltv' && group.needsEvents) {
    // Revenue over time — use subscription_purchased events
    const { clause, params } = joinedWhere(f);
    const andClause = clause ? clause.replace('WHERE ', 'AND ') : '';
    const p: Record<string, string> = { ...params };
    rows = db.prepare(`
      SELECT ${group.expr} as key, SUM(u.ltv) * ${SCALE} as value
      FROM events e JOIN users u ON u.id = e.user_id
      WHERE e.type = 'subscription_purchased' ${andClause}
      GROUP BY key ORDER BY key ASC LIMIT 90
    `).all(p) as { key: string; value: number }[];

  } else {
    // Event-based metrics (count_events | unique_users)
    const metricExpr = metric === 'unique_users'
      ? 'COUNT(DISTINCT e.user_id)'
      : 'COUNT(*)';

    const { clause, params } = joinedWhere(f);
    let where = clause;
    const p: Record<string, string> = { ...params };

    if (eventType) {
      where = where ? `${where} AND e.type = @event_type` : `WHERE e.type = @event_type`;
      p.event_type = eventType;
    }
    if (status) {
      where = where ? `${where} AND u.status = @status` : `WHERE u.status = @status`;
      p.status = status;
    }

    const orderDir = group.needsEvents ? 'ASC' : 'DESC';
    rows = db.prepare(`
      SELECT ${group.expr} as key, ${metricExpr} as value
      FROM events e JOIN users u ON u.id = e.user_id
      ${where}
      GROUP BY ${group.expr} ORDER BY value ${orderDir} LIMIT 90
    `).all(p) as { key: string; value: number }[];
  }

  const total = rows.reduce((s, r) => s + r.value, 0);
  const result = rows.map(r => ({
    key: r.key ?? '(none)',
    value: Math.round(r.value),
    pct: total > 0 ? Math.round((r.value / total) * 1000) / 10 : 0,
  }));

  return jsonResponse({ rows: result, total: Math.round(total), metric, groupBy, eventType });
}
