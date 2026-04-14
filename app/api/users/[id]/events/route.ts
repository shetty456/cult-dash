import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { jsonResponse } from '@/lib/queryHelpers';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 100), 200);
  const offset = Number(req.nextUrl.searchParams.get('offset') ?? 0);
  const typeFilter = req.nextUrl.searchParams.get('type');

  const typeClause = typeFilter ? `AND type = '${typeFilter.replace(/'/g, '')}'` : '';

  type EventRow = {
    id: string; type: string; timestamp: string;
    utm_source: string; utm_medium: string; utm_campaign: string; utm_content: string;
    device_type: string; os: string;
    session_id: string; session_number: number;
    city: string; state: string; properties: string;
  };

  const events = db.prepare(`
    SELECT id, type, timestamp,
           utm_source, utm_medium, utm_campaign, utm_content,
           device_type, os, session_id, session_number,
           city, state, properties
    FROM events
    WHERE user_id = ? ${typeClause}
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `).all(params.id, limit, offset) as EventRow[];

  const total = (db.prepare(`SELECT COUNT(*) as c FROM events WHERE user_id = ? ${typeClause}`).get(params.id) as { c: number }).c;

  return jsonResponse({
    events: events.map(e => ({ ...e, properties: e.properties ? JSON.parse(e.properties) : {} })),
    total,
  });
}
