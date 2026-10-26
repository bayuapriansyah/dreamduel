// SQLite via Node's built-in driver: no native build step, one file on disk.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";

// Lives outside the project tree by default: a database inside it makes the dev
// server's file watcher rebuild on every write.
const DB_PATH = resolve(/* turbopackIgnore: true */ process.env.DREAMDUEL_DB ?? join(homedir(), ".dreamduel", "dreamduel.db"));

const SCHEMA = `
CREATE TABLE IF NOT EXISTS duels (
  id            TEXT PRIMARY KEY,
  market        TEXT NOT NULL,
  duration_min  INTEGER NOT NULL,
  cap_usd       REAL NOT NULL,
  creator       TEXT NOT NULL,
  opponent      TEXT,
  vs_bot        INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  start_at      INTEGER,
  end_at        INTEGER,
  start_eq_a    REAL, start_eq_b REAL,
  end_eq_a      REAL, end_eq_b   REAL,
  flows_a       REAL NOT NULL DEFAULT 0, flows_b REAL NOT NULL DEFAULT 0,
  traded_a      INTEGER NOT NULL DEFAULT 0, traded_b INTEGER NOT NULL DEFAULT 0,
  fouled_a      INTEGER NOT NULL DEFAULT 0, fouled_b INTEGER NOT NULL DEFAULT 0,
  outcome       TEXT,
  settled_at    INTEGER,
  start_block   TEXT,
  end_block     TEXT
);
CREATE INDEX IF NOT EXISTS duels_status ON duels(status);
CREATE TABLE IF NOT EXISTS duel_events (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  duel_id  TEXT NOT NULL,
  ts       INTEGER NOT NULL,
  kind     TEXT NOT NULL,
  side     TEXT,
  text     TEXT NOT NULL,
  tx_hash  TEXT
);
CREATE INDEX IF NOT EXISTS duel_events_duel ON duel_events(duel_id, id);
CREATE TABLE IF NOT EXISTS duel_samples (
  duel_id  TEXT NOT NULL,
  ts       INTEGER NOT NULL,
  ret_a    REAL NOT NULL,
  ret_b    REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS duel_samples_duel ON duel_samples(duel_id, ts);
`;

const g = globalThis as unknown as { __dreamduelDb?: DatabaseSync };

export function db(): DatabaseSync {
  if (!g.__dreamduelDb) {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    const conn = new DatabaseSync(DB_PATH);
    conn.exec("PRAGMA journal_mode = WAL;");
    conn.exec(SCHEMA);
    g.__dreamduelDb = conn;
  }
  return g.__dreamduelDb;
}
