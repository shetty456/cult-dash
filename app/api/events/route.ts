import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { parseFilters, joinedWhere, jsonResponse } from '@/lib/queryHelpers';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const f = parseFilters(sp);
  const limit = Math.min(Number(sp.get('limit') ?? 50), 100);
  const offset = Number(sp.get('offset') ?? 0);
  const typeFilter = sp.get('type');

  const { clause, params } = joinedWhere(f);
  const typeClause = typeFilter ? `AND e.type = '${typeFilter.replace(/'/g, '')}'` : '';

  const baseWhere = clause
    ? `${clause} ${typeClause}`
    : typeClause ? `WHERE 1=1 ${typeClause}` : '';

  type EventRow = {
    id: string; user_id: string; user_name: string; user_city: string;
    type: string; timestamp: string;
    utm_source: string; utm_medium: string; utm_campaign: string; utm_content: string;
    device_type: string; os: string;
    session_id: string; session_number: number;
    city: string; properties: string;
  };

  const rows = db.prepare(`
    SELECT e.id, e.user_id, u.name as user_name, u.city as user_city,
           e.type, e.timestamp,
           e.utm_source, e.utm_medium, e.utm_campaign, e.utm_content,
           e.device_type, e.os,
           e.session_id, e.session_number,
           e.city, e.properties
    FROM events e
    JOIN users u ON u.id = e.user_id
    ${baseWhere}
    ORDER BY e.timestamp DESC
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit, offset }) as EventRow[];

  const total = (db.prepare(`
    SELECT COUNT(*) as c FROM events e JOIN users u ON u.id=e.user_id ${baseWhere}
  `).get(params) as { c: number }).c;

  return jsonResponse({
    events: rows.map(r => ({ ...r, properties: r.properties ? JSON.parse(r.properties) : {} })),
    total,
    offset,
    limit,
  });
}
