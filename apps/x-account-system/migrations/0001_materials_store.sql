-- ============================================================================
-- x-account-system migration 0001: materials_store + DLP / publication consent
--
-- v10.2 §10.7 CR-2 公開許諾 gate の Schema を実装。
-- 案件メモ / 音声メモ / Claude Code 履歴 / Git commit を投稿生成エージェントが
-- 読む前に「公開許諾 + DLP redaction + retention」を確認する。
--
-- 適用方法: Supabase Dashboard → SQL Editor or `supabase db push`
-- ============================================================================

-- schema (xad: x-account-system 専用、ofmeton-apps project 集約方針 2026-05-27)
CREATE SCHEMA IF NOT EXISTS xad;

-- 拡張機能 (uuid-ossp / pgcrypto は project 全体で既に installed)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- materials_store : 投稿生成の原料 = 1 件 = 1 レコード
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS xad.materials_store (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- 素材種別
  source_type text NOT NULL CHECK (source_type IN (
    'claude_code',       -- Claude Code session
    'git_commit',        -- Git commit
    'project_memo',      -- 案件メモ (wiki/projects/)
    'voice_memo',        -- 音声メモ
    'x_inspirations',    -- twitterapi.io 由来の海外/国内バズ
    'note_inspirations', -- note 競合観察
    'manual'             -- 手動入力
  )),
  source_ref text,        -- session_id / commit SHA / memo slug 等

  -- 原文と redacted 版 (v10.2 §10.7.1)
  raw_text text,
  redacted_text text,

  -- 個人情報 / 機密フラグ
  pii boolean NOT NULL DEFAULT false,
  client_confidential boolean NOT NULL DEFAULT false,

  -- 公開許諾 (v10.2 §10.7.3)
  publication_consent text NOT NULL DEFAULT 'pending' CHECK (publication_consent IN (
    'pending', 'granted', 'denied'
  )),
  consent_obtained_from text,
  consent_obtained_at timestamptz,
  consent_method text CHECK (consent_method IN (
    'line', 'email', 'phone', 'in_person', 'self', 'na'
  )),

  -- 用途と保持期間
  purpose text NOT NULL DEFAULT 'unknown' CHECK (purpose IN (
    'public_post', 'internal_only', 'unknown'
  )),
  retention text NOT NULL DEFAULT '180d' CHECK (retention IN (
    '90d', '180d', '1y', 'forever'
  )),
  expires_at timestamptz,

  -- 翻案ガード (v10.2 §10.2)
  permitted_storage text DEFAULT 'redacted_full',  -- 'url_only' / 'title_only' / 'redacted_full'
  derived_use_policy text DEFAULT 'paraphrase_required',  -- 'paraphrase_required' / 'structure_only'

  -- embedding (pgvector、extensions schema 明示で search_path 非依存)
  embedding extensions.vector(1536),

  -- meta
  meta jsonb DEFAULT '{}'::jsonb
);

-- expires_at の自動計算トリガー (retention に基づく)
CREATE OR REPLACE FUNCTION xad.compute_materials_expires_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at := CASE NEW.retention
    WHEN '90d' THEN now() + interval '90 days'
    WHEN '180d' THEN now() + interval '180 days'
    WHEN '1y' THEN now() + interval '1 year'
    WHEN 'forever' THEN NULL
  END;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS materials_store_expires_at ON xad.materials_store;
CREATE TRIGGER materials_store_expires_at
  BEFORE INSERT OR UPDATE OF retention ON xad.materials_store
  FOR EACH ROW EXECUTE FUNCTION xad.compute_materials_expires_at();

-- インデックス
CREATE INDEX IF NOT EXISTS idx_materials_consent ON xad.materials_store(publication_consent);
CREATE INDEX IF NOT EXISTS idx_materials_source ON xad.materials_store(source_type, source_ref);
CREATE INDEX IF NOT EXISTS idx_materials_expires ON xad.materials_store(expires_at);
CREATE INDEX IF NOT EXISTS idx_materials_pii ON xad.materials_store(pii) WHERE pii = true;
CREATE INDEX IF NOT EXISTS idx_materials_confidential ON xad.materials_store(client_confidential)
  WHERE client_confidential = true;

-- pgvector index (cos 類似度用、Phase 1 ingest 後の実利用)
CREATE INDEX IF NOT EXISTS idx_materials_embedding ON xad.materials_store
  USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists = 100);

-- ---------------------------------------------------------------------------
-- consent_requests : 顧客同意取得の履歴 (v10.2 §10.7.3)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS xad.consent_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT now(),

  material_id uuid NOT NULL REFERENCES xad.materials_store(id) ON DELETE CASCADE,
  client_name text NOT NULL,        -- 案件 client (例: "T 社")
  request_channel text NOT NULL,    -- 'line' / 'email' / 'phone' / 'in_person'
  request_message text,             -- 送った文面
  requested_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  response text CHECK (response IN ('granted', 'denied', 'pending')),
  response_message text,            -- client の返信
  notes text
);

CREATE INDEX IF NOT EXISTS idx_consent_material ON xad.consent_requests(material_id);
CREATE INDEX IF NOT EXISTS idx_consent_response ON xad.consent_requests(response);
