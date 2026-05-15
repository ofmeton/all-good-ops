-- 民泊清掃管理アプリ migration 0004: 完了写真用 Storage バケット
-- 非公開バケット。閲覧は service role 経由の短期署名URLのみ（設計書 8章）。
insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', false)
on conflict (id) do nothing;
