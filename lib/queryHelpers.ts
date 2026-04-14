/**
 * Builds SQL WHERE fragments and bind params from URL search params.
 * Applied to both the `users` table and the `events` table (via JOIN or subquery).
 */

export interface GlobalFilters {
  utm_source?: string;
  utm_medium?: string;
  device_type?: string;
  city?: string;
  plan?: string;
  channel?: string;
  from?: string;  // ISO date string
  to?: string;
}

export function parseFilters(searchParams: URLSearchParams): GlobalFilters {
  const f: GlobalFilters = {};
  const s = (k: string) => searchParams.get(k) || undefined;
  f.utm_source  = s('utm_source');
  f.utm_medium  = s('utm_medium');
  f.device_type = s('device_type');
  f.city        = s('city');
  f.plan        = s('plan');
  f.channel     = s('channel');
  f.from        = s('from');
  f.to          = s('to');
  return f;
}

/** WHERE clauses for the `users` table (u prefix) */
export function userWhere(f: GlobalFilters): { clause: string; params: Record<string, string> } {
  const parts: string[] = [];
  const params: Record<string, string> = {};

  if (f.utm_source)  { parts.push('u.utm_source = @utm_source');  params.utm_source  = f.utm_source; }
  if (f.utm_medium)  { parts.push('u.utm_medium = @utm_medium');  params.utm_medium  = f.utm_medium; }
  if (f.device_type) { parts.push('u.device_type = @device_type'); params.device_type = f.device_type; }
  if (f.city)        { parts.push('u.city = @city');               params.city        = f.city; }
  if (f.plan)        { parts.push('u.plan = @plan');               params.plan        = f.plan; }
  if (f.channel)     { parts.push('u.channel = @channel');         params.channel     = f.channel; }

  return {
    clause: parts.length ? 'WHERE ' + parts.join(' AND ') : '',
    params,
  };
}

/** WHERE clauses for the `events` table (e prefix) */
export function eventWhere(f: GlobalFilters, tableAlias = 'e'): { clause: string; params: Record<string, string> } {
  const t = tableAlias;
  const parts: string[] = [];
  const params: Record<string, string> = {};

  if (f.utm_source)  { parts.push(`${t}.utm_source = @utm_source`);  params.utm_source  = f.utm_source; }
  if (f.utm_medium)  { parts.push(`${t}.utm_medium = @utm_medium`);  params.utm_medium  = f.utm_medium; }
  if (f.device_type) { parts.push(`${t}.device_type = @device_type`); params.device_type = f.device_type; }
  if (f.city)        { parts.push(`${t}.city = @city`);               params.city        = f.city; }
  if (f.from)        { parts.push(`${t}.timestamp >= @from`);         params.from        = f.from; }
  if (f.to)          { parts.push(`${t}.timestamp <= @to`);           params.to          = f.to; }

  // plan and channel require joining to users
  if (f.plan)    { parts.push(`${t}.user_id IN (SELECT id FROM users WHERE plan = @plan)`);       params.plan    = f.plan; }
  if (f.channel) { parts.push(`${t}.user_id IN (SELECT id FROM users WHERE channel = @channel)`); params.channel = f.channel; }

  return {
    clause: parts.length ? 'WHERE ' + parts.join(' AND ') : '',
    params,
  };
}

/** Combined WHERE for queries that JOIN users + events */
export function joinedWhere(f: GlobalFilters): { clause: string; params: Record<string, string> } {
  const parts: string[] = [];
  const params: Record<string, string> = {};

  if (f.utm_source)  { parts.push('u.utm_source = @utm_source');  params.utm_source  = f.utm_source; }
  if (f.utm_medium)  { parts.push('u.utm_medium = @utm_medium');  params.utm_medium  = f.utm_medium; }
  if (f.device_type) { parts.push('u.device_type = @device_type'); params.device_type = f.device_type; }
  if (f.city)        { parts.push('u.city = @city');               params.city        = f.city; }
  if (f.plan)        { parts.push('u.plan = @plan');               params.plan        = f.plan; }
  if (f.channel)     { parts.push('u.channel = @channel');         params.channel     = f.channel; }
  if (f.from)        { parts.push('e.timestamp >= @from');         params.from        = f.from; }
  if (f.to)          { parts.push('e.timestamp <= @to');           params.to          = f.to; }

  return {
    clause: parts.length ? 'WHERE ' + parts.join(' AND ') : '',
    params,
  };
}

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
