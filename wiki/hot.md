---
type: meta
title: "Hot Cache"
updated: 2026-06-09
---

# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。セッション開始時に最優先で読む。詳細: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-06-09 — **X発信 段階1-1B 観測UI を本番出荷**（main `fdee9f7` / worker `9cdb6d39` / dashboard `xad-dashboard.vercel.app` / Supabase migration 0021）。永続MA の各工程 session イベント（思考/ツール/結果/model）を drain 中に `xad.session_event` へ fail-open 永続化＋`xad.run_session`(run→session 橋)＋`post_drafts.checker_session_id`。`runMaSession` に `onEvent` フック追加、collect/compose/check の caller に配線。dashboard `runs/[id]` を工程タイムライン化（SessionTrace＝思考/クエリ/出所/出力、MaterialProvenance＝draft→core_idea.source_material_ids→materials→collector_session_id で別run跨ぎ drill-down）。brainstorm→spec→writing-plans→subagent-driven TDD で実装。詳細: [[../memory/project_x_ma_persistent_rearch]]。

## Current Focus
- **1B E2E 検証（残）**: session_event/run_session は次 cron サイクル（`0 */2 * * *`）後にデータ投入 → `runs/[id]` で工程タイムライン目視。即時確認は collect→compose→check 手動 enqueue。
- **X発信 次は段階1-1C**: 定義編集UI（dashboard `agents.update` + Console）→ 段階2 承認/投稿 UX → 段階3。計画書 `~/.claude/plans/41-magical-sketch.md`。
- **feature-factory 実走検証（残）**: 小さい実機能を1本 feature-factory に流し CP①②③・差し戻し・受け入れテストが回るか実証（PR#147）。
- **🔴 はぐりん persona 運用**: monetize-os 廃止で収益化委譲先消失 → 名義境界の戦略再判断が未着手。
- **🔴 ミナト広告設定（再開待ち）**: chrome-devtools MCP 接続待ち。[[project-minato-ad-settings]]

## Recently Touched
- `apps/x-account-system/lib/trace/session-event-store.ts`（新規）/ `lib/ma/run-session.ts`(onEvent) / `lib/{curation,ingest,check}` caller / `migrations/0021_session_trace.sql`
- `apps/xad-dashboard/app/runs/[id]/{page,SessionTrace,MaterialProvenance}.tsx` / `lib/{queries,supabase,console-link}.ts`
- `docs/superpowers/specs|plans/2026-06-09-xad-run-trace-ui*`
- memory `project_x_ma_persistent_rearch`（1B 追記）/ `feedback_taskcreate_scope_threshold`・`feedback_deploy_verify_all_secrets`（retro 追記）
- [[../outputs/retrospectives/2026-06-09-2309-xad-run-trace-ui-1b]]

## Open Questions / Frontiers
- **taskcreate-threshold が3回連続 open** — 構造化トリガー（plan 実行スキル起動=最初に TaskCreate）を feedback に追記。次回 applied→verified に昇格するか／4回目なら hook 等別手段
- **feature-factory を第一候補に検討したか** — 今回「まとまった機能」を superpowers フローで回した。次回まとまった機能で feature-factory を先に検討するか監視
- dashboard は Basic 認証（`BASIC_AUTH_USER/PASS`・proxy.ts）。保護付きアプリのデプロイ報告は認証手段を併記（feedback 化済）

## Conventions
- 500 words 以内 / declarative present tense / 全置換更新（古い項目は間引く）
- 更新タイミング: ingest 後 / 大きな query 合成後 / 戦略変更 commit 後 / 振り返り完了時
