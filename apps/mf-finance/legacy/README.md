# legacy — 非アクティブ（ローカルSQLite移行前の Supabase 資産）

ローカル無料運用へ移行したため Supabase 依存は退役。履歴温存のため残置。

- `load-mgmt.mjs`: Management API 迂回ローダ（旧 PostgREST 未公開時用）
- `supabase/migrations/`: Postgres スキーマ（現行は `db/schema.sql` の SQLite 版）
