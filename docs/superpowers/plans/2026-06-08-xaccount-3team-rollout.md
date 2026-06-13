# X発信 改修 3team ロールアウト計画

> **For agentic workers:** REQUIRED SUB-SKILL: 各 team は architect → system-engineer → pr-review-toolkit。architect は spec の該当 team 章から bite-sized 実装ブループリントを生成し、system-engineer が TDD で実装する。Steps は checkbox。

**Goal:** 承認済み spec（`docs/superpowers/specs/2026-06-08-xaccount-templates-approval-check-design.md`）を 3 team 並列で実装し、テンプレ拡充・チェック強化・承認UX を本番投入する。

**Architecture:** 3 worktree = 3 team。migration は T3 単独。materials_store は T2=raw_text 読取 / T3=meta.translation 追加で非衝突。各 team 独立 merge。

**Tech Stack:** Cloudflare Workers(TS) / Supabase(Postgres, schema=xad) / Next.js(App Router) dashboard / vitest / Claude MA(Haiku 翻訳)。

---

## 0. 共通前提（全 team）
- spec 本文が SSOT。本計画はタスク順序と検証の確定のみ（詳細コードは architect ブループリント）。
- 規約 SSOT: `wiki/dev/standards.md`。dashboard は frontend-design 常時・responsive-layout 参照。
- worktree: `bash scripts/wt-new.sh <topic>`（origin/main 派生）。完了 `wt-done.sh`。
- 検証は spec 各 team の「検証」節。push 前に `git log --oneline main..HEAD` で混入確認。
- Supabase 失効時 `/mcp` 再認証 or Management API 迂回（memory `reference_supabase_mgmt_api_keychain`）。
- 翻訳・check の MA 呼び出しは Anthropic サブスク内（cost_ledger / brownout 配下）。

## T1 — 執筆の型（worktree: xaccount-t1-templates）
spec §3 T1 参照。

- [ ] **T1.1** `ComposeTemplate` 拡張の失敗テスト（tone/structure/hookType/hookStrength を持つ型 → `buildWriterSystemPrompt` が prompt に反映）を vitest で先に書く
- [ ] **T1.2** テスト red 確認
- [ ] **T1.3** `compose-templates.ts` に構造化フィールド追加＋`buildWriterSystemPrompt` 合成ロジック実装（既存 `systemPromptPatch` 併用）
- [ ] **T1.4** テスト green 確認 → commit
- [ ] **T1.5** チャエン他型 2〜3 種を registry 登録（型1 維持）。各テンプレの合成 prompt をスナップショットテスト → commit
- [ ] **T1.6** worker `GET /admin/templates`（既存 /admin 認可準拠）追加＋返却 shape テスト → commit
- [ ] **T1.7** dashboard `curation-formats.ts` の `TEMPLATE_OPTIONS` 手書き撤去 → curation 初期取得で `/admin/templates` から動的取得。表示テスト → commit
- [ ] **T1.8** 型化手順 doc（参考アカ後渡し時の register 手順）追記 → commit
- [ ] **T1.9** pr-review-toolkit（code-reviewer + silent-failure-hunter）→ 指摘修正 → PR

**Done:** 新テンプレが compose で選択・適用でき、dashboard 型一覧が endpoint 由来。drift 解消。

## T2 — チェック強化（worktree: xaccount-t2-check）
spec §3 T2 参照。完全独立・migration 無し。

- [ ] **T2.1** check の失敗テスト: 元ネタ含有→`factcheck=ok` かつ web_search 非呼出／非含有→web_search パス／`source_grounded` 出力、を vitest で先に書く（MA はモック）
- [ ] **T2.2** テスト red 確認
- [ ] **T2.3** `run-check.ts` に source 素材取得（`core_ideas.source_material_ids`→`materials_store.raw_text`+translation）を追加し checker メッセージへ「元ネタ」注入
- [ ] **T2.4** `check-prompts.ts` のファクト判定手順を「含有判定→非含有のみ web_search」に変更＋`SUBMIT_CHECK_TOOL` に `source_grounded` 追加
- [ ] **T2.5** テスト green 確認 → commit
- [ ] **T2.6** trace で実 draft の挙動確認（元ネタ由来は web_search 減）
- [ ] **T2.7** pr-review-toolkit → 指摘修正 → PR

**Done:** 元ネタ含有の主張は web_search なしで OK、非含有のみ裏取り。`source_grounded` が観測ログに出る。

## T3 — 承認体験（worktree: xaccount-t3-approval）
spec §3 T3 参照。最重量・最初着手推奨。順序: a 翻訳基盤 → b/c/d UI → e LINE。

### T3-a 翻訳（#6・基盤）
- [ ] **T3.1** collector の翻訳保存テスト（lang≠ja → `meta.translation` セット・ja はスキップ。MA モック）→ red
- [ ] **T3.2** collector 実装（Haiku 翻訳→`meta.translation`/`meta.translation_engine`）→ green → commit
- [ ] **T3.3** migration: `curation_materials` view に `translation` 露出 → xad 適用 → commit

### T3-b 承認UI（#2）
- [ ] **T3.4** migration: view `approval_drafts`（post_drafts×core_ideas×source materials）＋ RPC `set_approval_status(ids,status)` → xad 適用 → commit
- [ ] **T3.5** `lib/drafts-logic.ts` 純ロジック（status 遷移・body 更新バリデーション）の vitest → red
- [ ] **T3.6** `drafts-logic.ts` 実装 → green → commit
- [ ] **T3.7** `lib/drafts-queries.ts`＋ API `app/api/drafts/{approve,update}/route.ts`（fail-open・イベントログは curation select パターン踏襲）→ commit
- [ ] **T3.8** `app/approval/`（page server 取得 + ApprovalClient + DraftCard）。pending 一覧＋本文 inline 編集保存＋承認/却下。frontend-design → commit

### T3-c 元ネタ併記（#3）
- [ ] **T3.9** DraftCard に元ネタ節（原文＋日本語訳＋tweet_url＋engagement＋メディア）を `approval_drafts` から表示 → commit

### T3-d メディアモーダル（#5）
- [ ] **T3.10** `components/MediaModal.tsx`（lightbox・video 再生）→ MaterialCard と DraftCard に差し込み（thumbnail クリック→原寸）→ commit

### T3-e LINE 簡素化
- [ ] **T3.11** `post-job.ts` pushApproval を「新規承認 N件＋UIリンク」のみに置換 → commit
- [ ] **T3.12** `line-event.ts` の approve/reject 経路＋関連テスト撤去（他 intent skeleton 残置）→ commit

### T3 検証・締め
- [ ] **T3.13** `/approval` 実 E2E（編集→承認→core_ideas=approved／却下→draft）。LINE 通知 smoke
- [ ] **T3.14** pr-review-toolkit → 指摘修正 → PR（dashboard は `npx vercel deploy --prod --yes`）

**Done:** 承認が UI 一本化（本文編集＋元ネタ日本語併記＋メディアモーダル）、LINE は通知のみ。

## 統合（全 merge 後）
- [ ] 統合 smoke: compose（新テンプレ）→ check（元ネタ含有判定）→ `/approval`（編集・承認）→ LINE 通知 → 予約投稿ストック化。
- [ ] memory `project_x_agentic_rearchitecture` 更新・引き継ぎ raw 追記。

## Self-review（spec coverage）
- #1→T1 / #4→T2 / #2→T3-b / #3→T3-c / #5→T3-d / #6→T3-a / LINE→T3-e。全要望に対応タスク有り。
- migration 発行は T3 のみ（T3.3/T3.4）。番号衝突無し。
- 型整合: `set_approval_status` / `approval_drafts` / `meta.translation` / `source_grounded` を spec と一致して使用。
