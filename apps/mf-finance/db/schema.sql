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

-- ===== 後続モジュール（予算実績 / freee統合 / 確定申告） =====

-- カテゴリ別の月次予算（全月共通の1値。月別予算が要るときに拡張）。
CREATE TABLE IF NOT EXISTS budgets (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  category_major TEXT NOT NULL UNIQUE,
  amount         INTEGER NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- freee からの月次事業PL（薄切り ingest: data/freee-pl.json → load-freee.mjs）。
CREATE TABLE IF NOT EXISTS business_pl (
  month       TEXT PRIMARY KEY, -- 'YYYY-MM'
  revenue     INTEGER,
  expense     INTEGER,
  profit      INTEGER,
  source      TEXT NOT NULL DEFAULT 'freee',
  captured_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- 確定申告: カテゴリ→事業按分・青色申告科目のマッピング。
-- category_middle='' は大項目全体に適用（NULL だと UNIQUE が効かないため '' を既定に）。
CREATE TABLE IF NOT EXISTS tax_mappings (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  category_major  TEXT NOT NULL,
  category_middle TEXT NOT NULL DEFAULT '',
  business_ratio  REAL NOT NULL DEFAULT 0 CHECK (business_ratio >= 0 AND business_ratio <= 1),
  aoiro_item      TEXT,
  note            TEXT,
  UNIQUE (category_major, category_middle)
);

-- ===== Optimizer（データ・スチュワード） =====

-- 提案キュー（下層シグナル / 上層LLM 双方が投入、人間が承認/却下）。
CREATE TABLE IF NOT EXISTS optimizer_proposals (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  kind            TEXT NOT NULL CHECK (kind IN (
                    'classify_unknown','fixed_vs_variable','relabel',
                    'transfer_pair','rule_suggest','rule_conflict',
                    'label_add','category_regroup')),
  source          TEXT NOT NULL CHECK (source IN ('signal','llm')),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                    'pending','accepted','rejected','dismissed','superseded')),
  title           TEXT NOT NULL,
  rationale       TEXT,
  confidence      TEXT NOT NULL DEFAULT 'med' CHECK (confidence IN ('high','med','low')),
  target_ref      TEXT, -- JSON
  proposed_action TEXT, -- JSON
  dedup_key       TEXT,
  decided_at      TEXT,
  decided_note    TEXT
);
CREATE INDEX IF NOT EXISTS idx_proposals_status_kind ON optimizer_proposals (status, kind);
CREATE INDEX IF NOT EXISTS idx_proposals_dedup ON optimizer_proposals (dedup_key);

-- 取引単位の上書き（振替ペア・一点修正）。reload 後も apply-overrides で再現。
CREATE TABLE IF NOT EXISTS txn_overrides (
  txn_id           TEXT PRIMARY KEY, -- transactions.id（MF ID は安定）
  is_transfer      INTEGER CHECK (is_transfer IN (0,1)),
  is_internal_move INTEGER CHECK (is_internal_move IN (0,1)),
  classification   TEXT,
  category_major   TEXT,
  category_middle  TEXT,
  note             TEXT,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- 集計の括り直し（大項目→表示グループ）。/categories /budget /tax が ?by=group でロールアップ。
CREATE TABLE IF NOT EXISTS category_groups (
  category_major TEXT PRIMARY KEY,
  group_name     TEXT NOT NULL,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- optimize パスの作業ログ。
CREATE TABLE IF NOT EXISTS optimizer_runs (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  ran_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  ran_by   TEXT NOT NULL CHECK (ran_by IN ('signal','llm')),
  signals  INTEGER,
  proposed INTEGER,
  decided  INTEGER,
  note     TEXT
);

-- ===== お金レーダー / 資金繰り =====

-- 口座別残高（現在値・1口座1行・最新）。MF /bs から投入 or 手入力。
CREATE TABLE IF NOT EXISTS account_balances (
  account    TEXT PRIMARY KEY,
  kind       TEXT NOT NULL DEFAULT 'other'
             CHECK (kind IN ('bank','card','emoney','cash','crypto','other')),
  balance    INTEGER NOT NULL,
  as_of      TEXT, -- 残高の基準日 'YYYY-MM-DD'
  source     TEXT NOT NULL DEFAULT 'mf' CHECK (source IN ('mf','manual')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- 特定日の単発予定（いつ・いくら入る/引き落とされる）。毎月定期は recurring_items 側。
CREATE TABLE IF NOT EXISTS scheduled_cashflow (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  kind           TEXT NOT NULL CHECK (kind IN ('income','expense')),
  name           TEXT NOT NULL,
  amount         INTEGER NOT NULL, -- 正の magnitude
  scheduled_date TEXT NOT NULL,    -- 'YYYY-MM-DD'
  account        TEXT,
  note           TEXT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_scheduled_date ON scheduled_cashflow (scheduled_date);
