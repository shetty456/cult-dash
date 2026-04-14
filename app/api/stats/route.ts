import db from '@/lib/db';
import { jsonResponse } from '@/lib/queryHelpers';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const userCount  = (db.prepare('SELECT COUNT(*) as c FROM users').get()  as { c: number }).c;
  const eventCount = (db.prepare('SELECT COUNT(*) as c FROM events').get() as { c: number }).c;
  const eventTypes = (db.prepare(
    "SELECT type, COUNT(*) as c FROM events GROUP BY type ORDER BY c DESC"
  ).all() as { type: string; c: number }[]);

  // DB file size
  const dbPath = path.join(process.cwd(), 'cult.db');
  let dbSizeMb = 0;
  try {
    const stat = fs.statSync(dbPath);
    dbSizeMb = Math.round(stat.size / 1024 / 1024 * 10) / 10;
  } catch { /* ignore */ }

  const firstEvent = (db.prepare('SELECT MIN(timestamp) as t FROM events').get() as { t: string }).t;
  const lastEvent  = (db.prepare('SELECT MAX(timestamp) as t FROM events').get() as { t: string }).t;

  return jsonResponse({ userCount, eventCount, eventTypes, dbSizeMb, firstEvent, lastEvent });
}
