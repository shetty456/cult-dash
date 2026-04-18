import db from '@/lib/db';
import { jsonResponse } from '@/lib/queryHelpers';

const SCALE = 25;

// Realistic conversion rates for each experiment — drives the story
const EXPERIMENT_CONFIG = [
  {
    id: 'exp_onboarding_video',
    name: 'Onboarding: Video Intro vs Skip',
    hypothesis: 'A short video intro builds emotional buy-in and reduces drop-off before sign-up.',
    goal: 'OB Started → Sign-up',
    status: 'concluded' as const,
    winner: 'treatment' as const,
    started_at: '2026-03-18',
    ended_at: '2026-03-27',
    control:   { label: 'Skip (current)', conv_rate: 0.47 },
    treatment: { label: 'Video Intro',    conv_rate: 0.62 },
  },
  {
    id: 'exp_trial_length',
    name: 'Free Trial: 7 Days vs 14 Days',
    hypothesis: 'A longer trial gives users time to build a workout habit, increasing paid conversion.',
    goal: 'Trial Booked → Paid Subscriber',
    status: 'running' as const,
    winner: null,
    started_at: '2026-03-27',
    ended_at: null,
    control:   { label: '7 Days (current)', conv_rate: 0.22 },
    treatment: { label: '14 Days',          conv_rate: 0.31 },
  },
  {
    id: 'exp_reminder_channel',
    name: 'Trial Reminder: Push vs WhatsApp',
    hypothesis: 'WhatsApp messages have higher open rates than push notifications, driving more first visits.',
    goal: 'Trial Booked → First Visit',
    status: 'running' as const,
    winner: null,
    started_at: '2026-04-04',
    ended_at: null,
    control:   { label: 'Push Notification', conv_rate: 0.49 },
    treatment: { label: 'WhatsApp Message',  conv_rate: 0.63 },
  },
  {
    id: 'exp_pricing_upsell',
    name: 'Pricing Page: Monthly First vs Annual First',
    hypothesis: 'Anchoring users to the annual plan first increases ARPU and reduces monthly churn.',
    goal: 'Trial Completed → Subscription',
    status: 'running' as const,
    winner: null,
    started_at: '2026-04-11',
    ended_at: null,
    control:   { label: 'Monthly First',      conv_rate: 0.24 },
    treatment: { label: 'Annual Upsell First', conv_rate: 0.27 },
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
  // Pull actual sample sizes from DB
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
    const s = samples[exp.id] ?? { control: 500, treatment: 500 };
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
      id:          exp.id,
      name:        exp.name,
      hypothesis:  exp.hypothesis,
      goal:        exp.goal,
      status:      exp.status,
      winner:      exp.winner,
      started_at:  exp.started_at,
      ended_at:    exp.ended_at,
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
