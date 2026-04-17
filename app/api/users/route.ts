import { NextRequest } from 'next/server';
import db, { SCALE } from '@/lib/db';
import { parseFilters, userWhere, jsonResponse } from '@/lib/queryHelpers';

const ALLOWED_SORT = ['name','city','age','plan','channel','workouts_completed','ltv','status','last_active'] as const;
type SortKey = typeof ALLOWED_SORT[number];

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const f = parseFilters(sp);
  const limit = Math.min(Number(sp.get('limit') ?? 15), 100);
  const offset = Number(sp.get('offset') ?? 0);
  const search = sp.get('search') ?? '';
  const rawSort = sp.get('sort') ?? 'ltv';
  const sort: SortKey = ALLOWED_SORT.includes(rawSort as SortKey) ? rawSort as SortKey : 'ltv';
  const dir = sp.get('dir') === 'asc' ? 'ASC' : 'DESC';

  const { clause, params } = userWhere(f);
  const status = sp.get('status') ?? '';

  // Build combined clause (global filters + optional status + optional search)
  let combinedClause = clause;
  const combinedParams: Record<string, string | number> = { ...params };

  if (status) {
    combinedClause = combinedClause
      ? `${combinedClause} AND u.status = @status`
      : `WHERE u.status = @status`;
    combinedParams.status = status;
  }

  const searchClause = search
    ? `${combinedClause ? combinedClause + ' AND' : 'WHERE'} (u.name LIKE @search OR u.city LIKE @search)`
    : combinedClause;

  type UserRow = {
    id: string; name: string; city: string; state: string; age: number; gender: string;
    plan: string; channel: string;
    utm_source: string; utm_medium: string; utm_campaign: string; utm_content: string;
    device_type: string; os: string;
    joined_at: string; last_active: string;
    workouts_completed: number; status: string; ltv: number; nsm_reached: number;
  };

  const allParams = search ? { ...combinedParams, search: `%${search}%` } : combinedParams;

  const users = db.prepare(`
    SELECT * FROM users u
    ${searchClause}
    ORDER BY u.${sort} ${dir}
    LIMIT @limit OFFSET @offset
  `).all({ ...allParams, limit, offset }) as UserRow[];

  const total = (db.prepare(`
    SELECT COUNT(*) as c FROM users u ${searchClause}
  `).get(allParams) as { c: number }).c;

  // Stats counts (based on global+status filters but ignoring search)
  const statsBase = combinedClause;
  const statsParams = combinedParams;
  const statsRow = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN u.status = 'active'  THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN u.status = 'at-risk' THEN 1 ELSE 0 END) as atRisk,
      SUM(CASE WHEN u.status = 'churned' THEN 1 ELSE 0 END) as churned,
      SUM(u.nsm_reached) as nsmReached
    FROM users u ${statsBase}
  `).get(statsParams) as { total: number; active: number; atRisk: number; churned: number; nsmReached: number };

  return jsonResponse({
    users, total, offset, limit,
    stats: {
      total:      statsRow.total      * SCALE,
      active:     statsRow.active     * SCALE,
      atRisk:     statsRow.atRisk     * SCALE,
      churned:    statsRow.churned    * SCALE,
      nsmReached: statsRow.nsmReached * SCALE,
    },
  });
}
