-- 民泊清掃管理アプリ 初期スキーマ
-- 認可はアプリ層（resolveActor）で行うため RLS は有効化しない。
-- 全アクセスは service role key 経由のサーバーコードに限定する。

create type cleaning_status as enum (
  'unassigned', 'assigned', 'in_progress', 'reported', 'confirmed'
);
create type token_type as enum ('owner', 'staff');
create type notification_channel as enum ('line', 'email');

-- 管理者（認証情報は Supabase Auth が管理。ここはプロフィール）
create table admins (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role_level int not null default 1,
  created_at timestamptz not null default now()
);

-- 物件オーナー
create table owners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  line_user_id text,
  email text,
  created_at timestamptz not null default now()
);

-- 物件
create table properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owners(id) on delete restrict,
  name text not null,
  address text,
  access_info_note text,
  checklist_template jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

-- 清掃スタッフ
create table staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  line_user_id text,
  email text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

-- スタッフ↔担当物件（N:N）
create table staff_assignments (
  staff_id uuid not null references staff(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  primary key (staff_id, property_id)
);

-- トークンURL
create table access_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  type token_type not null,
  property_id uuid references properties(id) on delete cascade,
  staff_id uuid references staff(id) on delete cascade,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint token_target_check check (
    (type = 'owner' and property_id is not null and staff_id is null) or
    (type = 'staff' and staff_id is not null and property_id is null)
  )
);

-- 清掃依頼
create table cleaning_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete restrict,
  checkin_date date not null,
  checkout_date date not null,
  guest_count int not null,
  option_memo text,
  status cleaning_status not null default 'unassigned',
  assigned_staff_id uuid references staff(id) on delete set null,
  assignment_deadline timestamptz,
  created_by uuid references admins(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 完了報告
create table cleaning_reports (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references cleaning_requests(id) on delete cascade,
  staff_id uuid not null references staff(id) on delete restrict,
  checklist_result jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now()
);

-- 完了写真
create table report_photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references cleaning_reports(id) on delete cascade,
  storage_path text not null,
  uploaded_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- 備品補充依頼
create table supply_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  request_id uuid references cleaning_requests(id) on delete set null,
  staff_id uuid not null references staff(id) on delete restrict,
  items text not null,
  created_at timestamptz not null default now()
);

-- 通知送信ログ
create table notifications_log (
  id uuid primary key default gen_random_uuid(),
  channel notification_channel not null,
  recipient text not null,
  kind text not null,
  payload jsonb,
  status text not null,
  sent_at timestamptz not null default now()
);

create index idx_properties_owner on properties(owner_id);
create index idx_requests_property on cleaning_requests(property_id);
create index idx_requests_status on cleaning_requests(status);
create index idx_tokens_token on access_tokens(token);
create index idx_staff_assignments_property on staff_assignments(property_id);
