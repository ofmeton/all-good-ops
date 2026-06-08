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

-- ===========================================================================
-- ② approval_drafts view — 1 draft = 1 行（元ネタ素材を sources[] で同梱）
--    本文/状態/risk/format ＋ core_idea のタイトル ＋ source_material_ids を
--    lateral jsonb_agg で配列化（順序保持）。UI の 1 フェッチで承認画面が完結する。
-- ===========================================================================
create or replace view xad.approval_drafts as
select
  d.id,
  d.created_at,
  d.core_idea_id,
  d.body,
  d.fmat,
  d.human_approval_status,
  d.human_approved_at,
  d.risk_level,
  d.risk_reasons,
  d.editor_status,
  d.published_at,
  d.scheduled_for,
  ci.title            as idea_title,
  ci.summary          as idea_summary,
  ci.status           as idea_status,
  coalesce(src.sources, '[]'::jsonb) as sources
from xad.post_drafts d
join xad.core_ideas ci on ci.id = d.core_idea_id
left join lateral (
  select jsonb_agg(
    jsonb_build_object(
      'id',          m.id,
      'raw_text',    m.raw_text,
      'translation', (m.meta->>'translation'),
      'tweet_url',   (m.meta->>'tweet_url'),
      'lang',        (m.meta->>'lang'),
      'source_ref',  m.source_ref,
      'media',       (m.meta->'media'),
      'engagement',  (m.meta->'engagement')
    )
    order by sm.ord
  ) as sources
  from unnest(ci.source_material_ids) with ordinality as sm(mid, ord)
  join xad.materials_store m on m.id = sm.mid
) src on true
where d.platform = 'x';

-- ===========================================================================
-- ③ set_approval_status RPC — pending のみを CAS で原子遷移
--    approved → human_approval_status='approved' / human_approved_at=now() /
--               core_ideas.status='approved'（予約待ちストック投入）
--    rejected → human_approval_status='rejected' / core_ideas.status='draft'（再 queue）
--    既に published / scheduled / pending 以外の draft は claim 対象外。claim 件数を返す。
--    （data-modifying CTE は参照有無に関わらず必ず実行される＝idea_upd も走る）
-- ===========================================================================
create or replace function xad.set_approval_status(p_ids uuid[], p_status text)
returns integer language plpgsql as $$
declare
  n integer;
  v_idea_status text;
begin
  if p_status not in ('approved', 'rejected') then
    raise exception 'invalid approval status: %', p_status;
  end if;
  v_idea_status := case when p_status = 'approved' then 'approved' else 'draft' end;

  with claimed as (
    update xad.post_drafts d
       set human_approval_status = p_status,
           human_approved_at =
             case when p_status = 'approved' then now() else d.human_approved_at end
     where d.id = any(p_ids)
       and d.human_approval_status = 'pending'
       and d.published_at is null
       and d.scheduled_for is null
    returning d.core_idea_id
  ),
  idea_upd as (
    update xad.core_ideas ci
       set status = v_idea_status
      from claimed
     where ci.id = claimed.core_idea_id
    returning ci.id
  )
  select count(*) into n from claimed;
  return n;
end $$;
