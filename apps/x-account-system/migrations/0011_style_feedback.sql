-- migrations/0011_style_feedback.sql
-- LINE フィードバックコマンド (修正: / 覚えて:) の永続化。
-- 過去のユーザー指摘を将来の draft 生成に SOFT reference として注入するための保管庫。
--   kind='remember' : 「覚えて:」で登録された継続参考ガイダンス
--   kind='revise'   : 「修正:」で適用した指示 (再生成 + 継続参考の両方を兼ねる)
-- FILE ONLY — live DB へは適用しない (apply_migration は実行しない)。

create extension if not exists "uuid-ossp";

create table if not exists xad.style_feedback (
  id uuid primary key default uuid_generate_v4(),
  kind text not null check (kind in ('remember','revise')),
  draft_id text,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_style_feedback_created on xad.style_feedback (created_at desc);

alter table xad.style_feedback enable row level security;
