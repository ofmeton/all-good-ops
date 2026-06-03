# x-account-system Worker 配線 W5 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** W1-W4（launch-critical）に続き、残りの cron job（ingest / digest / optimizer / rollback-monitor / rotation）+ ideation（投稿入力源）+ brownout 4 段階 + oauth callback/token rotation を実装し、Phase 1 を全自動化する。

**Architecture:** W1-W4 と同じ Workers + Queues。ingest/digest/optimizer 等を queue consumer に配線。github-trending のみ Workers 外（GitHub Actions）。oauth callback は同期処理 + `oauth_tokens` 永続化 + auto-refresh。

**前提:** W1-W4 完了済（互換シム / backend / Queues / 投稿 / webhook）。本計画は W1-W4 の成果物（`src/queue.ts` consumer / line-client / webcrypto / migration 0007 / 各 backend）に依存。

**人間決定（2026-06-03）:** github-trending=GitHub Actions 外部 / core_ideas=自動 ideation 実装 / oauth=oauth_tokens table + auto-refresh。

**設計 SSOT:** `docs/superpowers/specs/2026-06-03-x-account-worker-wiring-design.md` / W1-W4 plan。

---

## W5-0: 前提ゲート（W1-W4 完了確認 + tsconfig 修正）

- [ ] **Step 1: W1-W4 成果物の存在確認** — 以下が main に入っていることを確認（無ければ W5 着手不可）: `src/queue.ts`（consumer）/ `src/env-bridge.ts` の `bridgeEnv` / `lib/line/line-client.ts` / `lib/crypto/webcrypto.ts` / migration 0007（`safety_state`/`optimizer_state`/`optimizer_snapshot`/`interview_sessions` + `core_ideas` の `topic/primary_hook/fmat/audience` 列）/ optimizer Supabase backend（`state-store.ts` の throw 解消）。
- [ ] **Step 2: worker typecheck が lib を見れるよう tsconfig 修正** — 現 `src/tsconfig.json` は `rootDir:"./"` + `include:["**/*.ts"]` で **src 配下限定**のため、src→lib import が typecheck で壊れる（Codex 確認、`src/tsconfig.json:3,8`）。`rootDir:".."` + `include:["../lib/**/*.ts","**/*.ts"]` に変更（または worker:typecheck を app root tsconfig に寄せる）。W1-W4 で未対応なら本ステップで対応。
- [ ] **Step 3: import パス規約** — **`src/queue.ts` から lib は `../lib/...`**（`../../lib` は `apps/lib` を指す誤り）。**`src/jobs/*.ts` からは `../../lib/...`**。本計画のスニペットはこの規約に従う。
- [ ] **Step 4: Commit** — `git commit -m "chore(x-account/worker): W5 前提 tsconfig(lib import) 修正"`

## W5-1: twitterapi.io buzz-ingest → materials_store

twitterapi.io で seed アカ群を取得し `materials_store`(source_type=x_inspirations) に保存。

**Files:**
- Create: `lib/ingest/twitterapi-client.ts`（fetch ベース、1 ファイル wrapper）
- Create: `lib/ingest/buzz-ingest.ts`
- Create: `lib/ingest/buzz-ingest.test.ts`
- Modify: `src/queue.ts`（buzz-ingest を配線）

- [ ] **Step 1: twitterapi.io client（rate-limited wrapper 1 ファイル）** — `reference_twitterapi_io_response_shape.md` 準拠。tweet = `{ id, text, likeCount, retweetCount, replyCount, viewCount, author:{userName}, createdAt }`。endpoint は memory `reference_twitterapi_io_endpoints.md` 参照。`fetchUserTweets(userName, key, fetchImpl=fetch)` を実装（テスト用 fetch 注入）。
- [ ] **Step 2: 失敗テスト** — mock fetch で seed 2 アカ → `materials_store` insert が `{source_type:'x_inspirations', source_ref:userName, raw_text, permitted_storage:'title_only', publication_consent:'pending'}` で呼ばれることを検証（DB は mock）。
- [ ] **Step 3: buzz-ingest 実装** — seed リストは `raw/publishing/inspirations/2026-05-26-reference-accounts.md` の handle 群（定数化）。各 handle の上位 tweet → DLP redact（`lib/dlp/redact.ts` は `{redactedText, highRiskHits}` を返す）→ `materials_store` insert: `{source_type:'x_inspirations', source_ref:userName, raw_text, redacted_text, pii:(highRiskHits>0), permitted_storage:'title_only', publication_consent:'pending', meta:{tweet_id}}`。**重複防止**: `meta->>'tweet_id'` 既存なら skip（`source_ref=userName` だけだと日次で重複するため tweet_id でユニーク化）。
- [ ] **Step 4: テスト緑** — Run: `npx jest lib/ingest/buzz-ingest.test.ts`（IN_MEMORY_FALLBACK 立てず DB mock）。Expected: PASS。
- [ ] **Step 5: queue 配線** — `src/queue.ts` の `handleJob` で `buzz-ingest` → `runBuzzIngest(env)`。
- [ ] **Step 6: Commit** — `git commit -m "feat(x-account/ingest): twitterapi.io buzz-ingest → materials_store"`

## W5-2: ideation（materials_store → core_ideas、LLM 自動生成）

投稿の入力源。materials を読んで `core_ideas` を LLM 生成。

**Files:**
- Create: `lib/ideation/ideate.ts`
- Create: `lib/ideation/ideate.test.ts`
- Modify: `src/queue.ts`（新 cron job `ideation` を追加、or buzz-ingest 後段で呼ぶ）

- [ ] **Step 1: 失敗テスト** — Anthropic mock（tool_use で CoreIdea 配列を返す）+ DB mock。未消費 materials（source_type in x_inspirations/note_inspirations、未 ideated）を読んで `core_ideas` insert（topic/primary_hook/fmat/audience/category/source_material_ids）が呼ばれることを検証。
- [ ] **Step 2: ideate 実装**
```ts
// lib/ideation/ideate.ts
const IDEA_TOOL = {
  name: "core_ideas",
  description: "materials から X 投稿ネタを生成",
  input_schema: { type: "object", properties: { ideas: { type: "array", items: { type: "object",
    properties: {
      topic: { type: "string" },
      primary_hook: { type: "string", enum: ["number","question","failure_story","contrast","tips_enum","first_hand","translation","opinion","industry_sop","business_repro","paraphrase","critique"] },
      fmat: { type: "string", enum: ["short","medium","long","thread","article"] },
      category: { type: "string", enum: ["paraphrase","first_hand","industry_sop"] },
      audience: { type: "string" },
      source_material_ids: { type: "array", items: { type: "string" } },
    }, required: ["topic","primary_hook","fmat","category","audience","source_material_ids"] } } }, required: ["ideas"] },
} as const;

export async function runIdeation(env: Env, count = 5): Promise<number> {
  const materials = await fetchUnideatedMaterials(env, 20);  // materials_store 未消費
  if (materials.length === 0) return 0;
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: "claude-sonnet-4-5", max_tokens: 4096,
    tools: [IDEA_TOOL as never], tool_choice: { type: "tool", name: "core_ideas" },
    system: buildIdeationSystemPrompt(),  // style-guide の配分/ターゲットを反映
    messages: [{ role: "user", content: `以下の素材から ${count} 個の core_ideas を生成。\n${materials.map((m) => `[${m.id}] ${m.redacted_text ?? m.raw_text}`).join("\n")}` }],
  });
  const tu = res.content.find((b) => b.type === "tool_use");
  if (!tu || tu.type !== "tool_use") throw new Error("ideation: no tool_use");
  const ideas = (tu.input as { ideas: IdeaRow[] }).ideas;
  await insertCoreIdeas(env, ideas);  // status='draft'
  await markMaterialsIdeated(env, materials.map((m) => m.id));
  return ideas.length;
}
```
> 前提: **migration 0007 適用済**（`core_ideas` に `topic/primary_hook/fmat/audience` 列）。未適用なら insert 不可なので W5-0 で確認。
> `buildIdeationSystemPrompt` は `style-guide-all-versions.md` の素材分類比率（translation10/paraphrase20/opinion30/first_hand40）+ ターゲット（非エンジニア経営者）+ Hook 配分を反映。
> **二重消費防止は atomic claim**: `fetchUnideatedMaterials` は `update materials_store set meta=meta||'{"ideation_status":"claimed"}' where meta->>'ideation_status' is null ... returning *`（条件付き claim）→ insert 成功後 `ideation_status:"done"`。retry/並行で同素材を再消費しない。
> `core_ideas.primary_hook` は **Writer 用 12 種**（`writer/types.ts`）。Editor の 4 分類結果は別途 `post_drafts.primary_hook`（4 種制約）に保存され、混同しない。
- [ ] **Step 3: テスト緑** — Run: `npx jest lib/ideation/ideate.test.ts`。Expected: PASS。
- [ ] **Step 4: cron 追加** — `wrangler.toml` cron に `ideation`（日次、投稿 cron の前）を追加。`src/queue.ts` で配線。
- [ ] **Step 5: Commit** — `git commit -m "feat(x-account/ideation): materials_store→core_ideas LLM自動生成"`

## W5-3: inspirations-ingest（週次）

**Files:**
- Create: `lib/ingest/inspirations-ingest.ts` + test
- Modify: `src/queue.ts`

- [ ] **Step 1: 失敗テスト** — 週次で seed（海外≥1/国内≥1/note≥1）を twitterapi.io + note 観察 → materials_store(note_inspirations/x_inspirations) insert を検証。
- [ ] **Step 2: 実装** — buzz-ingest の週次版（より広い母集団 + note 競合）。`permitted_storage`/consent は buzz と同様。
- [ ] **Step 3: テスト緑 + queue 配線 + Commit** — `git commit -m "feat(x-account/ingest): inspirations-ingest 週次"`

## W5-4: github-trending（GitHub Actions 外部）

Workers に載せず GitHub Actions で日次実行（人間決定）。

**Files:**
- Create: `.github/workflows/github-trending.yml`
- Modify: `wrangler.toml`（cron から github-trending を**外す**）

- [ ] **Step 1: Actions workflow** — `scripts/fetch-github-trending.py` を日次（UTC `0 22 * * *` = 07:00 JST）実行し `raw/publishing/github-trending/YYYY-MM-DD.json` を commit。
```yaml
# .github/workflows/github-trending.yml
name: github-trending-daily
on:
  schedule: [{ cron: "0 22 * * *" }]  # 07:00 JST
  workflow_dispatch:
permissions:
  contents: write   # commit/push に必須
jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: python3 apps/x-account-system/scripts/fetch-github-trending.py
      - run: |
          git config user.name "github-actions"
          git config user.email "actions@github.com"
          git add raw/publishing/github-trending/ && git commit -m "chore: github-trending $(TZ=Asia/Tokyo date +%F)" || echo "no change"
          git push
```
> 注: `fetch-github-trending.py:108` は UTC 日付でファイル名を作る。JST 日付に揃えるなら script の `datetime.now()` を `datetime.now(timezone(timedelta(hours=9)))` に変更（別 commit）。
- [ ] **Step 2: wrangler.toml から github-trending cron を削除**（W3-1 で追加していたら）。
- [ ] **Step 3: Commit** — `git commit -m "feat(x-account/ingest): github-trending を GitHub Actions 外部実行に"`

## W5-5: daily-digest + optimizer-update cron 配線

W2 で永続化実装済の関数を consumer に配線。

**Files:**
- Modify: `src/queue.ts`（daily-digest / optimizer-update を配線）
- Create: `src/jobs/maintenance.test.ts`

- [ ] **Step 1: 失敗テスト** — consumer が `daily-digest`→`runDailyDigest({})`、`optimizer-update`→`runOptimizerUpdate()` を呼ぶことを mock で検証。
- [ ] **Step 2: 配線** — `src/queue.ts` の `handleJob`:
```ts
// src/queue.ts 内（lib は ../lib/...）
case "daily-digest": { const { runDailyDigest } = await import("../lib/dashboard/digest.ts"); await runDailyDigest({}); break; }
case "optimizer-update": { const { runOptimizerUpdate } = await import("../lib/optimizer/update-loop.ts"); await runOptimizerUpdate(); break; }
```
（consumer 冒頭で `bridgeEnv(env)`（W1-4）を呼んでから lib を実行。`runOptimizerUpdate` は W2 の optimizer_state 永続化に依存。型: `runDailyDigest({})`/`runOptimizerUpdate()` は実シグネチャと一致。）
- [ ] **Step 3: テスト緑 + Commit** — `git commit -m "feat(x-account/worker): daily-digest/optimizer-update cron 配線"`

## W5-6: rollback-monitor 配線（→ rollbackToSnapshot）

`requestRollbackStep`（no-op）を実 `rollbackToSnapshot` に差し替え。

**Files:**
- Modify: `lib/safety/rollback-monitor.ts`（`requestRollbackStep` を実装 + 監視 job 追加）
- Create: `src/jobs/rollback-job.ts` + test
- Modify: `src/queue.ts`

- [ ] **Step 1: 失敗テスト** — PCR baseline 比 -30% 以上のデータで `evaluateRollback` triggered → `rollbackToSnapshot(lastSnapshotId)` が呼ばれ、optimizer_state が前 snapshot に戻り、LINE 警告 push を検証（DB/LINE mock）。
- [ ] **Step 2: rollback-job 実装** — cron `rollback-monitor`（2h 毎）: `aggregatePerformanceWindow(7,7)` で current/baseline → `evaluateRollback(input)` → triggered かつ **`state.lastSnapshotId` が存在する時のみ** `rollbackToSnapshot(state.lastSnapshotId)`（`lastSnapshotId?` は optional なので未設定＝初回は warn only + return、`types.ts:64`）。+ LINE 警告 + `optimizer_proposal` に `proposal_type='anomaly_alert'` 記録。
  - **責務分離（update-loop との重複整理）**: `runOptimizerUpdate`(W5-5, 日次23:00) は**更新直前 snapshot へ**自動 rollback（既存 `update-loop.ts:154,176`）。本 2h monitor は**前回確定 snapshot へ**の独立セーフティ。両者は別 snapshot を対象とし二重には戻さない（rollback 後は anomaly フラグで次回 monitor を抑制）。
- [ ] **Step 3: requestRollbackStep を差し替え** — rollback-monitor.ts の no-op `requestRollbackStep`（`rollback-monitor.ts:96-104`）を削除し、rollback-job が `rollbackToSnapshot` を直接呼ぶ構造に（rollback-monitor.ts は純判定関数 `evaluateRollback` のみ保持）。
- [ ] **Step 4: テスト緑 + queue 配線 + Commit** — `git commit -m "feat(x-account/safety): rollback-monitor を rollbackToSnapshot に配線"`

## W5-7: brownout 4 段階

現状 2-3 段階を master の 4 段階に。

**Files:**
- Modify: `lib/safety/brownout-handler.ts`（4 段階閾値 + status union 拡張）
- Modify: `lib/safety/brownout-handler.test.ts`（段階別テスト追加）

- [ ] **Step 1: 失敗テスト** — 4 閾値で status/挙動を検証:
```ts
// brownout-handler.test.ts に追加
test.each([
  [9000, "ok", false],
  [10000, "reduce", false],       // Writer retry reject + Optimizer downgrade
  [11500, "stop_posting", true],  // 投稿/Interviewer/Optimizer 停止, Digest は継続
  [12500, "cron_halt", true],     // 全cron停止 LINEのみ
  [13800, "escalate", true],      // 即エスカレーション cron完全停止
])("cost=%i → %s", async (cost, status, blocked) => {
  const d = await evaluateBrownout(cost);
  expect(d.status).toBe(status);
  expect(d.publishing_blocked).toBe(blocked);
});
```
- [ ] **Step 2: 4 段階実装** — 閾値定数 `[10000, 11500, 12500, 13800]`、`BrownoutDecision` に `status: "ok"|"reduce"|"stop_posting"|"cron_halt"|"escalate"` + `allowedJobs: string[]`（status ごとの job allowlist）を追加（既存 `should_stop_posting`/`publishing_blocked` は後方互換で残す）。`stop_posting` 以上で `triggerKillSwitch`、`escalate` で即 LINE。
- [ ] **Step 3: consumer ガードに job allowlist で反映** — 各 status の `allowedJobs`:
  - `ok`/`reduce`: 全 job（reduce は Writer retry reject + Optimizer downgrade を runEditor/optimizer 側で適用）
  - `stop_posting`: **post/ideation/interviewer/optimizer を skip、daily-digest は実行**（master L1918）
  - `cron_halt`: **daily-digest のみ実行、他全 skip**（LINE alert）
  - `escalate`: **daily-digest（緊急 alert 付き）のみ、他全 skip**
  `src/queue.ts` consumer 冒頭で `evaluateBrownout(cost)` → `if (!decision.allowedJobs.includes(msg.job)) { log skip; m.ack(); return; }`。digest は常に allow。
- [ ] **Step 4: テスト緑 + Commit** — `git commit -m "feat(x-account/safety): brownout 4段階 (master §8.1.5 準拠)"`

## W5-8: oauth_tokens 永続化 + callback + token 交換 + auto-refresh

**Files:**
- Create: `migrations/0008_oauth_tokens.sql`
- Create: `lib/oauth/token-exchange.ts`（WebCrypto、pkce-test の core を移植）
- Modify: `lib/publisher/token-store.ts`（env→oauth_tokens、`refreshAccessToken` 実装）
- Modify: `wrangler.toml`（KV binding `OAUTH_STATE`）+ `src/worker.ts`（`Env.OAUTH_STATE` + `/oauth/x/start` + `/oauth/x/callback` 実装）

- [ ] **Step 0: KV binding 追加** — OAuth state↔verifier の一時保存に Workers KV が要る（Codex 指摘、現状 KV なし）。`wrangler.toml` に:
```toml
[[kv_namespaces]]
binding = "OAUTH_STATE"
id = "<wrangler kv namespace create xad-oauth-state で発番>"
```
`src/worker.ts` の `Env` に `OAUTH_STATE: KVNamespace` を追加。
- [ ] **Step 1: migration 0008** — MCP apply（人間確認）。`expiresAt`(epoch ms) ↔ `expires_at`(timestamptz) は read 時 `new Date(ts).getTime()` / write 時 `new Date(ms).toISOString()` で変換:
```sql
-- migrations/0008_oauth_tokens.sql
create table if not exists xad.oauth_tokens (
  provider text primary key check (provider in ('x','meta')),
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  updated_at timestamptz not null default now()
);
alter table xad.oauth_tokens enable row level security;
create table if not exists xad.auth_blocked (
  provider text primary key check (provider in ('x','meta')),
  blocked boolean not null default false,
  reason text,
  updated_at timestamptz not null default now()
);
alter table xad.auth_blocked enable row level security;
```
- [ ] **Step 2: token-exchange.ts（WebCrypto）** — `pkce-test.ts` の `step_token`/`step_refresh` core を移植。`Basic` auth は `btoa(\`${id}:${secret}\`)`、`code_challenge` は W1 の `pkceChallenge`。`exchangeCode(code, verifier, env)` / `refreshToken(current, env)` を実装。
- [ ] **Step 3: token-store を oauth_tokens 化** — `getXAccessToken` は `oauth_tokens`(provider='x') を read（fallback で env）。`refreshAccessToken` の throw を `token-exchange.refreshToken` 実装に差し替え、新 token を `oauth_tokens` upsert。
- [ ] **Step 4: start + callback 実装** — `/oauth/x/start`: verifier/state 生成（W1 `randomVerifier`/`pkceChallenge`）→ `OAUTH_STATE.put(state, verifier, {expirationTtl:300})` → authorize URL に redirect。`/oauth/x/callback`: `code`/`state` を query 取得 → `OAUTH_STATE.get(state)` で verifier 取得（**取得後 `OAUTH_STATE.delete(state)` で one-time 化**、無ければ 400）→ `exchangeCode(code, verifier, env)` → `oauth_tokens` upsert（expiresAt→timestamptz 変換）→ 成功画面。
- [ ] **Step 5: auth_blocked は kill_switch に集約** — refresh 失敗時の投稿停止は **`safety_state.publishing_enabled=false`（`triggerKillSwitch("oauth_blocked")`）に集約**して既存 `kill_switch` gate で止める（`BlockedReason` に新値を足さない）。`auth_blocked` テーブルは監査記録用。rotation-notice（W5-9）で `isTokenExpired` 接近時 `refreshAccessToken` を auto 実行 + 失敗時に上記。
- [ ] **Step 6: テスト緑（mock fetch/DB） + Commit** — `git commit -m "feat(x-account/oauth): oauth_tokens永続化 + callback + token交換/refresh (WebCrypto)"`

## W5-9: rotation-notice + 統合 smoke

**Files:**
- Create: `src/jobs/rotation-job.ts` + test
- Modify: `src/queue.ts`

- [ ] **Step 1: 失敗テスト** — `getXAccessToken`→`isTokenExpired` で期日接近 → `refreshAccessToken`（auto）→ 成功で LINE 通知、失敗で `auth_blocked` + 投稿停止フラグ + LINE エスカレーション、を mock で検証。
- [ ] **Step 2: rotation-job 実装** — 月初 cron: X token の `expiresAt` を見て、近ければ auto-refresh、結果を LINE 通知。
- [ ] **Step 3: テスト緑 + queue 配線** — Commit。
- [ ] **Step 4: 全 cron 配線確認** — `src/queue.ts` の `handleJob` が全 job（post-* / buzz-ingest / ideation / inspirations-ingest / daily-digest / optimizer-update / rollback-monitor / rotation-notice / line-event）を網羅。`default` で unknown job をログ。
- [ ] **Step 5: 統合 smoke** — Run: `IN_MEMORY_FALLBACK=true npm test` + `npm run test:worker-live` + `npm run worker:bundle-check`。Expected: 全 PASS、node:* 残留なし。
- [ ] **Step 6: deploy（人間確認）+ wrangler tail** — 各 cron が実処理ログを出すか確認。Commit/PR。

---

## Self-Review（計画作成者が実施済）

- **Spec coverage**: 設計 v2 W5 項目（ingest/digest/optimizer/rollback/rotation/oauth/brownout4段階）を全カバー。core_ideas 供給は ideation（人間決定で自動化）+ buzz/inspirations で確立。github-trending は Actions 外部（人間決定）。
- **W1-W4 依存**: line-client/webcrypto/bridgeEnv/migration0007(safety_state/optimizer_state)/各backend に依存。W5 は W1-W4 完了が前提。
- **型整合**: `runDailyDigest({})`/`runOptimizerUpdate()`/`evaluateRollback(RollbackInput)`/`rollbackToSnapshot(snapshotId)`/`OAuthTokenState`/`getXAccessToken`/`isTokenExpired` は抽出した実型に準拠。
- **新規 migration**: 0008（oauth_tokens/auth_blocked）。0007 は W2。
- **要実機検証（Step 明記）**: twitterapi.io 実レスポンス形 / GitHub Actions の commit 権限 / oauth callback の KV verifier / X token 実 refresh 挙動 / ideation の出力品質（content-reviewer 通し）。
- **Workers 制約**: ideation/buzz/oauth は fetch + Anthropic SDK（dynamic import）で Workers 互換。github-trending のみ外部。

### Codex レビュー反映（2026-06-03）

- W5-0 前提ゲート追加（W1-W4 成果物確認 + `src/tsconfig.json` の lib import 対応）
- import パス是正（`src/queue.ts`→`../lib`、`src/jobs`→`../../lib`）
- OAuth は **KV binding `OAUTH_STATE`** + `/oauth/x/start`（verifier/state 生成・保存）+ callback の one-time delete を追加
- `lastSnapshotId?` optional ガード / rollback-monitor と update-loop の責務分離明記
- ideation は **atomic claim**（meta `ideation_status`）+ 0007 依存明記 + primary_hook(Writer12種) と post_drafts(4種) の分離
- buzz は `redacted_text/pii/meta.tweet_id` で保存・重複防止
- brownout 4 段階を **job allowlist** で表現（cron_halt でも digest は実行）
- auth_blocked は `kill_switch`(`safety_state`) に集約（`BlockedReason` 不変）
- GitHub Actions に `permissions: contents: write` + JST 日付
- 0008 に `provider` CHECK / expiresAt(ms)↔timestamptz 変換明記
