---
type: meta
title: "Hot Cache"
updated: 2026-06-12
---

# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。セッション開始時に最優先で読む。詳細: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-06-12 — **MF家計ダッシュボードのデータ基盤(Plan1)完成**。マネーフォワードME（個人版・課金継続＝収集役）のエクスポートを Claude で分析する個人家計システム。recon→全口座再連携→正規化ライブラリ(node:test 11緑)→Supabase `mf_finance`(7テーブル/RLS)へ **3,742行**冪等load→可処分ロジックtested。worktree `task/260606-mf-finance`（**未merge**・`[[../apps/mf-finance/HANDOFF.md]]`）。設計重心=「今月あといくら使えるか(可処分)」。retro [[../outputs/retrospectives/2026-06-12-1649-mf-finance-data-layer]]。
直近の非開発伴走: journaling体制化（`~/journal/` git管理外＋毎晩22:00 routine `trig_01WxVif5yDtYqSRLuXnMxyqx`）[[project-journaling-system]]／子どもの居場所名称「えんがわ」確定・TERRA縁側構想 [[../outputs/retrospectives/2026-06-12-engawa-naming-vision]]／xadダッシュボード刷新 [[../outputs/retrospectives/2026-06-12-1130-xad-mission-control-ui]]。

## Current Focus
- **mf-finance（別ブランチ進行中）**: Plan1=データ基盤 完成。次=①PostgREST公開反映の稼働確認（`mf_finance`を exposed schemas追加済だが反映待ち [[reference-supabase-nonpublic-schema-exposed]]）②最新データ再取得（再連携後フル版）③**Plan2=可処分ダッシュボードUI**(Next.js)未着手。確定要件・鍵・ハマり所は HANDOFF.md。
- **brownout 中（¥13,800超）**: X worker cron 停止中（daily-digest+line-eventのみ）。`!resume`か月初リセットで復帰。予約投稿はX側で発火継続。[[project-cron-automation-disabled]]
- **x-account への routine 活用（提案止まり）**: 第一候補=朝の承認お膳立てdigest。投稿はローカルChrome必須でクラウド不可。
- **optimizer 運用フェーズ**: `/proposals` accept→tier-Tはworker/config・promptは `x-optimizer-apply-code`。
- **🔴 はぐりん persona**: monetize-os廃止で委譲先消失→名義境界の戦略再判断 未着手。
- **🔴 ミナト広告設定（再開待ち）**: chrome-devtools MCP接続待ち。[[project-minato-ad-settings]]

## Recently Touched
- `apps/mf-finance/**`（lib+CLI+migrations+HANDOFF/DESIGN）／`raw/finance/moneyforward/**`／memory [[reference-supabase-nonpublic-schema-exposed]]／Supabase `mf_finance` schema(本番)
- 直前: journaling体制化 `.claude/skills/journaling/`・[[project-journaling-system]]／xad刷新 `apps/xad-dashboard/**`・[[feedback-css-fixed-containing-block]]

## Open Questions / Frontiers
- **mf-finance**: PostgREST公開反映が稼働インスタンスに乗ったか要確認（未反映なら `load-mgmt` 迂回継続）。max_rows=1000 なので3700件UIはページング/集計。
- **journaling routine初回検証**: 今夜22:00 初回プッシュが届くか未verify。
- **cwd-regression 3連続**: 全Bash `cd <abs> &&` 前置（[[bash-cwd-persistence]] #5）。4回目で別手段検討。
- `listApprovedStock`相当フィルタ3箇所複製の SSOT 化（未着手）。
- scheduled-publish: dashboard予約確定済は record CLI noop→scheduled_post_id 直接UPDATE要（skill追記済）。

## Conventions
- 500 words 以内 / declarative present tense / 全置換更新（古い項目は間引く）
- 更新タイミング: ingest 後 / 大きな query 合成後 / 戦略変更 commit 後 / 振り返り完了時
