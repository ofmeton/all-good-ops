-- ============================================================================
-- migration 0003: Row Level Security policies (v10.2 §10.7.1)
--
-- 適用順序: 先に ROLE 作成 → そのあと RLS / POLICY (POLICY ... TO <role> は
-- 対象 role が存在しないと CREATE 失敗するため)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ロール先行作成 (本番では手動で password 設定)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'human_admin') THEN
    CREATE ROLE human_admin;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'writer_agent') THEN
    CREATE ROLE writer_agent;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'editor_agent') THEN
    CREATE ROLE editor_agent;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'publisher_agent') THEN
    CREATE ROLE publisher_agent;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- RLS enable
-- ---------------------------------------------------------------------------
ALTER TABLE xad.materials_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE xad.consent_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE xad.core_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE xad.post_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE xad.posted_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE xad.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE xad.interview_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE xad.hook_unknown_candidates ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- materials_store: 投稿生成 (writer_agent) には raw_text NULL マスク + consent=granted のみ
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW xad.materials_for_writer AS
  SELECT
    id,
    source_type,
    source_ref,
    NULL::text AS raw_text,                  -- 強制 mask
    redacted_text,
    pii,
    client_confidential,
    publication_consent,
    purpose,
    expires_at,
    embedding,
    meta
  FROM xad.materials_store
  WHERE publication_consent = 'granted'
    AND (expires_at IS NULL OR expires_at > now())
    AND purpose = 'public_post';

-- human_admin: 全 read/write 可
CREATE POLICY materials_human_admin_all ON xad.materials_store
  FOR ALL TO human_admin USING (true) WITH CHECK (true);

-- writer_agent: テーブル直 SELECT は禁止 (view 経由のみ)
CREATE POLICY materials_writer_deny_direct ON xad.materials_store
  FOR ALL TO writer_agent USING (false) WITH CHECK (false);

GRANT SELECT ON xad.materials_for_writer TO writer_agent;
GRANT SELECT ON xad.materials_for_writer TO editor_agent;

-- consent_requests: human_admin のみ
CREATE POLICY consent_human_admin_all ON xad.consent_requests
  FOR ALL TO human_admin USING (true) WITH CHECK (true);

-- core_ideas / post_drafts: writer/editor は read+write、human は全
CREATE POLICY core_ideas_writer_rw ON xad.core_ideas
  FOR ALL TO writer_agent USING (true) WITH CHECK (true);
CREATE POLICY core_ideas_human_all ON xad.core_ideas
  FOR ALL TO human_admin USING (true) WITH CHECK (true);

CREATE POLICY drafts_writer_rw ON xad.post_drafts
  FOR ALL TO writer_agent USING (true) WITH CHECK (true);
CREATE POLICY drafts_editor_rw ON xad.post_drafts
  FOR ALL TO editor_agent USING (true) WITH CHECK (true);
CREATE POLICY drafts_human_all ON xad.post_drafts
  FOR ALL TO human_admin USING (true) WITH CHECK (true);

-- posted_records: publisher_agent と human_admin が write、他は readonly
CREATE POLICY posted_publisher_rw ON xad.posted_records
  FOR ALL TO publisher_agent USING (true) WITH CHECK (true);
CREATE POLICY posted_human_all ON xad.posted_records
  FOR ALL TO human_admin USING (true) WITH CHECK (true);
CREATE POLICY posted_writer_ro ON xad.posted_records
  FOR SELECT TO writer_agent, editor_agent USING (true);

-- performance_metrics: 全エージェント read、human と publisher が write
CREATE POLICY perf_publisher_rw ON xad.performance_metrics
  FOR ALL TO publisher_agent USING (true) WITH CHECK (true);
CREATE POLICY perf_human_all ON xad.performance_metrics
  FOR ALL TO human_admin USING (true) WITH CHECK (true);
CREATE POLICY perf_agents_ro ON xad.performance_metrics
  FOR SELECT TO writer_agent, editor_agent USING (true);

-- interview_records: writer_agent (Interviewer 兼任) と human が rw
CREATE POLICY interview_writer_rw ON xad.interview_records
  FOR ALL TO writer_agent USING (true) WITH CHECK (true);
CREATE POLICY interview_human_all ON xad.interview_records
  FOR ALL TO human_admin USING (true) WITH CHECK (true);

-- hook_unknown_candidates: writer/editor が write、human が承認
CREATE POLICY hook_writer_rw ON xad.hook_unknown_candidates
  FOR ALL TO writer_agent, editor_agent USING (true) WITH CHECK (true);
CREATE POLICY hook_human_all ON xad.hook_unknown_candidates
  FOR ALL TO human_admin USING (true) WITH CHECK (true);
