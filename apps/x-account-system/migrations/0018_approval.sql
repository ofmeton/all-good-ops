-- 0018_approval.sql — 承認体験(T3): 翻訳露出 / 承認ビュー / 承認状態更新RPC
--
-- ⚠️ 本番 xad(project=hofvvcvhjslevymhbcqj) への適用は人間ゲート。
--    本ファイルは SQL を用意するのみ（apply は別途・人間確認後）。
--
-- 構成:
--   ① curation_materials view を再作成し meta.translation を末尾列で露出（0016 全列をコピー）。
--   ② approval_drafts view: post_drafts × core_ideas × 元ネタ素材を 1 行に集約（sources[] 同梱）。
--   ③ set_approval_status RPC: pending のみを CAS で approved/rejected へ原子遷移。

-- ===========================================================================
-- ① curation_materials view（0016 をコピーし translation を追加）
-- ===========================================================================
create or replace view xad.curation_materials as
select
  m.id,
  m.source_ref,
  m.raw_text,
  m.created_at,
  (m.meta->>'collected_at')                       as collected_at,
  (m.meta->>'selection_status')                   as selection_status,
  (m.meta->'scores'->>'overall')::numeric         as overall_score,
  (m.meta->'scores'->>'freshness')::numeric       as freshness,
  (m.meta->'scores'->>'velocity')::numeric        as velocity,
  (m.meta->'scores'->>'target_fit')::numeric      as target_fit,
  (m.meta->>'score_reason')                        as score_reason,
  (m.meta->'discovery'->>'via')                    as discovery_via,
  (m.meta->'discovery'->>'query')                  as discovery_query,
  (m.meta->>'lang')                                as lang,
  (m.meta->>'tweet_url')                           as tweet_url,
  (m.meta->>'conversation_id')                     as conversation_id,
  (m.meta->'media')                                as media,
  (m.meta->'engagement')                           as engagement,
  (m.meta->>'translation')                         as translation
from xad.materials_store m
where m.source_type = 'x_inspirations';
