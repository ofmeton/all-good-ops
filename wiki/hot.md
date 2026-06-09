---
type: meta
title: "Hot Cache"
updated: 2026-06-09
---

# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。セッション開始時に最優先で読む。詳細: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-06-09 — **X発信を永続 Managed Agents 化（段階1-1A）して本番出荷**（PR#145 merge / worker deploy Version 6753004c）。collector/writer(opus-4-8)/checker を「create once→id参照、更新は version up」の永続 MA に。定義 SSOT=MA agent オブジェクト、control plane=`ant` CLI、registry=`xad.ma_agents`(migration 0020)、worker は DB lookup。editor は単発判定で MA 利点ゼロにつき除外。bootstrap 済（env_01KVMQ… ＋ x-writer/x-checker/x-collector）。compose/check を本番 smoke で実証（opus draft → haiku checker が事実誤り検出して差し戻し）。詳細: [[../memory/project_x_ma_persistent_rearch]]。

## Current Focus
- **段階1-1B（次の実開発）**: 実行履歴の詳細トラッキング UI。`xad.run_trace` ＋ 今回仕込んだ相関キー（`writer_session_id`/`materials_store.meta.collector_session_id`/`maSessionId`）で、過去1実行の各工程の思考・入力素材・素材の出所・出力を `apps/xad-dashboard` の runs/[id] に展開。
- **その後**: 1C 定義編集 UI（dashboard `agents.update`＋Console）→ 段階2 承認/投稿 UX → 段階3（テンプレ拡充/解説画像/スレッド）。計画書 `~/.claude/plans/41-magical-sketch.md`。
- **🔴 はぐりん persona 運用**: monetize-os 廃止で収益化委譲先消失 → 名義境界の戦略再判断が未着手。
- **🔴 ミナト広告設定（再開待ち）**: chrome-devtools MCP 接続待ち。[[project-minato-ad-settings]]

## Recently Touched
- `apps/x-account-system/lib/ma/*`（run-session persistent / agent-registry / bootstrap-core）/ `agents/*.agent.yaml`+`*.system.md` / `scripts/{render,bootstrap}-ma-agents.ts` / migration 0020
- memory `project_x_ma_persistent_rearch`（新規）/ `feedback_squash_merge_manual_worktree_remove`（訂正）/ `.claude/skills/prod-lib-diag`（追記）
- [[../outputs/retrospectives/2026-06-09-1713-xad-ma-persistent-rearch]]

## Open Questions / Frontiers
- `getAgentRef` の isolate cache は `--update`（新 version）後 stale → update 運用開始時に cache TTL/recycle を入れるか
- 1B 観測 UI は Console session への deep-link と自前 timeline 表示のどちらを主にするか
- squash merge×worktree の `--delete-branch` 罠が3回目を出さないか（feedback 訂正済）

## Conventions
- 500 words 以内 / declarative present tense / 全置換更新（古い項目は間引く）
- 更新タイミング: ingest 後 / 大きな query 合成後 / 戦略変更 commit 後 / 振り返り完了時
