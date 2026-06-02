-- 0006: xad schema の server 専用 4 table に RLS を有効化。
-- worker は SERVICE_ROLE_KEY 接続のため RLS をバイパスし動作は不変。
-- anon key からの直接アクセスを遮断 (Supabase security advisor: rls_disabled = critical の解消)。
-- 適用: 2026-06-03 MCP apply_migration (name=enable_xad_rls)。
--   ※本プロジェクト(ofmeton-apps)は複数スキーマ同居 + MCP 管理のため CLI db push は履歴不一致で不可。
--   migration は従来通り 000N ファイル + MCP apply で運用する。
alter table xad.style_guide enable row level security;
alter table xad.optimizer_proposal enable row level security;
alter table xad.cost_ledger enable row level security;
alter table xad.daily_digest_log enable row level security;
