-- 0029_runtime_params.sql — collector レバーの runtime 可変パラメータ（P3 / AD-3）。
--
-- ⚠️ 本番 xad(project=hofvvcvhjslevymhbcqj) への適用は人間ゲート（このファイルは未適用＝定義のみ）。
--    worker は SERVICE_ROLE_KEY 接続のため RLS をバイパスする。anon 直アクセスは RLS で遮断
--    （0006 と同方針。Supabase security advisor: rls_disabled = critical の回避）。
--
-- 役割: optimizer 閉ループの数値レバー（shortlist_top_k / exploration_quota /
--   prerank_max_age_hours / prerank_enforce）を **deploy 不要・即 revert 可能**な形で外出しする。
--   本テーブルは「code default からの上書き」だけを持つ（行が無いレバーは code default のまま）。
--   特に collector_prerank_enforce=1 の 1 行投入だけで enforce 化でき、行削除/0 で即 shadow へ戻せる。
--
-- bounds の死守はコード側（lib/params/runtime-params.ts RUNTIME_PARAM_BOUNDS）が SSOT。DB に何が
--   入っても resolveRuntimeParams が必ず clip する。下限>0 のレバー（exploration_quota）は計測ループを
--   不滅にする意図。
--
-- 実スキーマ Inspect: 既存 migration（0024/0028）の RLS/grant/schema 規約を踏襲（service_role 前提）。
--   新規テーブルのため既存構造への破壊なし。本番 DB へは触れていない（CREATE IF NOT EXISTS で冪等）。

create table if not exists xad.runtime_params (
  param_id   text primary key,
  value      numeric not null,
  updated_at timestamptz not null default now(),
  updated_by text,
  meta       jsonb
);

comment on table xad.runtime_params is
  'collector レバーの runtime 可変パラメータ（P3）。行=code default からの上書き。'
  'bounds は lib/params/runtime-params.ts が死守。enforce 切替は collector_prerank_enforce=1 の 1 行投入のみ（deploy 不要・即 revert）。';

-- anon 直アクセス遮断（service_role はバイパス）。0006 と同方針。
alter table xad.runtime_params enable row level security;

-- service_role への明示 grant（0024 の grant 方針に揃える。RLS バイパス済だが意図を明示）。
grant select, insert, update, delete on xad.runtime_params to service_role;
