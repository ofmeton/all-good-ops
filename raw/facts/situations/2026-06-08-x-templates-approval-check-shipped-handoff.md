---
date: 2026-06-08
category: situations
topic: X発信システム 改修3team（テンプレ拡充/承認UX/チェック強化）コード完了→本番反映が人間ゲートで残
---

# X発信 改修 3team セッション 引き継ぎ（2026-06-08）

## 何をやったか
spec/plan（PR#132）→ 3 worktree=3 team 並列（architect→system-engineer→pr-review-toolkit）で実装→レビュー→修正→独立 merge。統合後 main で型/テスト緑を確認済み。

- spec: `docs/superpowers/specs/2026-06-08-xaccount-templates-approval-check-design.md`
- plan: `docs/superpowers/plans/2026-06-08-xaccount-3team-rollout.md`

## merge 済み（main 反映済・本番未反映）
- **PR#134 T1 執筆の型**: `ComposeTemplate` 構造化拡張（tone/structure/hookType/hookStrength/referenceNote）＋`renderTemplatePrompt`。チャエン型2（逆張り `template_chaen_contrarian`）/型3（数字ハウツー `template_chaen_howto`）追加。worker `GET /admin/templates`（/admin/enqueue 認可複製）→ dashboard が動的取得し手書き TEMPLATE_OPTIONS 撤去（drift 撲滅）。型化手順 doc `2026-06-08-reference-account-templating-howto.md`。
- **PR#135 T2 チェック強化**: `run-check.ts` が draft の元ネタ（core_ideas.source_material_ids→materials_store.raw_text+meta.translation）を checker に注入。`check-prompts.ts` を「①元ネタ含有なら web_search 不要で ok ②非含有のみ裏取り」に。`SUBMIT_CHECK_TOOL` に `source_grounded`。`fetchSourceMaterials` は `.maybeSingle()`（参照切れ core_idea の恒久ストール回避）。
- **PR#136 T3 承認体験**: collector が lang≠ja を Haiku 翻訳→`meta.translation`。`app/approval/`（一覧・本文 inline 編集・承認/却下）。`MediaModal` lightbox を curation/approval 両カードに。DraftCard に元ネタ原文＋日本語訳＋engagement。LINE は pushApproval を承認UIリンク通知のみ化＋ line-event の approve/reject 撤去。**migration `0018_approval.sql`**（curation_materials に translation / approval_drafts view / set_approval_status RPC）。承認 query＋RPC に `editor_status='approved'` ガード（未点検 draft の fact-check バイパス退行を防止）。

## 確定した設計判断
- 翻訳=収集時 Claude Haiku（claude-haiku-4-5-20251001）→meta.translation（サブスク内・cost_ledger 計上）。
- LINE は CAS idempotency 維持のため **per-draft 通知**（spec の「N件まとめ」より architect 判断採用）。
- 参考アカは枠組み先行・後渡し（型化手順 doc に沿って構造化フィールドを埋め register すれば dashboard は endpoint 由来で自動波及）。

## 本番反映＝人間ゲート（未実施・次にやること）
1. **migration 0018 を xad（project=hofvvcvhjslevymhbcqj）に適用**。Supabase MCP 失効しがち → `/mcp` 再認証 → `list_tables`(schema=xad) で post_drafts/core_ideas/materials_store/curation_materials の実スキーマ Inspect（DDL 前必須）→ `apply_migration`。MCP 不可なら keychain→Management API 迂回（memory `reference_supabase_mgmt_api_keychain`）。**未適用だと /approval は 0 件**。
2. **dashboard deploy**: `cd apps/xad-dashboard && npx vercel deploy --prod --yes`（GitHub 自動 deploy なし）。deploy 後 smoke で全 secret verify。
3. **worker**: `APPROVAL_UI_URL`（=`<dashboard>/approval`）を wrangler secret 投入＋ Env 反映 → `npm ci` 後に wrangler deploy（mem `feedback_wrangler_deploy_npm_ci_first`）。collector 翻訳・新テンプレ・checker 改修もこの deploy で反映。
4. **本番 E2E / trace**: `/approval` 編集→承認→core_ideas=approved／却下→draft。T2 の web_search 実減 trace（元ネタ由来=source_grounded:true で web_search 0）。LINE 通知 smoke。

## 注意・補足
- worker テストは **jest**（`IN_MEMORY_FALLBACK=true npx jest`）、dashboard は **vitest**。spec の "vitest" 一般化は worker では実体 jest。
- 統合検証済み: dashboard vitest 23 / build 緑（/approval 生成）、worker typecheck clean / jest 82（curation+check+webhook）。
- 翻訳保存は次回 collect から発動（既存素材には translation 無し → 承認画面・curation で海外ツイートは原文のみ表示。再収集で付く）。
- frontend-design は 2026-06-08 に `ui-ux-pro-max` へ置換（PR#133・本実装は frontend-design 期に作成、機能影響なし）。
