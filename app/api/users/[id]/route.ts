import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { jsonResponse } from '@/lib/queryHelpers';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(params.id);
  if (!user) return jsonResponse({ error: 'Not found' }, 404);

  const eventCount = (db.prepare("SELECT COUNT(*) as c FROM events WHERE user_id = ?").get(params.id) as { c: number }).c;
  const workoutCount = (db.prepare("SELECT COUNT(*) as c FROM events WHERE user_id = ? AND type='workout_completed'").get(params.id) as { c: number }).c;
  const lastEvent = db.prepare("SELECT timestamp FROM events WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1").get(params.id) as { timestamp: string } | undefined;

  return jsonResponse({ ...user, eventCount, workoutCount, lastEventAt: lastEvent?.timestamp });
}
