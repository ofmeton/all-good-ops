-- 0016_curation.sql — 人間キュレーションUI(ステージ2): 意思決定ログ・状態更新RPC・閲覧ビュー

-- ① 追記型 意思決定ログ（run_trace 相乗りでなく専用＝material単位・snapshot付き・分析容易）
create table if not exists xad.curation_events (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  material_id uuid not null references xad.materials_store(id),
  action text not null check (action in ('select','reject','reset','send_to_compose')),
  from_status text,
  to_status text not null,
  scores jsonb,            -- 決定時点の {freshness,velocity,target_fit,overall} コピー（drift 防止）
  discovery jsonb,         -- {via, query} コピー
  source_ref text,         -- author handle
  note text,               -- 任意: 人間メモ（スコア違和感等。L5 シグナル）
  compose_run_id uuid,     -- send_to_compose 時の enqueue runId（収集→選抜→執筆の貫通）
  actor text not null default 'ofmeton'
);
create index if not exists curation_events_material_idx on xad.curation_events(material_id);
create index if not exists curation_events_action_created_idx on xad.curation_events(action, created_at);
create index if not exists curation_events_via_idx on xad.curation_events((discovery->>'via'));

-- ② 選抜状態の原子的バッチ更新（meta jsonb 内 selection_status を jsonb_set。他 meta キーは保持）
create or replace function xad.set_selection_status(p_ids uuid[], p_status text)
returns integer language plpgsql as $$
declare n integer;
begin
  if p_status not in ('collected','selected','queued','rejected') then
    raise exception 'invalid selection_status: %', p_status;
  end if;
  update xad.materials_store
     set meta = jsonb_set(meta, '{selection_status}', to_jsonb(p_status)),
         updated_at = now()
   where id = any(p_ids)
     and source_type = 'x_inspirations';
  get diagnostics n = row_count;
  return n;
end $$;

-- ③ フラット化ビュー（jsonb の overall を numeric 列化 → サーバ側ソート/フィルタが正しく簡潔に）
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
  (m.meta->'engagement')                           as engagement
from xad.materials_store m
where m.source_type = 'x_inspirations';
