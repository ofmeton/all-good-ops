-- 0015_collector_fields.sql — Collector Agent: 選抜状態のインデックスと新ソース候補テーブル

-- selection_status / overall は meta jsonb 内（buildMaterialRow 参照）。
-- 人間UIのソート・絞り込み高速化のため式インデックスを張る。
create index if not exists materials_store_selection_status_idx
  on xad.materials_store ((meta->>'selection_status'))
  where source_type = 'x_inspirations';

create index if not exists materials_store_overall_idx
  on xad.materials_store (((meta->'scores'->>'overall')::numeric))
  where source_type = 'x_inspirations';

-- 新ソース発見プール（即 watchlist 昇格しない）
create table if not exists xad.candidate_sources (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  handle text not null,
  discovered_via text not null,          -- user_search | following | trend
  discovered_query text,
  reason text,
  status text not null default 'candidate' -- candidate | promoted | rejected
    check (status in ('candidate','promoted','rejected')),
  unique (handle)
);
