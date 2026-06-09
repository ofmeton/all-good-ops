-- 0022_metrics_ingest.sql
-- metrics-ingest の冪等 upsert 用一意制約。
-- 事前 inspect (2026-06-10): performance_metrics 0行 → 制約追加は安全。
--
-- 注: posted_records は 0002 で既に `UNIQUE (platform, platform_post_id)` を持つため、
--     upsert/lookup の一意性はそれが担保する（本 migration では追加しない）。
--     なお ingest は posted_records を「lookup→無ければ INSERT」で扱い、
--     INSERT 時に NOT NULL の trace_id / scheduled_at を補う（既存行は更新しない）。

-- performance_metrics: MVP は最新スナップショット 1 行/post（reward-extractor が [0] を読む前提と整合）。
-- upsert onConflict "posted_record_id" のターゲット（0002 には posted_record_id の一意制約が無いため追加）。
-- 時系列化は後続フェーズで再検討。
create unique index if not exists uq_perf_metrics_posted_record
  on xad.performance_metrics (posted_record_id);
