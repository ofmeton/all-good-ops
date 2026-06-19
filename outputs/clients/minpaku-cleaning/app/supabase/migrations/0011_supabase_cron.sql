-- StayClean Sprint 2 P5: Supabase Cron で sub-daily スケジューリング（Vercel Hobby 代替・無料）
--
-- 背景: Vercel Hobby は cron が「1日1回」までで、ical-sync(*/15)・finalize-offers(*/10) を
-- vercel.json に置くとデプロイが失敗する。そこで pg_cron + pg_net（Supabase 無料枠で利用可）で
-- Vercel の cron エンドポイントを Bearer 認証付きで定期 GET する。新しい外部サービスを足さず自己完結。
--
-- 本番適用は人間ゲート。適用後に下記を投入して初めて有効化される（それまで各ジョブは no-op）:
--   insert into app_cron_config(key,value) values
--     ('base_url','https://<本番ドメイン>'),       -- 末尾スラッシュ無し
--     ('cron_secret','<Vercel と同じ CRON_SECRET>');

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- cron が叩く本番URLと CRON_SECRET を保持する非公開設定（service role のみ・RLS deny-all）。
-- 値は app（anon/authenticated）からは読めない。秘匿強化したい場合は Supabase Vault へ移行可。
create table if not exists app_cron_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table app_cron_config enable row level security;

-- 設定が揃っている時だけ cron エンドポイントへ Bearer 認証付き GET を送るラッパ。
-- 既存 GET ルート（isCronAuthenticated = Authorization: Bearer <CRON_SECRET>）に一致させる。
create or replace function trigger_cron_endpoint(endpoint_path text)
returns void
language plpgsql
security definer
set search_path = public, net
as $$
declare
  base_url text;
  secret text;
begin
  select value into base_url from app_cron_config where key = 'base_url';
  select value into secret from app_cron_config where key = 'cron_secret';
  -- 未設定のうちは何もしない（デプロイ後に app_cron_config を投入して有効化）。
  if base_url is null or secret is null then
    return;
  end if;
  perform net.http_get(
    url := base_url || endpoint_path,
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret)
  );
end;
$$;

-- 再適用時の冪等性: 同名ジョブがあれば付け替える。
do $$
begin
  if exists (select 1 from cron.job where jobname = 'stayclean-ical-sync') then
    perform cron.unschedule('stayclean-ical-sync');
  end if;
  if exists (select 1 from cron.job where jobname = 'stayclean-finalize-offers') then
    perform cron.unschedule('stayclean-finalize-offers');
  end if;
end $$;

-- ical-sync は 15 分毎（予約取込/キャンセル検知）、finalize-offers は 10 分毎
-- （確定アルゴリズムの 24h provisional 待ち・タイムアウトアラートの判定）。
select cron.schedule(
  'stayclean-ical-sync',
  '*/15 * * * *',
  $$select public.trigger_cron_endpoint('/api/cron/ical-sync')$$
);
select cron.schedule(
  'stayclean-finalize-offers',
  '*/10 * * * *',
  $$select public.trigger_cron_endpoint('/api/cron/finalize-offers')$$
);
