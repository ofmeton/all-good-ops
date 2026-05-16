-- 民泊清掃管理アプリ migration 0005: notifications_log の整合性と索引
-- Plan 1 code review 持ち越し。Plan 3 通知実装の前提。
-- 0001〜0004 は改変しない。

-- status の値域を固定。実装側 (Plan 3 notify.ts) も同じ値しか書かない。
alter table notifications_log
  add constraint chk_notifications_status check (
    status in ('queued', 'sent', 'failed', 'skipped')
  );

-- 冪等性チェック用の索引（同一 kind + recipient + 直近で送信済みかを引きやすくする）。
create index idx_notifications_kind_recipient_sent
  on notifications_log(kind, recipient, sent_at desc);

-- 送信失敗の管理画面表示・再送判断用（status='failed' を時刻順で引きやすくする）。
create index idx_notifications_failed on notifications_log(sent_at desc)
  where status = 'failed';
