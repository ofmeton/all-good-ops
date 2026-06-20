-- StayClean Sprint 2 Phase 2: iCal予約取込（基盤）
-- 本番適用は人間ゲート。アプリは service role 経由でアクセスし、RLS policy は作らない。

create type reservation_source as enum ('ical','manual');
create type reservation_status as enum ('active','cancelled');

create table property_ical_feeds (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  url text not null,
  ota_label text,
  last_fetched_at timestamptz,
  last_status text,
  created_at timestamptz not null default now(),
  unique (property_id, url)
);

create table reservations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  feed_id uuid references property_ical_feeds(id) on delete set null,
  external_uid text,
  source reservation_source not null,
  checkin_date date not null,
  checkout_date date not null,
  guest_count int,
  status reservation_status not null default 'active',
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservations_checkout_after_checkin check (checkout_date > checkin_date),
  constraint reservations_guest_count_positive check (guest_count is null or guest_count > 0)
);

create unique index uq_reservations_feed_uid
  on reservations(feed_id, external_uid)
  where external_uid is not null;
create index idx_reservations_property_dates
  on reservations(property_id, checkout_date);

alter table property_ical_feeds enable row level security;
alter table reservations enable row level security;
