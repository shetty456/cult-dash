import db from '@/lib/db';
import { jsonResponse } from '@/lib/queryHelpers';

export async function GET() {
  const distinct = (col: string, table = 'users') =>
    (db.prepare(`SELECT DISTINCT ${col} as v FROM ${table} WHERE ${col} IS NOT NULL ORDER BY ${col}`).all() as { v: string }[]).map(r => r.v);

  return jsonResponse({
    utmSources:  distinct('utm_source'),
    utmMediums:  distinct('utm_medium'),
    deviceTypes: distinct('device_type'),
    cities:      distinct('city'),
    plans:       ['free', 'monthly', 'quarterly', 'annual'],
    channels:    distinct('channel'),
  });
}
