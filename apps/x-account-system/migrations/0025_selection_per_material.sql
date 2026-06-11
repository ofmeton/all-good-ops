-- 0025_selection_per_material.sql — 素材ごと希望 fmat/template を一括反映する選抜RPC
--
-- ⚠️ 本番 xad(project=hofvvcvhjslevymhbcqj) への適用は人間ゲート。
--    本ファイルは SQL を用意するのみ（apply は別途・人間確認後 = Phase 2）。
--
-- ⚠️ 適用前に実スキーマを Inspect せよ:
--    - xad.materials_store(meta jsonb / source_type) が存在し source_type='x_inspirations'
--      で選抜対象を絞っていること（0001 / 0016 / 0017 と整合）。
--    - fmat whitelist は 0017 の set_selection_status と同一であること
--      （('short','medium','long','article','thread')）。drift があれば下の検証を合わせる。
--
-- 背景: 要件1（執筆送信時に素材ごと推薦 format/template をデフォルト選択）に対応。
--   0017 の 4 引数 set_selection_status は「バッチ全件に同一 fmat/template」を当てるため、
--   素材ごとに別々の希望を渡せない。本RPCは [{id, desired_fmat, template_id}] を素材単位で展開し、
--   各素材の meta に jsonb_set する。
--
-- 後方互換: 既存 4 引数版 set_selection_status(uuid[], text, text, text) は残置（W1 のフォールバック）。
--   本ファイルでは DROP しない。新関数 set_selection_status_items を追加するのみ。

create or replace function xad.set_selection_status_items(
  p_items  jsonb,
  p_status text
)
returns integer language plpgsql as $$
declare
  n integer := 0;
  v_item jsonb;
  v_id uuid;
  v_fmat text;
  v_template text;
  v_updated integer;
begin
  -- 境界ガード: p_status は 0016/0017 と同一 whitelist
  if p_status not in ('collected','selected','queued','rejected') then
    raise exception 'invalid selection_status: %', p_status;
  end if;
  -- 境界ガード: p_items は配列であること
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items must be a jsonb array';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    -- 各要素は object。id は必須、desired_fmat / template_id は任意。
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'each item must be a jsonb object: %', v_item;
    end if;
    if (v_item->>'id') is null then
      raise exception 'item missing id: %', v_item;
    end if;
    v_id := (v_item->>'id')::uuid;
    v_fmat := v_item->>'desired_fmat';      -- null 可
    v_template := v_item->>'template_id';   -- null 可

    -- fmat 検証（0017 と同一 whitelist。非 NULL のときだけ）
    if v_fmat is not null
       and v_fmat not in ('short','medium','long','article','thread') then
      raise exception 'invalid desired_fmat: %', v_fmat;
    end if;

    update xad.materials_store
       set meta =
             -- ① selection_status は常に更新（既存挙動）
             -- ② desired_fmat / template_id は非 NULL のときだけ jsonb_set で追記
             case when v_template is not null then
               jsonb_set(
                 case when v_fmat is not null then
                   jsonb_set(
                     jsonb_set(coalesce(meta, '{}'::jsonb), '{selection_status}', to_jsonb(p_status)),
                     '{desired_fmat}', to_jsonb(v_fmat))
                 else
                   jsonb_set(coalesce(meta, '{}'::jsonb), '{selection_status}', to_jsonb(p_status))
                 end,
                 '{template_id}', to_jsonb(v_template))
             else
               case when v_fmat is not null then
                 jsonb_set(
                   jsonb_set(coalesce(meta, '{}'::jsonb), '{selection_status}', to_jsonb(p_status)),
                   '{desired_fmat}', to_jsonb(v_fmat))
               else
                 jsonb_set(coalesce(meta, '{}'::jsonb), '{selection_status}', to_jsonb(p_status))
               end
             end,
           updated_at = now()
     where id = v_id
       and source_type = 'x_inspirations';
    get diagnostics v_updated = row_count;
    n := n + v_updated;
  end loop;

  return n;
end $$;

comment on function xad.set_selection_status_items(jsonb, text) is
  '素材ごと希望 fmat/template を一括反映する選抜RPC（要件1）。'
  'p_items=[{id, desired_fmat?, template_id?}] を jsonb_array_elements で展開し素材単位 meta を jsonb_set。'
  'fmat 検証は 0017 set_selection_status と同一 whitelist。0017 の 4 引数版は後方互換で残置。';
