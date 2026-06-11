-- 0026_draft_lifecycle.sql — draft ライフサイクル拡張: 破棄(discarded) / 修正依頼(revision_requested)
--
-- ⚠️ 本番 xad(project=hofvvcvhjslevymhbcqj) への適用は人間ゲート。
--    本ファイルは SQL を用意するのみ（apply は別途・人間確認後 = Phase 2）。
--
-- ⚠️ 適用前に必ず実スキーマを Inspect せよ（推測でスキーマを断定しない）:
--    1. human_approval_status の CHECK 制約名:
--       0002_posts_performance.sql:87-89 はインライン無名 CHECK のため
--       Postgres が自動命名する（慣例上 'post_drafts_human_approval_status_check'）。
--       実際の名前を必ず確認してから DROP する:
--         select conname from pg_constraint
--          where conrelid = 'xad.post_drafts'::regclass
--            and contype = 'c'
--            and pg_get_constraintdef(oid) ilike '%human_approval_status%';
--       下の DROP CONSTRAINT 名が実環境と異なる場合はその名前に置換すること。
--    2. published_at カラム: 0007_worker_backend.sql:55 で
--       'alter table xad.post_drafts add column if not exists published_at timestamptz' 済。
--       CAS の published_at IS NULL 条件が依存するため存在を確認すること。
--    3. scheduled_for カラム: 0014_scheduled_publish.sql。
--    4. core_ideas.source_material_ids（uuid[]）と materials_store.meta（jsonb）の存在。
--
-- 構成:
--   ① human_approval_status CHECK を 'discarded','revision_requested' 追加で拡張。
--   ② xad.discard_approved_drafts: approved&未公開&未予約 → 'discarded'（論理破棄・復元可）
--      + approval_reason coalesce + core_ideas.status='draft'（再利用可・決定3）。
--   ③ xad.request_draft_revision: pending&未公開&未予約 → 'revision_requested'
--      + approval_reason '[修正依頼] '||instruction + 素材 meta を再執筆向けにリセット（決定2 配管）。

-- ===========================================================================
-- ① human_approval_status CHECK 拡張
--    ⚠️ DROP する制約名は上の Inspect 手順で必ず実環境を確認すること。
-- ===========================================================================
alter table xad.post_drafts
  drop constraint if exists post_drafts_human_approval_status_check;

alter table xad.post_drafts
  add constraint post_drafts_human_approval_status_check
  check (human_approval_status in (
    'pending', 'approved', 'rejected', 'auto_approved',
    'discarded', 'revision_requested'
  ));

-- ===========================================================================
-- ② discard_approved_drafts — 承認済みの論理破棄（復元可）
--    CAS: status='approved' AND published_at IS NULL AND scheduled_for IS NULL
--    → human_approval_status='discarded' + approval_reason coalesce
--    + core_ideas.status='draft'（元素材は再利用可＝再キュレ/再執筆の対象に戻す・決定3）。
--    claim 件数を返す。二重押下は CAS で no-op（冪等）。
-- ===========================================================================
create or replace function xad.discard_approved_drafts(
  p_ids    uuid[],
  p_reason text default null
)
returns integer language plpgsql as $$
declare
  n integer;
begin
  with claimed as (
    update xad.post_drafts d
       set human_approval_status = 'discarded',
           approval_reason       = coalesce(p_reason, d.approval_reason)
     where d.id = any(p_ids)
       and d.human_approval_status = 'approved'
       and d.published_at is null
       and d.scheduled_for is null
    returning d.core_idea_id
  ),
  idea_upd as (
    -- 決定3: 破棄しても元ネタ(core_ideas)は archive せず status='draft' に戻す（再利用可）。
    update xad.core_ideas ci
       set status = 'draft'
      from claimed
     where ci.id = claimed.core_idea_id
    returning ci.id
  )
  select count(*) into n from claimed;
  return n;
end $$;

comment on function xad.discard_approved_drafts(uuid[], text) is
  '承認済みドラフトの論理破棄（復元可・要件3）。CAS approved&未公開&未予約 → discarded。'
  'core_ideas は決定3により status=draft に戻し再利用可とする（archive しない）。';

-- ===========================================================================
-- ③ request_draft_revision — 指示文つき修正依頼（要件4+5）
--    CAS: pending&未公開&未予約 → human_approval_status='revision_requested'
--    + approval_reason '[修正依頼] '||instruction（reject と学習上区別・決定小項目5）。
--    元素材 meta を再執筆向けにリセット（決定2 配管・解釈は writer agent 判断）:
--      composed_at=null / compose_claimed_at=null / compose_attempts++ /
--      human_revision_note=instruction / previous_draft_body=draft.body /
--      selection_status='queued'。desired_fmat・template_id は非 NULL 時のみ上書き。
--    claim 件数を返す（0 or 1）。即時 enqueueCompose は dashboard 側 W2 で行う。
-- ===========================================================================
create or replace function xad.request_draft_revision(
  p_draft_id    uuid,
  p_instruction text,
  p_desired_fmat text default null,
  p_template_id  text default null
)
returns integer language plpgsql as $$
declare
  n integer;
  v_core_idea_id uuid;
  v_body text;
  v_material_ids uuid[];
begin
  -- 境界ガード: instruction 必須・fmat whitelist（0017 と同一）
  if p_instruction is null or length(trim(p_instruction)) = 0 then
    raise exception 'p_instruction must not be empty';
  end if;
  if p_desired_fmat is not null
     and p_desired_fmat not in ('short','medium','long','article','thread') then
    raise exception 'invalid desired_fmat: %', p_desired_fmat;
  end if;

  -- CAS: pending&未公開&未予約 のみ claim。draft の core_idea_id と body を取得。
  update xad.post_drafts d
     set human_approval_status = 'revision_requested',
         approval_reason       = '[修正依頼] ' || p_instruction
   where d.id = p_draft_id
     and d.human_approval_status = 'pending'
     and d.published_at is null
     and d.scheduled_for is null
  returning d.core_idea_id, d.body
       into v_core_idea_id, v_body;

  get diagnostics n = row_count;
  if n = 0 then
    return 0;  -- 既に公開/予約/別状態 = no-op（冪等）
  end if;

  -- 元ネタ素材 ids を取得
  select ci.source_material_ids into v_material_ids
    from xad.core_ideas ci
   where ci.id = v_core_idea_id;

  -- core_ideas を再執筆対象へ（status=draft）
  update xad.core_ideas
     set status = 'draft'
   where id = v_core_idea_id;

  -- 元素材 meta を再執筆向けにリセット（一括）。
  -- desired_fmat / template_id は非 NULL のときだけ上書き（NULL=現状維持・要件5）。
  if v_material_ids is not null then
    update xad.materials_store m
       set meta =
             (
               -- 基本リセット: composed_at/compose_claimed_at を消し attempts++・各種メモを書く
               jsonb_set(
                 jsonb_set(
                   jsonb_set(
                     jsonb_set(
                       coalesce(m.meta, '{}'::jsonb)
                         - 'composed_at' - 'compose_claimed_at',
                       '{selection_status}', to_jsonb('queued'::text)),
                     '{compose_attempts}',
                     to_jsonb(coalesce((m.meta->>'compose_attempts')::int, 0) + 1)),
                   '{human_revision_note}', to_jsonb(p_instruction)),
                 '{previous_draft_body}', to_jsonb(coalesce(v_body, ''))
               )
             )
             -- desired_fmat / template_id は非 NULL 時のみ上書き
             || case when p_desired_fmat is not null
                     then jsonb_build_object('desired_fmat', p_desired_fmat)
                     else '{}'::jsonb end
             || case when p_template_id is not null
                     then jsonb_build_object('template_id', p_template_id)
                     else '{}'::jsonb end,
           updated_at = now()
     where m.id = any(v_material_ids)
       and m.source_type = 'x_inspirations';
  end if;

  return n;
end $$;

comment on function xad.request_draft_revision(uuid, text, text, text) is
  '指示文つき修正依頼（要件4+5）。CAS pending&未公開&未予約 → revision_requested。'
  'reject と区別して学習用に approval_reason に記録。元素材 meta を再執筆向けにリセットし、'
  'desired_fmat/template_id は非 NULL 時のみ上書き（現状維持=NULL）。即時 enqueueCompose は呼び出し側。';
