# X optimizer 提案の実行（Stage 4：自己改善ループの完成）設計

## Context（なぜ）

Stage 3 で LLM-optimizer（x-optimizer-analyst MA）が `xad.optimizer_proposal` にランク付き改善提案を書くようになった（現在10件蓄積）。Stage 4 はその提案を **人間が accept → 自動適用** する実行系を作り、自己改善ループを閉じる。[[project_x_optimizer_redesign]] の最終段。

**確定方針**:
- **accept がゲート**: optimizer は勝手に apply しない。人間が dashboard で accept した提案だけが適用される。
- **実行は自動化**（full automation 方針）。tier-L プロンプトは **TS SSOT コード直編集**（このリポの implementer 方式＝LLM が TDD/CI/レビュー gate を通してコードを書く）で適用。
- **全 apply は可逆**。🔒 不可侵はコードで強制。

## ゴール / 非ゴール

- **ゴール（本spec全体）**: 提案レビューUI ＋ apply-engine（tier別自動適用・検証ゲート・可逆・通知）。
- **本spec で実装する範囲（4A + 4B-1）**: ①レビュー/accept UI ②apply-engine 基盤（検証ゲート＋オーケストレーション＋rollback記録＋通知）＋ **tier-T（DB数値・no-deploy）適用**。config/prompt の自動適用は「手動 apply 推奨」にルーティング。
- **後続（4B-2・別spec/集中セッション）**: file編集＋CI＋deploy を伴う tier（config値変更・**プロンプト TS直編集→ma version-up→deploy**）の自動適用。最高リスクなので専用に手厚く。
- **非ゴール**: 🔒（FORBIDDEN_PHRASES/SAFETY_GUARDRAILS/死守param）の変更。accept を経ない autonomous apply。

## 全体アーキテクチャ

```
optimizer_proposal(蓄積)
  └─ 4A 人間レビューUI(dashboard): accept/reject + reviewer_reason   ← 人間ゲート
       (accepted=true をセット)
  └─ 4B apply-engine(cron/enqueue): accepted かつ未implemented を処理
       ├─ ① 検証ゲート validateProposalSafe()  … 🔒 をコードで拒否（apply 不可→flag）
       ├─ ② tier 判定 → tier別 apply handler
       │     - tier-T  : DB数値書込(guard内) + snapshot       ← 4B-1
       │     - tier-config: config値編集→branch→CI→merge→deploy ← 4B-2
       │     - tier-prompt: TS直編集(coding agent)→TDD/CI/review→merge→ma:render+bootstrap --update→deploy ← 4B-2
       ├─ ③ rollback handle を optimizer_proposal.meta に記録（snapshot_id / git_sha / ma_version）
       ├─ ④ implemented=true, implemented_at
       └─ ⑤ 失敗時 自動 rollback + LINE 通知 / 成功も通知
  └─ rollback: meta の handle で復元（rollback=true, rollback_at）
```

## 4A：提案レビュー/accept UI

2B の承認フロー（`/api/drafts/approve` → RPC `set_approval_status` → DraftCard）と同型で実装。

- **読み取り**: `optimizer_proposal`（proposal_type / scope / hypothesis / evidence / rank / created_at / accepted / implemented / reviewer_reason / rollback）。dashboard に view か直 select。pending（accepted is null）優先表示、rank順。
- **アクション**: accept / reject。RPC `set_proposal_decision(p_ids uuid[], p_accepted bool, p_reason text)` が `accepted` と `reviewer_reason` をセット（既 implemented は変更不可ガード）。
- **UI**: `apps/xad-dashboard/app/proposals/`（ProposalsClient + ProposalCard）。evidence(jsonb) を見やすく表示、accept/reject ボタン＋任意 reason。
- migration: `optimizer_proposal` は既存列で足りる（accepted/reviewer_reason）。view を出すなら `0024` で proposals 用 view 追加（任意）。

## 4B-1：apply-engine 基盤 ＋ 検証ゲート ＋ tier-T

新規 `apps/x-account-system/lib/optimizer-apply/`：

- **validation.ts** — `classifyTier(proposal): "T" | "config" | "prompt" | "blocked"` ＋ `validateProposalSafe(proposal): {ok, reason}`。
  - **🔒 ブロック（コード強制）**: scope/hypothesis が安全・死守領域（forbidden phrases 編集 / SAFETY_GUARDRAILS / first_hand下限 / industry_sop下限 / AI画像上限 / hashtag / failure cap）に触れると判定したら `blocked`。キーワード＋scope allowlist で保守的に（疑わしきはブロック→手動）。
  - tier 判定: scope が数値DB対象（例 thompson posterior / DB保持の閾値）→ "T"。config値→ "config"。prompt/template→ "prompt"。
- **tier-t.ts** — `applyTierT(proposal, deps)`: 対象 DB 値を guard 範囲で更新。適用前に **snapshot**（optimizer_state なら既存 snapshotState を流用／その他は対象行を meta に退避）。rollback handle = snapshot_id。
- **apply-engine.ts** — `runApplyEngine(deps?)`:
  1. accepted=true かつ implemented=false の proposals を取得。
  2. 各々 validateProposalSafe → blocked は skip＋`reviewer_reason` に理由追記（implemented にしない・要手動）。
  3. tier=="T" → applyTierT。tier in {config,prompt} → **4B-1 では未対応**＝skip＋「手動apply推奨」を notify（4B-2 で自動化）。
  4. 成功: implemented=true, implemented_at, meta.rollback_handle 記録。
  5. 失敗: 自動 rollback（snapshot復元）＋ LINE 異常通知。
  6. 集計を LINE 通知。
- **rollback.ts** — `rollbackProposal(proposalId, deps)`: meta.rollback_handle で復元、`rollback=true, rollback_at`。
- 配線: cron は付けず（apply は accept 後随時）`/admin/enqueue?job=optimizer-apply` ＋ queue case。brownout: DB書込のみ・LLM/cost 無のため `ALL_JOBS` ＋ `STOP_POSTING_ALLOWED`（metrics-ingest と同列。cron_halt/escalate には入れない）。

## データフロー（4B-1）
enqueue `optimizer-apply` → `runApplyEngine()`:
- accepted 未implemented を取得 → 各 validate → tier-T のみ apply（snapshot→DB更新→implemented+handle）→ 集計 notify。config/prompt は skip＋手動推奨 notify。

## エラー処理
fail-open（engine 全体は throw しない）。各 proposal の apply 失敗は **その提案だけ** rollback＋flag し他は継続。validate で疑わしきは blocked（安全側）。

## テスト（TDD）
- **validation.ts**: classifyTier（数値/config/prompt/blocked の分類）、validateProposalSafe（🔒 キーワード/scope を確実に blocked にする・正常は通す）。**安全回帰の要なので厚く**。
- **tier-t.ts**: snapshot→更新→rollback handle 返却、guard 範囲外は clip/拒否。
- **apply-engine.ts**（DI）: accepted取得→validate→tier振分け→implemented/rollback記録→notify、blocked/config/prompt は skip、失敗時 rollback。
- 4A: dashboard の `set_proposal_decision` 転送テスト（2B同型）。
- 本番実証: 既存10提案のうち安全な tier-T 提案を1件 accept→apply→確認→rollback で可逆性検証。なければ measurement_request を accept→「implemented化（観測要求は no-op apply＝記録のみ）」で経路確認。

## 触るファイル
- 新規: `lib/optimizer-apply/{validation,tier-t,apply-engine,rollback}.ts` ＋テスト。
- dashboard: `app/proposals/{page,ProposalsClient,ProposalCard}.tsx` ＋ `app/api/proposals/decide/route.ts` ＋ `lib/proposals-queries.ts`。
- migration `0024`: RPC `set_proposal_decision` ＋（任意）proposals view。
- 配線: `src/worker.ts`（JobMessage＋BY_NAME・cron無）/ `src/queue.ts`（case）/ brownout。
- 再利用: `lib/optimizer/state-store.ts`（snapshotState/rollbackToSnapshot）/ cost-ledger 不要 / LINE push / 2B の承認UI/RPC パターン。

## 検証（実装後）
- TDD 緑（特に validation の 🔒 ブロック）。
- 4A: dashboard で提案一覧→accept/reject が `optimizer_proposal` に反映。
- 4B-1: `prod-lib-diag` で `runApplyEngine()` 実行→ accepted の tier-T 提案が implemented 化＋rollback handle 記録、rollbackProposal で復元。config/prompt 提案は skip＋手動推奨通知。

## 後続：4B-2（別spec・集中セッション）
file編集＋CI＋deploy を伴う自動適用：
- **tier-config**: config値を編集する coding agent → branch → tests/build → merge → wrangler deploy。git revert で可逆。
- **tier-prompt**: 提案どおり TS SSOT（compose/check/collector-prompts）を編集する coding agent（implementer 方式・TDD/tsc/レビュー gate）→ merge → `ma:render` + `ma:bootstrap --update`（version-up）→ deploy。rollback = git revert + MA version restore。
- 安全: branch+CI 必須・🔒 再検証・人間 accept 済みのみ・各 apply 可逆・失敗時自動 rollback。これが「optimizer が安全にコードを書いて自己改善する」ループの完成。
