import { NextRequest } from 'next/server';
import db, { SCALE } from '@/lib/db';
import { parseFilters, jsonResponse } from '@/lib/queryHelpers';

const ANCHOR = '2026-04-17T23:59:59Z';

const CHANNEL_CAC: Record<string, number> = {
  'Paid Digital': 1120, 'Organic': 420, 'Referrals': 680, 'Brand/ATL': 890, 'Corporate': 560,
};

// Visitor/install share per channel (top-of-funnel includes anonymous users — not tracked in DB)
const VISITOR_SHARE: Record<string, number> = {
  'Paid Digital': 0.30,
  'Organic':      0.25,
  'Referrals':    0.25,
  'Brand/ATL':    0.10,
  'Corporate':    0.10,
};
const TOTAL_VISITORS = 500000; // realistic monthly app installs (used only as ceiling)

// Conversion rates for pre-signup stages (anonymous users not in DB)
// Derived from: 500K installs → 300K OB start → 150K OB done → 50K sign-ups
const SIGNUP_RATE   = 0.10;  // 10% of installs complete sign-up
const OB_START_RATE = 0.60;  // 60% of installs start onboarding
const OB_DONE_RATE  = 0.30;  // 30% of installs complete onboarding

const DIGITAL  = ['Paid Digital', 'Organic'];
const PHYSICAL = ['Referrals', 'Brand/ATL', 'Corporate'];
const ALL_CHANNELS = Object.keys(VISITOR_SHARE);

// India fitness-app industry benchmarks (2025–2026)
export const INDUSTRY = {
  digital:  { cac: 900,  visitToSignup: 18, signupToTrial: 30, trialToVisit: 65, visitToPaid: 22 },
  physical: { cac: 750,  visitToSignup: 28, signupToTrial: 52, trialToVisit: 72, visitToPaid: 35 },
};

interface FunnelRow { stage: string; count: number; pct: number; dropPct: number; }

function countEvent(type: string, from: string, to: string, channels?: string[]): number {
  const ph = channels ? channels.map(() => '?').join(',') : null;
  const chClause = ph ? `AND u.channel IN (${ph})` : '';
  const sql = `
    SELECT COUNT(DISTINCT e.user_id) as c
    FROM events e JOIN users u ON u.id = e.user_id
    WHERE e.type = ? AND e.timestamp >= ? AND e.timestamp <= ? ${chClause}
  `;
  const params: unknown[] = [type, from, to, ...(channels ?? [])];
  return (db.prepare(sql).get(...(params as string[])) as { c: number }).c;
}

function buildFunnel(from: string, to: string, channels?: string[]): FunnelRow[] {
  // All stages are derived from the date-filtered sign-up count so the entire
  // funnel responds correctly to any date range the user selects.
  const signups = countEvent('sign_up', from, to, channels) * SCALE;

  // Top 3 pre-signup stages: anonymous visitors not in DB, so we back-calculate
  // from sign-ups using known conversion rates, capped at realistic channel ceiling.
  const share      = channels ? channels.reduce((s, ch) => s + (VISITOR_SHARE[ch] ?? 0), 0) : 1;
  const maxInstall = Math.round(TOTAL_VISITORS * share);
  const installs   = Math.min(maxInstall,                         Math.round(signups / SIGNUP_RATE));
  const obStart    = Math.min(Math.round(maxInstall * OB_START_RATE), Math.round(signups / SIGNUP_RATE * OB_START_RATE));
  const obDone     = Math.min(Math.round(maxInstall * OB_DONE_RATE),  Math.round(signups / SIGNUP_RATE * OB_DONE_RATE));

  const raw = [
    { stage: 'App Install',          count: installs },
    { stage: 'Onboarding Started',   count: obStart  },
    { stage: 'Onboarding Completed', count: obDone   },
    { stage: 'Sign-up',              count: signups  },
    { stage: 'Trial Booked',         count: countEvent('trial_booked',          from, to, channels) * SCALE },
    { stage: 'First Visit',          count: countEvent('trial_completed',        from, to, channels) * SCALE },
    { stage: 'Paid Subscriber',      count: countEvent('subscription_purchased', from, to, channels) * SCALE },
  ];
  const top = raw[0].count || 1;
  return raw.map((s, i, arr) => ({
    ...s,
    pct:     Math.min(100, Math.round((s.count / top) * 1000) / 10),
    dropPct: i === 0 ? 0 : Math.max(0, Math.round(((arr[i-1].count - s.count) / Math.max(1, arr[i-1].count)) * 100)),
  }));
}

// Cost per paid subscriber = CAC ÷ (trial→paid conversion rate)
// This is the single number that tells you which channel is truly efficient end-to-end.
function costPerPaid(funnel: FunnelRow[], cac: number) {
  const trial    = funnel[4]?.count ?? 0;  // Trial Booked
  const paid     = funnel[6]?.count ?? 0;  // Paid Subscriber
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
  const sql = `SELECT channel, COUNT(*) as cnt FROM users ${chClause} GROUP BY channel`;
  const rows = db.prepare(sql).all(...((channels ?? []) as string[])) as { channel: string; cnt: number }[];
  let total = 0, weighted = 0;
  for (const r of rows) { total += r.cnt; weighted += (CHANNEL_CAC[r.channel] ?? 750) * r.cnt; }
  return total > 0 ? Math.round(weighted / total) : 750;
}

function avgDaysToFirstVisit(from: string, to: string, channels: string[]): number {
  const ph = channels.map(() => '?').join(',');
  const row = db.prepare(`
    SELECT AVG(ABS(julianday(tc.timestamp) - julianday(su.timestamp))) as d
    FROM events tc
    JOIN events su ON su.user_id = tc.user_id AND su.type = 'sign_up'
    JOIN users u ON u.id = tc.user_id
    WHERE tc.type = 'trial_completed'
      AND u.channel IN (${ph})
      AND tc.timestamp >= ? AND tc.timestamp <= ?
  `).get(...([...channels, from, to] as string[])) as { d: number | null };
  return Math.round((row?.d ?? 5) * 10) / 10;
}

function autoInsight(
  overall: FunnelRow[], digital: FunnelRow[], physical: FunnelRow[],
  cacD: number, cacP: number,
): string {
  // indices: 0=Install 1=OB Start 2=OB Done 3=Sign-up 4=Trial 5=Visit 6=Paid
  const dTrialPaid = digital[6].count  / Math.max(1, digital[4].count)  * 100;
  const pTrialPaid = physical[6].count / Math.max(1, physical[4].count) * 100;

  if (Math.abs(dTrialPaid - pTrialPaid) > 5 && digital[2].count > 0 && physical[2].count > 0) {
    const better = dTrialPaid > pTrialPaid ? 'Digital' : 'Physical';
    const ratio  = (Math.max(dTrialPaid, pTrialPaid) / Math.max(1, Math.min(dTrialPaid, pTrialPaid))).toFixed(1);
    const hi = Math.max(dTrialPaid, pTrialPaid).toFixed(0);
    const lo = Math.min(dTrialPaid, pTrialPaid).toFixed(0);
    return `${better} converts ${ratio}× better at Trial→Paid (${hi}% vs ${lo}%) — scale ${better.toLowerCase()} spend to grow paid subs fastest.`;
  }

  const leak = [...overall].filter(s => s.dropPct > 0).sort((a, b) => b.dropPct - a.dropPct)[0];
  if (leak) {
    const idx    = overall.indexOf(leak);
    const prevCnt = overall[idx - 1]?.count ?? 0;
    const uplift  = Math.round(prevCnt * Math.max(0, leak.dropPct - 15) / 100 * 0.3);
    return `Biggest drop at ${leak.stage} (${leak.dropPct}% lost). Recovering 15 pp adds ~${uplift.toLocaleString()} paid subs/month.`;
  }

  const cheapest = cacD < cacP ? `Digital (₹${cacD.toLocaleString()})` : `Physical (₹${cacP.toLocaleString()})`;
  return `${cheapest} is your most efficient acquisition channel — scale it to reduce blended CAC.`;
}

export async function GET(req: NextRequest) {
  const f    = parseFilters(req.nextUrl.searchParams);
  const to   = f.to   ?? ANCHOR;
  const from = f.from ?? new Date(new Date(to).getTime() - 30 * 86400000).toISOString();

  const overall  = buildFunnel(from, to);
  const digital  = buildFunnel(from, to, DIGITAL);
  const physical = buildFunnel(from, to, PHYSICAL);

  // Sub-channel breakdown (all 5 individual channels)
  const subChannels: Record<string, FunnelRow[]> = {};
  for (const ch of ALL_CHANNELS) {
    subChannels[ch] = buildFunnel(from, to, [ch]);
  }

  const cacDigital  = weightedCac(DIGITAL);
  const cacPhysical = weightedCac(PHYSICAL);
  const cacByChannel: Record<string, number> = {};
  for (const ch of ALL_CHANNELS) cacByChannel[ch] = CHANNEL_CAC[ch] ?? 750;

  const timeDigital  = avgDaysToFirstVisit(from, to, DIGITAL);
  const timePhysical = avgDaysToFirstVisit(from, to, PHYSICAL);
  const timeByChannel: Record<string, number> = {};
  for (const ch of ALL_CHANNELS) {
    timeByChannel[ch] = avgDaysToFirstVisit(from, to, [ch]);
  }

  const insight = autoInsight(overall, digital, physical, cacDigital, cacPhysical);

  const blendedCac = weightedCac();
  const costPerPaidSub = {
    overall:   costPerPaid(overall,  blendedCac),
    digital:   costPerPaid(digital,  cacDigital),
    physical:  costPerPaid(physical, cacPhysical),
    byChannel: Object.fromEntries(
      ALL_CHANNELS.map(ch => [ch, costPerPaid(subChannels[ch], CHANNEL_CAC[ch] ?? 750)])
    ),
    // India fitness-app industry average cost per paid subscriber (2025–2026)
    industryAvg: 4000,
  };

  return jsonResponse({
    overall, digital, physical, subChannels,
    cac: { digital: cacDigital, physical: cacPhysical },
    cacByChannel,
    costPerPaidSub,
    industryBenchmarks: INDUSTRY,
    timeToFirstVisit: { digital: timeDigital, physical: timePhysical },
    timeByChannel,
    insight,
  });
}
