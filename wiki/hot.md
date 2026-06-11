---
type: meta
title: "Hot Cache"
updated: 2026-06-12
---

# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。セッション開始時に最優先で読む。詳細: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-06-12 — **xad 収集/スコアリング/キュレーション改善（Fable設計→8PR本番反映）＋バグ2件＋予約投稿5件登録**。①画像DL(#163)②多軸ソート(#164)③time-decay effective_overall+migration0028(#165)④日本語=参考(JP)レーン物理分離(#166)⑤トリアージinbox高シグナルのみ+7日auto-archive(#167)⑥「選抜」→温めプール再定義(#168)⑦収集最適化:転換ゼロ4アカ剪定+公式10アカ追加+keyword/trend主軸(#169)⑧スレッド非ルートをTOP差替(#170)。バグ: schedule/今すぐ投稿の不整合(#171)・スロット再提案ゼロ(#172)=どちらも `published_at IS NULL` 欠落（承認済みストックフィルタ3箇所複製のドリフト、memory [[approved-stock-filter-triplicated]]）。承認済み5件をchrome-devtoolsでX予約投稿登録(6/12 07/08/12/15/17時)。デプロイは以後人間確認不要 [[deploy-no-confirm]]。詳細 [[../memory/project_xad_observability_dashboard]] 系。

## Current Focus
- **xad キュレ改善の実UI確認**: dashboard 新挙動を一巡（トリアージ「🎯高シグナルのみ」既定ON/参考(JP)レーン/多軸ソート/画像DL/温め/アーカイブ）。ハードリロード推奨。
- **brownout 中（¥13,800超）**: X worker cron 停止中（daily-digest+line-eventのみ）。`!resume` か月初リセットで復帰。予約投稿はX側で発火継続。[[project-cron-automation-disabled]]
- **次回 collect 実行時**: スレッドTOP差替・参考レーン付与・auto-archive sweep が初発火。既存488reply断片は triage 非表示+7日でarchive（backfillは2件しか可視化されず不要と判断）。
- **optimizer 運用フェーズ**: `/proposals` accept→tier-Tはworker/config・promptは `x-optimizer-apply-code`。apply-code hardening（次回運用時）。
- **🔴 はぐりん persona 運用**: monetize-os 廃止で委譲先消失→名義境界の戦略再判断 未着手。
- **🔴 ミナト広告設定（再開待ち）**: chrome-devtools MCP 接続待ち。[[project-minato-ad-settings]]

## Recently Touched
- `apps/xad-dashboard/lib/{curation-logic,curation-queries,schedule-queries,publish-queries,media-download}.ts`・`app/curation/{CurationClient,MaterialCard,page}.tsx`・`components/MediaModal.tsx`・`app/api/media/download/route.ts`
- `apps/x-account-system/lib/ingest/{collector,collector-thread,collector-persist,collector-config,collector-prompts,collector-scoring}.ts`・`src/{worker,queue}.ts`
- migration `0028_curation_v2`（本番適用済: time-decay view/archived/archive_stale_materials/collector_source_stats/lane backfill）
- `.claude/skills/x-scheduled-publish/SKILL.md`（snapshotトークン注意+dashboard確定済はrecord noop）
- [[../outputs/retrospectives/2026-06-12-0027-xad-curation-improvement-and-scheduled-publish]]
- memory 新規: [[deploy-no-confirm]] / [[approved-stock-filter-triplicated]]

## Open Questions / Frontiers
- **cwd-regression 2連続**: repo相対スクリプト(`bash scripts/wt-new.sh`)は repo root から叩く（subdir無言失敗）。全Bash `cd <abs> &&` 前置（[[bash-cwd-persistence]] #5・3回目なら hook 側強制検討）
- scheduled-publish: dashboard予約確定済(scheduled_for既設)は record CLI noop→scheduled_post_id 直接UPDATE要（skill追記済）
- `listApprovedStock` 相当フィルタ3箇所複製(publish/schedule/worker plan-slots)の SSOT 化（未着手）
- nested `claude -p` は acceptEdits + secret unset + PATH明示（[[headless-claude-subprocess]] / wiki原則7）。外部CLI経路は単発smoke先行
- 重い MA/opus は `timeoutMs` 明示／学習系は本番に燃料(実データ)があるか先に確認

## Conventions
- 500 words 以内 / declarative present tense / 全置換更新（古い項目は間引く）
- 更新タイミング: ingest 後 / 大きな query 合成後 / 戦略変更 commit 後 / 振り返り完了時
