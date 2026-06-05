-- ============================================================================
-- x-account-system migration 0002: posts / performance / interview / hook
--
-- v10.2 §9 データフロー + observability に基づくテーブル群。
-- ============================================================================

-- ---------------------------------------------------------------------------
-- core_ideas : 投稿の核アイデア = 1 個 = 1 レコード
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS xad.core_ideas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT now(),
  trace_id uuid NOT NULL DEFAULT uuid_generate_v4(),

  -- 内容
  title text,
  summary text,
  source_material_ids uuid[] NOT NULL DEFAULT '{}',  -- materials_store FK

  -- v10.1 §1.4 / v10.2 翻案 vs 実体験 vs 業種別 SOP
  category text NOT NULL CHECK (category IN (
    'paraphrase',       -- 翻案
    'first_hand',       -- 実体験
    'industry_sop'      -- 業種別 SOP
  )),

  -- 月別業種フォーカス (v10.1 §1.2)
  monthly_industry_focus text,  -- '税理士', '社労士', '製造業' 等

  -- 4 大課題 (v10.2 D-1 反映)
  reader_pain_point text CHECK (reader_pain_point IN (
    'C1_what_ai_can_do',
    'C2_how_to_integrate',
    'C3_pricing_judgment',
    'C4_failure_anxiety',
    'mixed'
  )),

  -- 状態
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'approved', 'published', 'rejected', 'archived'
  )),

  meta jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_core_ideas_trace ON xad.core_ideas(trace_id);
CREATE INDEX IF NOT EXISTS idx_core_ideas_category ON xad.core_ideas(category);

-- ---------------------------------------------------------------------------
-- post_drafts : 1 核アイデア × プラットフォーム × バリエーション
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS xad.post_drafts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT now(),
  trace_id uuid NOT NULL,

  core_idea_id uuid NOT NULL REFERENCES xad.core_ideas(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('x', 'instagram', 'note')),
  variant_index int NOT NULL DEFAULT 0,

  -- フォーマット (v10.2 §4.3.2)
  fmat text CHECK (fmat IN ('short', 'medium', 'long', 'thread', 'carousel', 'article')),
  body text NOT NULL,
  body_redacted text,  -- DLP redact 済本文 (Editor +5 で検証)
  attachments jsonb DEFAULT '[]'::jsonb,

  -- Hook 分類 (v10.2 §4.7.1 primary_hook + devices)
  primary_hook text CHECK (primary_hook IN (
    'failure_story', 'business_repro', 'critique', 'tips_enum'
  )),
  devices text[] DEFAULT '{}',  -- ['number', 'before_after', 'conclusion_first', ...]
  hook_confidence numeric(3,2),  -- 0.00 - 1.00

  -- 集客導線 (v10.2 §4.8)
  acquisition_route text CHECK (acquisition_route IN ('A', 'B', 'C')),
  has_url boolean NOT NULL DEFAULT false,
  url_position text CHECK (url_position IN ('none', 'end', 'mid')),

  -- Editor 判定
  editor_status text NOT NULL DEFAULT 'pending' CHECK (editor_status IN (
    'pending', 'approved', 'rejected'
  )),
  editor_reasons text[] DEFAULT '{}',  -- reject 理由のルール ID

  -- 承認 (human-in-the-loop)
  human_approval_status text DEFAULT 'pending' CHECK (human_approval_status IN (
    'pending', 'approved', 'rejected', 'auto_approved'
  )),
  human_approved_at timestamptz,

  -- コスト
  cost_usd numeric(10,6),
  retry_count int NOT NULL DEFAULT 0,

  -- リスク分類 (Codex 4-2: 高リスク vs 低リスク)
  risk_level text NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'high')),
  risk_reasons text[] DEFAULT '{}'  -- 'has_numbers' / 'client_derived' / 'paid_route' / 'business_law'
);

CREATE INDEX IF NOT EXISTS idx_drafts_core ON xad.post_drafts(core_idea_id);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON xad.post_drafts(editor_status, human_approval_status);
CREATE INDEX IF NOT EXISTS idx_drafts_trace ON xad.post_drafts(trace_id);
CREATE INDEX IF NOT EXISTS idx_drafts_risk ON xad.post_drafts(risk_level);

-- ---------------------------------------------------------------------------
-- posted_records : 実際に投稿されたレコード
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS xad.posted_records (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT now(),
  trace_id uuid NOT NULL,

  draft_id uuid NOT NULL REFERENCES xad.post_drafts(id),
  platform text NOT NULL,
  platform_post_id text NOT NULL,  -- X tweet_id / IG media_id / note article_id

  scheduled_at timestamptz NOT NULL,
  posted_at timestamptz NOT NULL,

  -- v10.2 §10.3 owned channel fallback 経由かどうか
  via_fallback boolean NOT NULL DEFAULT false,
  fallback_channel text,  -- 'note_email' / 'owned_domain' / 'line_subscriber'

  UNIQUE (platform, platform_post_id)
);

CREATE INDEX IF NOT EXISTS idx_posted_trace ON xad.posted_records(trace_id);
CREATE INDEX IF NOT EXISTS idx_posted_platform ON xad.posted_records(platform, posted_at);

-- ---------------------------------------------------------------------------
-- performance_metrics : 投稿 × 時系列の計測値
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS xad.performance_metrics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT now(),

  posted_record_id uuid NOT NULL REFERENCES xad.posted_records(id) ON DELETE CASCADE,
  measured_at timestamptz NOT NULL,

  -- v10.2 §1.3 真の北極星指標
  impressions int,
  user_profile_clicks int,
  url_link_clicks int,
  pcr numeric(6,5),  -- profile_clicks / impressions

  -- public_metrics
  like_count int,
  retweet_count int,
  reply_count int,
  quote_count int,
  bookmark_count int,

  -- v10.2 §8 Phase 1 業務 KPI
  qualified_consultation_attributed boolean DEFAULT false,
  paid_revenue_attributed_jpy int DEFAULT 0,

  -- v10.2 §9.3 funnel_stage
  funnel_stage text CHECK (funnel_stage IN (
    'impression', 'profile_click', 'note_visit', 'note_purchase', 'consultation'
  ))
);

CREATE INDEX IF NOT EXISTS idx_metrics_posted ON xad.performance_metrics(posted_record_id, measured_at);

-- ---------------------------------------------------------------------------
-- interview_records : LINE 完結インタビュー (v10.2 §4.1)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS xad.interview_records (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT now(),
  trace_id uuid NOT NULL DEFAULT uuid_generate_v4(),

  ma_session_id text,  -- Anthropic Managed Agents session ID
  mode text NOT NULL DEFAULT 'normal' CHECK (mode IN ('normal', 'weekly_batch')),

  turn_count int NOT NULL DEFAULT 0,
  satisfaction_score numeric(3,2),
  abort_reason text,  -- 'low_signal' / 'user_request' / 'max_turns'

  -- v10.2 公開許諾 gate との接続
  publication_consent_status text NOT NULL DEFAULT 'pending',
  client_impacted_flag boolean NOT NULL DEFAULT false,

  hypothesis jsonb,         -- working_title / target_platform / etc.
  collected_answers jsonb DEFAULT '[]'::jsonb,
  knowledge_gaps jsonb DEFAULT '[]'::jsonb,

  duration_seconds int,
  active_seconds int,
  total_cost_usd numeric(10,6)
);

CREATE INDEX IF NOT EXISTS idx_interview_trace ON xad.interview_records(trace_id);
CREATE INDEX IF NOT EXISTS idx_interview_session ON xad.interview_records(ma_session_id);

-- ---------------------------------------------------------------------------
-- hook_unknown_candidates : 未知 Hook 候補 (v10.2 §4.7.4)
-- HDBSCAN は Phase 2 以降、Phase 1 は人手ラベル
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS xad.hook_unknown_candidates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT now(),

  posted_record_id uuid REFERENCES xad.posted_records(id),
  text text NOT NULL,
  max_similarity_to_known numeric(3,2),
  proposed_label text,           -- 人手 or Opus 提案
  cluster_id int,                -- HDBSCAN 結果 (Phase 2 以降)
  approved boolean DEFAULT false,
  approved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_unknown_cluster ON xad.hook_unknown_candidates(cluster_id);
