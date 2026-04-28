-- ============================================================
-- BSA Proposal Automation - SQLite Schema
-- ============================================================
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- 媒体マスタ
CREATE TABLE IF NOT EXISTS platforms (
  prefix      TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  search_urls TEXT NOT NULL,        -- JSON array
  enabled     INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 案件マスタ
CREATE TABLE IF NOT EXISTS jobs (
  job_id                   TEXT PRIMARY KEY,
  platform_prefix          TEXT NOT NULL REFERENCES platforms(prefix),
  source_url               TEXT NOT NULL,
  detail_url               TEXT NOT NULL UNIQUE,
  title                    TEXT NOT NULL,
  description              TEXT,
  budget_text              TEXT,
  budget_min               INTEGER,
  budget_max               INTEGER,
  deadline                 TEXT,
  proposal_count           INTEGER,
  client_name              TEXT,
  client_verified          INTEGER,           -- 0/1
  client_history_count     INTEGER,
  service_category         TEXT,              -- lp/website/ad
  posted_at                TEXT,
  collected_at             TEXT NOT NULL,
  fit_score                INTEGER,
  fit_score_breakdown      TEXT,              -- JSON
  estimated_product_line   TEXT,              -- L1/L2/L3/L4
  status                   TEXT NOT NULL DEFAULT 'collected',
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_collected_at ON jobs(collected_at);
CREATE INDEX IF NOT EXISTS idx_jobs_fit_score ON jobs(fit_score DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_platform ON jobs(platform_prefix);

-- 提案文（最新版）
CREATE TABLE IF NOT EXISTS proposals (
  proposal_id      TEXT PRIMARY KEY,           -- ULID 等
  job_id           TEXT NOT NULL UNIQUE REFERENCES jobs(job_id) ON DELETE CASCADE,
  product_line     TEXT NOT NULL,              -- L1/L2/L3/L4
  price            INTEGER NOT NULL,
  delivery_days    INTEGER NOT NULL,
  body_md          TEXT NOT NULL,
  research_notes   TEXT,                       -- JSON: WebFetch / Exa の結果サマリ
  generated_at     TEXT NOT NULL,
  generated_by     TEXT NOT NULL,              -- claude-code-cli / human
  edited_at        TEXT,
  submitted_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_proposals_generated_at ON proposals(generated_at);

-- 提案文の改版履歴
CREATE TABLE IF NOT EXISTS proposal_revisions (
  revision_id      INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id      TEXT NOT NULL REFERENCES proposals(proposal_id) ON DELETE CASCADE,
  body_md          TEXT NOT NULL,
  product_line     TEXT NOT NULL,
  price            INTEGER NOT NULL,
  delivery_days    INTEGER NOT NULL,
  changed_at       TEXT NOT NULL DEFAULT (datetime('now')),
  changed_by       TEXT NOT NULL,              -- claude / human
  note             TEXT
);
CREATE INDEX IF NOT EXISTS idx_revisions_proposal ON proposal_revisions(proposal_id);

-- ステータス遷移履歴
CREATE TABLE IF NOT EXISTS status_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id      TEXT NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  changed_at  TEXT NOT NULL DEFAULT (datetime('now')),
  changed_by  TEXT NOT NULL,                   -- auto / human
  note        TEXT
);
CREATE INDEX IF NOT EXISTS idx_status_history_job ON status_history(job_id);

-- 追加生成依頼キュー
CREATE TABLE IF NOT EXISTS generation_requests (
  request_id     INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id         TEXT NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
  prompt_hint    TEXT,
  status         TEXT NOT NULL DEFAULT 'pending',     -- pending/processing/done/failed
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at   TEXT,
  error_message  TEXT
);
CREATE INDEX IF NOT EXISTS idx_genreq_status ON generation_requests(status);

-- 実行ログ
CREATE TABLE IF NOT EXISTS runs (
  run_id           INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at       TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at         TEXT,
  stage            TEXT,                       -- collect/score/generate/notify
  collected_count  INTEGER,
  generated_count  INTEGER,
  status           TEXT,                       -- success/error
  error_message    TEXT,
  error_stage      TEXT
);

-- セッション (クッキー管理)
CREATE TABLE IF NOT EXISTS sessions (
  platform_prefix    TEXT PRIMARY KEY REFERENCES platforms(prefix),
  cookie_path        TEXT NOT NULL,
  logged_in_at       TEXT,
  last_validated_at  TEXT,
  valid              INTEGER NOT NULL DEFAULT 0
);

-- Exa API 利用ログ（月次上限管理）
CREATE TABLE IF NOT EXISTS exa_usage (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  called_at     TEXT NOT NULL DEFAULT (datetime('now')),
  query         TEXT,
  result_count  INTEGER
);
CREATE INDEX IF NOT EXISTS idx_exa_called ON exa_usage(called_at);

-- 初期データ
INSERT OR IGNORE INTO platforms(prefix, name, search_urls, enabled)
VALUES (
  'LAN',
  'Lancers',
  '["https://www.lancers.jp/work/search/web/lp","https://www.lancers.jp/work/search/web/website","https://www.lancers.jp/work/search/ad"]',
  1
);
