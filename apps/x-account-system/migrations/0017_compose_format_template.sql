-- 0017_compose_format_template.sql — 執筆送信時の希望フォーマット/テンプレ選択を meta に記録
-- set_selection_status を引数拡張（p_desired_fmat / p_template_id を追加）。
-- p_desired_fmat / p_template_id は非 NULL のときだけ meta に jsonb_set で追記。
-- NULL は既存値保持（他 meta キー・既存 desired_fmat/template_id を壊さない）。
--
-- ⚠️ 引数を増やすと CREATE OR REPLACE は別シグネチャの新関数を作り、0016 の
--    2引数版が残って 2引数呼び出しが「function is not unique」で曖昧化する。
--    旧2引数版を明示 DROP してから 4引数版を作る（呼び出し元は dashboard の
--    4引数呼び出しのみ＝後方互換は 4引数の DEFAULT NULL が担保）。
drop function if exists xad.set_selection_status(uuid[], text);

create or replace function xad.set_selection_status(
  p_ids uuid[],
  p_status text,
  p_desired_fmat text default null,
  p_template_id text default null
)
returns integer language plpgsql as $$
declare n integer;
begin
  if p_status not in ('collected','selected','queued','rejected') then
    raise exception 'invalid selection_status: %', p_status;
  end if;
  if p_desired_fmat is not null
     and p_desired_fmat not in ('short','medium','long','article','thread') then
    raise exception 'invalid desired_fmat: %', p_desired_fmat;
  end if;
  update xad.materials_store
     set meta =
           -- ① selection_status は常に更新（既存挙動）
           -- ② desired_fmat / template_id は非 NULL のときだけ jsonb_set で追記
           case when p_template_id is not null then
             jsonb_set(
               case when p_desired_fmat is not null then
                 jsonb_set(
                   jsonb_set(coalesce(meta, '{}'::jsonb), '{selection_status}', to_jsonb(p_status)),
                   '{desired_fmat}', to_jsonb(p_desired_fmat))
               else
                 jsonb_set(coalesce(meta, '{}'::jsonb), '{selection_status}', to_jsonb(p_status))
               end,
               '{template_id}', to_jsonb(p_template_id))
           else
             case when p_desired_fmat is not null then
               jsonb_set(
                 jsonb_set(coalesce(meta, '{}'::jsonb), '{selection_status}', to_jsonb(p_status)),
                 '{desired_fmat}', to_jsonb(p_desired_fmat))
             else
               jsonb_set(coalesce(meta, '{}'::jsonb), '{selection_status}', to_jsonb(p_status))
             end
           end,
         updated_at = now()
   where id = any(p_ids)
     and source_type = 'x_inspirations';
  get diagnostics n = row_count;
  return n;
end $$;
