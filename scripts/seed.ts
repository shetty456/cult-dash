/**
 * Seed script — 4,000 users × 25 = 100K sign-ups displayed over 12 months
 * Run: npm run seed
 * Growth curve: sign-up rate doubles from Apr 2025 → Apr 2026
 */
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'cult.db');

// ── RNG ────────────────────────────────────────────────────────────────────
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

function pick<T>(arr: T[]): T { return arr[Math.floor(rng() * arr.length)]; }
function pickW<T>(arr: T[], weights: number[]): T {
  const r = rng(); let cum = 0;
  for (let i = 0; i < arr.length; i++) { cum += weights[i]; if (r < cum) return arr[i]; }
  return arr[arr.length - 1];
}
function rInt(min: number, max: number) { return min + Math.floor(rng() * (max - min + 1)); }

// ── Reference data ─────────────────────────────────────────────────────────
const ANCHOR = new Date('2026-04-17T23:59:59Z').getTime();
const YEAR_MS = 365 * 86400000;

const MALE_FIRST   = ['Aarav','Arjun','Vivek','Rohan','Kiran','Rahul','Suresh','Amit','Vikram','Deepak','Nikhil','Sanjay','Rajesh','Aditya','Prateek','Gaurav','Manish','Abhishek','Ravi','Siddharth','Harish','Pavan','Naveen','Satish','Vinay','Manoj','Dinesh','Ajay','Prakash','Sunil'];
const FEMALE_FIRST = ['Priya','Ananya','Deepika','Kavya','Shreya','Pooja','Meera','Neha','Divya','Sneha','Sunita','Lakshmi','Rekha','Radha','Nandini','Swathi','Bhavana','Pallavi','Archana','Geeta','Varsha','Rashmi','Usha','Lata','Anjali','Smita','Vandana','Poonam','Preeti','Sonal'];
const LAST_NAMES   = ['Sharma','Gupta','Singh','Kumar','Patel','Shah','Mehta','Joshi','Reddy','Nair','Iyer','Pillai','Rao','Verma','Chaudhary','Mishra','Dubey','Pandey','Tiwari','Sinha','Agarwal','Bansal','Bhatia','Chopra','Malhotra','Kapoor','Saxena','Trivedi','Bose','Das'];

const CITY_STATE: Record<string, string> = {
  'Mumbai': 'Maharashtra', 'Delhi': 'Delhi', 'Bengaluru': 'Karnataka',
  'Hyderabad': 'Telangana', 'Chennai': 'Tamil Nadu', 'Pune': 'Maharashtra',
  'Kolkata': 'West Bengal', 'Ahmedabad': 'Gujarat',
};
const CITIES = Object.keys(CITY_STATE);
const CITY_W = [0.22, 0.20, 0.18, 0.12, 0.10, 0.08, 0.06, 0.04];

const CHANNELS   = ['Paid Digital', 'Organic', 'Referrals', 'Brand/ATL', 'Corporate'];
const CHANNEL_W  = [0.30, 0.25, 0.25, 0.10, 0.10];

const PLANS      = ['free', 'monthly', 'quarterly', 'annual'];
// 8% paid → 320 DB users × 25 = 8K paid subs displayed (realistic for 100K sign-ups)
const PLAN_W     = [0.92, 0.04, 0.025, 0.015];
const PLAN_LTV: Record<string, number> = { free: 0, monthly: 399, quarterly: 999, annual: 2999 };

const WORKOUT_TYPES = ['Yoga','HIIT','Strength','Cycling','Zumba','Boxing','Running','Pilates'];
const WORKOUT_W     = [0.22, 0.18, 0.16, 0.12, 0.10, 0.08, 0.08, 0.06];

const DEVICES    = ['mobile', 'tablet', 'desktop'];
const DEVICE_W   = [0.65, 0.10, 0.25];
const DEVICE_OS: Record<string, string[]> = {
  mobile: ['Android', 'iOS'], tablet: ['Android', 'iOS'], desktop: ['Web'],
};

const CHANNEL_UTM: Record<string, { sources: string[]; mediums: string[]; campaigns: string[]; contents: string[] }> = {
  'Paid Digital': {
    sources:   ['google', 'facebook', 'instagram'],
    mediums:   ['cpc'],
    campaigns: ['fitness_q2_2025', 'summer_body_2025', 'new_year_2026', 'fitness_q1_2026', 'summer_2026'],
    contents:  ['banner_v1', 'banner_v2', 'story_ad', 'feed_ad', 'search_ad'],
  },
  'Organic': {
    sources:   ['organic'],
    mediums:   ['organic'],
    campaigns: ['(none)'],
    contents:  ['(none)'],
  },
  'Referrals': {
    sources:   ['referral'],
    mediums:   ['referral'],
    campaigns: ['referral_program_q2', 'referral_program_q3', 'referral_q4', 'referral_q1_2026'],
    contents:  ['share_link', 'whatsapp', 'email_share'],
  },
  'Brand/ATL': {
    sources:   ['youtube', 'google', 'hotstar'],
    mediums:   ['video', 'cpc', 'display'],
    campaigns: ['brand_awareness_2025', 'cult_life_q3', 'ipl_2026', 'cult_brand_q1_2026'],
    contents:  ['video_15s', 'video_30s', 'banner_brand'],
  },
  'Corporate': {
    sources:   ['email'],
    mediums:   ['email'],
    campaigns: ['corporate_wellness_q2', 'b2b_q3_2025', 'corporate_q4', 'b2b_q1_2026'],
    contents:  ['newsletter', 'targeted_email', 'welcome_series'],
  },
};

function isoOffset(msAgo: number): string {
  return new Date(ANCHOR - msAgo).toISOString();
}
function jsonProps(obj: Record<string, unknown>): string {
  return JSON.stringify(obj);
}

// ── Growth-weighted join-date distribution ─────────────────────────────────
// Users are skewed toward recent months: the most recent 3 months account for
// ~40% of sign-ups, simulating a growing app doubling YoY.
function growthJoinMs(): number {
  const r = rng();
  // Blend: 40% recent (last 90d), 35% mid (90-270d), 25% early (270-365d)
  if (r < 0.40) return Math.floor(rng() * 90  * 86400000);
  if (r < 0.75) return Math.floor(90 * 86400000  + rng() * 180 * 86400000);
  return Math.floor(270 * 86400000 + rng() * 95 * 86400000);
}

// ── Open / recreate DB ─────────────────────────────────────────────────────
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF');

db.exec(`
  DROP TABLE IF EXISTS events;
  DROP TABLE IF EXISTS users;

  CREATE TABLE users (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    city            TEXT NOT NULL,
    state           TEXT NOT NULL,
    age             INTEGER NOT NULL,
    gender          TEXT NOT NULL,
    plan            TEXT NOT NULL,
    channel         TEXT NOT NULL,
    utm_source      TEXT,
    utm_medium      TEXT,
    utm_campaign    TEXT,
    utm_content     TEXT,
    device_type     TEXT NOT NULL,
    os              TEXT NOT NULL,
    joined_at       TEXT NOT NULL,
    last_active     TEXT NOT NULL,
    workouts_completed INTEGER NOT NULL DEFAULT 0,
    status          TEXT NOT NULL,
    ltv             INTEGER NOT NULL DEFAULT 0,
    nsm_reached     INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE events (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    type            TEXT NOT NULL,
    timestamp       TEXT NOT NULL,
    utm_source      TEXT,
    utm_medium      TEXT,
    utm_campaign    TEXT,
    utm_content     TEXT,
    device_type     TEXT,
    os              TEXT,
    session_id      TEXT,
    session_number  INTEGER,
    city            TEXT,
    state           TEXT,
    properties      TEXT
  );

  CREATE INDEX idx_events_user_id    ON events(user_id);
  CREATE INDEX idx_events_type       ON events(type);
  CREATE INDEX idx_events_timestamp  ON events(timestamp);
  CREATE INDEX idx_events_utm_source ON events(utm_source);
  CREATE INDEX idx_events_device     ON events(device_type);
  CREATE INDEX idx_events_city       ON events(city);
  CREATE INDEX idx_users_channel     ON users(channel);
  CREATE INDEX idx_users_plan        ON users(plan);
  CREATE INDEX idx_users_status      ON users(status);
`);

const insertUser = db.prepare(`
  INSERT INTO users VALUES (
    @id,@name,@city,@state,@age,@gender,@plan,@channel,
    @utm_source,@utm_medium,@utm_campaign,@utm_content,
    @device_type,@os,@joined_at,@last_active,
    @workouts_completed,@status,@ltv,@nsm_reached
  )
`);
const insertEvent = db.prepare(`
  INSERT INTO events VALUES (
    @id,@user_id,@type,@timestamp,
    @utm_source,@utm_medium,@utm_campaign,@utm_content,
    @device_type,@os,@session_id,@session_number,
    @city,@state,@properties
  )
`);

// ── Generate users & events ────────────────────────────────────────────────
const TOTAL_USERS = 4000;
let eid = 0;

const seedAll = db.transaction(() => {
  for (let i = 0; i < TOTAL_USERS; i++) {
    const uid = `u${String(i + 1).padStart(4, '0')}`;

    const gender      = rng() < 0.55 ? 'M' : 'F';
    const firstName   = gender === 'M' ? pick(MALE_FIRST) : pick(FEMALE_FIRST);
    const city        = pickW(CITIES, CITY_W);
    const state       = CITY_STATE[city];
    const channel     = pickW(CHANNELS, CHANNEL_W);
    const plan        = pickW(PLANS, PLAN_W);
    const utmData     = CHANNEL_UTM[channel];
    const utm_source  = pick(utmData.sources);
    const utm_medium  = pick(utmData.mediums);
    const utm_campaign = pick(utmData.campaigns);
    const utm_content = pick(utmData.contents);
    const device_type = pickW(DEVICES, DEVICE_W);
    const os          = pick(DEVICE_OS[device_type]);
    const ageBucket   = rng();
    const age         = ageBucket < 0.15 ? rInt(18, 22)
      : ageBucket < 0.55 ? rInt(23, 30)
      : ageBucket < 0.82 ? rInt(31, 38)
      : rInt(39, 55);

    // Growth-skewed join date over 12 months
    const joinedMsAgo = growthJoinMs();
    const joined_at   = isoOffset(joinedMsAgo);
    const joinedTs    = ANCHOR - joinedMsAgo;
    const daysSinceJoin   = joinedMsAgo / 86400000;
    const availableWindow = ANCHOR - joinedTs; // ms since sign-up

    // Last active: within the window since joining
    const lastActiveMsAgo = Math.floor(rng() * Math.min(joinedMsAgo, YEAR_MS));
    const last_active      = isoOffset(lastActiveMsAgo);
    const daysSinceActive  = lastActiveMsAgo / 86400000;

    // Status driven by recency — older users more likely churned
    const churnProb = Math.min(0.6, daysSinceJoin / 365 * 0.5);
    const status = daysSinceActive < 7 ? 'active'
      : daysSinceActive < 21 ? 'at-risk'
      : rng() < churnProb ? 'churned' : 'at-risk';

    // Workout count: paid users work out more; older users have more time
    const maxWorkouts = Math.floor(daysSinceJoin / 2);
    const workouts_completed = plan === 'free'
      ? rInt(0, Math.min(6, maxWorkouts))
      : rInt(2, Math.min(maxWorkouts + 2, 120));

    // NSM: ≥12 workouts and active
    const nsm_reached = workouts_completed >= 12 && status === 'active' ? 1 : 0;

    const months = Math.max(1, daysSinceJoin / 30);
    const ltv = plan === 'free' ? 0
      : Math.round(PLAN_LTV[plan] * (0.8 + rng() * 0.4) * Math.min(months, 12));

    insertUser.run({
      id: uid, name: `${firstName} ${pick(LAST_NAMES)}`, city, state,
      age, gender, plan, channel,
      utm_source, utm_medium, utm_campaign, utm_content,
      device_type, os, joined_at, last_active,
      workouts_completed, status, ltv, nsm_reached,
    });

    // ── Event helpers ───────────────────────────────────────────────────
    function evt(type: string, msAgo: number, sessNum: number, props: Record<string, unknown> = {}) {
      // Clamp to the valid window (after join, before anchor)
      const clampedMs = Math.max(0, Math.min(msAgo, joinedMsAgo));
      insertEvent.run({
        id: `e${String(++eid).padStart(7, '0')}`,
        user_id: uid, type,
        timestamp: isoOffset(clampedMs),
        utm_source, utm_medium, utm_campaign, utm_content,
        device_type, os,
        session_id: `s_${uid}_${sessNum}`,
        session_number: sessNum,
        city, state,
        properties: jsonProps(props),
      });
    }

    // app_install (30–240 min before sign_up)
    const installOffset = rInt(30, 240) * 60000;
    evt('app_install', joinedMsAgo + installOffset, 0, {
      store: os === 'iOS' ? 'App Store' : os === 'Android' ? 'Play Store' : 'Web',
      app_version: pick(['3.2.1', '3.3.0', '3.3.1', '3.4.0', '3.5.0']),
      install_source: channel,
    });

    // onboarding_started
    const obStartOffset = installOffset - rInt(2, 8) * 60000;
    evt('onboarding_started', joinedMsAgo + obStartOffset, 0, {
      screen: 'goal_selection', goals_shown: rInt(4, 7),
    });

    // onboarding_completed
    const obDoneOffset = obStartOffset - rInt(5, 15) * 60000;
    evt('onboarding_completed', joinedMsAgo + obDoneOffset, 0, {
      goals_selected: rInt(1, 3),
      fitness_level: pick(['beginner', 'intermediate', 'advanced']),
      preferred_time: pick(['morning', 'afternoon', 'evening']),
      onboarding_duration_sec: rInt(120, 480),
    });

    // sign_up (at joined_at)
    evt('sign_up', joinedMsAgo, 1, {
      method: pick(['email', 'google', 'phone', 'facebook']),
      referral_code: channel === 'Referrals' ? `REF${rInt(1000, 9999)}` : null,
      plan_at_signup: 'free',
    });

    // page_views (3–12)
    const pvCount = rInt(3, 12);
    for (let p = 0; p < pvCount; p++) {
      evt('page_view', Math.floor(rng() * availableWindow), Math.floor(p / 3) + 1, {
        page: pick(['/home', '/classes', '/pricing', '/trainers', '/about', '/app']),
        referrer: utm_source === 'organic' ? 'google' : utm_source,
        time_on_page: rInt(15, 180),
      });
    }

    // app_open sessions (4–20)
    const sessionCount = rInt(4, 20);
    for (let s = 0; s < sessionCount; s++) {
      evt('app_open', Math.floor(rng() * availableWindow), s + 1, {
        screen: pick(['home', 'workout', 'profile', 'explore', 'challenges']),
        session_duration: rInt(60, 900),
        connection: pick(['WiFi', '4G', '5G']),
      });
    }

    // workout_completed events — spread naturally across the available window
    for (let w = 0; w < workouts_completed; w++) {
      const msAgo = Math.floor(rng() * availableWindow);
      const wType = pickW(WORKOUT_TYPES, WORKOUT_W);
      const duration = pick([30, 45, 60, 75]);
      evt('workout_started', msAgo + 2000, Math.floor(w / 2) + 1, {
        workout_type: wType, duration_min: duration,
        trainer: `Trainer ${rInt(1, 30)}`,
        class_id: `cls_${rInt(100, 999)}`,
      });
      evt('workout_completed', msAgo, Math.floor(w / 2) + 1, {
        workout_type: wType, duration_min: duration,
        calories_burned: rInt(duration * 4, duration * 8),
        heart_rate_avg: rInt(110, 160),
        rating: rInt(3, 5),
      });
    }

    // trial_booked (~32% of users)
    const hasTrial = rng() < 0.32;
    let trialMs = 0;
    let trialed = false;
    if (hasTrial) {
      const daysAfterJoin = rInt(1, 14) * 86400000;
      trialMs = Math.max(0, joinedMsAgo - daysAfterJoin);
      evt('trial_booked', trialMs + 3600000, 1, {
        workout_type: pickW(WORKOUT_TYPES, WORKOUT_W),
        trainer: `Trainer ${rInt(1, 30)}`,
        slot: `${rInt(6, 20)}:00`,
        trial_id: `tr_${uid}`,
      });
      if (rng() < 0.55) {
        trialed = true;
        evt('trial_completed', trialMs, 1, {
          workout_type: pickW(WORKOUT_TYPES, WORKOUT_W),
          nps_score: rInt(6, 10),
          would_subscribe: rng() < 0.65 ? 'yes' : 'no',
        });
      }
    }

    // class_booked (38% of trial users)
    if (hasTrial && rng() < 0.38) {
      evt('class_booked', Math.floor(rng() * availableWindow), rInt(1, sessionCount), {
        class_type: pickW(WORKOUT_TYPES, WORKOUT_W),
        trainer: `Trainer ${rInt(1, 30)}`,
        slot: `${rInt(6, 20)}:00`,
        mode: pick(['in-studio', 'live-online', 'on-demand']),
        price: pick([0, 99, 149, 199]),
      });
    }

    // subscription_purchased (all non-free)
    if (plan !== 'free') {
      const purchaseMs = Math.max(0, joinedMsAgo - rInt(1, 5) * 86400000);
      evt('subscription_purchased', purchaseMs, 1, {
        plan, amount: PLAN_LTV[plan],
        payment_method: pick(['UPI', 'Credit Card', 'Debit Card', 'Net Banking']),
        coupon: rng() < 0.2 ? pick(['CULT20', 'FIRST50', 'CORP10', 'ANNUAL30']) : null,
      });
      // Renewal events for long-tenured paid users (simulate monthly renewals)
      if (plan === 'monthly' && daysSinceJoin > 60) {
        const renewals = Math.floor(daysSinceJoin / 30) - 1;
        for (let r = 0; r < Math.min(renewals, 11); r++) {
          const renewMs = Math.max(0, joinedMsAgo - (r + 1) * 30 * 86400000);
          if (renewMs > 0) {
            evt('subscription_purchased', renewMs, 1, {
              plan, amount: PLAN_LTV[plan], is_renewal: true,
              payment_method: pick(['UPI', 'Credit Card', 'Debit Card']),
              coupon: null,
            });
          }
        }
      }
    }

    // subscription_cancelled (churned paid users)
    if (status === 'churned' && plan !== 'free') {
      evt('subscription_cancelled', Math.floor(rng() * 21 * 86400000), 1, {
        plan,
        reason: pick(['too_expensive', 'not_enough_time', 'moved_city', 'found_alternative', 'personal_reasons']),
        feedback: pick(['price', 'variety', 'timing', 'trainer', 'app_experience']),
      });
    }

    // meal_logged (45% of paid users)
    if (plan !== 'free' && rng() < 0.45) {
      const mealCount = rInt(1, 15);
      for (let m = 0; m < mealCount; m++) {
        evt('meal_logged', Math.floor(rng() * availableWindow), rInt(1, sessionCount), {
          meal_type: pick(['breakfast', 'lunch', 'dinner', 'snack']),
          calories: rInt(200, 800), protein_g: rInt(10, 60), items: rInt(1, 5),
        });
      }
    }

    // referral_sent (NSM users, ~45%)
    if (nsm_reached && rng() < 0.45) {
      evt('referral_sent', Math.floor(rng() * availableWindow), 1, {
        referral_code: `REF${uid.toUpperCase()}`,
        channel: pick(['whatsapp', 'sms', 'email', 'instagram']),
        referred_name: `${pick(MALE_FIRST)} ${pick(LAST_NAMES)}`,
      });
    }

    // ── Experiment assignments (match updated experiment IDs) ───────────────
    const xVariant = i % 2 === 0 ? 'control' : 'treatment';

    // exp_same_day_nudge — all users who joined in last 14 days (running Apr 4)
    if (daysSinceJoin < 14) {
      evt('experiment_assigned', joinedMsAgo, 1, {
        experiment_id: 'exp_same_day_nudge', variant: xVariant,
      });
    }

    // exp_streak_vs_next_class — users with ≥1 workout who joined last 10 days (running Apr 8)
    if (workouts_completed >= 1 && daysSinceJoin < 10) {
      evt('experiment_assigned', Math.max(0, joinedMsAgo - 86400000), 1, {
        experiment_id: 'exp_streak_vs_next_class', variant: xVariant,
      });
    }

    // exp_personalised_reco — users who joined 3–11 days ago (running Apr 11)
    if (daysSinceJoin >= 3 && daysSinceJoin < 11) {
      evt('experiment_assigned', Math.max(0, joinedMsAgo - 3 * 86400000), 1, {
        experiment_id: 'exp_personalised_reco', variant: xVariant,
      });
    }

    // exp_guided_slot_booking — users who joined 17–31 days ago (concluded Apr 1)
    if (daysSinceJoin >= 17 && daysSinceJoin <= 31) {
      evt('experiment_assigned', joinedMsAgo, 0, {
        experiment_id: 'exp_guided_slot_booking', variant: xVariant,
      });
    }

    // exp_trial_length — trial users who joined 17–21 days ago (running Mar 27)
    if (hasTrial && daysSinceJoin >= 17 && daysSinceJoin <= 55) {
      evt('experiment_assigned', trialMs + 3600000, 1, {
        experiment_id: 'exp_trial_length', variant: xVariant,
      });
    }
  }
});

console.log('⏳  Seeding database…');
seedAll();
db.close();

const verify = new Database(DB_PATH);
const userCount  = (verify.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
const eventCount = (verify.prepare('SELECT COUNT(*) as c FROM events').get() as { c: number }).c;
const trialCount = (verify.prepare("SELECT COUNT(DISTINCT user_id) as c FROM events WHERE type='trial_booked'").get() as { c: number }).c;
const paidCount  = (verify.prepare("SELECT COUNT(*) as c FROM users WHERE plan != 'free'").get() as { c: number }).c;
const nsmCount   = (verify.prepare("SELECT COUNT(*) as c FROM users WHERE nsm_reached = 1").get() as { c: number }).c;
const dateRange  = (verify.prepare("SELECT MIN(timestamp) as min_t, MAX(timestamp) as max_t FROM events WHERE type='sign_up'").get() as { min_t: string; max_t: string });
verify.close();

console.log(`\n✅  Seeding complete`);
console.log(`   Users:            ${userCount.toLocaleString()} (×25 = ${(userCount * 25).toLocaleString()} displayed)`);
console.log(`   Events:           ${eventCount.toLocaleString()}`);
console.log(`   Sign-up range:    ${dateRange.min_t?.slice(0,10)} → ${dateRange.max_t?.slice(0,10)}`);
console.log(`   Paid subs:        ${paidCount} (${(paidCount * 25).toLocaleString()} displayed)`);
console.log(`   Trial booked:     ${trialCount} (${(trialCount * 25).toLocaleString()} displayed)`);
console.log(`   NSM reached:      ${nsmCount} (${(nsmCount * 25).toLocaleString()} displayed)`);
