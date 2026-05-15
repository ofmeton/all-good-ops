-- 民泊清掃管理アプリ migration 0003: 完了報告は依頼ごとに1件
-- Plan 2 Task 5 code review 由来。getReportForRequest の .maybeSingle() が
-- 前提とする「1依頼=1報告」をDB制約で保証する。
alter table cleaning_reports
  add constraint uq_report_per_request unique (request_id);
