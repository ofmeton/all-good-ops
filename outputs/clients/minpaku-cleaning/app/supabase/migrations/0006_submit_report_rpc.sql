-- 民泊清掃管理アプリ migration 0006: submit_cleaning_report RPC
-- Plan 2 code review 持ち越し。3段書き込みをトランザクション化。
-- 0001〜0005 は改変しない。

create or replace function submit_cleaning_report(
  p_request_id uuid,
  p_staff_id    uuid,
  p_checklist   jsonb,
  p_photo_paths text[]
) returns uuid
language plpgsql
security definer
as $$
declare
  v_report_id uuid;
  v_path      text;
begin
  -- 1. 完了報告を作成
  insert into cleaning_reports (request_id, staff_id, checklist_result)
  values (p_request_id, p_staff_id, p_checklist)
  returning id into v_report_id;

  -- 2. 写真行を作成（expires_at = now + 90日）
  foreach v_path in array p_photo_paths
  loop
    insert into report_photos (report_id, storage_path, expires_at)
    values (v_report_id, v_path, now() + interval '90 days');
  end loop;

  -- 3. 依頼ステータスを reported に更新
  update cleaning_requests
  set status     = 'reported',
      updated_at = now()
  where id = p_request_id;

  return v_report_id;
end;
$$;
