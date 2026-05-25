-- ============================================================================
-- migration 0003: Row Level Security policies (v10.2 §10.7.1)
-- ============================================================================

ALTER TABLE public.materials_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posted_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hook_unknown_candidates ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- ロール: human_admin / writer_agent / editor_agent / publisher_agent / readonly
-- 設計: 投稿生成エージェントは raw_text 読めない、redacted_text + consent=granted のみ
-- ---------------------------------------------------------------------------

-- materials_store: 投稿生成 (writer_agent) には raw_text NULL マスク + consent=granted のみ
CREATE OR REPLACE VIEW public.materials_for_writer AS
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
  FROM public.materials_store
  WHERE publication_consent = 'granted'
    AND (expires_at IS NULL OR expires_at > now())
    AND purpose = 'public_post';

-- human_admin: 全 read/write 可
CREATE POLICY materials_human_admin_all ON public.materials_store
  FOR ALL TO human_admin USING (true) WITH CHECK (true);

-- writer_agent: redacted_text のみ read、raw_text は触れない
-- (view 経由でアクセスさせるため、テーブル直 SELECT は禁止)
CREATE POLICY materials_writer_deny_direct ON public.materials_store
  FOR ALL TO writer_agent USING (false) WITH CHECK (false);

GRANT SELECT ON public.materials_for_writer TO writer_agent;
GRANT SELECT ON public.materials_for_writer TO editor_agent;

-- consent_requests: human_admin のみ
CREATE POLICY consent_human_admin_all ON public.consent_requests
  FOR ALL TO human_admin USING (true) WITH CHECK (true);

-- core_ideas / post_drafts: writer/editor は read+write、human は全
CREATE POLICY core_ideas_writer_rw ON public.core_ideas
  FOR ALL TO writer_agent USING (true) WITH CHECK (true);
CREATE POLICY core_ideas_human_all ON public.core_ideas
  FOR ALL TO human_admin USING (true) WITH CHECK (true);

CREATE POLICY drafts_writer_rw ON public.post_drafts
  FOR ALL TO writer_agent USING (true) WITH CHECK (true);
CREATE POLICY drafts_editor_rw ON public.post_drafts
  FOR ALL TO editor_agent USING (true) WITH CHECK (true);
CREATE POLICY drafts_human_all ON public.post_drafts
  FOR ALL TO human_admin USING (true) WITH CHECK (true);

-- posted_records: publisher_agent と human_admin が write、他は readonly
CREATE POLICY posted_publisher_rw ON public.posted_records
  FOR ALL TO publisher_agent USING (true) WITH CHECK (true);
CREATE POLICY posted_human_all ON public.posted_records
  FOR ALL TO human_admin USING (true) WITH CHECK (true);
CREATE POLICY posted_writer_ro ON public.posted_records
  FOR SELECT TO writer_agent, editor_agent USING (true);

-- performance_metrics: 全エージェント read、human と publisher が write
CREATE POLICY perf_publisher_rw ON public.performance_metrics
  FOR ALL TO publisher_agent USING (true) WITH CHECK (true);
CREATE POLICY perf_human_all ON public.performance_metrics
  FOR ALL TO human_admin USING (true) WITH CHECK (true);
CREATE POLICY perf_agents_ro ON public.performance_metrics
  FOR SELECT TO writer_agent, editor_agent USING (true);

-- interview_records: writer_agent (Interviewer 兼任) と human が rw
CREATE POLICY interview_writer_rw ON public.interview_records
  FOR ALL TO writer_agent USING (true) WITH CHECK (true);
CREATE POLICY interview_human_all ON public.interview_records
  FOR ALL TO human_admin USING (true) WITH CHECK (true);

-- hook_unknown_candidates: writer/editor が write、human が承認
CREATE POLICY hook_writer_rw ON public.hook_unknown_candidates
  FOR ALL TO writer_agent, editor_agent USING (true) WITH CHECK (true);
CREATE POLICY hook_human_all ON public.hook_unknown_candidates
  FOR ALL TO human_admin USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- ロール作成 (本番では手動で password 設定)
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
