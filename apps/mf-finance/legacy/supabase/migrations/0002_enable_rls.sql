-- 0002_enable_rls.sql
-- 個人用・anon無効。アプリは server 側 service_role で接続（RLSをバイパス）。
-- ポリシー無し＝anon/authenticated ロールは全拒否（多層防御）。
alter table mf_finance.transactions enable row level security;
alter table mf_finance.recurring_items enable row level security;
alter table mf_finance.account_status enable row level security;
alter table mf_finance.asset_history enable row level security;
alter table mf_finance.liability_snapshots enable row level security;
alter table mf_finance.manual_liabilities enable row level security;
alter table mf_finance.category_rules enable row level security;
