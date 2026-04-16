/**
 * Seed script — generates 2,000 Indian fitness users + ~100K events into cult.db
 * Run: npm run seed
 * Scale factor: 25 (2K users × 25 = 50K sign-ups displayed, 500K visitors)
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
const ANCHOR = new Date('2026-04-11T14:47:00Z').getTime();

const MALE_FIRST = ['Aarav','Arjun','Vivek','Rohan','Kiran','Rahul','Suresh','Amit','Vikram','Deepak','Nikhil','Sanjay','Rajesh','Aditya','Prateek','Gaurav','Manish','Abhishek','Ravi','Siddharth','Harish','Pavan','Naveen','Satish','Vinay','Manoj','Dinesh','Ajay','Prakash','Sunil'];
const FEMALE_FIRST = ['Priya','Ananya','Deepika','Kavya','Shreya','Pooja','Meera','Neha','Divya','Sneha','Sunita','Lakshmi','Rekha','Radha','Nandini','Swathi','Bhavana','Pallavi','Archana','Geeta','Varsha','Rashmi','Usha','Lata','Anjali','Smita','Vandana','Poonam','Preeti','Sonal'];
const LAST_NAMES = ['Sharma','Gupta','Singh','Kumar','Patel','Shah','Mehta','Joshi','Reddy','Nair','Iyer','Pillai','Rao','Verma','Chaudhary','Mishra','Dubey','Pandey','Tiwari','Sinha','Agarwal','Bansal','Bhatia','Chopra','Malhotra','Kapoor','Saxena','Trivedi','Bose','Das'];

const CITY_STATE: Record<string, string> = {
  'Mumbai': 'Maharashtra', 'Delhi': 'Delhi', 'Bengaluru': 'Karnataka',
  'Hyderabad': 'Telangana', 'Chennai': 'Tamil Nadu', 'Pune': 'Maharashtra',
  'Kolkata': 'West Bengal', 'Ahmedabad': 'Gujarat',
};
const CITIES = Object.keys(CITY_STATE);
const CITY_W = [0.22, 0.20, 0.18, 0.12, 0.10, 0.08, 0.06, 0.04];

const CHANNELS = ['Paid Digital', 'Organic', 'Referrals', 'Brand/ATL', 'Corporate'];
const CHANNEL_W = [0.30, 0.25, 0.25, 0.10, 0.10];

const PLANS = ['free', 'monthly', 'quarterly', 'annual'];
const PLAN_W = [0.94, 0.030, 0.020, 0.010]; // ~6% paid → 120 DB users × 25 = 3K displayed
const PLAN_LTV: Record<string, number> = { free: 0, monthly: 399, quarterly: 999, annual: 2999 };

const WORKOUT_TYPES = ['Yoga','HIIT','Strength','Cycling','Zumba','Boxing','Running','Pilates'];
const WORKOUT_W = [0.22, 0.18, 0.16, 0.12, 0.10, 0.08, 0.08, 0.06];

const DEVICES = ['mobile', 'tablet', 'desktop'];
const DEVICE_W = [0.65, 0.10, 0.25];
const DEVICE_OS: Record<string, string[]> = {
  mobile: ['Android', 'iOS'],
  tablet: ['Android', 'iOS'],
  desktop: ['Web'],
};

// Channel → UTM mapping
const CHANNEL_UTM: Record<string, { sources: string[]; mediums: string[]; campaigns: string[]; contents: string[] }> = {
  'Paid Digital': {
    sources: ['google', 'facebook', 'instagram'],
    mediums: ['cpc'],
    campaigns: ['fitness_2026_q1', 'summer_body', 'new_year_resolution'],
    contents: ['banner_v1', 'banner_v2', 'story_ad', 'feed_ad', 'search_ad'],
  },
  'Organic': {
    sources: ['organic'],
    mediums: ['organic'],
    campaigns: ['(none)'],
    contents: ['(none)'],
  },
  'Referrals': {
    sources: ['referral'],
    mediums: ['referral'],
    campaigns: ['referral_program'],
    contents: ['share_link', 'whatsapp', 'email_share'],
  },
  'Brand/ATL': {
    sources: ['youtube', 'google'],
    mediums: ['video', 'cpc'],
    campaigns: ['brand_awareness', 'cult_life'],
    contents: ['video_15s', 'video_30s', 'banner_brand'],
  },
  'Corporate': {
    sources: ['email'],
    mediums: ['email'],
    campaigns: ['corporate_wellness', 'b2b_q1'],
    contents: ['newsletter', 'targeted_email', 'welcome_series'],
  },
};

function isoOffset(msAgo: number): string {
  return new Date(ANCHOR - msAgo).toISOString();
}

function jsonProps(obj: Record<string, unknown>): string {
  return JSON.stringify(obj);
}

// ── Open / recreate DB ─────────────────────────────────────────────────────
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF');

// Wipe and recreate
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
const TOTAL_USERS = 2000;
let totalEvents = 0;
let eid = 0;

const seedAll = db.transaction(() => {
  for (let i = 0; i < TOTAL_USERS; i++) {
    const uid = `u${String(i + 1).padStart(4, '0')}`;
    const gender = rng() < 0.55 ? 'M' : 'F';
    const firstName = gender === 'M' ? pick(MALE_FIRST) : pick(FEMALE_FIRST);
    const lastName = pick(LAST_NAMES);
    const city = pickW(CITIES, CITY_W);
    const state = CITY_STATE[city];
    const channel = pickW(CHANNELS, CHANNEL_W);
    const plan = pickW(PLANS, PLAN_W);
    const utmData = CHANNEL_UTM[channel];
    const utm_source = pick(utmData.sources);
    const utm_medium = pick(utmData.mediums);
    const utm_campaign = pick(utmData.campaigns);
    const utm_content = pick(utmData.contents);
    const device_type = pickW(DEVICES, DEVICE_W);
    const os = pick(DEVICE_OS[device_type]);

    // Age: skewed 22–35
    const ageBucket = rng();
    const age = ageBucket < 0.15 ? rInt(18, 22)
      : ageBucket < 0.55 ? rInt(23, 30)
      : ageBucket < 0.82 ? rInt(31, 38)
      : rInt(39, 55);

    // Join date: uniform over last 90 days
    const joinedMsAgo = Math.floor(rng() * 90 * 86400000);
    const joined_at = isoOffset(joinedMsAgo);
    const joinedTs = ANCHOR - joinedMsAgo;

    // Last active
    const lastActiveMsAgo = Math.floor(rng() * Math.min(joinedMsAgo, 30 * 86400000));
    const last_active = isoOffset(lastActiveMsAgo);
    const daysSinceActive = lastActiveMsAgo / 86400000;
    const daysSinceJoin = joinedMsAgo / 86400000;

    const status = daysSinceActive < 7 ? 'active'
      : daysSinceActive < 21 ? 'at-risk'
      : 'churned';

    const maxWorkouts = Math.floor(daysSinceJoin / 2.5);
    const workouts_completed = plan === 'free'
      ? rInt(0, Math.min(4, maxWorkouts))
      : rInt(1, Math.min(maxWorkouts + 1, 60));

    const nsm_reached = workouts_completed >= 12 && status === 'active' ? 1 : 0;

    const months = Math.max(1, daysSinceJoin / 30);
    const ltv = plan === 'free' ? 0
      : Math.round(PLAN_LTV[plan] * (0.8 + rng() * 0.4) * Math.min(months, 6));

    insertUser.run({
      id: uid, name: `${firstName} ${lastName}`, city, state,
      age, gender, plan, channel,
      utm_source, utm_medium, utm_campaign, utm_content,
      device_type, os, joined_at, last_active,
      workouts_completed, status, ltv, nsm_reached,
    });

    // ── Events for this user ────────────────────────────────────────────
    function evt(type: string, msAgo: number, sessNum: number, props: Record<string, unknown> = {}) {
      const ts = new Date(Math.min(ANCHOR, joinedTs + (ANCHOR - joinedTs - msAgo))).toISOString();
      insertEvent.run({
        id: `e${String(++eid).padStart(7, '0')}`,
        user_id: uid, type,
        timestamp: ts,
        utm_source, utm_medium, utm_campaign, utm_content,
        device_type, os,
        session_id: `s_${uid}_${sessNum}`,
        session_number: sessNum,
        city, state,
        properties: jsonProps(props),
      });
      totalEvents++;
    }

    const availableWindow = ANCHOR - joinedTs; // ms since join

    // page_views (3–12)
    const pvCount = rInt(3, 12);
    for (let p = 0; p < pvCount; p++) {
      const msAgo = Math.floor(rng() * availableWindow);
      const sess = Math.floor(p / 3) + 1;
      evt('page_view', msAgo, sess, {
        page: pick(['/home', '/classes', '/pricing', '/trainers', '/about', '/app']),
        referrer: utm_source === 'organic' ? 'google' : utm_source,
        time_on_page: rInt(15, 180),
      });
    }

    // app_open sessions (4–15)
    const sessionCount = rInt(4, 15);
    for (let s = 0; s < sessionCount; s++) {
      const msAgo = Math.floor(rng() * availableWindow);
      evt('app_open', msAgo, s + 1, {
        screen: pick(['home', 'workout', 'profile', 'explore', 'challenges']),
        session_duration: rInt(60, 900),
        connection: pick(['WiFi', '4G', '5G']),
      });
    }

    // workout events
    for (let w = 0; w < workouts_completed; w++) {
      const msAgo = Math.floor(rng() * availableWindow);
      const wType = pickW(WORKOUT_TYPES, WORKOUT_W);
      const duration = pick([30, 45, 60, 75]);
      const sess = Math.floor(w / 2) + 1;
      evt('workout_started', msAgo + 1000, sess, {
        workout_type: wType, duration_min: duration,
        trainer: `Trainer ${rInt(1, 25)}`,
        class_id: `cls_${rInt(100, 999)}`,
      });
      evt('workout_completed', msAgo, sess, {
        workout_type: wType, duration_min: duration,
        calories_burned: rInt(duration * 4, duration * 8),
        heart_rate_avg: rInt(110, 160),
        rating: rInt(3, 5),
      });
    }

    // trial_booked — ~30% of users (to get 600 DB users → 15K displayed)
    const hasTrial = rng() < 0.30;
    if (hasTrial) {
      const msAgo = Math.floor(rng() * Math.min(availableWindow, 7 * 86400000));
      evt('trial_booked', msAgo + 3600000, 1, {
        workout_type: pickW(WORKOUT_TYPES, WORKOUT_W),
        trainer: `Trainer ${rInt(1, 25)}`,
        slot: `${rInt(6, 20)}:00`,
        trial_id: `tr_${uid}`,
      });

      // trial_completed — ~53% of trial_booked (to get ~320 DB → 8K displayed)
      if (rng() < 0.53) {
        evt('trial_completed', msAgo, 1, {
          workout_type: pickW(WORKOUT_TYPES, WORKOUT_W),
          nps_score: rInt(6, 10),
          would_subscribe: rng() < 0.6 ? 'yes' : 'no',
        });
      }
    }

    // subscription_purchased (all non-free)
    if (plan !== 'free') {
      const msAgo = Math.max(0, joinedMsAgo - rInt(1, 3) * 86400000 - Math.floor(rng() * 86400000));
      evt('subscription_purchased', msAgo, 1, {
        plan, amount: PLAN_LTV[plan],
        payment_method: pick(['UPI', 'Credit Card', 'Debit Card', 'Net Banking']),
        coupon: rng() < 0.2 ? pick(['CULT20', 'FIRST50', 'CORP10']) : null,
      });
    }

    // subscription_cancelled (churned users)
    if (status === 'churned' && plan !== 'free') {
      const msAgo = Math.floor(rng() * 14 * 86400000);
      evt('subscription_cancelled', msAgo, 1, {
        plan, reason: pick(['too_expensive', 'not_enough_time', 'moved_city', 'found_alternative', 'personal_reasons']),
        feedback: pick(['price', 'variety', 'timing', 'trainer', 'app_experience']),
      });
    }

    // referral_sent (NSM users, ~40%)
    if (nsm_reached && rng() < 0.40) {
      const msAgo = Math.floor(rng() * 30 * 86400000);
      evt('referral_sent', msAgo, 1, {
        referral_code: `REF${uid.toUpperCase()}`,
        channel: pick(['whatsapp', 'sms', 'email', 'instagram']),
        referred_name: `${pick(MALE_FIRST)} ${pick(LAST_NAMES)}`,
      });
    }

    // meal_logged (50% of paid users, 1–10 logs)
    if (plan !== 'free' && rng() < 0.5) {
      const mealCount = rInt(1, 10);
      for (let m = 0; m < mealCount; m++) {
        const msAgo = Math.floor(rng() * availableWindow);
        evt('meal_logged', msAgo, rInt(1, sessionCount), {
          meal_type: pick(['breakfast', 'lunch', 'dinner', 'snack']),
          calories: rInt(200, 800),
          protein_g: rInt(10, 60),
          items: rInt(1, 5),
        });
      }
    }

    // class_booked (40% of trial users)
    if (hasTrial && rng() < 0.40) {
      const msAgo = Math.floor(rng() * availableWindow);
      evt('class_booked', msAgo, rInt(1, sessionCount), {
        class_type: pickW(WORKOUT_TYPES, WORKOUT_W),
        trainer: `Trainer ${rInt(1, 25)}`,
        slot: `${rInt(6, 20)}:00`,
        mode: pick(['in-studio', 'live-online', 'on-demand']),
        price: pick([0, 99, 149, 199]),
      });
    }
  }
});

console.log('⏳  Seeding database…');
seedAll();
db.close();

// ── Verify ─────────────────────────────────────────────────────────────────
const verify = new Database(DB_PATH);
const userCount = (verify.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
const eventCount = (verify.prepare('SELECT COUNT(*) as c FROM events').get() as { c: number }).c;
const trialCount = (verify.prepare("SELECT COUNT(DISTINCT user_id) as c FROM events WHERE type='trial_booked'").get() as { c: number }).c;
const paidCount = (verify.prepare("SELECT COUNT(*) as c FROM users WHERE plan != 'free'").get() as { c: number }).c;
verify.close();

console.log(`\n✅  Seeding complete`);
console.log(`   Users:            ${userCount.toLocaleString()} (represents ${(userCount * 25).toLocaleString()} displayed)`);
console.log(`   Events:           ${eventCount.toLocaleString()}`);
console.log(`   Funnel (×25 display):`);
console.log(`     Visitors:       500,000`);
console.log(`     Sign-ups:       ${(userCount * 25).toLocaleString()}`);
console.log(`     Trial booked:   ${(trialCount * 25).toLocaleString()}`);
console.log(`     Paid subs:      ${(paidCount * 25).toLocaleString()}`);
console.log(`   DB size:          ${DB_PATH}`);
