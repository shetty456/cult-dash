import { NextRequest } from 'next/server';
import db, { SCALE } from '@/lib/db';
import { parseFilters, jsonResponse } from '@/lib/queryHelpers';

const ANCHOR = '2026-04-17T23:59:59Z';

const CHANNEL_CAC: Record<string, number> = {
  'Paid Digital': 1120, 'Organic': 420, 'Referrals': 680, 'Brand/ATL': 890, 'Corporate': 560,
};

export async function GET(req: NextRequest) {
  const f = parseFilters(req.nextUrl.searchParams);

  // Resolve the current window; fall back to last 30 days relative to ANCHOR
  const to   = f.to   ?? ANCHOR;
  const from = f.from ?? new Date(new Date(to).getTime() - 30 * 86400000).toISOString();

  // Prior period of the same length for comparisons
  const durationMs = new Date(to).getTime() - new Date(from).getTime();
  const prevTo   = from;
  const prevFrom = new Date(new Date(from).getTime() - durationMs).toISOString();

  // ── WAU ──────────────────────────────────────────────────────────────────
  const wau = (db.prepare(`
    SELECT COUNT(DISTINCT user_id) as c FROM events
    WHERE timestamp >= @from AND timestamp <= @to
  `).get({ from, to }) as { c: number }).c * SCALE;

  const wauPrev = (db.prepare(`
    SELECT COUNT(DISTINCT user_id) as c FROM events
    WHERE timestamp >= @from AND timestamp <= @to
  `).get({ from: prevFrom, to: prevTo }) as { c: number }).c * SCALE;

  const wauChange = wauPrev > 0 ? Math.round(((wau - wauPrev) / wauPrev) * 1000) / 10 : 0;

  // ── NSM — users with ≥3 workout_completed in the window ──────────────────
  const nsmRaw = (db.prepare(`
    SELECT COUNT(*) as c FROM (
      SELECT user_id FROM events
      WHERE type = 'workout_completed' AND timestamp >= @from AND timestamp <= @to
      GROUP BY user_id HAVING COUNT(*) >= 3
    )
  `).get({ from, to }) as { c: number }).c;

  const nsmPrevRaw = (db.prepare(`
    SELECT COUNT(*) as c FROM (
      SELECT user_id FROM events
      WHERE type = 'workout_completed' AND timestamp >= @from AND timestamp <= @to
      GROUP BY user_id HAVING COUNT(*) >= 3
    )
  `).get({ from: prevFrom, to: prevTo }) as { c: number }).c;

  const nsm      = nsmRaw     * SCALE;
  const nsmPrev  = nsmPrevRaw * SCALE;
  const nsmChange = nsmPrev > 0 ? Math.round(((nsm - nsmPrev) / nsmPrev) * 1000) / 10 : 0;

  // ── Blended CAC (channel mix from all users — not time-windowed) ─────────
  type ChannelRow = { channel: string; cnt: number };
  const channelCounts = db.prepare(
    `SELECT channel, COUNT(*) as cnt FROM users GROUP BY channel`
  ).all() as ChannelRow[];

  let totalUsers = 0; let weightedCac = 0;
  for (const row of channelCounts) {
    totalUsers += row.cnt;
    weightedCac += (CHANNEL_CAC[row.channel] ?? 750) * row.cnt;
  }
  const cac      = totalUsers > 0 ? Math.round(weightedCac / totalUsers) : 750;
  const cacPrev  = Math.round(cac * 0.92);
  const cacChange = Math.round(((cac - cacPrev) / cacPrev) * 1000) / 10;

  // ── ARPU ─────────────────────────────────────────────────────────────────
  const arpuRow = db.prepare(
    `SELECT AVG(ltv) as avg FROM users WHERE plan != 'free'`
  ).get() as { avg: number | null };
  const arpu      = Math.round(arpuRow.avg ?? 0);
  const arpuPrev  = Math.round(arpu * 0.96);
  const arpuChange = arpuPrev > 0 ? Math.round(((arpu - arpuPrev) / arpuPrev) * 1000) / 10 : 0;

  // ── MRR ──────────────────────────────────────────────────────────────────
  const mrrRow = db.prepare(`
    SELECT SUM(CASE plan
      WHEN 'monthly'   THEN ltv
      WHEN 'quarterly' THEN ltv / 3.0
      WHEN 'annual'    THEN ltv / 12.0
      ELSE 0 END) as mrr
    FROM users WHERE plan != 'free'
  `).get() as { mrr: number | null };
  const mrr      = Math.round((mrrRow.mrr ?? 0) * SCALE);
  const mrrPrev  = Math.round(mrr * 0.93);
  const mrrChange = mrrPrev > 0 ? Math.round(((mrr - mrrPrev) / mrr) * 1000) / 10 : 0;

  return jsonResponse({
    wau:  { value: wau,  prev: wauPrev,  change: wauChange  },
    nsm:  { value: nsm,  prev: nsmPrev,  change: nsmChange  },
    cac:  { value: cac,  prev: cacPrev,  change: cacChange  },
    arpu: { value: arpu, prev: arpuPrev, change: arpuChange },
    mrr:  { value: mrr,  prev: mrrPrev,  change: mrrChange  },
  });
}
