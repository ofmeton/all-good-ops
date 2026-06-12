---
type: meta
title: "Hot Cache"
updated: 2026-06-12
---

# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。セッション開始時に最優先で読む。詳細: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-06-12 — **陸さんのジャーナリング伴走を引き継ぎ・体制化（非コーディング）**。スマホ Claude の前回カルテを受領し `~/journal/`（**git 管理外**）に `CARTE.md`＋`entries/2026-06-12.md` を保存。毎晩22:00 JST に cloud routine（`trig_01WxVif5yDtYqSRLuXnMxyqx`）でリマインド設定。`journaling` skill 新設（聞き役・`session-retrospective` と別物）。**プライバシー規約**: journaling 内容は raw/facts・outputs 等 git push 対象に書かず ~/journal のみ（CLAUDE.md raw 保存ルールに私的領域例外を追記）。併せて Claude の **routine（cloud scheduled agent）機能**を解説し x-account への活用案を提示（下記）。直前の xad ダッシュボード刷新（PR#173/#174）は [[../outputs/retrospectives/2026-06-12-1130-xad-mission-control-ui]] 参照。**別途（非開発の伴走）**: 子どもの居場所の名称を「えんがわ」に確定（被り許容＝由来が唯一無二）。TERRA縁側構想 Notion に §0「なぜやるのか」（陸さんの原体験を B 粒度で）＋週間タイムスケジュール表を追記済み。retro [[../outputs/retrospectives/2026-06-12-engawa-naming-vision]]。

## Current Focus
- **x-account への routine 活用（提案止まり・未着手）**: 第一候補=**朝の承認お膳立て digest**（未承認ドラフトを採点→ランク→通知で承認を秒化）。他=ストック残量監視＋補充トリガー／optimizer 提案 triage／ドリフト監視（承認フィルタ3複製）／週次 digest。**投稿はローカル Chrome 必須でクラウド不可**・高頻度配管は Workers のまま。
- **brownout 中（¥13,800超）**: X worker cron 停止中（daily-digest+line-event のみ）。`!resume` か月初リセットで復帰。予約投稿はX側で発火継続。[[project-cron-automation-disabled]]
- **xad ダッシュボード刷新の実機確認**: 新ダークUI一巡（工程図KPIストリップ/Runsタイムライン/各ページ）。モーダル不具合は解消済（ハードリロード推奨）。
- **optimizer 運用フェーズ**: `/proposals` accept→tier-Tはworker/config・promptは `x-optimizer-apply-code`。apply-code hardening（次回運用時）。
- **🔴 はぐりん persona 運用**: monetize-os 廃止で委譲先消失→名義境界の戦略再判断 未着手。
- **🔴 ミナト広告設定（再開待ち）**: chrome-devtools MCP 接続待ち。[[project-minato-ad-settings]]

## Recently Touched
- `~/journal/CARTE.md`・`~/journal/entries/2026-06-12.md`（git 管理外）／`.claude/skills/journaling/SKILL.md`（新）
- CLAUDE.md（raw 保存ルールに私的領域例外）／memory 新規 [[project-journaling-system]]
- cloud routine 「夜のジャーナリング・リマインド」作成（毎晩22:00 / `0 13 * * *` UTC）
- 直前: xad ダッシュボード刷新 `apps/xad-dashboard/**`・[[feedback-css-fixed-containing-block]]・[[../outputs/retrospectives/2026-06-12-1130-xad-mission-control-ui]]

## Open Questions / Frontiers
- **journaling routine 初回検証**: 今夜22:00 の初回プッシュが実際に届くか未 verify
- **routine のコスト感**: 1発火＝フルクラウドセッション＝サブスク枠消費。x-account 系は重いので低頻度（週次中心）に。本数上限は未確認（claude.ai/code/routines でライブ確認）
- **cwd-regression 3連続**: サブディレクトリ前提の npm/npx を親dirから実行し空振り。全Bash `cd <abs> &&` 前置（[[bash-cwd-persistence]] #5）。4回目で別手段検討
- `listApprovedStock` 相当フィルタ3箇所複製(publish/schedule/worker plan-slots)の SSOT 化（未着手・routine ドリフト監視の対象候補）
- scheduled-publish: dashboard予約確定済は record CLI noop→scheduled_post_id 直接UPDATE要（skill追記済）

## Conventions
- 500 words 以内 / declarative present tense / 全置換更新（古い項目は間引く）
- 更新タイミング: ingest 後 / 大きな query 合成後 / 戦略変更 commit 後 / 振り返り完了時
