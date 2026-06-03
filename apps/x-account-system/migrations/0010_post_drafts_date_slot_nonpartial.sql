-- partial unique index は ON CONFLICT (scheduled_date, slot) のターゲットに使えず
-- persistDraft の upsert が失敗するため非 partial 化。NULL は distinct 扱いで重複許容。
drop index if exists xad.post_drafts_date_slot_uniq;
create unique index if not exists post_drafts_date_slot_uniq on xad.post_drafts (scheduled_date, slot);
