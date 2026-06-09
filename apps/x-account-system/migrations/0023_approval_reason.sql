-- 0023_approval_reason.sql — Stage 2B: 承認/却下理由の自由テキスト記録
--
-- ⚠️ 本番 xad(project=hofvvcvhjslevymhbcqj) への適用は人間ゲート。
--    本ファイルは SQL を用意するのみ（apply は別途・人間確認後）。
--
-- 背景: 承認/却下時に任意の理由・メモを残し、将来の LLM オプティマイザが
--   「なぜ承認/却下されたか」を学習できるようにする。
--   LINE フローは変更しない。style_feedback は触らない。
--
-- 構成:
--   ① post_drafts に approval_reason text（nullable・任意）を追加。
--   ② approval_drafts view を末尾に approval_reason 列を追加して再定義。
--   ③ set_approval_status RPC に p_reason text DEFAULT null を追加し
--      UPDATE 時に coalesce で書く（既存 3 引数呼び出しは後方互換維持）。

-- ===========================================================================
-- ① post_drafts.approval_reason
-- ===========================================================================
alter table xad.post_drafts
  add column if not exists approval_reason text;

comment on column xad.post_drafts.approval_reason is
  '承認/却下時の理由・メモ（任意自由テキスト）。'
  '将来の LLM オプティマイザが品質改善の学習データとして使用する。'
  '承認・却下いずれでも記録可。null は理由未入力。';

-- ===========================================================================
-- ② approval_drafts view — 0019 をコピーし末尾に approval_reason を追加
--    （列を明示列挙しているため create or replace で全列再定義する）
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
  coalesce(src.sources, '[]'::jsonb) as sources,
  coalesce(d.attachments, '[]'::jsonb) as attachments,
  d.approval_reason
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
  -- left join: 参照先 material が削除されても要素を inner join で silent 脱落させない。
  from unnest(ci.source_material_ids) with ordinality as sm(mid, ord)
  left join xad.materials_store m on m.id = sm.mid
) src on true
where d.platform = 'x';

-- ===========================================================================
-- ③ set_approval_status RPC — p_reason を追加（後方互換）
--    p_reason が null のときは既存値を維持（coalesce）＝既存 3 引数呼び出しは不変。
--
--    ⚠️ plpgsql の default 引数追加はオーバーロードを生み曖昧呼び出しになるため、
--       旧シグネチャ set_approval_status(uuid[], text, jsonb) を明示 drop してから
--       再作成し 1 シグネチャに統一する。
-- ===========================================================================
drop function if exists xad.set_approval_status(uuid[], text, jsonb);

create or replace function xad.set_approval_status(
  p_ids         uuid[],
  p_status      text,
  p_attachments jsonb default null,
  p_reason      text default null
)
returns integer language plpgsql as $$
declare
  n integer;
  v_idea_status text;
begin
  if p_status not in ('approved', 'rejected') then
    raise exception 'invalid approval status: %', p_status;
  end if;
  -- attachments を渡す場合は配列であること（境界ガード）
  if p_attachments is not null and jsonb_typeof(p_attachments) <> 'array' then
    raise exception 'p_attachments must be a jsonb array';
  end if;
  v_idea_status := case when p_status = 'approved' then 'approved' else 'draft' end;

  with claimed as (
    update xad.post_drafts d
       set human_approval_status = p_status,
           human_approved_at =
             case when p_status = 'approved' then now() else d.human_approved_at end,
           attachments     = coalesce(p_attachments, d.attachments),
           approval_reason = coalesce(p_reason, d.approval_reason)
     where d.id = any(p_ids)
       and d.human_approval_status = 'pending'
       and d.editor_status = 'approved'   -- MA 点検済みのみ承認可（fact-check バイパス防止）
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
