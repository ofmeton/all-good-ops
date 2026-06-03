-- migrations/0012_line_message_map.sql
-- LINE 承認カードの message_id ↔ draft_id 紐づけテーブル。
-- 引用リプライ (quotedMessageId) から対象 draft を逆引きするために使う。
--   message_id : LINE push レスポンスの sentMessages[].id (承認カードの message id)
--   draft_id   : 対応する post_drafts.id
-- FILE ONLY — live DB へは適用しない (apply_migration は実行しない)。

create table if not exists xad.line_message_map (
  message_id text primary key,
  draft_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_line_message_map_draft on xad.line_message_map (draft_id);

alter table xad.line_message_map enable row level security;
