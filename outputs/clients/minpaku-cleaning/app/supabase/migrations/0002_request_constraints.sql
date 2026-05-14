-- 民泊清掃管理アプリ migration 0002: 清掃依頼フロー向けスキーマ拡張
-- Plan 1 の code review 持ち越し事項 + Plan 2 で必要な制約・索引。
-- 0001 は改変しない。

-- 管理者による依頼キャンセルを状態機械の枠内で扱うため cancelled を追加。
-- PostgreSQL 12+ は ADD VALUE をトランザクション内で実行可（同一txn内で値を使わなければ可）。
alter type cleaning_status add value if not exists 'cancelled';

-- cleaning_requests の整合性制約
alter table cleaning_requests
  add constraint chk_guest_count_positive check (guest_count > 0);
alter table cleaning_requests
  add constraint chk_checkout_after_checkin check (checkout_date > checkin_date);

-- 割当スタッフでの検索用インデックス
create index idx_requests_assigned_staff on cleaning_requests(assigned_staff_id);

-- access_tokens: 1対象に有効（revoked_at is null）なトークンは1つだけ。
-- Plan 1 Task 12 review 由来。アプリ層ガードに加えDB制約で重複アクティブを排除する。
create unique index uq_active_owner_token on access_tokens(property_id)
  where type = 'owner' and revoked_at is null;
create unique index uq_active_staff_token on access_tokens(staff_id)
  where type = 'staff' and revoked_at is null;
