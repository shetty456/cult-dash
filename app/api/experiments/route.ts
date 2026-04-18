import db from '@/lib/db';
import { jsonResponse } from '@/lib/queryHelpers';

const SCALE = 25;

// Each experiment is tied to one of the 4 early activation leading indicators
// or the acquisition funnel. linkedMetric drives the badge colour in the UI.
const EXPERIMENT_CONFIG = [
  {
    id:          'exp_same_day_nudge',
    name:        'Same-Day Nudge: 1h vs 24h Post Sign-up',
    hypothesis:  'A push notification 1 hour after sign-up, while intent is highest, drives more users to their first workout within 48h than the current next-day reminder.',
    goal:        '% 1st workout ≤ 48h',
    linkedMetric: '48h' as const,
    status:      'running' as const,
    winner:      null,
    started_at:  '2026-04-04',
    ended_at:    null,
    // Control baseline matches the ~22% 48h activation rate seen in DB
    control:   { label: '24h reminder (current)', conv_rate: 0.22 },
    treatment: { label: '1h post sign-up push',   conv_rate: 0.31 },
  },
  {
    id:          'exp_streak_vs_next_class',
    name:        'Post-1st Workout: Streak Counter vs Next Class CTA',
    hypothesis:  'Showing a streak counter immediately after the first workout creates loss aversion and motivates users to return within the same week, increasing ≥2 workouts in week 1.',
    goal:        '% ≥2 workouts in week 1',
    linkedMetric: 'week1' as const,
    status:      'running' as const,
    winner:      null,
    started_at:  '2026-04-08',
    ended_at:    null,
    // Control baseline aligns with ~18% week-1 two-workout rate from DB
    control:   { label: '"Browse next class" CTA',        conv_rate: 0.18 },
    treatment: { label: 'Streak counter + day-2 nudge',   conv_rate: 0.26 },
  },
  {
    id:          'exp_personalised_reco',
    name:        'Day-3 Re-engagement: Personalised vs Generic',
    hypothesis:  'A personalised class recommendation based on the first workout type reduces median days to a 2nd workout compared to a generic "come back" reminder.',
    goal:        'Median days → 2nd workout',
    linkedMetric: 'timeToSecond' as const,
    status:      'running' as const,
    winner:      null,
    started_at:  '2026-04-11',
    ended_at:    null,
    // ~36% of users who did any workout complete a 2nd within 14d; personalisation targets this
    control:   { label: 'Generic reminder',               conv_rate: 0.36 },
    treatment: { label: 'Personalised class suggestion',  conv_rate: 0.47 },
  },
  {
    id:          'exp_guided_slot_booking',
    name:        'Onboarding: Guided Slot Booking vs Self-Serve',
    hypothesis:  'Booking users into a specific class slot during onboarding creates a commitment device that reduces the never-activated (0 workouts in week 1) rate.',
    goal:        '% 0 workouts in week 1 ↓',
    linkedMetric: 'neverActivated' as const,
    status:      'concluded' as const,
    winner:      'treatment' as const,
    started_at:  '2026-03-18',
    ended_at:    '2026-04-01',
    // Never-activated baseline ~45%; guided booking pushed it down to ~30%
    control:   { label: 'Self-serve class browser',       conv_rate: 0.55 }, // 55% activated (45% never did)
    treatment: { label: 'Guided slot booking (winner)',   conv_rate: 0.70 }, // 70% activated (30% never did)
  },
  {
    id:          'exp_trial_length',
    name:        'Free Trial: 7 Days vs 14 Days',
    hypothesis:  'A 14-day trial gives users enough time to build a workout habit (≥3 workouts), increasing trial → paid conversion.',
    goal:        'Trial → Paid conversion',
    linkedMetric: 'funnel' as const,
    status:      'running' as const,
    winner:      null,
    started_at:  '2026-03-27',
    ended_at:    null,
    // ~21% of trials convert to paid in DB (131 paid / 612 trial bookings)
    control:   { label: '7-day trial (current)', conv_rate: 0.21 },
    treatment: { label: '14-day trial',          conv_rate: 0.30 },
  },
];

function zTest(n1: number, p1: number, n2: number, p2: number) {
  const x1 = Math.round(n1 * p1);
  const x2 = Math.round(n2 * p2);
  const pooled = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
  if (se === 0) return { z: 0, significant: false, confidence: 0 };
  const z = Math.abs((p2 - p1) / se);
  const confidence = z >= 2.576 ? 99 : z >= 1.960 ? 95 : z >= 1.645 ? 90 : Math.round(z / 1.96 * 95);
  return { z: Math.round(z * 100) / 100, significant: z >= 1.96, confidence };
}

export function GET() {
  const rows = db.prepare(`
    SELECT
      json_extract(properties, '$.experiment_id') AS exp_id,
      json_extract(properties, '$.variant')       AS variant,
      COUNT(DISTINCT user_id)                     AS n
    FROM events
    WHERE type = 'experiment_assigned'
    GROUP BY exp_id, variant
  `).all() as { exp_id: string; variant: string; n: number }[];

  const samples: Record<string, { control: number; treatment: number }> = {};
  for (const row of rows) {
    if (!samples[row.exp_id]) samples[row.exp_id] = { control: 0, treatment: 0 };
    if (row.variant === 'control')   samples[row.exp_id].control   = row.n * SCALE;
    if (row.variant === 'treatment') samples[row.exp_id].treatment = row.n * SCALE;
  }

  const result = EXPERIMENT_CONFIG.map(exp => {
    const s    = samples[exp.id] ?? { control: 500, treatment: 500 };
    const n_ctrl = s.control  || 500;
    const n_trt  = s.treatment || 500;

    const { z, significant, confidence } = zTest(
      n_ctrl, exp.control.conv_rate,
      n_trt,  exp.treatment.conv_rate,
    );

    const lift = Math.round(
      ((exp.treatment.conv_rate - exp.control.conv_rate) / exp.control.conv_rate) * 1000
    ) / 10;

    return {
      id:           exp.id,
      name:         exp.name,
      hypothesis:   exp.hypothesis,
      goal:         exp.goal,
      linkedMetric: exp.linkedMetric,
      status:       exp.status,
      winner:       exp.winner,
      started_at:   exp.started_at,
      ended_at:     exp.ended_at,
      control: {
        label:       exp.control.label,
        n:           n_ctrl,
        conv_rate:   exp.control.conv_rate,
        conversions: Math.round(n_ctrl * exp.control.conv_rate),
      },
      treatment: {
        label:       exp.treatment.label,
        n:           n_trt,
        conv_rate:   exp.treatment.conv_rate,
        conversions: Math.round(n_trt * exp.treatment.conv_rate),
      },
      lift,
      z,
      significant,
      confidence,
    };
  });

  return jsonResponse(result);
}
