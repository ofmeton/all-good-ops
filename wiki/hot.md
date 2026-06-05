---
type: meta
title: "Hot Cache"
updated: 2026-06-05
---

# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。セッション開始時に最優先で読む。詳細: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-06-05 — **x-account 工程可視化ダッシュボードを新規構築し本番稼働**。各工程の入出力/ロジック/prompt/cron実行を観測する WEB UI。3系統＝Stage Registry(11ノード) + Run Trace計装(fail-open/ctx.waitUntil/PII redact/LLM prompt-tokens、`xad.run`/`run_trace` migration0013) + Next.js16観測UI(React Flow工程図+ノード詳細[定義/実行tab]+runタイムライン+Basic認証proxy.ts)。Kくンツイート比較→ファネル段階別設計判断(PR#84)が発端。ブレスト→spec(Codex4R)→plan(/code-review+Codex3R)→subagent-driven実装(既存423テスト緑維持)→本番(PR#85/#86/#87、worker再デプロイ+Vercel+migration適用)。E2E実証:post-noon手動でwriter/hook/editor/line-approval trace記録。URL: xad-dashboard-ofmetons-projects.vercel.app。SSOT: [[project-xad-observability-dashboard]]。
（前スレッド）hidamari-cms feature-complete&本番稼働(hidamari-cms.vercel.app) [[project-hidamari-cms]]。x-account-system 本番実運用中 [[project-x-account-phase05]]。

## Current Focus
- **xad observability 次フェーズ**: dlp/optimizer 独立 trace / optimizer posterior 可視化 / コスト推移 / trace 90日 retention / UI から工程再実行ボタン。改善テコ入れ→自己改善ループ移行が狙い。
- **x-account 運用**: LINE承認カード→投稿、cron巡回（06:00 buzz→06:30 ideation→07/12/19 post→21:00 digest）稼働。観測ダッシュボードで各工程を可視化済。
- **hidamari-cms 次フェーズ**: テーマ一元化ラッピング（site.config化・CSS変数駆動・複製手順）。CMS は feature-complete。
- **🔴 ミナト広告設定（再開待ち）**: chrome-devtools MCP 接続待ち。[[project-minato-ad-settings]]
- **money-bot 不調（保留）**: dailyPublishWorkflow `publish_queue upsert: fetch failed`。

## Recently Touched
- [[project-xad-observability-dashboard]] / apps/xad-dashboard + apps/x-account-system/lib/trace,registry
- [[../outputs/retrospectives/2026-06-05-1730-xad-observability-dashboard]]
- 新スキル [[vercel-headless-deploy]] / memory [[reference-supabase-mgmt-api-keychain]]
- [[project-hidamari-cms]] / [[nextjs-supabase-site-gotchas]]（前スレッド）

## Open Questions / Frontiers
- xad ダッシュボードを起点に改善テコ入れ→自己改善ループにどう乗せるか
- writer の事実捏造抑制（X6警告のみ）/ money-bot `fetch failed` 原因
- hidamari-cms ラッピングのテーマ境界定義 / X non_public_metrics 検証

## Conventions
- 500 words 以内 / declarative present tense / 全置換更新（古い項目は間引く）
- 更新タイミング: ingest 後 / 大きな query 合成後 / 戦略変更 commit 後 / 振り返り完了時
