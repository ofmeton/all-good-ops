---
type: meta
title: "Hot Cache"
updated: 2026-06-13
---
# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。セッション開始時に最優先で読む。詳細: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-06-13 — **X collector コスト最適化を設計(Fable architect)→並列実装→閉ループ→夜間自動運用まで完遂**(PR#175-184・全deploy)。実測 collector ¥53/run = explore¥5/scoring¥29/translate¥19 → **scoring主因**。P0計測/P1 early-dedup/P2二段採点(shadow)/P5 optimizer週一(cron `0 16 * * SUN`)/閉ループ(runtime_params+tier-P+snapshot ROI)/launchd夜間apply(real-mode)/MA agent live化(SDK直)/enforce自動切替(nightly)。実課金は P0実証collect1回(~¥58)のみ。retro [[../outputs/retrospectives/2026-06-13-xad-collector-cost-optimization]]・memory [[project-x-collector-cost-optimization]]。

## Current Focus
- **X collector 最適化＝自走化完了**: shadow データ蓄積中(現1/7)。**enforce 自動flip**(直近7run retention=100%∧pruned_fine_max<70)で削減発動(¥53→¥25-35・即revert=`collector_prerank_enforce`=0)。launchd 夜間apply(03:00JST)は real-mode だが brownout中は defer。MA live: collector v2(PR#169 keyword/trend主軸)・analyst v2(P4 collector_lever)。
- **brownout 中（¥13,800超）**: X worker は daily-digest+line-event のみ。`!resume`か月初リセットで復帰。**enforce自動flip は collect 継続が前提**＝brownout で collect halt なら shadow 蓄積停止 → 要 `!resume`/監視。[[project-cron-automation-disabled]]
- **mf-finance（別ブランチ進行中）**: Plan1+後続モジュール完了。worktree `task/260606-mf-finance` 未merge・[[../apps/mf-finance/HANDOFF.md]]。PostgREST公開反映の稼働確認が残。
- 🔴 **ミナト広告設定（再開待ち）**: chrome-devtools MCP接続待ち。[[project-minato-ad-settings]]
- 🔴 **はぐりん persona**: 名義境界の戦略再判断 未着手。

## Recently Touched
- `apps/x-account-system/lib/{ingest,optimizer-apply,params,optimizer-analyst}/**`・`scripts/optimizer-apply-nightly.*`・`scripts/update-ma-agents-sdk.ts`・`migrations/0029_runtime_params.sql`・plist `~/Library/LaunchAgents/com.allgoodops.xad-optimizer-apply.plist`
- memory [[project-x-collector-cost-optimization]] [[reference-cloudflare-cron-quartz-dow]] [[feedback-communication-style]]（自走指示時の確認最小化を追記）
- 前セッション: mf-finance `apps/mf-finance/**`／journaling `.claude/skills/journaling/`

## Open Questions / Frontiers
- **enforce 自動flip 依存**: collect が回り続け shadow が7run貯まるか（brownout halt 注意）。基準到達で自動切替＋LINE通知。
- **bootstrap-core `--tool` バグ残置**: 次回 MA update は `scripts/update-ma-agents-sdk.ts`(SDK直) 再利用 or 恒久修正。
- **MA prompt drift 検知なし**: merge+worker deploy ≠ MA反映（ma:bootstrap 必須）で PR#169 が3日 un-live だった。system_hash drift の CI 警告が欲しい。
- **cwd-regression**: 全Bash `cd <abs> &&` 前置（[[bash-cwd-persistence]]）。
- `listApprovedStock`相当フィルタ3箇所複製の SSOT 化（未着手）。

## Conventions
- 500 words 以内 / declarative present tense / 全置換更新（古い項目は間引く）
- 更新タイミング: ingest 後 / 大きな query 合成後 / 戦略変更 commit 後 / 振り返り完了時
