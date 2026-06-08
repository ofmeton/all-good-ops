# X発信システム 改修設計: テンプレ拡充 / 承認UX / チェック強化

- date: 2026-06-08
- status: approved (brainstorming → spec)
- 関連: PR#112(収集) / PR#113(キュレUI) / PR#128(旧削除) / PR#130(format+template選択)
- memory: `project_x_agentic_rearchitecture` / `project_agent_teams_orchestration`
- 引き継ぎ: `raw/facts/situations/2026-06-08-x-format-template-shipped-handoff.md`

## 1. 目的とスコープ

X発信新アーキ〈収集→キュレUI選抜→執筆→チェック→人間承認→予約投稿〉に、6 つの改善を入れる。

| # | 改善 | 担当 team |
|---|---|---|
| 1 | 投稿テンプレ拡充（チャエン他型＋参考アカ分析の型化基盤／文体・構成・hook強度・hook類型） | T1 |
| 2 | 承認UI（UI上で本文を直接編集＋承認、LINEは通知のみ） | T3 |
| 3 | 承認時に元ネタツイート併記（#4 日本語訳も併記） | T3 |
| 4 | チェッカー改善（まず元ネタ含有判定→含めばOK／含まねば WEBサーチ） | T2 |
| 5 | メディアをモーダル表示（#3） | T3 |
| 6 | 海外ツイートの日本語翻訳データ（#4 基盤） | T3 |

### 確定した方針判断
- **翻訳方式**: 収集時に Claude Haiku で翻訳 → `materials_store.meta.translation` に保存（既存 MA 基盤を再利用・新ベンダ無し・cost_ledger 管理下／brownout 配下）。
- **参考アカウント**: 型化エンジン（構造化フィールドを埋めて register する手順）を先に整備。アカウントは後渡しで同じ枠に流す。今回スコープはチャエン他型＋枠組み。
- **LINE**: approve/reject ボタン・ハンドラを撤去。LINE は「新規承認 N件＋UIリンク」通知のみ。
- **並列**: 3 worktree = 3 team（agent-teams-playbook: 各 team で architect → system-engineer → pr-review-toolkit）。

### 非スコープ（今回やらない）
- ループ自動化（計測→施策の自律ループ）。
- X API 直投の完全撤去（別 cleanup PR 候補・既存どおり chrome 予約投稿）。
- 参考アカウントの実分析（アカ後渡し後・別セッション可）。
- 旧 x_inspirations 891件の選抜対象化。

## 2. 現状の足場（コード根拠）

- 承認: LINE Flex card（`src/jobs/post-job.ts:219-368` pushApproval）→ postback（`src/jobs/line-event.ts:128-160` parse / `:169-270` handleApprove / `:275-329` handleReject）。`post_drafts.human_approval_status` ∈ pending/approved/rejected/auto_approved（`migrations/0002:87-89`）。承認で `core_ideas.status='approved'`（予約待ちストック）。`AUTONOMOUS_PUBLISH`（`src/worker.ts:28,290`）。
- テンプレ: `lib/curation/compose-templates.ts:9-51`（`ComposeTemplate{id,name,description,systemPromptPatch,preferredFmats}`・`template_chaen_gold` のみ）。dashboard 複製 `apps/xad-dashboard/lib/curation-formats.ts:8-25`（drift 警告コメント有）。compose 適用 `lib/curation/run-compose.ts:126-172`。
- チェック: `lib/check/run-check.ts:129-250`（draft 本文＋直近投稿のみ渡す・**元ネタ raw_text は未渡し**）。`lib/check/check-prompts.ts:13-75`（SUBMIT_CHECK_TOOL・現状ファクトは「完全な嘘/明らかにおかしい数字」のみ）。WEB_TOOLSET=web_search+web_fetch。
- 素材/翻訳: `migrations/0001` materials_store（`raw_text`/`meta jsonb`・**翻訳フィールド無し**）。`migrations/0016` curation_materials view（lang/tweet_url/media/engagement を meta から抽出）。draft→素材は `core_ideas.source_material_ids uuid[]`（`migrations/0002:18`）。
- dashboard: `app/curation/`（page/CurationClient/MaterialCard）＋ `lib/curation-logic.ts`＋ `lib/curation-queries.ts`＋ `app/api/curation/select/route.ts`。`lib/supabase.ts` serverSupabase(schema:xad, service role)。承認ページは未存在。

## 3. Team 別 設計

### T1 — 執筆の型（要望#1）

**目標**: 文体・構成・hook強度・hook類型を構造化して持ち、チャエン他型を増やし、参考アカウントを後から同じ枠で型化できるようにする。

**変更**
- `lib/curation/compose-templates.ts`: `ComposeTemplate` を拡張。
  - 追加フィールド: `tone`(文体: string)、`structure`(構成: string[] 例 `["速報フック","意味づけ","箇条書き","実務接続"]`)、`hookType`(enum: `速報|逆張り|数字|共感|問い|権威`)、`hookStrength`(`strong|medium|soft`)、`referenceNote`(由来: string・任意)。
  - `systemPromptPatch` は維持しつつ、構造化フィールドから本文を合成できるようにする（`buildWriterSystemPrompt` 内で tone/structure/hookType/hookStrength を prompt 文に展開。明示 patch があれば併用）。
  - チャエン他型を **2〜3 種**登録（型2/型3。既存 `template_chaen_gold` は型1 として維持）。
- ドリフト解消: worker に `GET /admin/templates`（既存 `/admin/*` 認可に準拠）を追加し registry の `{id,name,description,preferredFmats}` を返す。dashboard `lib/curation-formats.ts` の `TEMPLATE_OPTIONS` 手書きを撤去し、この endpoint から動的取得（curation ページ初期データ取得時にフェッチ）。
- 型化手順を spec/doc 化（参考アカ後渡し時に「構造化フィールドを埋めて register」する再現手順）。

**境界**: worker `lib/curation/compose-templates.ts`・`run-compose.ts`(prompt 合成)・`/admin/templates` route／dashboard `lib/curation-formats.ts`・curation 初期データ取得。migration 無し。

**検証**: `buildWriterSystemPrompt` の vitest（各テンプレ→prompt に tone/structure/hook が反映）。`/admin/templates` の返却 shape。dashboard 型一覧が endpoint 由来で表示。

### T2 — チェック強化（要望#4）

**目標**: ファクトチェックを「まず元ネタツイート含有判定」に変える。含めば web_search 不要で OK、含まねば従来どおり web_search。

**変更**
- `lib/check/run-check.ts`: 対象 draft の `core_ideas.source_material_ids` → `materials_store.raw_text`(+ `meta.translation` があれば併記) を取得し、checker のユーザーメッセージに **「元ネタツイート」**として追加（現状は draft 本文＋直近投稿のみ）。
- `lib/check/check-prompts.ts`:
  - system prompt のファクト判定を変更: **①draft の主張・数字が元ネタに含まれるか判定 → 含めば `factcheck=ok`（web_search 呼ばない）。②元ネタに無い新情報・数字のみ web_search/web_fetch で裏取り → 取れれば ok、明らかに誤りなら suspicious、不明は unverifiable で通す**（誇張許容の現方針は維持）。
  - `SUBMIT_CHECK_TOOL` に `source_grounded: boolean`（主張が元ネタ由来か）を追加し観測ログへ。
- 効果: 元ネタ由来の投稿で web_search が減る（コスト減）＋ 非元ネタ主張の裏取り精度向上。

**境界**: worker `lib/check/run-check.ts`・`check-prompts.ts`（＋必要なら素材取得の小ヘルパ）。完全独立・migration 無し・他 team とファイル非衝突。

**検証**: check の vitest（元ネタ含有→web_search 不要パス／非含有→web_search パス／`source_grounded` 出力）。trace で挙動確認。

### T3 — 承認体験（要望#2,3,5,6）

**目標**: 承認を UI 一本化。本文を UI 上で直接編集して承認。承認画面で元ネタツイート（原文＋日本語訳＋engagement＋メディア）を併記。メディアはモーダル。LINE は通知のみ。

**T3-a 翻訳（#6・基盤・先行実装）**
- collector: 海外ツイート（`lang` が ja 以外）収集時に Claude Haiku で翻訳 → `meta.translation`（＋ `meta.translation_engine` 程度のメタ）。既存 MA 経路・cost_ledger 計上。
- migration: `curation_materials` view と後述 `approval_drafts` view に `translation` を露出。
- 失効時の DDL 投入は Management API 迂回（memory `reference_supabase_mgmt_api_keychain`）。

**T3-b 承認UI（#2）**
- 新 view `approval_drafts`: `post_drafts × core_ideas × source materials` を join し、1 行に draft（body/status/risk/format）＋ 元ネタ配列（raw_text/translation/tweet_url/lang/media/engagement）を載せる。
- 新ページ `app/approval/`（`page.tsx` server 初期取得 ＋ `ApprovalClient.tsx` ＋ `DraftCard.tsx`）。`human_approval_status='pending'` かつ実投稿前の draft を一覧。
- **本文 inline 編集**: DraftCard の textarea で `post_drafts.body` を編集→保存。
- API `app/api/drafts/route.ts`（一覧は server component 経由でも可）＋ `app/api/drafts/approve/route.ts`（approve/reject）＋ `app/api/drafts/update/route.ts`（body 更新）。`lib/drafts-queries.ts`＋ `lib/drafts-logic.ts`（純ロジック・vitest）。
- RPC `set_approval_status(ids, status)`: 承認時 `human_approval_status='approved'`/`human_approved_at=now`/`core_ideas.status='approved'`、却下時 `rejected`/`core_ideas.status='draft'`（`line-event.ts` handleApprove/handleReject の状態遷移を踏襲・atomic claim 維持）。body 更新は service role で直接 or RPC。
- fail-open / イベントログは curation の `select/route.ts` パターンに倣う。

**T3-c 元ネタ併記（#3）**
- DraftCard に元ネタセクション: 原文 raw_text ＋ 日本語訳（`translation`）を併記、`tweet_url` リンク、engagement(like/RT/view)、メディアサムネ。`approval_drafts` view から 1 フェッチ。

**T3-d メディアモーダル（#5）**
- 共有コンポーネント `components/MediaModal.tsx`（lightbox）。`MaterialCard`（curation）と `DraftCard`（approval 元ネタ）両方で thumbnail クリック→原寸表示、`type=video` は再生対応。frontend-design 準拠。

**T3-e LINE 簡素化**
- `src/jobs/post-job.ts` pushApproval を「新規承認 N件＋承認UIリンク」のみに置換（Flex approve/reject card・本文全文 push を撤去）。
- `src/jobs/line-event.ts` の approve/reject 経路（parseApprovalIntent の承認 intent / handleApprove / handleReject）と関連テストを撤去。他 intent があれば webhook skeleton は残置。

**境界**: dashboard `app/approval/`・`app/api/drafts/*`・`lib/drafts-*`・`components/MediaModal`・curation MaterialCard（モーダル差し込み）／worker collector（翻訳）・`post-job.ts`・`line-event.ts`／migrations（翻訳列＋ approval_drafts view ＋ set_approval_status RPC）。

**検証**: drafts-logic vitest（status 遷移・body 更新バリデーション）。migration を xad（project=hofvvcvhjslevymhbcqj）適用。`/approval` 実 E2E（編集→承認→core_ideas 遷移）。LINE 通知 smoke。

## 4. チーム間コントラクト / 衝突回避

- migration は **T3 単独**発行（番号衝突回避）。T1/T2 は migration 無し。
- materials_store: T2 は `raw_text`（既存）読取のみ、T3 は `meta.translation`（新規追加フィールド）。別フィールドで非衝突。T2 は翻訳に非依存（モデルが原文を直接読む）。
- テンプレ型定義は T1 単独。check は T2 単独。承認/LINE/翻訳/メディアは T3 単独。
- 着手は 3 並列同時可。マージ順は任意（ハード依存なし）。最重量は T3 → 最初に着手推奨。

## 5. 進め方（orchestration）

1. 本 spec を main 反映（全 team の共有参照）。
2. team ごとに worktree（`bash scripts/wt-new.sh xaccount-t1-templates` 等）。
3. 各 team: architect（本 spec の team 章 → 実装ブループリント）→ system-engineer（実装・test/build）→ pr-review-toolkit（code-reviewer + silent-failure-hunter 必須）。`wiki/dev/standards.md` 準拠。
4. dashboard は frontend-design 常時。Vercel は GitHub 自動デプロイ無し → `npx vercel deploy --prod --yes`。Supabase MCP 失効時は `/mcp` 再認証 or Management API 迂回。
5. 各 PR は独立 merge。全 merge 後に統合 smoke（compose→check→/approval→LINE通知）。
