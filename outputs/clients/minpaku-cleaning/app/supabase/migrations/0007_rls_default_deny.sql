-- 民泊清掃管理アプリ migration 0007: anon/authenticated 経由の直接アクセスを遮断
-- Plan 4 本番デプロイ時の Supabase advisor 指摘対応。
-- 設計書 §4 の「app-layer auth で認可一元管理」の意図を維持しつつ、anon key
-- が NEXT_PUBLIC で公開されるリスクに対する防御層として RLS を有効化する。
-- policy は意図的に作成しない（= 全 deny）。アプリは service role 経由のみで
-- DB アクセスするため、service role が RLS をバイパスする仕様により、本変更で
-- アプリ動作は何も変わらない。

alter table public.admins             enable row level security;
alter table public.owners             enable row level security;
alter table public.properties         enable row level security;
alter table public.staff              enable row level security;
alter table public.staff_assignments  enable row level security;
alter table public.access_tokens      enable row level security;
alter table public.cleaning_requests  enable row level security;
alter table public.cleaning_reports   enable row level security;
alter table public.report_photos      enable row level security;
alter table public.supply_requests    enable row level security;
alter table public.notifications_log  enable row level security;
