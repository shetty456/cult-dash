/**
 * Builds SQL WHERE fragments and bind params from URL search params.
 * Only date-range filtering — from/to applied to the appropriate timestamp column.
 */

export interface GlobalFilters {
  from?: string;  // ISO datetime string
  to?: string;    // ISO datetime string
}

export function parseFilters(sp: URLSearchParams): GlobalFilters {
  return {
    from: sp.get('from') || undefined,
    to:   sp.get('to')   || undefined,
  };
}

/** WHERE clause on `users` table — filters by u.joined_at */
export function userWhere(f: GlobalFilters): { clause: string; params: Record<string, string> } {
  const parts: string[] = [];
  const params: Record<string, string> = {};
  if (f.from) { parts.push('u.joined_at >= @from'); params.from = f.from; }
  if (f.to)   { parts.push('u.joined_at <= @to');   params.to   = f.to;   }
  return { clause: parts.length ? 'WHERE ' + parts.join(' AND ') : '', params };
}

/** WHERE clause on `events` table — filters by e.timestamp */
export function eventWhere(f: GlobalFilters, tableAlias = 'e'): { clause: string; params: Record<string, string> } {
  const t = tableAlias;
  const parts: string[] = [];
  const params: Record<string, string> = {};
  if (f.from) { parts.push(`${t}.timestamp >= @from`); params.from = f.from; }
  if (f.to)   { parts.push(`${t}.timestamp <= @to`);   params.to   = f.to;   }
  return { clause: parts.length ? 'WHERE ' + parts.join(' AND ') : '', params };
}

/** WHERE clause for queries that JOIN users + events — filters by e.timestamp */
export function joinedWhere(f: GlobalFilters): { clause: string; params: Record<string, string> } {
  const parts: string[] = [];
  const params: Record<string, string> = {};
  if (f.from) { parts.push('e.timestamp >= @from'); params.from = f.from; }
  if (f.to)   { parts.push('e.timestamp <= @to');   params.to   = f.to;   }
  return { clause: parts.length ? 'WHERE ' + parts.join(' AND ') : '', params };
}

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
