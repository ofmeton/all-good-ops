-- 0020_ma_agents.sql — Managed Agents 永続ランタイムの registry（段階1 P1）
-- 適用: MCP apply_migration（既存 0006〜0019 と同経路）。**本番適用は人間確認ゲート**。
--
-- 永続化した Managed Agent（environment / agent を毎回 create/delete せず再利用）の
-- 参照を保持する。agent_key（writer / editor 等の論理キー）で active な
-- agent_id / version / environment_id を引き、run-session の persistent 経路に渡す。
-- RLS 有効化＝service role 専用（anon は読めない。0013 と同方針で policy は付与しない）。

create table if not exists xad.ma_agents (
  agent_key      text primary key,
  agent_id       text not null,
  version        text not null,
  environment_id text not null,
  model          text not null,
  status         text not null default 'active',   -- active | archived
  system_hash    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table xad.ma_agents enable row level security;
-- policy は付与しない（service role 専用、anon は読めない）

-- persistent writer セッションの相関キー（compose 経路で writer_session_id を保持）
alter table xad.post_drafts add column if not exists writer_session_id text;
