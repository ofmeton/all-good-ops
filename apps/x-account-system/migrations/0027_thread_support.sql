-- 0027_thread_support.sql — スレッド投稿対応: post_drafts.thread_bodies + approval_drafts view 再作成
--
-- ⚠️ 本番 xad(project=hofvvcvhjslevymhbcqj) への適用は人間ゲート。
--    本ファイルは SQL を用意するのみ（apply は別途・人間確認後 = Phase 2）。
--
-- ⚠️ 適用前に実スキーマを Inspect せよ:
--    - approval_drafts view の現行定義（0023_approval_reason.sql:31-71 が最新）を確認し、
--      列の欠落・追加がないこと。本ファイルは 0023 の全列 + thread_bodies で再定義する。
--        select pg_get_viewdef('xad.approval_drafts'::regclass, true);
--    - fmat CHECK に 'thread' が既存（0002:63）であること。
--
-- 契約（重要）:
--   thread_bodies が「投稿時の正」。body は thread_bodies を "\n\n---\n\n" で join した派生。
--   thread_bodies IS NULL = 単一ツイート（後方互換）。
--   insert 時は thread draft なら必ず両方（body と thread_bodies）を書くこと
--   （dashboard lib/thread-logic.ts / x-account-system lib/curation/thread.ts の joinThread と同一区切り）。

-- ===========================================================================
-- ① post_drafts.thread_bodies — スレッド本文配列（null=単一・後方互換）
-- ===========================================================================
alter table xad.post_drafts
  add column if not exists thread_bodies jsonb;

comment on column xad.post_drafts.thread_bodies is
  'スレッド投稿の本文配列（jsonb 文字列配列）。null=単一ツイート（後方互換）。'
  'thread_bodies が投稿時の正。body は "\n\n---\n\n" join 派生。insert 時は両方を書く。';

-- ===========================================================================
-- ② approval_drafts view 再作成 — 0023 の全列 + thread_bodies を末尾に追加
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
  d.approval_reason,
  d.thread_bodies
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
