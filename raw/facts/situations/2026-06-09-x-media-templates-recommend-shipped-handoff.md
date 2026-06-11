---
date: 2026-06-09
category: situations
topic: X発信 改修3team（承認UIメディア添付/テンプレ5拡充/LLMレコメンド）main merge済→本番反映が人間ゲートで残
---

# X発信 改修 3team セッション 引き継ぎ（2026-06-09）

## 何をやったか
plan（`~/.claude/plans/xaccout-ui-ux-dl-url-foamy-hearth.md`）→ 3隔離worktree=3team 並列（system-engineer実装→pr-review-toolkit code-reviewer+silent-failure-hunter→修正）→ ファイル独立を確認しクリーン統合。**3 PR とも main merge 済・統合検証緑・本番未反映**。

- ※ wt-new.sh の外部worktreeはこのセッションのサンドボックス外でagentが触れず → **Agent isolation:"worktree"（repo内 .claude/worktrees/）に切替**で解決。

## merge 済み（main 反映済・本番未反映）
- **PR#139 T-B テンプレ5拡充**: `compose-templates.ts` に case_calm/value_deepdive/reaction_light/contrarian_news/offer_savings。既存フィールドのみ（細目は systemPromptPatch 散文・型拡張なし）。`listTemplateSummaries` を `{id,name,description,preferredFmats,tone,hookType}` に拡張＋contract テスト。
- **PR#140 T-C LLMレコメンド**: worker `POST /admin/recommend`（Bearer・件数上限20・空入力skip・cost_ledger計上・fail-open・Haiku）。`recommend.ts`（境界検証）/ dashboard `/api/curation/recommend` / CurationClient「🤖おすすめ」（推薦理由表示・pre-fill編集可）。on-demand限定。
- **PR#141 T-A 承認UIメディア添付**: 写真=pbs DL→chrome `upload_file` 添付（attachments 構造化・承認時atomic）/ 動画・GIF=`{tweet_url}/video/1` deep-link を承認UIトグルで本文追記。**migration 0019**（approval_drafts view + set_approval_status に p_attachments・後方互換）。AttachmentPicker / media-fetch(写真・8MB上限・skipped降格) / fetch-draft-media CLI。**HIGH修正: 予約後 scheduled_for 未更新の二重予約バグ→`mark-scheduled.ts` 冪等UPDATE新設**。cleanup自動sweep/添付枚数表示。docs `apps/x-account-system/docs/backlog.md`（後回しバックログ）同梱。

## 確定した設計判断
- **メディア（写真/動画ハイブリッド）**: 動画=deep-link 本文追記（DL不要・陸さん実機確認済「/video/1 を貼ると展開」）。写真=DL→upload。CDN画像URL直貼りは画像化しないため不採用。
- collector が video_info を捨てサムネのみ保存問題は deep-link 方式で無関係化。
- テンプレ構造化の細フィールド（mediaPolicy/avoid等）は今回 systemPromptPatch 埋込止まり（型拡張せず）。
- レコメンドは LLM(Haiku) on-demand・テンプレ非依存（実行時 summary 渡し）。

## 本番反映＝人間ゲート（未実施・次にやること）
※ 前提訂正: migration **0018 と前回T3の dashboard/worker deploy は 2026-06-08 に適用・反映済**（memory project_x_agentic_rearchitecture line46）。今回新規に要るのは **0019＋今セッション分のコード deploy のみ**。
1. **migration 0019 を xad（project=hofvvcvhjslevymhbcqj）に適用**。MCP `/mcp` 再認証→`list_tables`(schema=xad) で post_drafts/approval_drafts/set_approval_status の現状を Inspect（DDL前必須・0018適用済の確認も兼ねる）→`apply_migration`。MCP不可なら keychain→Management API 迂回（mem `reference_supabase_mgmt_api_keychain`）。0019 は approval_drafts view 再定義＋set_approval_status に p_attachments 追加（後方互換）。
2. **dashboard deploy**: `cd apps/xad-dashboard && npx vercel deploy --prod --yes`（GitHub自動deployなし）。
3. **worker deploy**: `cd apps/x-account-system && npm ci` 後 `wrangler deploy`（mem `feedback_wrangler_deploy_npm_ci_first`）。`APPROVAL_UI_URL`（前回T3分）と `ANTHROPIC_API_KEY`（recommend用）secret 投入確認。新テンプレ・recommend・collector翻訳・承認メディアはこの deploy で反映。
4. **deploy後 smoke**: 全secret verify（mem `feedback_deploy_verify_all_secrets`）。`/admin/recommend` を実素材で叩き推薦妥当性＋cost_ledger計上 verify。
5. **本番E2E**: `/approval` で写真添付＋動画 deep-link 本文追記→承認→`plan-scheduled-publish` 添付サマリ→chrome 予約で写真 upload_file・動画 deep-link 展開・`mark-scheduled` で scheduled_for 更新（二重予約防止）を実走。複数写真の添付順・写真deep-link展開は実機未確認。

## 次の本命（合意済）
現改修の本番反映が済んだら **「計測整備→改善ループ設計」**（`collector-agent-design.md:119` の「ループ自動化は後日」）。後回し全項目は `apps/x-account-system/docs/backlog.md` に集約済。

## 注意
- worker テストは jest（`IN_MEMORY_FALLBACK=true npx jest`）・dashboard は vitest。統合検証: worker 594 / dashboard build 緑。
- StayClean同様 .env.local は本番を指す系の事故注意（migration はステージ確認）。
