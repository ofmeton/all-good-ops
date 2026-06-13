# 引き継ぎ: X発信 ステージ2 人間キュレーションUI 出荷完了 (2026-06-06)

> 再開時は memory `project_x_agentic_rearchitecture.md`（自動ロード）も併読。本 note はその場の作業引き継ぎ。

## 今どこ（DONE）
X発信新アーキ〈収集Ag→**人間UI選抜**(済)→執筆Ag→チェックAg→人間承認→予約投稿〉の**第2工程＝キュレーションUI を本番出荷完了**。
- PR #113 squash merged（main=7cdae95）。worktree 掃除・ローカルブランチ削除済。
- migration 0016 本番適用（`xad.curation_events` / RPC `set_selection_status` / view `curation_materials`）。
- worker 再デプロイ（compose 登録）: `https://ofmeton-x-account.off-me-ton.workers.dev`
- dashboard 本番: `https://xad-dashboard-ofmetons-projects.vercel.app/curation`（Basic認証）。env `WORKER_BASE_URL`/`OAUTH_ADMIN_SECRET` 投入済。
- 実データ E2E 全経路OK（RPC→view→compose stub trace count=1→reset で 138collected 復帰、本番汚染なし）。

## 実装の要点（コードは main にある）
- dashboard: `apps/xad-dashboard/app/curation/`（page/CurationClient/MaterialCard）+ `lib/curation-logic.ts`（純ロジック・vitest）+ `lib/curation-queries.ts`（Supabaseラッパ）+ `app/api/curation/select/route.ts`（更新→enqueue→events、fail-open）。
- worker: `lib/curation/compose-stub.ts`（queued 読むだけの**配管stub**＝実writer未実装）。`src/queue.ts` case "compose"。
- collector: `buildMaterialRow` の meta に engagement 追加済。
- 状態: `materials_store.meta.selection_status` ∈ {collected,selected,queued,rejected}。全選抜操作を snapshot 付きで `curation_events` に追記（L1/L3/L5 分析SQL=`apps/x-account-system/docs/curation-analysis.sql`）。

## 運用メモ（再開時に効く）
- **OAUTH_ADMIN_SECRET の SSOT = `apps/x-account-system/.env.local`**（48文字）。worker wrangler secret と Vercel env を同値で同期済。worker secret は読めないので .env.local を真として両者に push する。
- 「執筆へ送る」→ worker `/admin/enqueue?job=compose` を **Authorization: Bearer**（secret を URL に載せない／worker はクエリ `?key=` も後方互換で受ける）。
- Supabase MCP 失効中 → migration/SQL は keychain→sbp_ 抽出→Management API 迂回（memory `reference_supabase_mgmt_api_keychain`）。
- Vercel env 投入は CLI bug 回避で REST API（`api.vercel.com/v10/projects/prj_IdHQhxygfAy9Lh7OKz5oZNLmQkwo/env?teamId=team_Le012XqeShXuAuHdkQuyPGRO`）+ keychain token（`~/Library/Application Support/com.vercel.cli/auth.json`）。

## 次にやる候補（未決・要選択）
1. **ステージ3＝執筆Ag**: `compose-stub.ts` を実 writer 本体（リサーチ付き）に置換。queued 素材→投稿ドラフト生成→post_drafts。これが本命の次工程。
2. **収集の高速化**: collect が 5.5分（scoring 7バッチ逐次）。レバー L7(Haiku化)/L8(batch拡大)/並列化。
3. **旧素材の扱い決定**: 旧 buzz-ingest 由来の x_inspirations **891件が selection_status=null で UI に出ない**（新収集138のみ対象＝現状想定どおり）。旧も選抜対象にするなら一括 `collected` 化の小施策。
4. **既知フォローアップ**: registry `compose.upstream=["collect"]` はメタ近似（人間ゲートは worker ノード非実在）。実 writer 実装時に topology 精緻化。

## 開始時の儀式
- SessionStart で cwd/branch 確認 → main 上なら新規作業前に `bash scripts/wt-new.sh <topic>`。
- 残 worktree: `all-good-ops-collector-agent`（前セッション merged 残骸＝掃除可）/ `all-good-ops-mf-finance`（別作業）。
