-- StayClean Sprint 2 Phase 4: LINE Login linking nonce store.
-- OAuth state nonce is stored server-side and consumed exactly once.

create table line_link_nonces (
  nonce text primary key,
  target_type token_type not null,
  staff_id uuid references staff(id) on delete cascade,
  owner_id uuid references owners(id) on delete cascade,
  consumed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint line_nonce_target_chk check (
    (target_type='staff' and staff_id is not null and owner_id is null) or
    (target_type='owner' and owner_id is not null and staff_id is null)
  )
);

alter table line_link_nonces enable row level security;
