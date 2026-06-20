-- StayClean Sprint 2 Phase 3: 複数人依頼回答と確定アルゴリズム基盤
-- 本番適用は人間ゲート。アプリは service role 経由でアクセスし、RLS policy は作らない。

create type response_answer as enum ('available','unavailable');

create table cleaning_request_recipients (
  request_id uuid not null references cleaning_requests(id) on delete cascade,
  staff_id   uuid not null references staff(id) on delete cascade,
  excluded boolean not null default false,
  notified_at timestamptz,
  primary key (request_id, staff_id)
);

create table cleaning_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references cleaning_requests(id) on delete cascade,
  staff_id   uuid not null references staff(id) on delete cascade,
  answer response_answer not null,
  offered_date date,
  responded_at timestamptz not null default now(),
  unique (request_id, staff_id)
);
create index idx_responses_request on cleaning_responses(request_id);

alter table cleaning_requests
  add column reservation_id uuid references reservations(id) on delete set null,
  add column offer_date_start date,
  add column offer_date_end date,
  add column scheduled_clean_date date,
  add column provisional_decision_at timestamptz,
  add column confirmed_at timestamptz;

alter table cleaning_request_recipients enable row level security;
alter table cleaning_responses enable row level security;
