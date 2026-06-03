-- migrations/0007_worker_backend.sql
create extension if not exists "uuid-ossp";  -- 既存 migration が uuid_generate_v4 を使うが明示有効化が無いため

-- safety_state: kill-switch / brownout / publisher gate の永続状態（kill-switch.ts が scope='global' で参照）
create table if not exists xad.safety_state (
  scope text primary key,
  publishing_enabled boolean not null default true,
  resume_at timestamptz,
  triggered_by text,
  updated_at timestamptz not null default now()
);
insert into xad.safety_state (scope, publishing_enabled) values ('global', true)
  on conflict (scope) do nothing;
alter table xad.safety_state enable row level security;

-- optimizer_state: OptimizerState posterior 永続。singleton（scope PK で upsert）
create table if not exists xad.optimizer_state (
  scope text primary key default 'global',
  generation int not null default 0,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
alter table xad.optimizer_state enable row level security;

-- optimizer_snapshot: rollback 用
create table if not exists xad.optimizer_snapshot (
  id uuid primary key default uuid_generate_v4(),
  snapshot_id text not null unique,
  state jsonb not null,
  created_at timestamptz not null default now()
);
alter table xad.optimizer_snapshot enable row level security;

-- interview_sessions: interviewer 途中状態（Workers ステートレス対策、InterviewSession を素直に永続）
create table if not exists xad.interview_sessions (
  id text primary key,
  line_user_id text not null,
  current_step text not null,
  industry text not null,
  topic text not null,
  answers jsonb not null default '[]'::jsonb,
  material_id text,
  publication_consent text not null default 'pending',
  finalized boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table xad.interview_sessions enable row level security;

-- post_drafts 追加列
alter table xad.post_drafts add column if not exists scheduled_date date;
alter table xad.post_drafts add column if not exists slot text;
alter table xad.post_drafts add column if not exists editor_output jsonb;
alter table xad.post_drafts add column if not exists embedding extensions.vector(1536);
alter table xad.post_drafts add column if not exists published_at timestamptz;
alter table xad.post_drafts add column if not exists writer_draft_id text;
create unique index if not exists post_drafts_date_slot_uniq
  on xad.post_drafts (scheduled_date, slot) where scheduled_date is not null;

-- core_ideas に writer 入力フィールドを追加（CoreIdea = {topic, primaryHook, fmat, contentType, audience, sourceMaterialIds}）
alter table xad.core_ideas add column if not exists topic text;
alter table xad.core_ideas add column if not exists primary_hook text;
alter table xad.core_ideas add column if not exists fmat text;
alter table xad.core_ideas add column if not exists audience text;
-- contentType は既存 category(paraphrase/first_hand/industry_sop) を流用、不足分は meta jsonb で補完
