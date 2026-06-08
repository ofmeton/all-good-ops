-- 0019_attachments.sql — 承認UIメディア添付(T-A): 写真の upload intent を構造化保持
--
-- ⚠️ 本番 xad(project=hofvvcvhjslevymhbcqj) への適用は人間ゲート。
--    本ファイルは SQL を用意するのみ（apply は別途・人間確認後）。
--    DDL前に実スキーマ Inspect 必須（list_tables / 既存 0018 view・RPC を正本に拡張）。
--
-- 背景: post_drafts.attachments カラムは 0002 で定義済（jsonb DEFAULT '[]'）だが未使用。
--   承認画面で選んだ元ネタ写真を「DL→upload_file でネイティブ添付」する upload intent を
--   このカラムに構造化保持する。動画/GIF は本文に deep-link を直書きするため対象外。
--   要素形（写真のみ。実行結果フィールドは publish 時に skill が追記）:
--     { kind:'upload', mediaType:'photo', sourceUrl, sourceMaterialId,
--       localPath?, resolvedKind?('upload'|'skipped'), fallbackReason? }
--
-- 構成:
--   ① post_drafts.attachments に jsonb 配列 CHECK と用途 comment を付与（後方互換）。
--   ② approval_drafts view を drop&recreate し末尾に d.attachments 列を追加（0018 をコピー拡張）。
--   ③ set_approval_status RPC に p_attachments を追加し、claim 内で coalesce 更新（後方互換）。

-- ===========================================================================
-- ① post_drafts.attachments — jsonb 配列ガード + 用途 comment
--    既存 default '[]'。null も許容（CHECK は null をすり抜けるため明示 or 条件）。
-- ===========================================================================
alter table xad.post_drafts
  drop constraint if exists post_drafts_attachments_is_array;
alter table xad.post_drafts
  add constraint post_drafts_attachments_is_array
  check (attachments is null or jsonb_typeof(attachments) = 'array');

comment on column xad.post_drafts.attachments is
  '投稿メディア添付の構造化フィールド。写真の upload intent を配列で保持: '
  '[{kind:''upload'',mediaType:''photo'',sourceUrl(pbs.twimg.com),sourceMaterialId,'
  'localPath?,resolvedKind?(''upload''|''skipped''),fallbackReason?}]。'
  '書込は承認時(intent)。publish 時に x-scheduled-publish が DL 成否を localPath/'
  'resolvedKind/fallbackReason に追記する。動画/GIF は本文 deep-link で扱い本配列には入れない。';

-- ===========================================================================
-- ② approval_drafts view — 0018 をコピーし末尾に d.attachments 列を追加
--    （view への列追加は drop&recreate ではなく create or replace で末尾追加可だが、
--     列順・依存安定のため 0018 同様 create or replace で全列を明示再定義する）
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
  coalesce(d.attachments, '[]'::jsonb) as attachments
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
-- ③ set_approval_status RPC — p_attachments を追加（後方互換）
--    承認確定時に写真の upload intent を attachments に書く唯一の意思決定点。
--    p_attachments が null のときは既存値を維持（coalesce）＝既存呼び出し(2引数)は不変。
--    claim 条件（pending / editor_status='approved' / 未公開 / 未予約）は 0018 と同一。
--
--    ⚠️ 旧シグネチャ set_approval_status(uuid[], text) を drop してから再作成する。
--       plpgsql の default 引数追加はオーバーロードを生み曖昧呼び出しになるため、
--       明示 drop で 1 シグネチャに統一する。
-- ===========================================================================
drop function if exists xad.set_approval_status(uuid[], text);

create or replace function xad.set_approval_status(
  p_ids uuid[],
  p_status text,
  p_attachments jsonb default null
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
           attachments = coalesce(p_attachments, d.attachments)
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
