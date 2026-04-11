// ─────────────────────────────────────────────────────────────────────────────
// Cult.fit Growth Dashboard — Mock Data & Types
// Single source of truth. No API calls — all data is embedded here.
// ─────────────────────────────────────────────────────────────────────────────

export type DateRange = '7d' | '30d' | '90d';

export type Channel =
  | 'All Channels'
  | 'Referrals'
  | 'Organic Search'
  | 'Paid Digital'
  | 'Brand/ATL'
  | 'Corporate';

export type MetricStatus = 'green' | 'yellow' | 'red';

export interface MetricValue {
  value: number;
  formatted: string;
  wowChange: number | null;
  momChange: number | null;
  sparkline: number[]; // 7 data points for inline SVG sparkline
  status: MetricStatus;
  subtext?: string;    // e.g. "Target ₹750 | Above"
  progress?: number;   // 0–100 for progress bar (Revenue MTD)
}

export interface MetricSet {
  wau: MetricValue;
  nsm: MetricValue;
  blendedCac: MetricValue;
  arpu: MetricValue;
  revenueMtd: MetricValue;
}

export interface FunnelStage {
  label: string;
  count: number;
  convRate: number | null;   // % from previous stage (null for Install)
  dropOffRate: number | null; // % that dropped off before this stage
  isBiggestLeak: boolean;
  wowChange: number;
}

export interface Alert {
  id: string;
  title: string;
  detail: string;
  severity: 'High' | 'Medium' | 'Medium Watch';
  drillLabel: string;
  drillHref: string;
  channels: Channel[];
}

export interface DashboardData {
  metrics: MetricSet;
  funnel: FunnelStage[];
  alerts: Alert[];
  asOf: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Base data (30d / All Channels)
// ─────────────────────────────────────────────────────────────────────────────

const BASE_METRICS: MetricSet = {
  wau: {
    value: 180000,
    formatted: '180K',
    wowChange: 2.1,
    momChange: 8.1,
    sparkline: [162, 165, 170, 168, 174, 178, 180],
    status: 'green',
  },
  nsm: {
    value: 15300,
    formatted: '15.3K',
    wowChange: 2.3,
    momChange: 5.4,
    sparkline: [13.8, 14.1, 14.5, 14.7, 14.9, 15.1, 15.3],
    status: 'green',
    subtext: 'Habit Completers (3×4/week)',
  },
  blendedCac: {
    value: 820,
    formatted: '₹820',
    wowChange: null,
    momChange: 1.2,
    sparkline: [890, 870, 855, 840, 835, 828, 820],
    status: 'yellow',
    subtext: 'Target ₹750 | Above',
  },
  arpu: {
    value: 385,
    formatted: '₹385/mo',
    wowChange: null,
    momChange: 1.8,
    sparkline: [378, 379, 380, 381, 382, 384, 385],
    status: 'green',
  },
  revenueMtd: {
    value: 18.2,
    formatted: '₹18.2Cr',
    wowChange: 4.7,
    momChange: 11.2,
    sparkline: [15.1, 15.8, 16.4, 16.9, 17.4, 17.9, 18.2],
    status: 'green',
    subtext: '78% of ₹23.3Cr target',
    progress: 78,
  },
};

const BASE_FUNNEL: FunnelStage[] = [
  { label: 'Install',       count: 100000, convRate: null, dropOffRate: null, isBiggestLeak: false, wowChange: 2.1  },
  { label: 'Sign-up',       count: 35000,  convRate: 35,   dropOffRate: 65,   isBiggestLeak: true,  wowChange: -0.8 },
  { label: 'Trial Booking', count: 21700,  convRate: 62,   dropOffRate: 38,   isBiggestLeak: false, wowChange: 1.5  },
  { label: 'First Visit',   count: 12600,  convRate: 58,   dropOffRate: 42,   isBiggestLeak: false, wowChange: 2.2  },
  { label: 'Paid Sub',      count: 6048,   convRate: 48,   dropOffRate: 52,   isBiggestLeak: false, wowChange: 3.1  },
];

const ALL_ALERTS: Alert[] = [
  {
    id: 'alert-paid-cac',
    title: 'Paid Digital CAC ↑18% MoM',
    detail: 'Investigate rising CPC on Google/Instagram. Cost crossed ₹1,120 — 37% above blended benchmark.',
    severity: 'High',
    drillLabel: 'View Channel Breakdown',
    drillHref: '#channel-breakdown',
    channels: ['All Channels', 'Paid Digital'],
  },
  {
    id: 'alert-trial-conv',
    title: 'Trial Booking Conversion ↓5.2% WoW',
    detail: 'Check trainer availability and onboarding UX. Sign-up → Trial fell from 67.2% to 62.0%.',
    severity: 'Medium',
    drillLabel: 'View Trial Quality Metrics',
    drillHref: '#trial-metrics',
    channels: ['All Channels', 'Organic Search', 'Paid Digital', 'Referrals'],
  },
  {
    id: 'alert-d30-retention',
    title: 'D30 Retention ↓0.5% WoW',
    detail: 'Declining slowly — not critical yet, but monitor. 30-day retention at 34.2%, down from 34.7%.',
    severity: 'Medium Watch',
    drillLabel: 'View Retention Curves',
    drillHref: '#retention',
    channels: ['All Channels', 'Organic Search', 'Brand/ATL', 'Corporate'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Range multipliers — applied to all numeric values
// ─────────────────────────────────────────────────────────────────────────────

const RANGE_MULTIPLIERS: Record<DateRange, number> = {
  '7d':  0.92,
  '30d': 1.00,
  '90d': 1.11,
};

// ─────────────────────────────────────────────────────────────────────────────
// Channel overrides — shallow-merge onto scaled base
// ─────────────────────────────────────────────────────────────────────────────

type ChannelOverride = Partial<{
  wau: Partial<MetricValue>;
  nsm: Partial<MetricValue>;
  blendedCac: Partial<MetricValue>;
  arpu: Partial<MetricValue>;
  revenueMtd: Partial<MetricValue>;
}>;

const CHANNEL_OVERRIDES: Partial<Record<Channel, ChannelOverride>> = {
  'Referrals': {
    wau:        { value: 81000, formatted: '81K', wowChange: 3.4, status: 'green' },
    nsm:        { value: 8262,  formatted: '8.3K', status: 'green' },
    blendedCac: { value: 680, formatted: '₹680', momChange: -5.2, status: 'green', subtext: 'Below target ₹750' },
    arpu:       { value: 410, formatted: '₹410/mo', momChange: 2.4, status: 'green' },
    revenueMtd: { value: 8.4, formatted: '₹8.4Cr', progress: 72, subtext: '72% of ₹11.7Cr target' },
  },
  'Organic Search': {
    wau:        { value: 45000, formatted: '45K', wowChange: 1.8, status: 'green' },
    nsm:        { value: 4050,  formatted: '4.1K', status: 'green' },
    blendedCac: { value: 420, formatted: '₹420', momChange: -2.1, status: 'green', subtext: 'Well below target ₹750' },
    arpu:       { value: 370, formatted: '₹370/mo', momChange: 1.1, status: 'green' },
    revenueMtd: { value: 4.5, formatted: '₹4.5Cr', progress: 82, subtext: '82% of ₹5.5Cr target' },
  },
  'Paid Digital': {
    wau:        { value: 36000, formatted: '36K', wowChange: 0.5, status: 'yellow' },
    nsm:        { value: 2880,  formatted: '2.9K', wowChange: -1.2, status: 'yellow' },
    blendedCac: { value: 1120, formatted: '₹1,120', momChange: 18.0, status: 'red', subtext: '↑18% MoM | ₹370 above target' },
    arpu:       { value: 395, formatted: '₹395/mo', momChange: 0.8, status: 'green' },
    revenueMtd: { value: 3.8, formatted: '₹3.8Cr', progress: 68, subtext: '68% of ₹5.6Cr target' },
  },
  'Brand/ATL': {
    wau:        { value: 12000, formatted: '12K', wowChange: 4.2, status: 'green' },
    nsm:        { value: 960,   formatted: '960', status: 'green' },
    blendedCac: { value: 950, formatted: '₹950', momChange: 3.1, status: 'yellow', subtext: 'Target ₹750 | Above' },
    arpu:       { value: 360, formatted: '₹360/mo', momChange: 0.6, status: 'green' },
    revenueMtd: { value: 1.1, formatted: '₹1.1Cr', progress: 75, subtext: '75% of ₹1.5Cr target' },
  },
  'Corporate': {
    wau:        { value: 22000, formatted: '22K', wowChange: 5.1, status: 'green' },
    nsm:        { value: 3960,  formatted: '4.0K', wowChange: 4.8, status: 'green' },
    blendedCac: { value: 580, formatted: '₹580', momChange: -3.4, status: 'green', subtext: 'Below target ₹750' },
    arpu:       { value: 620, formatted: '₹620/mo', momChange: 2.9, status: 'green' },
    revenueMtd: { value: 3.6, formatted: '₹3.6Cr', progress: 90, subtext: '90% of ₹4.0Cr target' },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Channel-specific funnel data
// ─────────────────────────────────────────────────────────────────────────────

const CHANNEL_FUNNELS: Partial<Record<Channel, FunnelStage[]>> = {
  'Referrals': [
    { label: 'Install',       count: 45000, convRate: null, dropOffRate: null, isBiggestLeak: false, wowChange: 3.4  },
    { label: 'Sign-up',       count: 22500, convRate: 50,   dropOffRate: 50,   isBiggestLeak: true,  wowChange: 1.2  },
    { label: 'Trial Booking', count: 15750, convRate: 70,   dropOffRate: 30,   isBiggestLeak: false, wowChange: 2.1  },
    { label: 'First Visit',   count: 10395, convRate: 66,   dropOffRate: 34,   isBiggestLeak: false, wowChange: 3.2  },
    { label: 'Paid Sub',      count: 5613,  convRate: 54,   dropOffRate: 46,   isBiggestLeak: false, wowChange: 4.1  },
  ],
  'Paid Digital': [
    { label: 'Install',       count: 60000, convRate: null, dropOffRate: null, isBiggestLeak: false, wowChange: 0.5  },
    { label: 'Sign-up',       count: 15600, convRate: 26,   dropOffRate: 74,   isBiggestLeak: true,  wowChange: -2.1 },
    { label: 'Trial Booking', count: 8580,  convRate: 55,   dropOffRate: 45,   isBiggestLeak: false, wowChange: -0.8 },
    { label: 'First Visit',   count: 4547,  convRate: 53,   dropOffRate: 47,   isBiggestLeak: false, wowChange: 1.1  },
    { label: 'Paid Sub',      count: 1910,  convRate: 42,   dropOffRate: 58,   isBiggestLeak: false, wowChange: 0.7  },
  ],
  'Corporate': [
    { label: 'Install',       count: 8000, convRate: null, dropOffRate: null, isBiggestLeak: false, wowChange: 5.1  },
    { label: 'Sign-up',       count: 5600, convRate: 70,   dropOffRate: 30,   isBiggestLeak: false, wowChange: 4.8  },
    { label: 'Trial Booking', count: 4424, convRate: 79,   dropOffRate: 21,   isBiggestLeak: false, wowChange: 5.0  },
    { label: 'First Visit',   count: 3315, convRate: 75,   dropOffRate: 25,   isBiggestLeak: true,  wowChange: 3.9  },
    { label: 'Paid Sub',      count: 2319, convRate: 70,   dropOffRate: 30,   isBiggestLeak: false, wowChange: 6.2  },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Merge helpers
// ─────────────────────────────────────────────────────────────────────────────

function scaleMetric(m: MetricValue, multiplier: number): MetricValue {
  const scaledValue = m.value * multiplier;
  return {
    ...m,
    value: scaledValue,
    sparkline: m.sparkline.map(v => v * multiplier),
  };
}

function mergeMetric(base: MetricValue, override: Partial<MetricValue>): MetricValue {
  return { ...base, ...override };
}

function scaleFunnel(stages: FunnelStage[], multiplier: number): FunnelStage[] {
  return stages.map(stage => ({
    ...stage,
    count: Math.round(stage.count * multiplier),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main data accessor
// ─────────────────────────────────────────────────────────────────────────────

export function getDashboardData(range: DateRange, channel: Channel): DashboardData {
  const multiplier = RANGE_MULTIPLIERS[range];
  const channelOverride = CHANNEL_OVERRIDES[channel];

  // Scale base metrics by date range
  const scaledMetrics: MetricSet = {
    wau:        scaleMetric(BASE_METRICS.wau,        multiplier),
    nsm:        scaleMetric(BASE_METRICS.nsm,        multiplier),
    blendedCac: scaleMetric(BASE_METRICS.blendedCac, multiplier),
    arpu:       scaleMetric(BASE_METRICS.arpu,       multiplier),
    revenueMtd: scaleMetric(BASE_METRICS.revenueMtd, multiplier),
  };

  // Apply channel overrides (override ignores range scaling for realism)
  const metrics: MetricSet = channelOverride ? {
    wau:        channelOverride.wau        ? mergeMetric(scaledMetrics.wau,        channelOverride.wau)        : scaledMetrics.wau,
    nsm:        channelOverride.nsm        ? mergeMetric(scaledMetrics.nsm,        channelOverride.nsm)        : scaledMetrics.nsm,
    blendedCac: channelOverride.blendedCac ? mergeMetric(scaledMetrics.blendedCac, channelOverride.blendedCac) : scaledMetrics.blendedCac,
    arpu:       channelOverride.arpu       ? mergeMetric(scaledMetrics.arpu,       channelOverride.arpu)       : scaledMetrics.arpu,
    revenueMtd: channelOverride.revenueMtd ? mergeMetric(scaledMetrics.revenueMtd, channelOverride.revenueMtd) : scaledMetrics.revenueMtd,
  } : scaledMetrics;

  // Pick funnel — channel-specific or scaled base
  const rawFunnel = CHANNEL_FUNNELS[channel] ?? BASE_FUNNEL;
  const funnel = scaleFunnel(rawFunnel, channel === 'All Channels' ? multiplier : 1);

  // Filter alerts to those relevant for the selected channel
  const alerts = ALL_ALERTS.filter(a => a.channels.includes(channel));

  return {
    metrics,
    funnel,
    alerts,
    asOf: '2026-04-11T14:47:00Z',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sparkline path builder — used in MetricCard
// ─────────────────────────────────────────────────────────────────────────────

export function buildSparklinePath(data: number[], width = 80, height = 32): string {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  return data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2; // 2px padding
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export const FILTER_OPTIONS = {
  dateRanges: ['7d', '30d', '90d'] as DateRange[],
  channels: [
    'All Channels',
    'Referrals',
    'Organic Search',
    'Paid Digital',
    'Brand/ATL',
    'Corporate',
  ] as Channel[],
};
