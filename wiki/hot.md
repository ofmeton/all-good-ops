---
type: meta
title: "Hot Cache"
updated: 2026-06-14
---
# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。セッション開始時に最優先で読む。詳細: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-06-14 — **X発信 大刷新(PR#185-205)**: ①collector自動収集をフラグ(`collector_enabled=0`)で可逆停止→**手動ブックマークURL貼付取込**(`/admin/ingest-bookmarks`→twitterapi `get_tweet_by_ids`・source_type=x_inspirations/via=bookmark→既存curation配管)。bookmarks_v2自動吸上げは proxy必須で却下→URL貼付採用 ②競合バズ/スレッド/チャエン/記事を研究→テンプレ拡充 ③writer改修=fmat別知見(`compose-knowledge.ts`)+段取りoutline先行(submit_draft.outline)+visual_hint ④**ターゲット再定義(メイン=Claude Code中級者)をブランド全体(CLAUDE.md/spec)へ** ⑤stop-slop導入 ⑥Phase2 slice1=記事ブロック画像 gpt-image-2(visual_hint駆動・ローカル`generate-draft-images.ts`→Storage `xad-generated`)・実物検収で**日本語テキスト◎=hybrid不要**・**画像genは保留(手動運用)** ⑦article品質PDCA=ローカルreplica評価(`pdca-eval.ts`)でロールモデル(nobel_824記事)基準 **62→88** 改善・本番反映(template patchはruntime注入=re-bake不要)。codex(gpt-5.5)多用。retro [[../outputs/retrospectives/2026-06-14-xad-bookmark-research-writer-image-quality]]。
- 学び: codex外部API実装はguess→ブリーフにllms-full grep必須/article長文composeは240sでも重い→入力trim/段取り簡略要/LLM採点ノイズ±5→大レバー(few-shot)で動かす/worktree-file-reread 4連続(同一feature1 worktree使い回し未徹底)。
- 前: web-ui-bridge(PR#195-204)・codex-implement堅牢化(PR#187-188)。

## Current Focus
- **X発信 新運用**: 自動収集OFF・**手動ブックマークURLを `scripts/ingest-bookmarks.ts`/`/admin/ingest-bookmarks` で投入**→curation→writer(知見+段取り+新ターゲット)→check→LINE承認。writer は MAv4(再焼成済)。テンプレ patch は runtime 注入(re-bake不要・deployのみ)。collector復活は `collector_enabled` 行削除/=1。
- **X発信 残**: ①article compose軽量化(240sでも長文重い→入力trim/段取り簡略)未実装 ②Phase2画像 次スライス=publish側ブロック挿入(X Articleインライン/thread各ツイート)=**保留(手動画像gen運用)** ③writer品質~88 plateau・自己推敲2pass(compose費2倍)は要承認レバー。eval資産=`scripts/pdca-eval.ts`。
- **web-ui-bridge**: 出荷済(PR#195-204)。残=STUDIO 95%パリティ。起動=`node apps/web-ui-bridge/daemon/server.mjs --target <site>`+対象`npm run dev`。
- **X collector 最適化＝自走化完了**: shadow データ蓄積中(現1/7)。**enforce 自動flip**(直近7run retention=100%∧pruned_fine_max<70)で削減発動(¥53→¥25-35・即revert=`collector_prerank_enforce`=0)。launchd 夜間apply(03:00JST)は real-mode だが brownout中は defer。MA live: collector v2(PR#169 keyword/trend主軸)・analyst v2(P4 collector_lever)。
- **brownout 中（¥13,800超）**: X worker は daily-digest+line-event のみ。`!resume`か月初リセットで復帰。**enforce自動flip は collect 継続が前提**＝brownout で collect halt なら shadow 蓄積停止 → 要 `!resume`/監視。[[project-cron-automation-disabled]]
- **mf-finance（別ブランチ進行中）**: Plan1+後続モジュール完了。worktree `task/260606-mf-finance` 未merge・[[../apps/mf-finance/HANDOFF.md]]。PostgREST公開反映の稼働確認が残。
- 🔴 **ミナト広告設定（再開待ち）**: chrome-devtools MCP接続待ち。[[project-minato-ad-settings]]
- 🔴 **はぐりん persona**: 名義境界の戦略再判断 未着手。

## Recently Touched
- `apps/x-account-system/lib/{ingest/twitterapi-client,ingest/bookmark-collect,ingest/tweet-url,curation/compose-prompts,curation/compose-knowledge,curation/compose-templates,curation/run-compose,visualizer/codex-image,visualizer/draft-images,params/runtime-params}.ts`・`scripts/{ingest-bookmarks,generate-draft-images,pdca-eval,x-bookmark-login,fetch-thread-study,fetch-chaen-article-study}.ts`・`agents/x-writer.{system.md,agent.yaml}`・`wrangler.toml`・`src/{worker,queue}.ts`
- `CLAUDE.md`(ターゲット改定)・`docs/superpowers/specs/2026-05-20-publishing-pivot-design.md`・`.claude/skills/stop-slop/`・`outputs/improvements/2026-06-13-chaen-quality-pdca/`・`outputs/research/2026-06-13-*`・`raw/publishing/research/2026-06-13-*`
- memory [[project-x-block-images]] [[project-x-writer-quality-pdca]] [[feedback-codex-permission-defaults]] [[feedback-deploy-no-confirm]] [[feedback-factcheck-external-specs]] [[project-x-collector-cost-optimization]]（collector retire pivot）
- 本番反映: worker `v91d6666e`・x-writer MA `v4`・Storage bucket `xad-generated`・`runtime_params.collector_enabled=0`

## Open Questions / Frontiers
- **enforce 自動flip 依存**: collect が回り続け shadow が7run貯まるか（brownout halt 注意）。基準到達で自動切替＋LINE通知。
- **bootstrap-core `--tool` バグ残置**: 次回 MA update は `scripts/update-ma-agents-sdk.ts`(SDK直) 再利用 or 恒久修正。
- **MA prompt drift 検知なし**: merge+worker deploy ≠ MA反映（ma:bootstrap 必須）で PR#169 が3日 un-live だった。system_hash drift の CI 警告が欲しい。
- **cwd-regression**: 全Bash `cd <abs> &&` 前置（[[bash-cwd-persistence]]）。
- `listApprovedStock`相当フィルタ3箇所複製の SSOT 化（未着手）。

## Conventions
- 500 words 以内 / declarative present tense / 全置換更新（古い項目は間引く）
- 更新タイミング: ingest 後 / 大きな query 合成後 / 戦略変更 commit 後 / 振り返り完了時
