---
type: meta
title: "Hot Cache"
updated: 2026-06-12
---

# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。セッション開始時に最優先で読む。詳細: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-06-12 — **xad-dashboard 全8ページをミッションコントロール風ダークUIにフル刷新（PR#173）＋「執筆へ送る」モーダル不可視バグ修正（PR#174）。両方デプロイ済**。刷新: globals.css ダークトークン3層+グロー+共通レシピ(.glass/.btn-*/.badge-*/.stagger-in)/AmbientBackground/工程図StageNode+animated edges+KPIストリップ(F10)/Runs タイムライン演出。契約 §2 を v2 ダーク写像表へ改訂。**バグ根因**: `app/template.tsx` の入場アニメが `fill:both` で終了後も identity matrix transform を残し `position:fixed` の containing block を奪取→全fixedモーダルが画面外（compose dialog top 2940px）。`.page-enter`(fill無し)へ分離して解消。memory [[feedback-css-fixed-containing-block]]。前段(同日未明)の xad 収集/キュレ改善8PR(#163-170)は前 retro 参照。

## Current Focus
- **ダッシュボード刷新の実機確認**: 新ダークUIを一巡（工程図KPIストリップ/Runsタイムライン/各ページ）。モーダル不具合は解消済（ハードリロード推奨）。
- **xad キュレ改善の実UI確認**: dashboard 新挙動を一巡（トリアージ「🎯高シグナルのみ」既定ON/参考(JP)レーン/多軸ソート/画像DL/温め/アーカイブ）。
- **brownout 中（¥13,800超）**: X worker cron 停止中（daily-digest+line-eventのみ）。`!resume` か月初リセットで復帰。予約投稿はX側で発火継続。[[project-cron-automation-disabled]]
- **次回 collect 実行時**: スレッドTOP差替・参考レーン付与・auto-archive sweep が初発火。既存488reply断片は triage 非表示+7日でarchive（backfillは2件しか可視化されず不要と判断）。
- **optimizer 運用フェーズ**: `/proposals` accept→tier-Tはworker/config・promptは `x-optimizer-apply-code`。apply-code hardening（次回運用時）。
- **🔴 はぐりん persona 運用**: monetize-os 廃止で委譲先消失→名義境界の戦略再判断 未着手。
- **🔴 ミナト広告設定（再開待ち）**: chrome-devtools MCP 接続待ち。[[project-minato-ad-settings]]

## Recently Touched
- `apps/xad-dashboard/app/globals.css`(ダークトークン/レシピSSOT)・`app/template.tsx`(.page-enter)・`app/{layout,HomeClient,page}.tsx`・`app/components/{AmbientBackground,StageNode,Flowchart,NodePanel,NavBar,motion/*}`・`app/runs/**`・全ページ sweep・`lib/kpi-queries.ts`(新)
- `docs/superpowers/specs/2026-06-09-xad-dashboard-shared-design-contract.md`（§2 を v2 ダーク写像表へ改訂）
- [[../outputs/retrospectives/2026-06-12-1130-xad-mission-control-ui]]
- memory 新規: [[feedback-css-fixed-containing-block]]（fixed×containing block）／追記: visual_diff_check（UIバグは実描画で実証）・bulk_replace（全色grep集計）・turbopack-symlink（symlink全般へ一般化）
- 前段(同日未明): xad キュレ改善8PR・migration0028・[[../outputs/retrospectives/2026-06-12-0027-xad-curation-improvement-and-scheduled-publish]]

## Open Questions / Frontiers
- **cwd-regression 3連続**: 今回はサブディレクトリ前提の npm/npx を親dirから実行し空振り。全Bash `cd <abs> &&` 前置（[[bash-cwd-persistence]] #5）。全npm/npx hook検証は過剰のため見送り継続・4回目で別手段検討
- **UIバグは実描画で実証**: DOM count でなく座標/computed style/スクショ目視（[[feedback-css-fixed-containing-block]] / visual_diff_check）。fixed が画面外なら祖先の transform/filter/backdrop-filter を疑う
- `/curation` React #418 hydration（日時 UTC/JST ズレ）実害軽微で未修正
- scheduled-publish: dashboard予約確定済(scheduled_for既設)は record CLI noop→scheduled_post_id 直接UPDATE要（skill追記済）
- `listApprovedStock` 相当フィルタ3箇所複製(publish/schedule/worker plan-slots)の SSOT 化（未着手）
- nested `claude -p` は acceptEdits + secret unset + PATH明示（[[headless-claude-subprocess]] / wiki原則7）。外部CLI経路は単発smoke先行
- 重い MA/opus は `timeoutMs` 明示／学習系は本番に燃料(実データ)があるか先に確認

## Conventions
- 500 words 以内 / declarative present tense / 全置換更新（古い項目は間引く）
- 更新タイミング: ingest 後 / 大きな query 合成後 / 戦略変更 commit 後 / 振り返り完了時
