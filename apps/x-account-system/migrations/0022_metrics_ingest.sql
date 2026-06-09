-- 0022_metrics_ingest.sql
-- metrics-ingest の冪等 upsert 用一意制約。
-- 事前 inspect (2026-06-10): posted_records 11行 / 重複(platform,platform_post_id)=0 / null platform_post_id=0、
--                           performance_metrics 0行 → 制約追加は安全。

-- posted_records: 同一プラットフォームの同一 tweet は 1 行（platform_post_id NULL は対象外）。
-- upsert onConflict "platform,platform_post_id" のターゲット。
create unique index if not exists uq_posted_records_platform_post
  on xad.posted_records (platform, platform_post_id)
  where platform_post_id is not null;

-- performance_metrics: MVP は最新スナップショット 1 行/post（reward-extractor が [0] を読む前提と整合）。
-- upsert onConflict "posted_record_id" のターゲット。時系列化は後続フェーズで再検討。
create unique index if not exists uq_perf_metrics_posted_record
  on xad.performance_metrics (posted_record_id);
