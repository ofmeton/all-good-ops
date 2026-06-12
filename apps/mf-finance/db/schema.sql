-- db/schema.sql — SQLite 版 mf_finance スキーマ（ローカル無料運用）
-- supabase/migrations/0001_mf_finance_schema.sql の SQLite 移植。
-- 型移植: boolean→INTEGER CHECK(0,1) / date→TEXT('YYYY-MM-DD') /
--         timestamptz→TEXT(ISO8601 UTC) / bigint identity→INTEGER PK AUTOINCREMENT /
--         jsonb→TEXT(JSON文字列) / numeric→REAL。
-- DBファイル自体が名前空間のため mf_finance. 接頭辞は外す。RLS は不要（ローカルファイル）。

CREATE TABLE IF NOT EXISTS transactions (
  id               TEXT PRIMARY KEY,
  included         INTEGER NOT NULL DEFAULT 1 CHECK (included IN (0, 1)),
  date             TEXT NOT NULL,
  description      TEXT,
  amount           INTEGER NOT NULL,
  account          TEXT,
  category_major   TEXT,
  category_middle  TEXT,
  memo             TEXT,
  is_transfer      INTEGER NOT NULL DEFAULT 0 CHECK (is_transfer IN (0, 1)),
  is_internal_move INTEGER NOT NULL DEFAULT 0 CHECK (is_internal_move IN (0, 1)),
  classification   TEXT,
  source_type      TEXT,
  llm_labeled      INTEGER NOT NULL DEFAULT 0 CHECK (llm_labeled IN (0, 1)),
  source           TEXT NOT NULL DEFAULT 'mf_cf',
  ingested_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date);
CREATE INDEX IF NOT EXISTS idx_transactions_classification ON transactions (classification);

CREATE TABLE IF NOT EXISTS recurring_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  kind          TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
  name          TEXT NOT NULL,
  match_pattern TEXT,
  amount        INTEGER NOT NULL,
  day           INTEGER,
  source_type   TEXT,
  active        INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  confirmed     TEXT NOT NULL DEFAULT 'auto' CHECK (confirmed IN ('auto', 'user')),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS account_status (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  account         TEXT NOT NULL,
  status          TEXT,
  last_fetched_at TEXT,
  captured_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS asset_history (
  date                TEXT PRIMARY KEY,
  total               INTEGER,
  deposit_cash_crypto INTEGER,
  points              INTEGER
);

CREATE TABLE IF NOT EXISTS liability_snapshots (
  snapshot_date TEXT PRIMARY KEY,
  total         INTEGER,
  breakdown     TEXT, -- JSON 文字列
  captured_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS manual_liabilities (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  lender          TEXT,
  balance         INTEGER,
  rate            REAL,
  monthly_payment INTEGER,
  as_of_date      TEXT
);

CREATE TABLE IF NOT EXISTS category_rules (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern         TEXT NOT NULL,
  match_type      TEXT,
  category_major  TEXT,
  category_middle TEXT,
  classification  TEXT,
  source_type     TEXT,
  source          TEXT NOT NULL DEFAULT 'manual',
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
