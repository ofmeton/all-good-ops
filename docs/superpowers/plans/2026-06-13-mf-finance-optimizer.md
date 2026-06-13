# mf-finance Optimizer 実装計画

> **For agentic workers:** 並列ワークストリーム方式。基盤(Task 0)を先に敷き、W1/W2/W3 を専有ファイル分担で並列実装。各タスクは tsc/test/build で検証。Steps は `- [ ]`。

**Goal:** ダッシュボード全体のデータ・スチュワード（提案キュー＋人間ゲート＋ルール化永続）を実装する。

**Architecture:** 二層（コード決定的シグナル ＋ Claude オンデマンド思考）＋ `/optimizer` 承認UI。承認は category_rules / txn_overrides / category_groups に落ちて再取込耐性。

**Tech Stack:** Next.js 16 App Router / better-sqlite3 / TypeScript / node:test。spec: `docs/superpowers/specs/2026-06-13-mf-finance-optimizer-design.md`。

**作業ディレクトリ:** `/Users/rikukudo/Projects/all-good-ops-mf-finance/apps/mf-finance/`（worktree task/260606-mf-finance、最新化済み）。

---

## ファイル構成（責務）

**基盤（Task 0・親が先に）**
- `db/schema.sql`（追記）: optimizer_proposals / txn_overrides / category_groups / optimizer_runs
- `lib/optimizer/types.ts`（新）: ProposalKind / ProposalSource / Status / Confidence / ActionType の型＋`OptimizerProposal`/`ProposedAction` 共有型。**全ワークストリームが read-only 参照する契約**
- `scripts/apply-overrides.mjs`（新）: txn_overrides を transactions へ再適用（apply-rules の後）
- `scripts/optimizer-helpers.mjs`（新）: `openDb()` 等の共通（既存 scripts と同作法）
- パイプライン配線: `package.json`（refresh に apply:overrides 追加・optimizer scripts）/ `app/api/refresh/route.ts`（apply-overrides 連鎖）

**W1: シグナル + export（専有: `lib/optimizer/signals.ts` `lib/optimizer/detect.mjs` `scripts/optimizer-export.mjs` `test/optimizer-detect.test.mjs`）**
**W2: キューUI + 承認アクション + home バッジ（専有: `app/optimizer/**` `lib/optimizer/proposals-queries.ts` `lib/optimizer/actions.ts`、共有編集: `app/page.tsx` のバッジ1行）**
**W3: propose + grouping + ?by=group トグル（専有: `scripts/optimizer-propose.mjs` `lib/optimizer/grouping.ts` `test/optimizer-grouping.test.mjs`、共有編集: `app/categories/page.tsx` `app/budget/page.tsx`）**

---

## Task 0: 基盤（親・並列の前提）

**Files:** `db/schema.sql` / `lib/optimizer/types.ts` / `scripts/apply-overrides.mjs` / `scripts/optimizer-helpers.mjs` / `package.json` / `app/api/refresh/route.ts`

- [ ] **Step 1: schema 追記**（spec §1 の DDL を `db/schema.sql` 末尾に。CREATE TABLE IF NOT EXISTS、インデックス含む）
- [ ] **Step 2: DB へ適用**: `node -e` で schema.sql を exec → 4テーブル存在確認
- [ ] **Step 3: `lib/optimizer/types.ts`** — spec §1/§5 の型を定義・export:
```ts
export type ProposalKind = "classify_unknown"|"fixed_vs_variable"|"relabel"|"transfer_pair"|"rule_suggest"|"rule_conflict"|"label_add"|"category_regroup";
export type ProposalSource = "signal"|"llm";
export type ProposalStatus = "pending"|"accepted"|"rejected"|"dismissed"|"superseded";
export type Confidence = "high"|"med"|"low";
export type ProposedAction =
  | { type:"add_rule"; pattern:string; match_type:"exact"|"contains"; classification:string; category_major?:string; category_middle?:string }
  | { type:"edit_rule"; rule_id:number; patch:Record<string,unknown> }
  | { type:"delete_rule"; rule_id:number }
  | { type:"set_override"; txn_ids:string[]; fields:{ is_transfer?:0|1; is_internal_move?:0|1; classification?:string; category_major?:string; category_middle?:string } }
  | { type:"mark_transfer"; txn_ids:string[] }
  | { type:"regroup"; mappings:{ category_major:string; group_name:string; sort_order?:number }[] }
  | { type:"add_recurring"; kind:"income"|"expense"; name:string; amount:number; day?:number|null };
export interface OptimizerProposal { id:number; created_at:string; kind:ProposalKind; source:ProposalSource; status:ProposalStatus; title:string; rationale:string|null; confidence:Confidence; target_ref:unknown; proposed_action:ProposedAction|null; dedup_key:string|null; decided_at:string|null; decided_note:string|null }
```
- [ ] **Step 4: `scripts/apply-overrides.mjs`** — txn_overrides を読み、各 txn_id の非NULLフィールドを transactions に UPDATE（冪等・短トランザクション）。前後で上書き件数をログ
- [ ] **Step 5: パイプライン配線** — `package.json` scripts に `apply:overrides`/`optimizer:export`/`optimizer:propose` 追加、`refresh` を `normalize && load && apply:rules && apply:overrides && load:assets` に。`app/api/refresh/route.ts` の連鎖に apply-overrides 追加（apply-rules の後）
- [ ] **Step 6: 検証** `npm test`（既存緑）/ `node scripts/apply-overrides.mjs`（0件でも正常終了）/ 親がコミット

---

## Task W1: 決定的シグナル + LLM入力 export

**Files:** Create `lib/optimizer/detect.mjs`(純関数) `lib/optimizer/signals.ts`(server-only クエリ) `scripts/optimizer-export.mjs` / Test `test/optimizer-detect.test.mjs`

検出器（spec §3）。純粋ロジックは `detect.mjs` に分離してテスト、DB アクセスは `signals.ts`。

- [ ] **Step 1: `detect.mjs` 純関数 + test**（TDD）:
  - `pairTransfers(rows)` — 同日±1日・反対符号・同額・別account の2件を transfer ペア候補に。test: 一致ペア検出 / 同口座は除外 / 符号同じは除外
  - `ruleConflicts(rules, rows)` — ルール一致取引の分類多数決とルールが食い違うものを返す。test: 不一致検出 / 一致は出さない
  - `labelInconsistencies(rows)` — 同一 description が複数 classification にまたがる group を返す。test
  - `npm test` で緑
- [ ] **Step 2: `signals.ts`（server-only）** — `import { db }`。各検出器に DB から行を渡し、結果を `optimizer_proposals` へ upsert（source='signal'、dedup_key で既存 pending を重複させない、status!=pending のものは再生成しない）。`refreshSignals(): { detected:number; inserted:number }`。unknown 塊・unconfirmed recurring もここで proposals 化。`optimizer_runs` に ran_by='signal' で1行記録
- [ ] **Step 3: `scripts/optimizer-export.mjs`** — spec §4-1 の `data/optimizer-input.json` を出力（pending signals / unknown descriptions 例 / category_rules / classification 分布 / category_groups / 直近決定ログ / 大項目一覧）。件数をログ
- [ ] **Step 4: 検証** `npx tsc --noEmit` / `npm test`（detect 緑）/ 一時.mjs で refreshSignals を実行し 2026 実データで proposals が入ること・冪等（2回目は inserted=0）をログ / export 実行し JSON 生成確認
- [ ] **Step 5: 報告**（コミットしない・親が統合）

---

## Task W2: /optimizer キューUI + 承認アクション + home バッジ

**Files:** Create `lib/optimizer/proposals-queries.ts` `lib/optimizer/actions.ts` `app/optimizer/page.tsx` `app/optimizer/ProposalCard.tsx` `app/optimizer/DecisionLog.tsx` / Modify `app/page.tsx`(バッジ1行)

- [ ] **Step 1: `proposals-queries.ts`（server-only）** — `getPendingProposals()`（kind別・confidence順）/ `getProposalCounts()`（kind別・未処理総数）/ `getDecisionLog(limit)`（accepted/rejected 履歴）/ `getRuns(limit)`
- [ ] **Step 2: `actions.ts`（"use server"）** — `applyProposal(id)`: proposal を読み `proposed_action` の type で分岐し DB 反映（add_rule→category_rules INSERT+`apply-rules`相当 / mark_transfer・set_override→txn_overrides UPSERT+`apply-overrides`相当 / edit_rule・delete_rule / regroup→category_groups / add_recurring）→ status=accepted・decided_at 記録。`rejectProposal(id, note?)` / `dismissProposal(id)` / `editAndApply(id, patchedAction)`。**ルール/override 反映後は該当 apply を server 内で実行**（execFile で scripts/apply-rules.mjs・apply-overrides.mjs、固定引数）。`revalidatePath("/optimizer")` + "/" + 影響ページ。`BudgetActionResult` 同様 `{ok}|{ok,error}` 返却（UI 例外回避、既存 budget-actions 作法）
- [ ] **Step 3: UI** `app/optimizer/page.tsx`（force-dynamic・server）: ヘッダ（kind別件数・未処理N・最終run時刻・［シグナル更新］ボタン=signals.refreshSignals 呼ぶ小 action）+ pending を ProposalCard 列挙 + 「決定ログ」セクション（DecisionLog）。`ProposalCard.tsx`（client・useTransition）: title/rationale/target詳細/confidenceバッジ/［承認 却下 修正して承認 スキップ］。globals.css トークンのみ・44px・375px・既存 RecurringEditor/Alerts 作法踏襲
- [ ] **Step 4: home バッジ** `app/page.tsx` に `getProposalCounts()` を呼び、未処理>0 なら「最適化提案 N件」リンク（/optimizer）を Alerts 付近に1ブロック追加
- [ ] **Step 5: 検証** `npx tsc --noEmit` / `npm test` 既存緑 / 一時.mjs で各 action を1往復（add_rule→accepted→category_rules反映→確認、mark_transfer→txn_overrides反映、その後 DELETE で原状復帰）/ build は親が実施
- [ ] **Step 6: 報告**（コミットしない）

---

## Task W3: LLM propose 取込 + category_groups ロールアップ + ?by=group

**Files:** Create `scripts/optimizer-propose.mjs` `lib/optimizer/grouping.ts` / Test `test/optimizer-grouping.test.mjs` / Modify `app/categories/page.tsx` `app/budget/page.tsx`

- [ ] **Step 1: `scripts/optimizer-propose.mjs`** — 引数 or stdin の proposals JSON 配列を検証（kind/title/confidence/proposed_action の型ガード・spec §5 のアクション型に適合）して `optimizer_proposals` に source='llm' で INSERT。dedup_key 既存 pending はスキップ。`optimizer_runs` に ran_by='llm' 記録。投入件数ログ。**不正な行は弾いてログ**（LLM出力の境界検証）
- [ ] **Step 2: `grouping.ts` + test** — `resolveGroups(rows, mapping)` 純関数（category_major→group_name 畳み込み、未設定は素のまま）を test。`getCategoryGroups()`（server: category_groups 読取）
- [ ] **Step 3: `?by=group` トグル** — `app/categories/page.tsx` と `app/budget/page.tsx`: searchParams に `by`（'major'|'group'）。'group' 時は getCategoryGroups で大項目をグループに畳んで集計（既存集計関数の結果を grouping で後段ロールアップ、または集計キーを差し替え）。トグルUI（major/group 切替リンク）。設定が無い大項目は自グループ名=自身で素通し。既存 'major' 表示は完全非破壊（既定）
- [ ] **Step 4: 検証** `npx tsc --noEmit` / `npm test`（grouping 緑）/ 一時.mjs: category_groups に手で2件入れ→`?by=group` 相当の集計が畳まれることを確認→DELETE 原状復帰 / optimizer-propose にダミー proposals を流し INSERT→確認→DELETE
- [ ] **Step 5: 報告**（コミットしない・/categories /budget の編集は W3 専有）

---

## 親: 統合・LLM思考デモ・検証・コミット（並列後）

- [ ] W1/W2/W3 完了後、共有編集（app/page.tsx バッジ・/categories・/budget）の整合確認
- [ ] `npm test`（全緑）/ `npm run build`（/optimizer 含む全ルート緑）
- [ ] dev 起動 → 全新ページ HTTP200 → /optimizer・home バッジ・?by=group を目視（スクショ）
- [ ] **LLM思考パス一周**: `npm run optimizer:export` → 私(Claude)が `data/optimizer-input.json` を読み実提案 JSON 生成 → `npm run optimizer:propose` で投入 → /optimizer に出ることを確認（unknown65・ルール矛盾・regroup 提案など実物）
- [ ] 承認→ルール化→`npm run refresh`→再現（冪等）を実機確認
- [ ] HANDOFF.md・memory 更新 → コミット（Phase毎 or まとめて）

---

## 自己レビュー結果
- **spec カバレッジ**: §1 4テーブル→Task0 / §2 永続3分担→Task0(types)+W2(actions)+W3(groups) / §3 シグナル→W1 / §4 LLMパス→W1(export)+W3(propose)+親(デモ) / §5 アクション型→types+W2 / §6 UI+会話→W2+親 / §7 regroup→W3 / §8 段階→Task順 / §9 検証→各Step+親。全カバー。
- **型整合**: ProposedAction の type 名（add_rule/edit_rule/delete_rule/set_override/mark_transfer/regroup/add_recurring）を types.ts で固定し W2 actions・W3 propose が同名参照。
- **並列衝突**: 専有ファイル分離。共有編集は app/page.tsx(W2のみ)・/categories /budget(W3のみ)・db/schema.sql package.json api/refresh(Task0のみ)。lib/optimizer/ は同ディレクトリだが全て別ファイル。
