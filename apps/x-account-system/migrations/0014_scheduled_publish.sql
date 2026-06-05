-- 0014_scheduled_publish.sql
-- Phase 1 (チャエン×Kくん 理想設計): X API 直投を廃止し「承認＝予約待ちストック化」へ。
--
-- 新しい投稿モデル:
--   pending  : editor 通過後、承認待ち
--   approved : 人が承認 → 予約待ちストック (scheduled_for IS NULL)
--   scheduled: chrome-devtools が X 公式予約投稿UIに登録済 (scheduled_for / scheduled_post_id set)  ← Phase 2
--   posted   : 予約時刻に X が公開済 (published_at set)                                              ← Phase 2
--
-- 既存カラム human_approval_status (pending/approved/rejected) と human_approved_at / published_at を
-- そのまま使い、本 migration は「予約状態」を表す 2 カラムのみ追加する。

alter table xad.post_drafts add column if not exists scheduled_for timestamptz;
alter table xad.post_drafts add column if not exists scheduled_post_id text;

comment on column xad.post_drafts.scheduled_for is
  'chrome-devtools が X 公式予約UIに登録した予約公開時刻 (JST ピーク帯)。NULL = まだストック (未予約)。';
comment on column xad.post_drafts.scheduled_post_id is
  'X 予約投稿の識別子 (chrome-devtools 操作時に控える)。冪等な再予約防止に使う。';

-- 予約待ちストック (approved かつ未予約) を引く index。Phase 2 のスケジューラが
--   WHERE human_approval_status='approved' AND scheduled_for IS NULL
-- で承認順に取り出す。
create index if not exists idx_drafts_approved_stock
  on xad.post_drafts (human_approved_at)
  where human_approval_status = 'approved' and scheduled_for is null;
