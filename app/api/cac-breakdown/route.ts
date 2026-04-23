import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { parseFilters, jsonResponse } from '@/lib/queryHelpers';
import { CHANNEL_COLORS } from '@/lib/channelColors';

const ANCHOR = '2026-04-17T23:59:59Z';

const CHANNEL_CAC: Record<string, number> = {
  'Paid Digital': 1120,
  'Organic':      420,
  'Referrals':    680,
  'Brand/ATL':    890,
  'Corporate':    560,
};
const MONTH_LABELS = ['Oct','Nov','Dec','Jan','Feb','Mar'];

export async function GET(req: NextRequest) {
  const f = parseFilters(req.nextUrl.searchParams);
  const to   = f.to   ?? ANCHOR;
  const from = f.from ?? new Date(new Date(to).getTime() - 365 * 86400000).toISOString();
  // Habit window always uses 28-day lookback regardless of filter
  const rollingFrom = new Date(new Date(to).getTime() - 28 * 86400000).toISOString();

  // ── All-time users per channel (spend base) ───────────────────────────────
  type TotalRow = { channel: string; total: number };
  const totalRows = db.prepare(`
    SELECT channel, COUNT(*) as total FROM users GROUP BY channel
  `).all() as TotalRow[];
  const totalMap = new Map(totalRows.map(r => [r.channel, r.total]));

  // ── Activated: ≥1 workout_completed in filter window ─────────────────────
  type QRow = { channel: string; cnt: number };
  const activatedRows = db.prepare(`
    SELECT u.channel, COUNT(DISTINCT u.id) as cnt
    FROM users u
    JOIN events e ON e.user_id = u.id
    WHERE e.type = 'workout_completed'
      AND e.timestamp >= @from AND e.timestamp <= @to
    GROUP BY u.channel
  `).all({ from, to }) as QRow[];
  const activatedMap = new Map(activatedRows.map(r => [r.channel, r.cnt]));

  // ── Engaged: ≥3 workouts in any single week within filter window ──────────
  const engagedRows = db.prepare(`
    SELECT u.channel, COUNT(DISTINCT u.id) as cnt
    FROM users u
    WHERE u.id IN (
      SELECT user_id FROM (
        SELECT user_id, strftime('%Y-W%W', timestamp) as week, COUNT(*) as cnt
        FROM events
        WHERE type = 'workout_completed'
          AND timestamp >= @from AND timestamp <= @to
        GROUP BY user_id, week
        HAVING cnt >= 3
      )
    )
    GROUP BY u.channel
  `).all({ from, to }) as QRow[];
  const engagedMap = new Map(engagedRows.map(r => [r.channel, r.cnt]));

  // ── Habit: ≥3 workouts in each of ≥4 distinct weeks in 28-day window ─────
  const habitRows = db.prepare(`
    SELECT u.channel, COUNT(DISTINCT u.id) as cnt
    FROM users u
    WHERE u.id IN (
      SELECT user_id FROM (
        SELECT user_id, strftime('%Y-W%W', timestamp) as week, COUNT(*) as cnt
        FROM events
        WHERE type = 'workout_completed'
          AND timestamp >= @rollingFrom AND timestamp <= @to
        GROUP BY user_id, week
        HAVING cnt >= 3
      )
      GROUP BY user_id
      HAVING COUNT(*) >= 4
    )
    GROUP BY u.channel
  `).all({ rollingFrom, to }) as QRow[];
  const habitMap = new Map(habitRows.map(r => [r.channel, r.cnt]));

  // ── Assemble per-channel result ───────────────────────────────────────────
  const channels = Object.keys(CHANNEL_CAC);
  const byChannel = channels.map(ch => {
    const totalUsers = totalMap.get(ch) ?? 0;
    const spend      = CHANNEL_CAC[ch] * totalUsers;
    const activated  = activatedMap.get(ch) ?? 0;
    const engaged    = engagedMap.get(ch)   ?? 0;
    const habit      = habitMap.get(ch)     ?? 0;

    return {
      channel:          ch,
      color:            CHANNEL_COLORS[ch] ?? '#6b7280',
      totalUsers,
      spend,
      activated,
      engaged,
      habit,
      costPerActivated: activated > 0 ? Math.round(spend / activated) : null,
      costPerEngaged:   engaged   > 0 ? Math.round(spend / engaged)   : null,
      costPerHabit:     habit     > 0 ? Math.round(spend / habit)     : null,
    };
  });

  // ── CAC trend (modelled) ──────────────────────────────────────────────────
  const trend = MONTH_LABELS.map((month, i) => ({
    month,
    blended: 780 + i * 8  + (i * 17) % 30,
    paid:    980 + i * 25 + (i * 13) % 50,
    organic: 390 + i * 5  + (i * 7)  % 20,
  }));

  return jsonResponse({ byChannel, trend, trendLabel: 'Modelled — Oct 2025 – Mar 2026' });
}
