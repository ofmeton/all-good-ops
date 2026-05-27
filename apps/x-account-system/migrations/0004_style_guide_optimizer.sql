-- ============================================================================
-- migration 0004: style_guide / optimizer_proposal / cost_ledger
-- v10.2 §7 (Style Guide v1〜v3) + §4.8 (Optimizer ナレッジベース) + §3.3 (cost)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- style_guide : v1 / v2 / v3 ... の YAML を版管理 (v10.2 C-3)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS xad.style_guide (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT now(),

  version text NOT NULL,         -- 'v1', 'v1.1', 'v2', ...
  yaml_blob text NOT NULL,
  yaml_sha256 text NOT NULL,
  source text NOT NULL,          -- 'phase0_report' / 'optimizer_phase2_w20' 等

  effective_from timestamptz NOT NULL,
  approved_at timestamptz,
  approved_by text,              -- 'human' / 'auto_optimizer_phase1'
  retired_at timestamptz,

  notes text,
  UNIQUE (version)
);

CREATE INDEX IF NOT EXISTS idx_style_guide_active ON xad.style_guide(retired_at)
  WHERE retired_at IS NULL;

-- 「現行 active style guide」を返す helper
CREATE OR REPLACE FUNCTION xad.active_style_guide()
RETURNS TABLE (version text, yaml_blob text, yaml_sha256 text) AS $$
  SELECT version, yaml_blob, yaml_sha256
  FROM xad.style_guide
  WHERE retired_at IS NULL
    AND effective_from <= now()
  ORDER BY effective_from DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- ---------------------------------------------------------------------------
-- optimizer_proposal : Phase 2 Opus の提案ナレッジベース (v10.2 §4.8 + Codex 11-2)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS xad.optimizer_proposal (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT now(),

  proposal_type text NOT NULL CHECK (proposal_type IN (
    'anomaly_alert', 'operational_friction', 'measurement_request',
    'config_change', 'structural_change'
  )),
  scope text NOT NULL,           -- 'writer_prompt' / 'editor_rule' / 'agent_definition' / ...

  hypothesis text NOT NULL,
  evidence jsonb NOT NULL,
  rank text CHECK (rank IN ('A', 'B', 'C')),

  -- Codex 11-2: 提案精度評価
  accepted boolean,
  implemented boolean,
  implemented_at timestamptz,
  rollback boolean DEFAULT false,
  rollback_at timestamptz,
  business_effect numeric(10,4),  -- PCR / paid_revenue 差分
  reviewer_reason text,

  meta jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_optimizer_rank ON xad.optimizer_proposal(rank, accepted);
CREATE INDEX IF NOT EXISTS idx_optimizer_type ON xad.optimizer_proposal(proposal_type);

-- ---------------------------------------------------------------------------
-- cost_ledger : 月予算と実コストの差を観測 (v10.2 §3.3.4 brownout)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS xad.cost_ledger (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT now(),

  month text NOT NULL,             -- 'YYYY-MM'
  category text NOT NULL,          -- 'writer' / 'editor' / 'image' / 'x_api' / ...
  cost_jpy numeric(10,2) NOT NULL,
  cost_usd numeric(10,4),
  unit_count int,                  -- runs / tokens / images / posts
  meta jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_cost_month ON xad.cost_ledger(month, category);

-- 月次集計 view (brownout 判定用)
CREATE OR REPLACE VIEW xad.cost_monthly_summary AS
  SELECT
    month,
    SUM(cost_jpy) AS total_cost_jpy,
    SUM(cost_jpy) FILTER (WHERE category LIKE 'writer%' OR category LIKE 'editor%') AS llm_cost_jpy,
    SUM(cost_jpy) FILTER (WHERE category = 'image') AS image_cost_jpy,
    SUM(cost_jpy) FILTER (WHERE category LIKE 'x_api%') AS x_api_cost_jpy
  FROM xad.cost_ledger
  GROUP BY month;

-- ---------------------------------------------------------------------------
-- daily_digest_log : LINE Daily Digest / Weekly Brief 配信ログ (v10.2 §5.2)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS xad.daily_digest_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT now(),

  digest_type text NOT NULL CHECK (digest_type IN ('daily', 'weekly', 'anomaly')),
  sent_at timestamptz NOT NULL,
  recipient text NOT NULL,         -- 'line_user_ofmeton'
  body text NOT NULL,
  approval_items_count int DEFAULT 0,

  -- 異常検知 (Codex 8-1 ベース)
  alerts jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'acked'))
);

CREATE INDEX IF NOT EXISTS idx_digest_type ON xad.daily_digest_log(digest_type, sent_at);
