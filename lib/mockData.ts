// ─── Seeded RNG (mulberry32) — deterministic, no hydration mismatch ─────────
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(42);

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MockUser {
  id: string;
  name: string;
  city: string;
  age: number;
  gender: 'M' | 'F';
  plan: 'free' | 'monthly' | 'quarterly' | 'annual';
  channel: string;
  joinedAt: string;
  lastActive: string;
  workoutsCompleted: number;
  status: 'active' | 'at-risk' | 'churned';
  ltv: number;
  nsmReached: boolean;
}

export interface MockEvent {
  id: string;
  userId: string;
  userName: string;
  userCity: string;
  type:
    | 'app_open'
    | 'workout_started'
    | 'workout_completed'
    | 'trial_booked'
    | 'subscription_purchased'
    | 'subscription_cancelled'
    | 'referral_sent'
    | 'class_booked'
    | 'meal_logged';
  timestamp: string;
  channel?: string;
  metadata: Record<string, string | number>;
}

// ─── Reference data ─────────────────────────────────────────────────────────

const ANCHOR = new Date('2026-04-11T14:47:00Z').getTime();

const MALE_FIRST = [
  'Aarav','Arjun','Vivek','Rohan','Kiran','Rahul','Suresh','Amit','Vikram','Deepak',
  'Nikhil','Sanjay','Rajesh','Aditya','Prateek','Gaurav','Manish','Abhishek','Ravi','Siddharth',
  'Harish','Pavan','Naveen','Satish','Vinay','Manoj','Dinesh','Ajay','Prakash','Sunil',
];
const FEMALE_FIRST = [
  'Priya','Ananya','Deepika','Kavya','Shreya','Pooja','Meera','Neha','Divya','Sneha',
  'Sunita','Lakshmi','Rekha','Radha','Nandini','Swathi','Bhavana','Pallavi','Archana','Geeta',
  'Varsha','Rashmi','Usha','Lata','Anjali','Smita','Vandana','Poonam','Preeti','Sonal',
];
const LAST_NAMES = [
  'Sharma','Gupta','Singh','Kumar','Patel','Shah','Mehta','Joshi','Reddy','Nair',
  'Iyer','Pillai','Rao','Verma','Chaudhary','Mishra','Dubey','Pandey','Tiwari','Sinha',
  'Agarwal','Bansal','Bhatia','Chopra','Malhotra','Kapoor','Saxena','Trivedi','Bose','Das',
];
const CITIES = ['Mumbai','Delhi','Bengaluru','Hyderabad','Chennai','Pune','Kolkata','Ahmedabad'];
const CITY_WEIGHTS = [0.22, 0.20, 0.18, 0.12, 0.10, 0.08, 0.06, 0.04];
const CHANNELS = ['Referrals','Paid Digital','Organic','Brand/ATL','Corporate'];
const CHANNEL_WEIGHTS = [0.25, 0.30, 0.25, 0.10, 0.10];
const PLANS: MockUser['plan'][] = ['free','monthly','quarterly','annual'];
const PLAN_WEIGHTS = [0.30, 0.35, 0.20, 0.15];
const WORKOUT_TYPES = ['Yoga','HIIT','Strength','Cycling','Zumba','Boxing','Running','Pilates'];
const WORKOUT_WEIGHTS = [0.22, 0.18, 0.16, 0.12, 0.10, 0.08, 0.08, 0.06];

function pickWeighted<T>(arr: T[], weights: number[]): T {
  const r = rng();
  let cum = 0;
  for (let i = 0; i < arr.length; i++) {
    cum += weights[i];
    if (r < cum) return arr[i];
  }
  return arr[arr.length - 1];
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function isoDate(msFromAnchor: number): string {
  return new Date(ANCHOR - msFromAnchor).toISOString();
}

const PLAN_LTV: Record<MockUser['plan'], number> = {
  free: 0,
  monthly: 399,
  quarterly: 999,
  annual: 2999,
};

// ─── Generate 300 Users ──────────────────────────────────────────────────────

export const USERS: MockUser[] = Array.from({ length: 300 }, (_, i) => {
  const gender: 'M' | 'F' = rng() < 0.55 ? 'M' : 'F';
  const firstName = gender === 'M' ? pick(MALE_FIRST) : pick(FEMALE_FIRST);
  const lastName = pick(LAST_NAMES);
  const city = pickWeighted(CITIES, CITY_WEIGHTS);
  const channel = pickWeighted(CHANNELS, CHANNEL_WEIGHTS);
  const plan = pickWeighted(PLANS, PLAN_WEIGHTS);

  // Age: skew 22-35
  const ageBucket = rng();
  const age = ageBucket < 0.15 ? 18 + Math.floor(rng() * 5)
    : ageBucket < 0.50 ? 23 + Math.floor(rng() * 8)
    : ageBucket < 0.80 ? 31 + Math.floor(rng() * 10)
    : 41 + Math.floor(rng() * 15);

  // Join date: within last 90 days
  const joinedMsAgo = Math.floor(rng() * 90 * 24 * 60 * 60 * 1000);
  const joinedAt = isoDate(joinedMsAgo);

  // Last active: after join, within last 30 days
  const lastActiveMsAgo = Math.floor(rng() * Math.min(joinedMsAgo, 30 * 24 * 60 * 60 * 1000));
  const lastActive = isoDate(lastActiveMsAgo);

  const daysSinceActive = lastActiveMsAgo / (24 * 60 * 60 * 1000);
  const status: MockUser['status'] = daysSinceActive < 7 ? 'active'
    : daysSinceActive < 21 ? 'at-risk'
    : 'churned';

  const daysSinceJoin = joinedMsAgo / (24 * 60 * 60 * 1000);
  const workoutsCompleted = plan === 'free'
    ? Math.floor(rng() * 5)
    : Math.floor(rng() * Math.min(daysSinceJoin / 3, 40) + 1);

  // NSM: 3 workouts/week × 4 weeks = 12+ workouts, status active
  const nsmReached = workoutsCompleted >= 12 && status === 'active';

  const months = Math.max(1, daysSinceJoin / 30);
  const ltv = plan === 'free' ? 0
    : Math.round(PLAN_LTV[plan] * (rng() * 0.4 + 0.8) * Math.min(months, 6));

  return {
    id: `u${String(i + 1).padStart(3, '0')}`,
    name: `${firstName} ${lastName}`,
    city,
    age,
    gender,
    plan,
    channel,
    joinedAt,
    lastActive,
    workoutsCompleted,
    status,
    ltv,
    nsmReached,
  };
});

// ─── Generate Events ─────────────────────────────────────────────────────────

export const ALL_EVENTS: MockEvent[] = [];

USERS.forEach(user => {
  const joinedTs = new Date(user.joinedAt).getTime();
  const eventCount = user.plan === 'free' ? 5 + Math.floor(rng() * 10)
    : 15 + Math.floor(rng() * 40);

  // app_open events
  const appOpens = Math.floor(eventCount * 0.4);
  for (let i = 0; i < appOpens; i++) {
    const ts = joinedTs + Math.floor(rng() * (ANCHOR - joinedTs));
    ALL_EVENTS.push({
      id: `e_${user.id}_ao${i}`,
      userId: user.id,
      userName: user.name,
      userCity: user.city,
      type: 'app_open',
      timestamp: new Date(ts).toISOString(),
      metadata: { screen: pick(['home','workout','profile','explore']) },
    });
  }

  // workout events
  for (let i = 0; i < user.workoutsCompleted; i++) {
    const ts = joinedTs + Math.floor(rng() * (ANCHOR - joinedTs));
    const workoutType = pickWeighted(WORKOUT_TYPES, WORKOUT_WEIGHTS);
    const duration = [30, 45, 60, 75][Math.floor(rng() * 4)];
    ALL_EVENTS.push({
      id: `e_${user.id}_ws${i}`,
      userId: user.id,
      userName: user.name,
      userCity: user.city,
      type: 'workout_started',
      timestamp: new Date(ts).toISOString(),
      metadata: { workoutType, duration },
    });
    ALL_EVENTS.push({
      id: `e_${user.id}_wc${i}`,
      userId: user.id,
      userName: user.name,
      userCity: user.city,
      type: 'workout_completed',
      timestamp: new Date(ts + duration * 60 * 1000).toISOString(),
      metadata: { workoutType, duration, caloriesBurned: Math.floor(duration * (4 + rng() * 4)) },
    });
  }

  // plan events
  if (user.plan !== 'free') {
    const ts = new Date(user.joinedAt).getTime() + Math.floor(rng() * 3 * 24 * 60 * 60 * 1000);
    ALL_EVENTS.push({
      id: `e_${user.id}_sp`,
      userId: user.id,
      userName: user.name,
      userCity: user.city,
      type: 'subscription_purchased',
      timestamp: new Date(ts).toISOString(),
      channel: user.channel,
      metadata: { plan: user.plan, amount: PLAN_LTV[user.plan] },
    });
  }

  if (user.status === 'churned') {
    const ts = new Date(user.lastActive).getTime();
    ALL_EVENTS.push({
      id: `e_${user.id}_sc`,
      userId: user.id,
      userName: user.name,
      userCity: user.city,
      type: 'subscription_cancelled',
      timestamp: new Date(ts).toISOString(),
      metadata: { plan: user.plan, reason: pick(['price','time','other']) },
    });
  }

  // trial bookings
  if (rng() < 0.35) {
    const ts = new Date(user.joinedAt).getTime() + Math.floor(rng() * 2 * 24 * 60 * 60 * 1000);
    ALL_EVENTS.push({
      id: `e_${user.id}_tb`,
      userId: user.id,
      userName: user.name,
      userCity: user.city,
      type: 'trial_booked',
      timestamp: new Date(ts).toISOString(),
      metadata: { workoutType: pickWeighted(WORKOUT_TYPES, WORKOUT_WEIGHTS), trainerName: `Trainer ${Math.floor(rng() * 20 + 1)}` },
    });
  }

  // referrals
  if (user.nsmReached && rng() < 0.4) {
    const ts = new Date(user.joinedAt).getTime() + Math.floor(rng() * 30 * 24 * 60 * 60 * 1000);
    ALL_EVENTS.push({
      id: `e_${user.id}_rs`,
      userId: user.id,
      userName: user.name,
      userCity: user.city,
      type: 'referral_sent',
      timestamp: new Date(ts).toISOString(),
      metadata: { referralCode: `REF${user.id.toUpperCase()}` },
    });
  }

  // meal logs
  if (user.plan !== 'free' && rng() < 0.5) {
    const mealCount = Math.floor(rng() * 8 + 1);
    for (let i = 0; i < mealCount; i++) {
      const ts = new Date(user.joinedAt).getTime() + Math.floor(rng() * (ANCHOR - new Date(user.joinedAt).getTime()));
      ALL_EVENTS.push({
        id: `e_${user.id}_ml${i}`,
        userId: user.id,
        userName: user.name,
        userCity: user.city,
        type: 'meal_logged',
        timestamp: new Date(ts).toISOString(),
        metadata: { calories: Math.floor(300 + rng() * 500), meal: pick(['breakfast','lunch','dinner','snack']) },
      });
    }
  }
});

// Sort all events descending
ALL_EVENTS.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

export const RECENT_EVENTS: MockEvent[] = ALL_EVENTS.slice(0, 50);

// ─── Aggregations ────────────────────────────────────────────────────────────

// Helper: offset by days from anchor
function anchorDay(daysAgo: number): string {
  const d = new Date(ANCHOR - daysAgo * 24 * 60 * 60 * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// 1. DAU_SERIES — last 90 days
export const DAU_SERIES: { date: string; dau: number; newUsers: number }[] = Array.from(
  { length: 90 },
  (_, i) => {
    const daysAgo = 89 - i;
    const date = anchorDay(daysAgo);
    const cutoffTs = ANCHOR - daysAgo * 24 * 60 * 60 * 1000;
    const dayStart = cutoffTs;
    const dayEnd = cutoffTs + 24 * 60 * 60 * 1000;

    const activeSet = new Set<string>();
    ALL_EVENTS.forEach(e => {
      const ts = new Date(e.timestamp).getTime();
      if (ts >= dayStart && ts < dayEnd) activeSet.add(e.userId);
    });

    const newUsers = USERS.filter(u => {
      const jt = new Date(u.joinedAt).getTime();
      return jt >= dayStart && jt < dayEnd;
    }).length;

    return { date, dau: activeSet.size, newUsers };
  }
);

// 2. WAU_SERIES — last 13 weeks
export const WAU_SERIES: { week: string; wau: number }[] = Array.from(
  { length: 13 },
  (_, i) => {
    const weeksAgo = 12 - i;
    const weekEnd = ANCHOR - weeksAgo * 7 * 24 * 60 * 60 * 1000;
    const weekStart = weekEnd - 7 * 24 * 60 * 60 * 1000;
    const d = new Date(weekStart);
    const week = `W${String(d.getMonth() + 1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;

    const activeSet = new Set<string>();
    ALL_EVENTS.forEach(e => {
      const ts = new Date(e.timestamp).getTime();
      if (ts >= weekStart && ts < weekEnd) activeSet.add(e.userId);
    });

    return { week, wau: activeSet.size };
  }
);

// 3. NSM_SERIES — weekly habit completers
export const NSM_SERIES: { week: string; nsmCount: number; nsmRate: number }[] = WAU_SERIES.map(
  (w, i) => {
    const weeksAgo = 12 - i;
    const weekEnd = ANCHOR - weeksAgo * 7 * 24 * 60 * 60 * 1000;
    const weekStart = weekEnd - 7 * 24 * 60 * 60 * 1000;

    // Users who completed 3+ workouts THIS week
    const workoutsByUser: Record<string, number> = {};
    ALL_EVENTS.forEach(e => {
      if (e.type !== 'workout_completed') return;
      const ts = new Date(e.timestamp).getTime();
      if (ts < weekStart || ts >= weekEnd) return;
      workoutsByUser[e.userId] = (workoutsByUser[e.userId] || 0) + 1;
    });

    const nsmCount = Object.values(workoutsByUser).filter(n => n >= 3).length;
    const nsmRate = w.wau > 0 ? Math.round((nsmCount / w.wau) * 1000) / 10 : 0;

    return { week: w.week, nsmCount, nsmRate };
  }
);

// 4. WORKOUT_TYPE_DIST
const wtCount: Record<string, number> = {};
ALL_EVENTS.forEach(e => {
  if (e.type !== 'workout_completed') return;
  const wt = String(e.metadata.workoutType);
  wtCount[wt] = (wtCount[wt] || 0) + 1;
});
const wtTotal = Object.values(wtCount).reduce((s, v) => s + v, 0);
export const WORKOUT_TYPE_DIST: { type: string; count: number; pct: number }[] = Object.entries(wtCount)
  .sort((a, b) => b[1] - a[1])
  .map(([type, count]) => ({ type, count, pct: Math.round((count / wtTotal) * 1000) / 10 }));

// 5. CAC_BY_CHANNEL
const CHANNEL_CAC: Record<string, number> = {
  'Referrals': 680,
  'Paid Digital': 1120,
  'Organic': 420,
  'Brand/ATL': 890,
  'Corporate': 560,
};
const CHANNEL_COLORS: Record<string, string> = {
  'Referrals': '#10b981',
  'Paid Digital': '#ef4444',
  'Organic': '#4ade80',
  'Brand/ATL': '#f59e0b',
  'Corporate': '#60a5fa',
};
export const CAC_BY_CHANNEL: { channel: string; cac: number; users: number; color: string }[] = CHANNELS.map(ch => ({
  channel: ch,
  cac: CHANNEL_CAC[ch],
  users: USERS.filter(u => u.channel === ch).length,
  color: CHANNEL_COLORS[ch],
})).sort((a, b) => a.cac - b.cac);

// 6. CAC_TREND — last 6 months
const MONTH_NAMES = ['Oct','Nov','Dec','Jan','Feb','Mar'];
export const CAC_TREND: { month: string; blended: number; paid: number; organic: number }[] = MONTH_NAMES.map((month, i) => ({
  month,
  blended: 780 + i * 8 + Math.floor((i * 17) % 30),
  paid: 980 + i * 25 + Math.floor((i * 13) % 50),
  organic: 390 + i * 5 + Math.floor((i * 7) % 20),
}));

// 7. FUNNEL_STAGES
const totalInstalls = 22000;
const signups = Math.round(totalInstalls * 0.35);
const trialsBooked = Math.round(signups * 0.62);
const trialCompleted = Math.round(trialsBooked * 0.74);
const paid = USERS.filter(u => u.plan !== 'free').length;

export const FUNNEL_STAGES: { stage: string; count: number; pct: number; dropPct: number }[] = [
  { stage: 'Installs', count: totalInstalls, pct: 100, dropPct: 0 },
  { stage: 'Sign-ups', count: signups, pct: Math.round((signups / totalInstalls) * 100), dropPct: Math.round((1 - signups / totalInstalls) * 100) },
  { stage: 'Trial Booked', count: trialsBooked, pct: Math.round((trialsBooked / totalInstalls) * 100), dropPct: Math.round((1 - trialsBooked / signups) * 100) },
  { stage: 'Trial Done', count: trialCompleted, pct: Math.round((trialCompleted / totalInstalls) * 100), dropPct: Math.round((1 - trialCompleted / trialsBooked) * 100) },
  { stage: 'Paid Sub', count: paid, pct: Math.round((paid / totalInstalls) * 100), dropPct: Math.round((1 - paid / trialCompleted) * 100) },
];

// 8. FUNNEL_CONV_TREND — weekly (13 weeks)
export const FUNNEL_CONV_TREND: { week: string; install2signup: number; trial2paid: number }[] = WAU_SERIES.map(
  (w, i) => ({
    week: w.week,
    install2signup: Math.round((32 + i * 0.2 + (i % 3)) * 10) / 10,
    trial2paid: Math.round((44 + i * 0.3 + (i % 4)) * 10) / 10,
  })
);

// 9. REVENUE_SERIES — daily last 90 days
export const REVENUE_SERIES: { date: string; revenue: number; mrr: number }[] = DAU_SERIES.map((d, i) => {
  const baseRevenue = 45000 + i * 800 + Math.floor((i * 137) % 15000);
  const mrr = 1600000 + i * 12000 + Math.floor((i * 113) % 80000);
  return { date: d.date, revenue: baseRevenue, mrr };
});

// 10. REVENUE_BY_PLAN
const planRevMap: Record<string, { revenue: number; users: number }> = {
  free: { revenue: 0, users: 0 },
  monthly: { revenue: 0, users: 0 },
  quarterly: { revenue: 0, users: 0 },
  annual: { revenue: 0, users: 0 },
};
USERS.forEach(u => {
  planRevMap[u.plan].revenue += u.ltv;
  planRevMap[u.plan].users += 1;
});
const totalRev = Object.values(planRevMap).reduce((s, v) => s + v.revenue, 0);
const PLAN_COLORS: Record<string, string> = {
  free: '#4b5563',
  monthly: '#60a5fa',
  quarterly: '#10b981',
  annual: '#f59e0b',
};
export const REVENUE_BY_PLAN: { plan: string; revenue: number; users: number; pct: number; color: string }[] = Object.entries(planRevMap)
  .filter(([, v]) => v.revenue > 0)
  .map(([plan, v]) => ({
    plan: plan.charAt(0).toUpperCase() + plan.slice(1),
    revenue: v.revenue,
    users: v.users,
    pct: totalRev > 0 ? Math.round((v.revenue / totalRev) * 100) : 0,
    color: PLAN_COLORS[plan],
  }))
  .sort((a, b) => b.revenue - a.revenue);

// 11. USERS_BY_CITY
export const USERS_BY_CITY: { city: string; users: number; avgLtv: number }[] = CITIES.map(city => {
  const cityUsers = USERS.filter(u => u.city === city);
  const avgLtv = cityUsers.length > 0
    ? Math.round(cityUsers.reduce((s, u) => s + u.ltv, 0) / cityUsers.length)
    : 0;
  return { city, users: cityUsers.length, avgLtv };
}).sort((a, b) => b.users - a.users);

// ─── Summary KPI values for MetricCardV2 ─────────────────────────────────────

export const SUMMARY_KPIS = {
  wau: {
    value: WAU_SERIES[WAU_SERIES.length - 1].wau,
    prevValue: WAU_SERIES[WAU_SERIES.length - 2].wau,
    sparkline: WAU_SERIES.slice(-7).map(w => w.wau),
  },
  nsm: {
    value: NSM_SERIES[NSM_SERIES.length - 1].nsmCount,
    prevValue: NSM_SERIES[NSM_SERIES.length - 2].nsmCount,
    sparkline: NSM_SERIES.slice(-7).map(w => w.nsmCount),
  },
  cac: {
    value: Math.round(CAC_BY_CHANNEL.reduce((s, c) => s + c.cac * c.users, 0) / CAC_BY_CHANNEL.reduce((s, c) => s + c.users, 0)),
    prevValue: Math.round(CAC_BY_CHANNEL.reduce((s, c) => s + c.cac * c.users, 0) / CAC_BY_CHANNEL.reduce((s, c) => s + c.users, 0) * 0.93),
    sparkline: CAC_TREND.slice(-7).map(t => t.blended),
  },
  conversion: {
    value: FUNNEL_STAGES[FUNNEL_STAGES.length - 1].pct,
    prevValue: FUNNEL_STAGES[FUNNEL_STAGES.length - 1].pct - 1.2,
    sparkline: FUNNEL_CONV_TREND.slice(-7).map(f => f.trial2paid),
  },
  revenue: {
    value: REVENUE_SERIES[REVENUE_SERIES.length - 1].mrr,
    prevValue: REVENUE_SERIES[REVENUE_SERIES.length - 8]?.mrr ?? REVENUE_SERIES[0].mrr,
    sparkline: REVENUE_SERIES.filter((_, i) => i % 13 === 0).slice(-7).map(r => r.mrr),
  },
};
