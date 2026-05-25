-- ============================================================================
-- migration 0005: v10.3 反映 patches
--
-- v10.3 全レビュー指摘オールクリア反映:
--   - C-10 PCR から売上計測 (UTM / purchase / qualified_lead / business_outcomes)
--   - F-2 業法ガード (business_law_risk_flag)
--   - C-9 auto-post 品質 gate (post_drafts.risk_level)
--   - C-13 verified_failure_story 上限化 (materials_store 拡張)
--   - A-4 Daily Digest 因果連鎖 (daily_digest_log.causal_chain)
--   - 顧客素材方針変更 (consent default 'granted')
-- ============================================================================

-- ---------------------------------------------------------------------------
-- C-10: UTM + business_outcomes (PCR → 売上 attribution)
-- ---------------------------------------------------------------------------
ALTER TABLE public.posted_records
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text;

CREATE INDEX IF NOT EXISTS idx_posted_utm ON public.posted_records(utm_campaign, posted_at);

-- 売上 attribution テーブル
CREATE TABLE IF NOT EXISTS public.business_outcomes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT now(),
  trace_id uuid,

  source_post_id uuid REFERENCES public.posted_records(id) ON DELETE SET NULL,
  outcome_type text NOT NULL CHECK (outcome_type IN (
    'consultation',        -- 個別相談 (LINE / DM)
    'paid_article',        -- note 有料記事購入
    'service_inquiry',     -- AI 自動化代行の問い合わせ
    'qualified_lead'       -- 受注に至ったリード
  )),
  outcome_at timestamptz NOT NULL DEFAULT now(),
  outcome_value_jpy int DEFAULT 0,
  attribution_confidence numeric(3,2) DEFAULT 0.50,  -- 0.00-1.00
  attribution_method text CHECK (attribution_method IN (
    'utm_direct',          -- utm_source 直接トレース
    'cross_platform',      -- X → note → 購入 等 推定
    'manual_input'         -- 手動入力 (相談時にヒアリング)
  )),
  meta jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_outcomes_type ON public.business_outcomes(outcome_type, outcome_at);
CREATE INDEX IF NOT EXISTS idx_outcomes_post ON public.business_outcomes(source_post_id);

ALTER TABLE public.business_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY outcomes_human_all ON public.business_outcomes
  FOR ALL TO human_admin USING (true) WITH CHECK (true);
CREATE POLICY outcomes_publisher_rw ON public.business_outcomes
  FOR ALL TO publisher_agent USING (true) WITH CHECK (true);
CREATE POLICY outcomes_agents_ro ON public.business_outcomes
  FOR SELECT TO writer_agent, editor_agent USING (true);

-- ---------------------------------------------------------------------------
-- F-2: 業法ガード (post_drafts.business_law_risk_flag) + C-9 auto-post 品質 gate
-- ---------------------------------------------------------------------------
-- post_drafts は migration 0002 で risk_level / risk_reasons は既存
-- v10.3 で business_law_risk_flag を明示的に追加 (risk_reasons の subset として可視化)

ALTER TABLE public.post_drafts
  ADD COLUMN IF NOT EXISTS business_law_risk_flag boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS business_law_keywords text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_drafts_bizlaw ON public.post_drafts(business_law_risk_flag)
  WHERE business_law_risk_flag = true;

-- C-9: auto-post 品質 gate 監査用フィールド
ALTER TABLE public.posted_records
  ADD COLUMN IF NOT EXISTS critical_error_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS terms_violation_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approval_latency_hours numeric(5,2);

-- ---------------------------------------------------------------------------
-- C-13: verified_failure_story 上限化 (materials_store 拡張)
-- ---------------------------------------------------------------------------
ALTER TABLE public.materials_store
  ADD COLUMN IF NOT EXISTS publication_allowed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS redaction_reviewed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_impacted_flag boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_failure_story boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_materials_verified_failure ON public.materials_store(verified_failure_story)
  WHERE verified_failure_story = true;

-- failure_story 月 4 本上限を検知する view
CREATE OR REPLACE VIEW public.verified_failure_supply_monthly AS
  SELECT
    to_char(created_at, 'YYYY-MM') AS month,
    COUNT(*) AS verified_count
  FROM public.materials_store
  WHERE verified_failure_story = true
    AND publication_consent = 'granted'
    AND publication_allowed = true
    AND redaction_reviewed = true
  GROUP BY 1
  ORDER BY 1 DESC;

-- v10.3 顧客素材方針変更: consent default を 'granted' 寄りに
-- (実値変更は人間が initial INSERT 時に行う、default は維持しつつ運用 SOP は HUMAN_TASKS で明示)
COMMENT ON COLUMN public.materials_store.publication_consent IS
  'v10.3: 本人事業 4 種 / 案件 client 由来とも基本許諾済前提で granted を入れる方針';

-- ---------------------------------------------------------------------------
-- A-4: Daily Digest 因果連鎖
-- ---------------------------------------------------------------------------
ALTER TABLE public.daily_digest_log
  ADD COLUMN IF NOT EXISTS causal_chain text;  -- "PCR -32% → transfer ingest 7 日 0 件 → 翻案率 12%" 形式

-- ---------------------------------------------------------------------------
-- C-7: IG launch 独立 gate 監査
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.launch_gates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT now(),

  platform text NOT NULL CHECK (platform IN ('x', 'instagram', 'note', 'threads', 'shorts')),
  gate_name text NOT NULL,           -- 'oauth_pkce_step_1_5', 'meta_app_review', etc.
  passed boolean NOT NULL DEFAULT false,
  passed_at timestamptz,
  evidence_url text,                 -- スクリーンショット / log URL 等
  notes text,
  UNIQUE (platform, gate_name)
);

CREATE INDEX IF NOT EXISTS idx_gates_platform ON public.launch_gates(platform, passed);

ALTER TABLE public.launch_gates ENABLE ROW LEVEL SECURITY;
CREATE POLICY gates_human_all ON public.launch_gates
  FOR ALL TO human_admin USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 完了通知 (Supabase Studio で apply 後の SELECT で確認可能)
-- ---------------------------------------------------------------------------
COMMENT ON TABLE public.business_outcomes IS 'v10.3 C-10: PCR から売上 attribution';
COMMENT ON TABLE public.launch_gates IS 'v10.3 C-7: IG / X / note 等の独立 launch gate 監査';
