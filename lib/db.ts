import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'cult.db');

// Singleton — reused across hot-reloads in dev
const globalForDb = global as typeof global & { __cultDb?: Database.Database };

function createDb(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
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

    CREATE TABLE IF NOT EXISTS events (
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
      properties      TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_events_user_id    ON events(user_id);
    CREATE INDEX IF NOT EXISTS idx_events_type       ON events(type);
    CREATE INDEX IF NOT EXISTS idx_events_timestamp  ON events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_events_utm_source ON events(utm_source);
    CREATE INDEX IF NOT EXISTS idx_events_device     ON events(device_type);
    CREATE INDEX IF NOT EXISTS idx_events_city       ON events(city);
    CREATE INDEX IF NOT EXISTS idx_users_channel     ON users(channel);
    CREATE INDEX IF NOT EXISTS idx_users_plan        ON users(plan);
    CREATE INDEX IF NOT EXISTS idx_users_status      ON users(status);
  `);

  return db;
}

const db: Database.Database = globalForDb.__cultDb ?? createDb();
if (process.env.NODE_ENV !== 'production') globalForDb.__cultDb = db;

export default db;
export const SCALE = 25; // 2,000 DB users → 500K displayed
