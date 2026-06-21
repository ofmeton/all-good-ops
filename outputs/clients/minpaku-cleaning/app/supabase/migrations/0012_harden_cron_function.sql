-- StayClean Sprint 2 P5+: trigger_cron_endpoint のセキュリティ強化
--
-- 0011 で作成した public.trigger_cron_endpoint は SECURITY DEFINER。
-- 既定では PUBLIC（anon / authenticated 含む）に EXECUTE が付くため、PostgREST 経由
-- (/rest/v1/rpc/trigger_cron_endpoint) で公開 anon key から呼べてしまい、cron エンドポイント
-- (ical-sync / finalize-offers) を外部から任意トリガできる（通知の連打等）。
-- このラッパは cron（postgres = 関数オーナー）からのみ呼ばれるべきなので EXECUTE を剥奪する。
-- オーナー(postgres)は所有者として EXECUTE を保持し、pg_cron ジョブは postgres として実行される
-- ため、cron の稼働には影響しない（service_role も保持）。
revoke all on function public.trigger_cron_endpoint(text) from public;
revoke all on function public.trigger_cron_endpoint(text) from anon;
revoke all on function public.trigger_cron_endpoint(text) from authenticated;
