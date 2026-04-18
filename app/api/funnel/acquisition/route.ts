import { NextRequest } from 'next/server';
import db, { SCALE } from '@/lib/db';
import { parseFilters, jsonResponse } from '@/lib/queryHelpers';

const ANCHOR = '2026-04-17T23:59:59Z';

const CHANNEL_CAC: Record<string, number> = {
  'Paid Digital': 1120, 'Organic': 420, 'Referrals': 680, 'Brand/ATL': 890, 'Corporate': 560,
};
const DIGITAL        = ['Paid Digital', 'Organic'];
const PHYSICAL       = ['Referrals', 'Brand/ATL', 'Corporate'];
const ALL_CHANNELS   = Object.keys(CHANNEL_CAC);

export const INDUSTRY = {
  digital:  { cac: 900,  visitToSignup: 18, signupToTrial: 30, trialToVisit: 65, visitToPaid: 22 },
  physical: { cac: 750,  visitToSignup: 28, signupToTrial: 52, trialToVisit: 72, visitToPaid: 35 },
};

interface FunnelRow { stage: string; count: number; pct: number; dropPct: number; }

// Count distinct users who fired a given event type in the window
function countEvent(type: string, from: string, to: string, channels?: string[]): number {
  const ph = channels ? channels.map(() => '?').join(',') : null;
  const chClause = ph ? `AND u.channel IN (${ph})` : '';
  const sql = `
    SELECT COUNT(DISTINCT e.user_id) as c
    FROM events e JOIN users u ON u.id = e.user_id
    WHERE e.type = ? AND e.timestamp >= ? AND e.timestamp <= ? ${chClause}
  `;
  return (db.prepare(sql).get(...([type, from, to, ...(channels ?? [])] as string[])) as { c: number }).c;
}

// Count distinct users with ≥minCount workout_completed events in the window
function countWorkoutMin(minCount: number, from: string, to: string, channels?: string[]): number {
  const ph = channels ? channels.map(() => '?').join(',') : null;
  const chClause = ph ? `AND u.channel IN (${ph})` : '';
  const sql = `
    SELECT COUNT(*) as c FROM (
      SELECT e.user_id
      FROM events e JOIN users u ON u.id = e.user_id
      WHERE e.type = 'workout_completed'
        AND e.timestamp >= ? AND e.timestamp <= ?
        ${chClause}
      GROUP BY e.user_id HAVING COUNT(*) >= ?
    )
  `;
  return (db.prepare(sql).get(...([from, to, ...(channels ?? []), minCount] as unknown[])) as { c: number }).c;
}

function buildFunnel(from: string, to: string, channels?: string[]): FunnelRow[] {
  // Strictly sequential path — each stage is a subset of the one above:
  // Install → Sign-up → Trial Booked → Class Booked → Paid Subscription
  // Workout stages removed: workout counts exceed trial counts (not sequential)
  const raw = [
    { stage: 'Install',          count: countEvent('app_install',            from, to, channels) * SCALE },
    { stage: 'Sign-up',          count: countEvent('sign_up',                from, to, channels) * SCALE },
    { stage: 'Trial Booked',     count: countEvent('trial_booked',           from, to, channels) * SCALE },
    { stage: 'Class Booked',     count: countEvent('class_booked',           from, to, channels) * SCALE },
    { stage: 'Paid Subscription',count: countEvent('subscription_purchased', from, to, channels) * SCALE },
  ];
  const top = raw[0].count || 1;
  return raw.map((s, i, arr) => ({
    ...s,
    pct:     Math.min(100, Math.round((s.count / top) * 1000) / 10),
    dropPct: i === 0 ? 0 : Math.max(0, Math.round(((arr[i-1].count - s.count) / Math.max(1, arr[i-1].count)) * 100)),
  }));
}

function costPerPaid(funnel: FunnelRow[], cac: number) {
  const trial    = funnel[2]?.count ?? 0;  // Trial Booked
  const paid     = funnel[4]?.count ?? 0;  // Paid Subscription
  const convRate = trial > 0 ? paid / trial : 0;
  return {
    cost:     convRate > 0 ? Math.round(cac / convRate) : 0,
    cac,
    convRate: Math.round(convRate * 1000) / 10,
  };
}

function weightedCac(channels?: string[]): number {
  const ph = channels ? channels.map(() => '?').join(',') : null;
  const chClause = ph ? `WHERE channel IN (${ph})` : '';
  const rows = db.prepare(`SELECT channel, COUNT(*) as cnt FROM users ${chClause} GROUP BY channel`)
    .all(...((channels ?? []) as string[])) as { channel: string; cnt: number }[];
  let total = 0, weighted = 0;
  for (const r of rows) { total += r.cnt; weighted += (CHANNEL_CAC[r.channel] ?? 750) * r.cnt; }
  return total > 0 ? Math.round(weighted / total) : 750;
}

function autoInsight(overall: FunnelRow[], digital: FunnelRow[], physical: FunnelRow[]): string {
  // Biggest absolute drop in the funnel
  const leak = [...overall].filter(s => s.dropPct > 0).sort((a, b) => b.dropPct - a.dropPct)[0];
  // Trial → Paid comparison across channels
  const dConv = digital[4].count  / Math.max(1, digital[2].count)  * 100;
  const pConv = physical[4].count / Math.max(1, physical[2].count) * 100;

  if (Math.abs(dConv - pConv) > 5) {
    const better = dConv > pConv ? 'Digital' : 'Physical';
    const hi = Math.max(dConv, pConv).toFixed(0);
    const lo = Math.min(dConv, pConv).toFixed(0);
    return `${better} converts ${hi}% of trials to paid vs ${lo}% — scale ${better.toLowerCase()} spend to grow paid subs fastest.`;
  }
  if (leak) {
    const idx    = overall.indexOf(leak);
    const prev   = overall[idx - 1]?.count ?? 0;
    const uplift = Math.round(prev * Math.max(0, leak.dropPct - 15) / 100 * 0.3);
    return `Biggest drop at "${leak.stage}" (${leak.dropPct}% lost). Recovering 15 pp adds ~${uplift.toLocaleString()} paid subs.`;
  }
  return 'Funnel conversion looks healthy across all stages.';
}

export async function GET(req: NextRequest) {
  const f    = parseFilters(req.nextUrl.searchParams);
  const to   = f.to   ?? ANCHOR;
  const from = f.from ?? new Date(new Date(to).getTime() - 365 * 86400000).toISOString();

  const overall  = buildFunnel(from, to);
  const digital  = buildFunnel(from, to, DIGITAL);
  const physical = buildFunnel(from, to, PHYSICAL);

  const subChannels: Record<string, FunnelRow[]> = {};
  for (const ch of ALL_CHANNELS) subChannels[ch] = buildFunnel(from, to, [ch]);

  const cacDigital  = weightedCac(DIGITAL);
  const cacPhysical = weightedCac(PHYSICAL);
  const cacByChannel: Record<string, number> = {};
  for (const ch of ALL_CHANNELS) cacByChannel[ch] = CHANNEL_CAC[ch] ?? 750;

  const blendedCac = weightedCac();
  const costPerPaidSub = {
    overall:    costPerPaid(overall,  blendedCac),
    digital:    costPerPaid(digital,  cacDigital),
    physical:   costPerPaid(physical, cacPhysical),
    byChannel:  Object.fromEntries(ALL_CHANNELS.map(ch => [ch, costPerPaid(subChannels[ch], CHANNEL_CAC[ch] ?? 750)])),
    industryAvg: 4000,
  };

  // ── NSM bridge: connect acquisition funnel to the north star metric ───────
  // Users who hit ≥3 workouts/week in at least one week of the window
  type CountRow = { c: number };
  const nsmCompleterCount = (db.prepare(`
    SELECT COUNT(DISTINCT user_id) as c FROM (
      SELECT user_id, strftime('%Y-W%W', timestamp) as wk
      FROM events
      WHERE type = 'workout_completed' AND timestamp >= ? AND timestamp <= ?
      GROUP BY user_id, wk HAVING COUNT(*) >= 3
    )
  `).get(from, to) as CountRow).c * SCALE;

  const nsmPaidCount = (db.prepare(`
    SELECT COUNT(DISTINCT nsm.user_id) as c FROM (
      SELECT user_id FROM (
        SELECT user_id, strftime('%Y-W%W', timestamp) as wk
        FROM events
        WHERE type = 'workout_completed' AND timestamp >= ? AND timestamp <= ?
        GROUP BY user_id, wk HAVING COUNT(*) >= 3
      )
    ) nsm JOIN users u ON u.id = nsm.user_id WHERE u.plan != 'free'
  `).get(from, to) as CountRow).c * SCALE;

  const nsmFreeCount = nsmCompleterCount - nsmPaidCount;
  // Blended avg monthly plan value (~₹600/mo weighted across monthly/quarterly/annual)
  const avgMonthlyValue = 600;
  const upsellMrrOpportunity = Math.round(nsmFreeCount * 0.30 * avgMonthlyValue);

  const nsmBridge = {
    nsmCompleters:    nsmCompleterCount,
    nsmPaid:          nsmPaidCount,
    nsmFree:          nsmFreeCount,
    paidAmongNsm:     nsmCompleterCount > 0 ? Math.round((nsmPaidCount / nsmCompleterCount) * 100) : 0,
    upsellMrrOpportunity,
  };

  return jsonResponse({
    overall, digital, physical, subChannels,
    cac: { digital: cacDigital, physical: cacPhysical },
    cacByChannel, costPerPaidSub,
    industryBenchmarks: INDUSTRY,
    nsmBridge,
    insight: autoInsight(overall, digital, physical),
  });
}
