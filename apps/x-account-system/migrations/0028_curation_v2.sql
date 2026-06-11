-- 0028_curation_v2.sql — キュレーション改善基盤（PR-3）
--   ① 表示時 time-decay スコア（effective_overall / freshness_eff）= スコアのリアルタイム化（要件3）
--   ② lane（candidate / reference）= 日本語二次流通の参考レーン分離の土台（要件4・PR-4 で収集時付与）
--   ③ archived ステータス + auto-archive RPC = 未操作素材の自動退避の土台（要件2・PR-5 で発火/UI）
--   ④ collector_source_stats = 収集無駄のソース別計測（要件1・PR-6 の剪定根拠）
--
-- ⚠️ 本番 xad(project=hofvvcvhjslevymhbcqj) への適用は人間ゲート。CREATE OR REPLACE / ADD のみで
--    既存列・関数シグネチャを壊さない（後方互換）。現行 deploy の dashboard（overall_score 参照）も
--    引き続き動作する。
--
-- 実スキーマ Inspect 済（2026-06-11）:
--   - materials_store に created_at(採点/挿入時刻) / updated_at あり。
--   - 本番 view xad.curation_materials は 0016 から drift し translation 列を含む（後付け）。
--     → v2 でも translation を必ず保持する（外すと dashboard の m.translation が壊れる）。
--   - velocity_per_hour は meta に未保存 → view で engagement とツイート経過時間から算出。
--   - selection_status 実在値: collected / queued / rejected（selected は 0 件）。lane 未付与（ja 250 件）。

-- ① フラット化ビュー v2（0016 の置換）。既存列を全保持 + 派生列を追加。
create or replace view xad.curation_materials as
with base as (
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
    (m.meta->>'translation')                         as translation,
    -- lane: 明示 meta.lane を優先、無ければ ja=reference / それ以外 candidate
    --       （PR-4 の収集時付与・backfill 後も整合。未付与の現行データでも view 側で確定）。
    coalesce(
      m.meta->>'lane',
      case when m.meta->>'lang' = 'ja' then 'reference' else 'candidate' end
    )                                                as lane,
    -- 採点/挿入時刻 created_at からの経過（時間）。freshness decay の基準。
    greatest(extract(epoch from (now() - m.created_at)) / 3600.0, 0)            as age_hours_scored,
    -- ツイート投稿時刻 meta.collected_at からの経過（時間, 最小0.1で0除算回避）。velocity_per_hour の基準。
    greatest(extract(epoch from (now() - (m.meta->>'collected_at')::timestamptz)) / 3600.0, 0.1) as tweet_age_hours
  from xad.materials_store m
  where m.source_type = 'x_inspirations'
)
select
  id, source_ref, raw_text, created_at, collected_at, selection_status,
  overall_score, freshness, velocity, target_fit, score_reason,
  discovery_via, discovery_query, lang, tweet_url, conversation_id,
  media, engagement, translation, lane,
  -- freshness を半減期48hで指数減衰させた「いまの鮮度」。
  case when freshness is null then null
       else round(freshness * exp(-ln(2.0) * age_hours_scored / 48.0)) end          as freshness_eff,
  -- effective_overall: 減衰した freshness 分（重み0.3 = collector-config.ts scoringWeights.freshness）
  --   だけ overall から引く。LLM 再計算なし・決定的＝昨日と今日でスコアが変わる（要件3）。
  case when overall_score is null then null
       when freshness is null then overall_score
       else greatest(0, round(
         overall_score - 0.3 * (freshness - round(freshness * exp(-ln(2.0) * age_hours_scored / 48.0)))
       )) end                                                                        as effective_overall,
  -- 時間あたりエンゲージ（バズ速度）= (like+rt+bookmark) / ツイート経過時間。PR-5 inbox セーフガード/source_stats 用。
  case when engagement is null then null
       else round((
         coalesce((engagement->>'like')::numeric, 0)
         + coalesce((engagement->>'retweet')::numeric, 0)
         + coalesce((engagement->>'bookmark')::numeric, 0)
       ) / tweet_age_hours, 1) end                                                   as velocity_per_hour
from base;

-- ② selection_status whitelist に 'archived' を追加（4引数版・0017 の置換。シグネチャ同一）。
create or replace function xad.set_selection_status(
  p_ids uuid[],
  p_status text,
  p_desired_fmat text default null,
  p_template_id text default null
)
returns integer language plpgsql as $$
declare n integer;
begin
  if p_status not in ('collected','selected','queued','rejected','archived') then
    raise exception 'invalid selection_status: %', p_status;
  end if;
  if p_desired_fmat is not null
     and p_desired_fmat not in ('short','medium','long','article','thread') then
    raise exception 'invalid desired_fmat: %', p_desired_fmat;
  end if;
  update xad.materials_store
     set meta =
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

-- ② selection_status whitelist に 'archived' を追加（per-item 版・0025 の置換。シグネチャ同一）。
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
  if p_status not in ('collected','selected','queued','rejected','archived') then
    raise exception 'invalid selection_status: %', p_status;
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items must be a jsonb array';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'each item must be a jsonb object: %', v_item;
    end if;
    if (v_item->>'id') is null then
      raise exception 'item missing id: %', v_item;
    end if;
    v_id := (v_item->>'id')::uuid;
    v_fmat := v_item->>'desired_fmat';
    v_template := v_item->>'template_id';

    if v_fmat is not null
       and v_fmat not in ('short','medium','long','article','thread') then
      raise exception 'invalid desired_fmat: %', v_fmat;
    end if;

    update xad.materials_store
       set meta =
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

-- ③ curation_events.action に 'archive'（自動退避の動詞）を許可。
alter table xad.curation_events drop constraint if exists curation_events_action_check;
alter table xad.curation_events add constraint curation_events_action_check
  check (action in ('select','reject','reset','send_to_compose','archive'));

-- ③ 古い未操作素材を自動退避（削除でなく collected → archived）。collect job 末尾で呼ぶ（PR-5）。
--    削除しない・curation_events に system actor で snapshot 付き追記＝全件監査可能・reset で復帰可能。
create or replace function xad.archive_stale_materials(p_days integer)
returns integer language plpgsql as $$
declare n integer;
begin
  if p_days is null or p_days < 1 then
    raise exception 'p_days must be >= 1 (got %)', p_days;  -- 0日で全 collected 退避する事故を防ぐ
  end if;

  with stale as (
    select m.id, m.source_ref, m.meta as old_meta
    from xad.materials_store m
    where m.source_type = 'x_inspirations'
      and m.meta->>'selection_status' = 'collected'   -- selected/queued/rejected/archived は対象外
      and m.created_at < now() - make_interval(days => p_days)
  ),
  upd as (
    update xad.materials_store m
       set meta = jsonb_set(m.meta, '{selection_status}', to_jsonb('archived'::text)),
           updated_at = now()
      from stale s
     where m.id = s.id
     returning s.id, s.source_ref, s.old_meta
  ),
  logged as (
    insert into xad.curation_events
      (material_id, action, from_status, to_status, scores, discovery, source_ref, note, actor)
    select u.id, 'archive', 'collected', 'archived',
           u.old_meta->'scores', u.old_meta->'discovery', u.source_ref,
           'auto-archive: collected ' || p_days || 'd 経過', 'system'
    from upd u
    returning 1
  )
  select count(*) into n from upd;
  return n;
end $$;

comment on function xad.archive_stale_materials(integer) is
  'collected のまま p_days 日経過した x_inspirations 素材を archived へ自動退避（要件2）。'
  '削除せず・curation_events に actor=system / action=archive で snapshot 追記。reset で復帰可。collect job 末尾で発火。';

-- ④ ソース別 収集→投稿候補化の転換率（直近14日）。収集無駄の剪定根拠（要件1・PR-6 の月次レビュー）。
create or replace view xad.collector_source_stats as
select
  m.source_ref,
  count(*)                                                                   as collected_count,
  count(*) filter (where m.meta->>'selection_status' = 'queued')             as queued_count,
  count(*) filter (
    where coalesce(m.meta->>'lane',
      case when m.meta->>'lang' = 'ja' then 'reference' else 'candidate' end) = 'reference'
  )                                                                          as reference_count,
  round(avg((m.meta->'scores'->>'overall')::numeric), 1)                     as avg_overall,
  round(100.0 * count(*) filter (where m.meta->>'selection_status' = 'queued')
        / nullif(count(*), 0), 1)                                            as queued_rate_pct
from xad.materials_store m
where m.source_type = 'x_inspirations'
  and m.created_at > now() - interval '14 days'
group by m.source_ref
order by collected_count desc;

-- ⑤ 既存素材の meta.lane を backfill（ja=reference / それ以外 candidate）。未付与のものだけ。冪等。
--    view 側でも coalesce で確定するが、source_stats / 直接 meta クエリのため materialize しておく。
update xad.materials_store
   set meta = jsonb_set(meta, '{lane}',
        to_jsonb(case when meta->>'lang' = 'ja' then 'reference' else 'candidate' end)),
       updated_at = now()
 where source_type = 'x_inspirations'
   and not (meta ? 'lane');
