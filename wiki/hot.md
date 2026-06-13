---
type: meta
title: "Hot Cache"
updated: 2026-06-14
---
# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。セッション開始時に最優先で読む。詳細: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-06-14 — **web-ui-bridge 構築**: 動いてる実 Next.js+Tailwind サイト上の overlay で要素をクリック/ドラッグ→**決定的に実コード編集**(className literal/AST 入替・Claude不介在)＋複雑系は Claude 橋渡し。STUDIO 風 UI(実機 devtools 計測でライト#fff化)。Phase0→B/B.2→C(並べ替え/reparent/複製/削除)→undo/redo(永続化で再起動耐性)→セキュリティ硬化 を PR#195-204 で。memory [[project-web-ui-bridge]]・retro [[../outputs/retrospectives/2026-06-14-web-ui-bridge-studio]]。**残=STUDIO 95%パリティ(boxモデルwidget/hover状態/bpバー位置)**。
- 学び: 同一feature反復は1 worktree使い回し(今回9本+terra6回reinstallの重複)/模倣対象は設計前devtools実測/dev daemon依存状態は永続化/Codex委任は次回実践。
- 前: codex-implement 堅牢化(Sonnetフォールバック+effort medium/PR#187-188)。retro [[../outputs/retrospectives/2026-06-13-codex-fallback-effort]]。

## Current Focus
- **web-ui-bridge**: 主要機能(編集/構造/undo/STUDIO風UI)出荷済。次は STUDIO 95%パリティ詰め(boxモデルwidget・hover状態・bpバー)。起動=`node apps/web-ui-bridge/daemon/server.mjs --target <site>` + 対象で `npm run dev`、daemon依存に `@babel/parser`(初回 `cd daemon && npm install`)。履歴/トークンは target 配下に永続化(gitignore済)。
- **Codex 委任の実運用観察**: フォールバック(Sonnet)/effort medium が効くか次の Codex 委任時に確認(レート制限が実際に減るか・medium で取りこぼし増えないか)。
- **X collector 最適化＝自走化完了**: shadow データ蓄積中(現1/7)。**enforce 自動flip**(直近7run retention=100%∧pruned_fine_max<70)で削減発動(¥53→¥25-35・即revert=`collector_prerank_enforce`=0)。launchd 夜間apply(03:00JST)は real-mode だが brownout中は defer。MA live: collector v2(PR#169 keyword/trend主軸)・analyst v2(P4 collector_lever)。
- **brownout 中（¥13,800超）**: X worker は daily-digest+line-event のみ。`!resume`か月初リセットで復帰。**enforce自動flip は collect 継続が前提**＝brownout で collect halt なら shadow 蓄積停止 → 要 `!resume`/監視。[[project-cron-automation-disabled]]
- **mf-finance（別ブランチ進行中）**: Plan1+後続モジュール完了。worktree `task/260606-mf-finance` 未merge・[[../apps/mf-finance/HANDOFF.md]]。PostgREST公開反映の稼働確認が残。
- 🔴 **ミナト広告設定（再開待ち）**: chrome-devtools MCP接続待ち。[[project-minato-ad-settings]]
- 🔴 **はぐりん persona**: 名義境界の戦略再判断 未着手。

## Recently Touched
- `apps/web-ui-bridge/{daemon/server.mjs,daemon/reorder.mjs,overlay/overlay.js,STUDIO-PARITY.md,README.md}`・`outputs/clients/terra-isshiki/site/`(パイロット・dev限定 overlay 注入1行+gitignore)
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
