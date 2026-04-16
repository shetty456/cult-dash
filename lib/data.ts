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

// How to reformat a metric value after range-scaling
export type MetricFormat = 'K' | 'K1' | '₹' | '₹/mo' | '₹Cr';

export interface MetricValue {
  value: number;
  formatted: string;
  formatType: MetricFormat; // drives reformatting in scaleMetric
  wowChange: number | null;
  momChange: number | null;
  sparkline: number[]; // 7 data points for inline SVG sparkline
  status: MetricStatus;
  subtext?: string;    // e.g. "Target ₹750 | Above"
  progress?: number;   // 0–100 for progress bar (Revenue MTD)
}

function applyFormat(value: number, fmt: MetricFormat): string {
  switch (fmt) {
    case 'K':    return `${Math.round(value / 1000)}K`;
    case 'K1':   return `${(value / 1000).toFixed(1)}K`;
    case '₹':    return `₹${Math.round(value).toLocaleString('en-IN')}`;
    case '₹/mo': return `₹${Math.round(value)}/mo`;
    case '₹Cr':  return `₹${value.toFixed(1)}Cr`;
  }
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
// Phase 2 Types — Channel Performance + Segmentation
// ─────────────────────────────────────────────────────────────────────────────

export interface ChannelRow {
  name: string;
  installs: number;
  installsWoW: number;
  trialConv: number;   // % sign-up → trial
  paidConv: number;    // % trial → paid
  cac: number;
  cacMoM: number;
  timeToVisit: number; // avg days install → first visit
  nsm: number;         // % of users achieving NSM
  status: 'healthy' | 'watch' | 'alert';
  alert: string | null;
}

export interface AgeBand {
  band: string;
  users: number;
  usersWoW: number;
  d7Retention: number;
  d30Retention: number;
  d60Retention: number;
  nsm: number;
  churnRate: number;
}

export interface PaymentSegment {
  type: string;
  users: number;
  usersWoW: number;
  d7Retention: number;
  d30Retention: number;
  d60Retention: number;
  nsm: number;
  arpu: number;
  ltvCacRatio: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3 Types — Retention Curves + NSM Milestones
// ─────────────────────────────────────────────────────────────────────────────

export interface RetentionPoint {
  day: number;
  retention: number;
  users?: number;
}

export interface RetentionCurves {
  blended: RetentionPoint[];
  byChannel: Record<string, RetentionPoint[]>;
}

export interface NSMMilestone {
  name: string;
  count: number;
  percent: number;
}

export interface NSMWeekCohort {
  week: string;
  cohortSize: number;
  firstVisit: number;
  secondVisit: number;
  thirdVisit: number;
  nsmCompletion: number;
  nsmPercent: number;
  trend: number; // WoW change in NSM %
}

export interface NSMMilestones {
  currentWeek: {
    week: string;
    cohortSize: number;
    milestones: NSMMilestone[];
    bottleneck: string;
    bottleneckPercent: number;
  };
  historicalCohorts: NSMWeekCohort[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1: Base data (30d / All Channels)
// ─────────────────────────────────────────────────────────────────────────────

const BASE_METRICS: MetricSet = {
  wau: {
    value: 180000,
    formatted: '180K',
    formatType: 'K',
    wowChange: 2.1,
    momChange: 8.1,
    sparkline: [162, 165, 170, 168, 174, 178, 180],
    status: 'green',
  },
  nsm: {
    value: 15300,
    formatted: '15.3K',
    formatType: 'K1',
    wowChange: 2.3,
    momChange: 5.4,
    sparkline: [13.8, 14.1, 14.5, 14.7, 14.9, 15.1, 15.3],
    status: 'green',
    subtext: 'Habit Completers (3×4/week)',
  },
  blendedCac: {
    value: 820,
    formatted: '₹820',
    formatType: '₹',
    wowChange: null,
    momChange: 1.2,
    sparkline: [890, 870, 855, 840, 835, 828, 820],
    status: 'yellow',
    subtext: 'Target ₹750 | Above',
  },
  arpu: {
    value: 385,
    formatted: '₹385/mo',
    formatType: '₹/mo',
    wowChange: null,
    momChange: 1.8,
    sparkline: [378, 379, 380, 381, 382, 384, 385],
    status: 'green',
  },
  revenueMtd: {
    value: 18.2,
    formatted: '₹18.2Cr',
    formatType: '₹Cr',
    wowChange: 4.7,
    momChange: 11.2,
    sparkline: [15.1, 15.8, 16.4, 16.9, 17.4, 17.9, 18.2],
    status: 'green',
    subtext: '78% of ₹23.3Cr target',
    progress: 78,
  },
};

const BASE_FUNNEL: FunnelStage[] = [
  { label: 'Install',       count: 500000, convRate: null, dropOffRate: null, isBiggestLeak: false, wowChange: 2.1  },
  { label: 'Sign-up',       count: 50000,  convRate: 10,   dropOffRate: 90,   isBiggestLeak: true,  wowChange: -0.8 },
  { label: 'Trial Booking', count: 15000,  convRate: 30,   dropOffRate: 70,   isBiggestLeak: false, wowChange: 1.5  },
  { label: 'First Visit',   count: 8000,   convRate: 53,   dropOffRate: 47,   isBiggestLeak: false, wowChange: 2.2  },
  { label: 'Paid Sub',      count: 3000,   convRate: 37,   dropOffRate: 63,   isBiggestLeak: false, wowChange: 3.1  },
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
    detail: 'Check trainer availability and onboarding UX. Sign-up → Trial fell from 35.0% to 30.0%.',
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
    { label: 'Install',       count: 125000, convRate: null, dropOffRate: null, isBiggestLeak: false, wowChange: 3.4  },
    { label: 'Sign-up',       count: 18750,  convRate: 15,   dropOffRate: 85,   isBiggestLeak: true,  wowChange: 1.2  },
    { label: 'Trial Booking', count: 9375,   convRate: 50,   dropOffRate: 50,   isBiggestLeak: false, wowChange: 2.1  },
    { label: 'First Visit',   count: 5813,   convRate: 62,   dropOffRate: 38,   isBiggestLeak: false, wowChange: 3.2  },
    { label: 'Paid Sub',      count: 2325,   convRate: 40,   dropOffRate: 60,   isBiggestLeak: false, wowChange: 4.1  },
  ],
  'Paid Digital': [
    { label: 'Install',       count: 165000, convRate: null, dropOffRate: null, isBiggestLeak: false, wowChange: 0.5  },
    { label: 'Sign-up',       count: 8250,   convRate: 5,    dropOffRate: 95,   isBiggestLeak: true,  wowChange: -2.1 },
    { label: 'Trial Booking', count: 2888,   convRate: 35,   dropOffRate: 65,   isBiggestLeak: false, wowChange: -0.8 },
    { label: 'First Visit',   count: 1329,   convRate: 46,   dropOffRate: 54,   isBiggestLeak: false, wowChange: 1.1  },
    { label: 'Paid Sub',      count: 359,    convRate: 27,   dropOffRate: 73,   isBiggestLeak: false, wowChange: 0.7  },
  ],
  'Corporate': [
    { label: 'Install',       count: 25000,  convRate: null, dropOffRate: null, isBiggestLeak: false, wowChange: 5.1  },
    { label: 'Sign-up',       count: 10000,  convRate: 40,   dropOffRate: 60,   isBiggestLeak: true,  wowChange: 4.8  },
    { label: 'Trial Booking', count: 8000,   convRate: 80,   dropOffRate: 20,   isBiggestLeak: false, wowChange: 5.0  },
    { label: 'First Visit',   count: 6000,   convRate: 75,   dropOffRate: 25,   isBiggestLeak: false, wowChange: 3.9  },
    { label: 'Paid Sub',      count: 3600,   convRate: 60,   dropOffRate: 40,   isBiggestLeak: false, wowChange: 6.2  },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2: Channel Performance Table Data
// ─────────────────────────────────────────────────────────────────────────────

export const CHANNEL_TABLE_DATA: ChannelRow[] = [
  {
    name: 'Referrals',
    installs: 125000,
    installsWoW: 2.3,
    trialConv: 68,
    paidConv: 52,
    cac: 680,
    cacMoM: -1.2,
    timeToVisit: 2.1,
    nsm: 10.2,
    status: 'healthy',
    alert: null,
  },
  {
    name: 'Organic Search',
    installs: 110000,
    installsWoW: 0.8,
    trialConv: 63,
    paidConv: 48,
    cac: 720,
    cacMoM: 1.8,
    timeToVisit: 2.4,
    nsm: 8.1,
    status: 'watch',
    alert: null,
  },
  {
    name: 'Paid Digital',
    installs: 165000,
    installsWoW: -2.1,
    trialConv: 52,
    paidConv: 42,
    cac: 1120,
    cacMoM: 18.0,
    timeToVisit: 3.2,
    nsm: 7.3,
    status: 'alert',
    alert: 'CAC up 18% MoM',
  },
  {
    name: 'Brand/ATL',
    installs: 75000,
    installsWoW: 1.5,
    trialConv: 58,
    paidConv: 45,
    cac: 950,
    cacMoM: 2.1,
    timeToVisit: 2.8,
    nsm: 7.8,
    status: 'watch',
    alert: null,
  },
  {
    name: 'Corporate B2B',
    installs: 25000,
    installsWoW: 4.2,
    trialConv: 72,
    paidConv: 68,
    cac: 480,
    cacMoM: -0.5,
    timeToVisit: 1.8,
    nsm: 15.1,
    status: 'healthy',
    alert: null,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2: Segmentation Data
// ─────────────────────────────────────────────────────────────────────────────

export const AGE_SEGMENTS: AgeBand[] = [
  { band: '18–25', users: 50400, usersWoW: 1.9, d7Retention: 38, d30Retention: 32, d60Retention: 28, nsm: 22, churnRate: 8.5 },
  { band: '26–35', users: 75600, usersWoW: 2.4, d7Retention: 45, d30Retention: 41, d60Retention: 36, nsm: 31, churnRate: 5.2 },
  { band: '36–45', users: 39600, usersWoW: 2.1, d7Retention: 48, d30Retention: 44, d60Retention: 38, nsm: 35, churnRate: 4.8 },
  { band: '46+',   users: 14400, usersWoW: 1.8, d7Retention: 42, d30Retention: 38, d60Retention: 33, nsm: 28, churnRate: 6.2 },
];

export const PAYMENT_SEGMENTS: PaymentSegment[] = [
  { type: 'Self-Pay',  users: 153000, usersWoW: 2.1, d7Retention: 40, d30Retention: 37, d60Retention: 31, nsm: 8,  arpu: 350, ltvCacRatio: 5.5 },
  { type: 'Corporate', users: 27000,  usersWoW: 3.2, d7Retention: 56, d30Retention: 52, d60Retention: 48, nsm: 42, arpu: 480, ltvCacRatio: 18  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3: Retention Curves
// ─────────────────────────────────────────────────────────────────────────────

export const RETENTION_CURVES: RetentionCurves = {
  blended: [
    { day: 1,  retention: 68, users: 180000 },
    { day: 7,  retention: 42, users: 75600  },
    { day: 14, retention: 40, users: 72000  },
    { day: 30, retention: 39, users: 70200  },
    { day: 60, retention: 34, users: 61200  },
  ],
  byChannel: {
    Referrals: [
      { day: 1,  retention: 72 },
      { day: 7,  retention: 46 },
      { day: 14, retention: 44 },
      { day: 30, retention: 43 },
      { day: 60, retention: 38 },
    ],
    'Organic Search': [
      { day: 1,  retention: 68 },
      { day: 7,  retention: 40 },
      { day: 14, retention: 38 },
      { day: 30, retention: 37 },
      { day: 60, retention: 32 },
    ],
    'Paid Digital': [
      { day: 1,  retention: 62 },
      { day: 7,  retention: 35 },
      { day: 14, retention: 32 },
      { day: 30, retention: 31 },
      { day: 60, retention: 26 },
    ],
    'Brand/ATL': [
      { day: 1,  retention: 65 },
      { day: 7,  retention: 40 },
      { day: 14, retention: 38 },
      { day: 30, retention: 37 },
      { day: 60, retention: 32 },
    ],
    Corporate: [
      { day: 1,  retention: 78 },
      { day: 7,  retention: 56 },
      { day: 14, retention: 54 },
      { day: 30, retention: 52 },
      { day: 60, retention: 48 },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3: NSM Milestones
// ─────────────────────────────────────────────────────────────────────────────

export const NSM_MILESTONES: NSMMilestones = {
  currentWeek: {
    week: 'Apr 1–7',
    cohortSize: 1245,
    milestones: [
      { name: '1st Visit',          count: 1245, percent: 100  },
      { name: '2nd Visit (D7)',      count: 987,  percent: 79.3 },
      { name: '3rd Visit (D7)',      count: 764,  percent: 61.4 },
      { name: '3rd Confirmed',       count: 682,  percent: 54.8 },
      { name: '4-Week 3×/Wk (NSM)', count: 156,  percent: 12.5 },
    ],
    bottleneck: '3rd visit → 4-week consistency',
    bottleneckPercent: 77,
  },
  historicalCohorts: [
    { week: 'Mar 25–31',   cohortSize: 1235, firstVisit: 1235, secondVisit: 975,  thirdVisit: 766, nsmCompletion: 160, nsmPercent: 13.0, trend:  1.2 },
    { week: 'Apr 1–7',     cohortSize: 1245, firstVisit: 1245, secondVisit: 987,  thirdVisit: 764, nsmCompletion: 156, nsmPercent: 12.5, trend: -0.5 },
    { week: 'Apr 8–14',    cohortSize: 1198, firstVisit: 1198, secondVisit: 969,  thirdVisit: 755, nsmCompletion: 164, nsmPercent: 13.7, trend:  1.2 },
    { week: 'Apr 15–21',   cohortSize: 1220, firstVisit: 1220, secondVisit: 996,  thirdVisit: 781, nsmCompletion: 172, nsmPercent: 14.1, trend:  0.4 },
    { week: 'Apr 22–28',   cohortSize: 1187, firstVisit: 1187, secondVisit: 950,  thirdVisit: 738, nsmCompletion: 145, nsmPercent: 12.2, trend: -1.9 },
    { week: 'Apr 29–May 5',cohortSize: 1256, firstVisit: 1256, secondVisit: 1005, thirdVisit: 784, nsmCompletion: 168, nsmPercent: 13.4, trend:  1.2 },
    { week: 'May 6–12',    cohortSize: 1210, firstVisit: 1210, secondVisit: 968,  thirdVisit: 754, nsmCompletion: 171, nsmPercent: 14.1, trend:  0.7 },
    { week: 'May 13–19',   cohortSize: 1273, firstVisit: 1273, secondVisit: 1019, thirdVisit: 792, nsmCompletion: 185, nsmPercent: 14.5, trend:  0.4 },
  ],
};

// NSM by segment
export const NSM_BY_AGE = [
  { band: '18–25', firstVisit: 100, secondVisit: 72, thirdVisit: 54, fourWkNsm: 8.8,  nsmPct: 22, trend:  1.1 },
  { band: '26–35', firstVisit: 100, secondVisit: 82, thirdVisit: 68, fourWkNsm: 15.8, nsmPct: 31, trend:  0.8 },
  { band: '36–45', firstVisit: 100, secondVisit: 85, thirdVisit: 71, fourWkNsm: 18.9, nsmPct: 35, trend:  1.3 },
  { band: '46+',   firstVisit: 100, secondVisit: 78, thirdVisit: 62, fourWkNsm: 12.2, nsmPct: 28, trend:  0.5 },
];

export const NSM_BY_PAYMENT = [
  { type: 'Self-Pay',  firstVisit: 100, secondVisit: 76, thirdVisit: 58, fourWkNsm: 6.2,  nsmPct: 8,  trend: -0.3 },
  { type: 'Corporate', firstVisit: 100, secondVisit: 89, thirdVisit: 82, fourWkNsm: 27.5, nsmPct: 42, trend:  2.1 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 merge helpers
// ─────────────────────────────────────────────────────────────────────────────

function scaleMetric(m: MetricValue, multiplier: number): MetricValue {
  const scaledValue = m.value * multiplier;
  const scaledFormatted = applyFormat(scaledValue, m.formatType);

  // For Revenue MTD, recompute the progress subtext against the same target
  let subtext = m.subtext;
  let progress = m.progress;
  if (m.formatType === '₹Cr' && m.progress !== undefined) {
    // Back-calculate target from base (18.2 / 0.78 ≈ 23.3 Cr)
    const baseTarget = m.value / (m.progress / 100);
    const scaledProgress = Math.round((scaledValue / baseTarget) * 100);
    progress = scaledProgress;
    subtext = `${scaledProgress}% of ₹${baseTarget.toFixed(1)}Cr target`;
  }

  return {
    ...m,
    value: scaledValue,
    formatted: scaledFormatted,
    sparkline: m.sparkline.map(v => v * multiplier),
    subtext,
    progress,
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
// Main Phase 1 data accessor
// ─────────────────────────────────────────────────────────────────────────────

export function getDashboardData(range: DateRange, channel: Channel): DashboardData {
  const multiplier = RANGE_MULTIPLIERS[range];
  const channelOverride = CHANNEL_OVERRIDES[channel];

  const scaledMetrics: MetricSet = {
    wau:        scaleMetric(BASE_METRICS.wau,        multiplier),
    nsm:        scaleMetric(BASE_METRICS.nsm,        multiplier),
    blendedCac: scaleMetric(BASE_METRICS.blendedCac, multiplier),
    arpu:       scaleMetric(BASE_METRICS.arpu,       multiplier),
    revenueMtd: scaleMetric(BASE_METRICS.revenueMtd, multiplier),
  };

  const metrics: MetricSet = channelOverride ? {
    wau:        channelOverride.wau        ? mergeMetric(scaledMetrics.wau,        channelOverride.wau)        : scaledMetrics.wau,
    nsm:        channelOverride.nsm        ? mergeMetric(scaledMetrics.nsm,        channelOverride.nsm)        : scaledMetrics.nsm,
    blendedCac: channelOverride.blendedCac ? mergeMetric(scaledMetrics.blendedCac, channelOverride.blendedCac) : scaledMetrics.blendedCac,
    arpu:       channelOverride.arpu       ? mergeMetric(scaledMetrics.arpu,       channelOverride.arpu)       : scaledMetrics.arpu,
    revenueMtd: channelOverride.revenueMtd ? mergeMetric(scaledMetrics.revenueMtd, channelOverride.revenueMtd) : scaledMetrics.revenueMtd,
  } : scaledMetrics;

  const rawFunnel = CHANNEL_FUNNELS[channel] ?? BASE_FUNNEL;
  const funnel = scaleFunnel(rawFunnel, channel === 'All Channels' ? multiplier : 1);

  const alerts = ALL_ALERTS.filter(a => a.channels.includes(channel));

  return { metrics, funnel, alerts, asOf: '2026-04-11T14:47:00Z' };
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
      const y = height - ((v - min) / range) * (height - 4) - 2;
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
