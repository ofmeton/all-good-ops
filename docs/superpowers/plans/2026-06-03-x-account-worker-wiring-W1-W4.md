# x-account-system Worker 配線 W1-W4 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** deploy 済だが全ハンドラ stub の Cloudflare Worker `ofmeton-x-account` を、`lib/` に配線し未実装 backend を実装して、Phase 1（人間承認つき **3 投稿/日**）の launch-critical 経路を実働させる。

**Architecture:** Workers + Cloudflare Queues。`scheduled()`/webhook は軽量（enqueue のみ）、重処理は Queue consumer。lib の Node 非互換（child_process/fs/axios/dotenv/CLI）を互換シムで除去し、未実装 production backend（LLM judge / optimizer store / digest・optimizer 永続化 / publisher DB gate / safety_state）を実装。

**Tech Stack:** TypeScript / Cloudflare Workers (`nodejs_compat`, compat_date 2026-05-01) / Cloudflare Queues / Supabase (`@supabase/supabase-js`, xad schema) / Anthropic SDK (`@anthropic-ai/sdk ^0.36.0`, tool_use) / jest (ts-jest, CommonJS) / WebCrypto。

**設計 SSOT:** `docs/superpowers/specs/2026-06-03-x-account-worker-wiring-design.md`

**前提作業（全タスク共通の最初に 1 回）:**
- worktree で `cd apps/x-account-system && npm install`（`tsx`/`jest`/`wrangler` が無いと全 step が動かない）
- `IN_MEMORY_FALLBACK=true` でない本番経路を実装するため、テストは原則 fixture/mock で本番分岐を直接叩く（既存テストは `IN_MEMORY_FALLBACK=true` 前提なので壊さない）
- jest は CommonJS トランスパイル（`jest.config.cjs`、`__dirname` 可、`.ts` import は `moduleNameMapper` で剥がす）

---

## Phase W1 — Workers 互換シム

Node 非互換を除去。各タスクは「テスト緑のまま Node 依存を消す」リファクタ。

### Task W1-1: hook 分類器を純 TS 化（classify-rules.ts）

`classify.py`（220行 regex + スコアリング）を TS に移植し、`classify.ts` の `child_process` 経路を撤去。

**Files:**
- Create: `lib/hook-classifier/classify-rules.ts`
- Create: `lib/hook-classifier/__fixtures__/classify-parity.json`（py 出力との parity ケース）
- Create: `lib/hook-classifier/classify-rules.test.ts`
- Modify: `lib/hook-classifier/classify.ts`（spawn 経路を classify-rules 呼び出しに置換）

- [ ] **Step 1: parity fixture を作る** — `classify.py` を実行して代表 20 ケースの入力→出力を採取。

Run（worktree の app 配下）:
```bash
for t in "3時間かかってた経理を20分に短縮した手順" "失敗した。ChatGPTで詰まった話" "みんなAIは万能と思ってるが実は" "Claude活用5つのコツ" "【保存版】請求書自動化" ; do
  python3 lib/hook-classifier/classify.py --text "$t"
done
```
採取した `{input, expected:{primary_hook,devices,confidence}}` を `__fixtures__/classify-parity.json` に配列で保存（confidence は ±0.05 許容のため期待レンジで持つ）。

- [ ] **Step 2: 失敗するテストを書く**

```ts
// lib/hook-classifier/classify-rules.test.ts
import { classifyRules } from "./classify-rules.ts";
import fixtures from "./__fixtures__/classify-parity.json";

describe("classifyRules parity with classify.py", () => {
  test.each(fixtures as Array<{ input: string; expected: { primary_hook: string; devices: string[]; confidenceMin: number; confidenceMax: number } }>)(
    "$input",
    ({ input, expected }) => {
      const r = classifyRules(input);
      expect(r.primary_hook).toBe(expected.primary_hook);
      for (const d of expected.devices) expect(r.devices).toContain(d);
      expect(r.confidence).toBeGreaterThanOrEqual(expected.confidenceMin);
      expect(r.confidence).toBeLessThanOrEqual(expected.confidenceMax);
    },
  );
});
```

- [ ] **Step 3: 失敗を確認** — Run: `IN_MEMORY_FALLBACK=true npx jest lib/hook-classifier/classify-rules.test.ts`。Expected: FAIL "Cannot find module './classify-rules.ts'"。

- [ ] **Step 4: classify-rules.ts を実装** — `classify.py` の `DEVICE_PATTERNS`/keyword 辞書/`detect_primary_hook` を移植。**emoji 範囲は `u` flag + `\u{...}`**。

```ts
// lib/hook-classifier/classify-rules.ts
import type { HookClassification } from "./classify.ts";

const DEVICE_PATTERNS: Record<string, RegExp> = {
  number: /(?:\d+(?:[.,]\d+)?\s?(?:分|秒|時間|日|週間|ヶ月|年|倍|%|％|円|万円|千円|件|個|本|名|社|時短))|(?:[1-9]\d{0,2}(?:,\d{3})+)/u,
  before_after: /(?:before[\s/:＝→\-]+after|before\s*→\s*after)|(?:\d+[\s\d]*[→⇒\->]+\s*\d+)|(?:[一-龯]{0,5}前\s*[→⇒\->]+\s*[一-龯]{0,5}後)/u,
  conclusion_first: /^(?:結論[、,。]|答えは|断言します|一言で言うと|要するに|つまり)/u,
  question: /^[^\n]{0,40}(?:[？?])/u,
  contrarian: /(?:みんな|多くの人|世間|普通)\s?(?:は|が)?\s?[一-龯]{0,20}\s?(?:と言う|思って|信じて)\s?が?[、,。]?\s?(?:実は|本当は|現実は)|(?:と思われ|信じられ)\s?(?:て|がち)\s?(?:いる|だが|るが)[、,。]?\s?(?:実は|本当は)/u,
  empathy: /(?:実は|正直)\s?(?:私|僕|自分|オレ|俺)\s?(?:も|だって|もまた)\s?(?:最初|昔|初め|前)?/u,
  meta_reference: /(?:この投稿|この[ツトス]レッド|本日のツイート|今日のスレ)/u,
  self_deprecating: /(?:下手|苦手|無能|ダメ|どんくさい|ポンコツ|底辺)/u,
  comparison: /(?:vs|ＶＳ|比較|と比べて|に比べて|より|の方が|より優れ|より劣)/u,
  warning: /(?:危険|要注意|注意|やめろ|やってはいけない|落とし穴|罠|警告|ご法度)/u,
  first_hand_past: /(?:私|僕|自分|俺)\s?(?:は|が|を|に|で)?\s?[^\n]{0,40}(?:した|してた|だった|なった|思った|気付いた|失敗した)/u,
  brackets: /^[^\n]{0,15}【[^】]{1,12}】/u,
  emoji_lead: /^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u,
};

const FAILURE_KEYWORDS = ["失敗","ダメだった","ハマった","詰まった","詰んだ","落とし穴","後悔","迷った","途方に暮れ","うまくいかな","間違","ミス"];
const BUSINESS_REPRO_KEYWORDS = ["手順","Step","ステップ","ワークフロー","プロンプト","テンプレ","やり方","方法","設定","実装","コード","自動化"];
const CRITIQUE_KEYWORDS = ["業界","批評","考察","本質","そもそも","つまるところ","結局","問題は","課題は","違うのは","勘違い"];
const TIPS_ENUM_KEYWORDS = ["選","つ厳選","つの","コツ","ポイント","テクニック","Tips","tip"];

type Hook = HookClassification["primary_hook"];

function detectPrimaryHook(text: string, devices: string[]): { hook: Hook; confidence: number } {
  const score: Record<Hook, number> = { failure_story: 0, business_repro: 0, critique: 0, tips_enum: 0 };
  for (const kw of FAILURE_KEYWORDS) if (text.includes(kw)) score.failure_story += 1.0;
  for (const kw of BUSINESS_REPRO_KEYWORDS) if (text.includes(kw)) score.business_repro += 0.7;
  for (const kw of CRITIQUE_KEYWORDS) if (text.includes(kw)) score.critique += 0.8;
  for (const kw of TIPS_ENUM_KEYWORDS) if (text.includes(kw)) score.tips_enum += 0.7;
  if (devices.includes("first_hand_past") && score.failure_story < 1) score.failure_story += 0.5;
  if (devices.includes("empathy")) score.failure_story += 0.6;
  if (devices.includes("before_after")) score.business_repro += 1.2;
  if (devices.includes("number") && devices.includes("before_after")) score.business_repro += 0.8;
  if (devices.includes("contrarian")) score.critique += 1.0;
  if (devices.includes("comparison") && !BUSINESS_REPRO_KEYWORDS.some((k) => text.includes(k))) score.critique += 0.4;
  const enumSignals = (text.match(/(?:^|\n)\s?[1-9一二三四五六七八九][.)]\s/gu) ?? []).length;
  if (enumSignals >= 2) score.tips_enum += 1.5;
  if (text.includes("bullet") || /[・▼📌✅]/u.test(text)) score.tips_enum += 0.6;
  let best = (Object.keys(score) as Hook[]).reduce((a, b) => (score[a] >= score[b] ? a : b));
  const total = Object.values(score).reduce((a, b) => a + b, 0) || 1.0;
  let confidence = Math.min(score[best] / total, 0.95);
  if (score[best] < 0.5) { best = "tips_enum"; confidence = 0.3; }
  return { hook: best, confidence: Math.round(confidence * 1000) / 1000 };
}

export function classifyRules(text: string): HookClassification {
  if (!text) return { primary_hook: "tips_enum", devices: [], confidence: 0.0, raw_features: {} };
  const devices: string[] = [];
  const raw: Record<string, string> = {};
  for (const [name, pat] of Object.entries(DEVICE_PATTERNS)) {
    const m = pat.exec(text);
    if (m) { devices.push(name); raw[name] = m[0].slice(0, 60); }
  }
  const { hook, confidence } = detectPrimaryHook(text, devices);
  return { primary_hook: hook, devices, confidence, raw_features: raw };
}
```

- [ ] **Step 5: テスト緑を確認** — Run: `IN_MEMORY_FALLBACK=true npx jest lib/hook-classifier/classify-rules.test.ts`。Expected: PASS。parity 不一致が出たら fixture の confidence レンジ or regex を py と突き合わせ調整（差分は許容 95%+、未達は人間確認）。

- [ ] **Step 6: classify.ts の child_process 経路を撤去** — `lib/hook-classifier/classify.ts` の `import { spawn } from "node:child_process"` 以下 spawn ブロック（line 13, 65-97）を削除し、本番経路を `classifyRules` 呼び出しに置換。

```ts
// classify.ts: import 行を差し替え
import { classifyRules } from "./classify-rules.ts";
// classifyHook 本体: IN_MEMORY_FALLBACK ブロックは残し、その後の spawn 部を:
export async function classifyHook(text: string): Promise<HookClassification> {
  // ...（既存 IN_MEMORY_FALLBACK ブロックはそのまま）
  return classifyRules(text);
}
```
`import.meta.url` / `fileURLToPath` / `path` / `SCRIPT_PATH` の未使用化したものを削除。**`FALLBACK` 定数は既存 IN_MEMORY_FALLBACK ブロック（classify.ts:28,59）が使うので残す**。

- [ ] **Step 7: 既存 editor テストが緑のまま確認** — Run: `IN_MEMORY_FALLBACK=true npx jest lib/hook-classifier lib/editor`。Expected: PASS（child_process 撤去で挙動不変）。

- [ ] **Step 8: Commit**
```bash
git add lib/hook-classifier/
git commit -m "feat(x-account/worker): hook 分類器を純 TS 化 (classify.py→classify-rules.ts, child_process 撤去)"
```

### Task W1-2: 静的 config を TS 定数化（cost-model / fallback channels）

`readFileSync` を撤去し CSV/YAML を TS 定数に。

**Files:**
- Create: `lib/cost/cost-model-data.ts`（CSV を配列定数化）
- Create: `lib/fallback/channels-data.ts`（YAML を JSON 定数化）
- Modify: `lib/cost/budget-calculator.ts`（readFileSync→定数 import、CLI 分離）
- Modify: `lib/fallback/trigger.ts`（readFileSync/js-yaml/dotenv→定数 import）

- [ ] **Step 1: cost-model を定数化** — `cost-model.csv` の 21 行を `lib/cost/cost-model-data.ts` の `export const COST_MODEL_ROWS: CostRow[] = [...]` に変換（`parseCsv` の出力型と同一フィールド）。CSV は今後 SSOT をこの TS にする。
- [ ] **Step 2: budget-calculator を改修** — `readFileSync(csvPath)` を `COST_MODEL_ROWS` 直接参照に。`node:fs`/`node:url`/`node:path` import と `main()` 即時実行（CLI）を `if (import.meta.main)` 相当でなく **別ファイル `lib/cost/budget-cli.ts` に分離**（worker は純関数のみ import）。
- [ ] **Step 3: fallback channels を定数化** — `fallback_channels.yaml` を `lib/fallback/channels-data.ts` の `export const FALLBACK_CONFIG: FallbackConfig = {...}` に。`loadFallbackConfig()` は定数を返すだけに。`import "dotenv/config"`（top-level）を削除。
- [ ] **Step 4: テスト緑確認** — Run: `IN_MEMORY_FALLBACK=true npx jest lib/cost lib/fallback`。Expected: PASS。
- [ ] **Step 5: Commit** — `git commit -m "feat(x-account/worker): 静的config(CSV/YAML)をTS定数化, node:fs撤去"`

### Task W1-3: LINE クライアント + WebCrypto util

axios → fetch、`node:crypto` → WebCrypto。

**Files:**
- Create: `lib/line/line-client.ts`（fetch ベース LINE push、共通化）
- Create: `lib/crypto/webcrypto.ts`（LINE 署名検証 HMAC-SHA256 / PKCE SHA-256 / base64url）
- Create: `lib/crypto/webcrypto.test.ts`
- Modify: `lib/dashboard/digest.ts`（axios→line-client、dotenv import 削除、CLI 分離）
- Modify: `lib/interviewer/line-flow.ts`（axios→line-client）

- [ ] **Step 1: WebCrypto util の失敗テスト**
```ts
// lib/crypto/webcrypto.test.ts
import { verifyLineSignature, pkceChallenge, base64url } from "./webcrypto.ts";
test("verifyLineSignature: 既知 body+secret で一致", async () => {
  const secret = "testsecret";
  const body = '{"events":[]}';
  // 期待値は Node で生成: crypto.createHmac('sha256',secret).update(body).digest('base64')
  const sig = "GtfRYwmsm9hG6P0sQ7m3yQ2N4lqV0sY0a7e6sJ0o5kE="; // ← Step 2 で実値に差し替え
  expect(await verifyLineSignature(body, sig, secret)).toBe(true);
  expect(await verifyLineSignature(body, "wrong", secret)).toBe(false);
});
test("pkceChallenge: S256 が base64url", async () => {
  const c = await pkceChallenge("verifier123");
  expect(c).toMatch(/^[A-Za-z0-9_-]+$/);
});
```
- [ ] **Step 2: 期待 signature の実値を採取** — Run:
```bash
node -e "const c=require('crypto');console.log(c.createHmac('sha256','testsecret').update('{\"events\":[]}').digest('base64'))"
```
出力を Step 1 の `sig` に貼る。
- [ ] **Step 3: webcrypto.ts 実装**
```ts
// lib/crypto/webcrypto.ts
export function base64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = ""; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64std(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf); let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
// HMAC-SHA256 の base64 は常に 44 文字（長さは公開情報）なので長さ早期 return は
// 機密を漏らさない。厳密化したい場合は両者を同長 buffer に正規化して XOR 比較。
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
export async function verifyLineSignature(body: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return timingSafeEqual(b64std(mac), signature);
}
export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(digest);
}
export function randomVerifier(): string {
  const b = new Uint8Array(64); crypto.getRandomValues(b); return base64url(b);
}
```
- [ ] **Step 4: テスト緑** — Run: `npx jest lib/crypto/webcrypto.test.ts`。Expected: PASS。
- [ ] **Step 5: line-client.ts 実装**（digest/line-flow の重複 axios を集約）
```ts
// lib/line/line-client.ts
export async function pushLine(to: string, text: string, token: string): Promise<void> {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to, messages: [{ type: "text", text }] }),
  });
  if (!res.ok) throw new Error(`LINE push failed: ${res.status} ${await res.text()}`);
}
```
- [ ] **Step 6: digest.ts / line-flow.ts の axios を pushLine に置換** + `digest.ts` の `import "dotenv/config"`（line19）削除 + CLI 部（line136-165）を `lib/dashboard/digest-cli.ts` に分離。`sendToLine` 内 `await import("axios")` を `pushLine(payload.to, payload.text, token)` に。`line-flow.ts:237-244` も同様。
- [ ] **Step 7: 既存テスト緑** — Run: `IN_MEMORY_FALLBACK=true npx jest lib/dashboard lib/interviewer`。Expected: PASS（dry-run 経路は不変）。
- [ ] **Step 8: Commit** — `git commit -m "feat(x-account/worker): LINE push を fetch 化 + WebCrypto util (署名/PKCE), axios/dotenv 撤去"`

### Task W1-4: env 注入方針 + bundle-check

top-level `process.env` read は native populate に依拠（compat_date 2026-05-01）。bundle に node:* が残らないことを検証。

**Files:**
- Modify: `wrangler.toml`（`[vars] SUPABASE_SCHEMA="xad"` 追加）
- Create: `src/env-bridge.ts`（defense-in-depth）
- Create: `scripts/bundle-check.sh`
- Modify: `package.json`（`worker:bundle-check` script 追加）

- [ ] **Step 1: wrangler.toml に vars 追加** — `[vars]` に `SUPABASE_SCHEMA = "xad"` を追加。
- [ ] **Step 2: env-bridge.ts** — worker entry 冒頭で呼ぶ保険（native populate が効かない値のみ補完。top-level read には間に合わない点はコメント明記）。
```ts
// src/env-bridge.ts
export function bridgeEnv(env: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(env)) {
    if (typeof v === "string" && process.env[k] == null) process.env[k] = v;
  }
  process.env.SUPABASE_SCHEMA ??= "xad";
}
```
- [ ] **Step 3: bundle-check** — `scripts/bundle-check.sh`: `wrangler deploy --dry-run --outdir /tmp/xad-bundle` 後 `grep -RE "node:child_process|node:fs|require\(['\"]fs['\"]\)" /tmp/xad-bundle && exit 1 || echo OK`。`package.json` に `"worker:bundle-check": "bash scripts/bundle-check.sh"`。
- [ ] **Step 4: 実機検証（要記録）** — `wrangler tail` で deploy 後に top-level read（`SUPABASE_SCHEMA` 等）が効くか確認。効かない場合は該当 lib の top-level 定数を lazy getter 化（W1-4 追加タスク化）。
- [ ] **Step 5: Commit** — `git commit -m "chore(x-account/worker): SUPABASE_SCHEMA vars化 + env-bridge + bundle-check"`

---

## Phase W2 — 未実装 backend の実装

### Task W2-1: migration 0007（safety_state / optimizer_state / interview_sessions + 制約）

**Files:**
- Create: `migrations/0007_worker_backend.sql`

- [ ] **Step 1: 既存 DDL inspect** — Run: `grep -n "CREATE TABLE" migrations/000*.sql`。`safety_state`/`optimizer_state`/`interview_sessions` が無いことを確認（feedback_db_migration_pre_inspect）。
- [ ] **Step 2: 0007 を書く**
```sql
-- migrations/0007_worker_backend.sql
create extension if not exists "uuid-ossp";  -- 既存 migration が uuid_generate_v4 を使うが明示有効化が無いため

-- safety_state: kill-switch / brownout / publisher gate の永続状態（kill-switch.ts が scope='global' で参照）
create table if not exists xad.safety_state (
  scope text primary key,
  publishing_enabled boolean not null default true,
  resume_at timestamptz,
  triggered_by text,
  updated_at timestamptz not null default now()
);
insert into xad.safety_state (scope, publishing_enabled) values ('global', true)
  on conflict (scope) do nothing;
alter table xad.safety_state enable row level security;

-- optimizer_state: OptimizerState posterior 永続。singleton（scope PK で upsert）
create table if not exists xad.optimizer_state (
  scope text primary key default 'global',
  generation int not null default 0,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
alter table xad.optimizer_state enable row level security;

-- optimizer_snapshot: rollback 用
create table if not exists xad.optimizer_snapshot (
  id uuid primary key default uuid_generate_v4(),
  snapshot_id text not null unique,
  state jsonb not null,
  created_at timestamptz not null default now()
);
alter table xad.optimizer_snapshot enable row level security;

-- interview_sessions: interviewer 途中状態（Workers ステートレス対策、InterviewSession を素直に永続）
create table if not exists xad.interview_sessions (
  id text primary key,
  line_user_id text not null,
  current_step text not null,
  industry text not null,
  topic text not null,
  answers jsonb not null default '[]'::jsonb,
  material_id text,
  publication_consent text not null default 'pending',
  finalized boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table xad.interview_sessions enable row level security;

-- post_drafts 追加列:
--  scheduled_date/slot: 1 投稿/slot/日 の冪等一意制約
--  editor_output: 承認時に publishToX が要求する EditorOutput 全体を保存（再 runEditor は非決定なので避ける）
--  embedding: runEditor R5 (lib/editor/db.ts:110 が post_drafts.embedding を select) が本番で必要
--  published_at / writer_draft_id: 公開時刻 / writer 生成 id (非UUID) の控え
alter table xad.post_drafts add column if not exists scheduled_date date;
alter table xad.post_drafts add column if not exists slot text;
alter table xad.post_drafts add column if not exists editor_output jsonb;
alter table xad.post_drafts add column if not exists embedding extensions.vector(1536);
alter table xad.post_drafts add column if not exists published_at timestamptz;
alter table xad.post_drafts add column if not exists writer_draft_id text;
create unique index if not exists post_drafts_date_slot_uniq
  on xad.post_drafts (scheduled_date, slot) where scheduled_date is not null;

-- core_ideas に writer 入力フィールドを追加（既存は title/summary/category のみで CoreIdea を満たせない）
--  CoreIdea = {topic, primaryHook, fmat, contentType, audience, sourceMaterialIds}
alter table xad.core_ideas add column if not exists topic text;
alter table xad.core_ideas add column if not exists primary_hook text;
alter table xad.core_ideas add column if not exists fmat text;
alter table xad.core_ideas add column if not exists audience text;
-- contentType は既存 category(paraphrase/first_hand/industry_sop) を流用、不足分は meta jsonb で補完
```

> ⚠️ `post_drafts.embedding` 不在は **runEditor が本番で R5 を実行すると失敗する追加 backend 穴**（Codex 発見、`lib/editor/db.ts:110` が `post_drafts!inner(body, embedding)` を select）。0007 で列追加 + W2 で R5 経路の embedding 書込/読込を実装（embedding 生成は W2-2 と同じ Anthropic/OpenAI embedding。Phase 1 で R5 重複検出を簡略化する場合は db.ts のクエリを body のみに変える代替案も可。実装時に確定）。
- [ ] **Step 3: MCP apply（人間確認の上）** — 本番 DB 書込なので人間確認。`mcp__plugin_supabase_supabase__apply_migration`(project_id=`hofvvcvhjslevymhbcqj`, name=`worker_backend`, query=上記)。CLI db push は不可（履歴不一致、本プロジェクト方針）。
- [ ] **Step 4: 反映確認** — `list_tables` で 4 テーブル + post_drafts 列を確認。`get_advisors security` で RLS no-policy(INFO) を確認。
- [ ] **Step 5: Commit** — `git add migrations/0007_worker_backend.sql && git commit -m "feat(x-account/db): 0007 worker backend tables (safety_state/optimizer_state/interview_sessions)"`

### Task W2-2: LLM judge を Anthropic tool_use で実装

**Files:**
- Modify: `lib/editor/llm-judge.ts`（`callAnthropicJudge` の throw を実装）
- Create: `lib/editor/llm-judge.live.test.ts`（Anthropic mock）

- [ ] **Step 1: 失敗テスト（Anthropic mock で tool_use 応答→LlmJudgeResult）**
```ts
// lib/editor/llm-judge.live.test.ts  (IN_MEMORY_FALLBACK は立てない)
import { runLlmJudge } from "./llm-judge.ts";
jest.mock("@anthropic-ai/sdk", () => ({
  default: class { messages = { create: async () => ({
    content: [{ type: "tool_use", name: "judge", input: {
      r1_workflow_theme: { status: "pass", reason: "ok" },
      r3_no_enemy: { status: "pass", reason: "ok" },
      r6_assertive_conclusion: { status: "pass", reason: "ok" },
      x2_stealth_disclosure_text: { status: "pass", reason: "ok" },
      x4_audience_line: { status: "pass", reason: "ok" },
      x5_proper_noun_assist: { status: "pass", reason: "ok" },
    }}],
    usage: { input_tokens: 1500, output_tokens: 500 },
  }) }; },
}));
test("callAnthropicJudge: tool_use を LlmJudgeResult に map", async () => {
  process.env.ANTHROPIC_API_KEY = "test";
  const r = await runLlmJudge({ body: "x", hasAffiliateLink: false, format: "short", platform: "x" });
  expect(r.r1_workflow_theme.status).toBe("pass");
  expect(r.costUsd).toBeGreaterThan(0);
});
```
- [ ] **Step 2: 失敗確認** — Run: `npx jest lib/editor/llm-judge.live.test.ts`。Expected: FAIL（throw "not implemented"）。
- [ ] **Step 3: callAnthropicJudge 実装**（writer-x の lazy import パターン + tools/tool_choice）
```ts
// llm-judge.ts: callAnthropicJudge を差し替え
const JUDGE_TOOL = {
  name: "judge",
  description: "Editor 6項目を pass/fail/skip で判定",
  input_schema: {
    type: "object",
    properties: Object.fromEntries(
      ["r1_workflow_theme","r3_no_enemy","r6_assertive_conclusion","x2_stealth_disclosure_text","x4_audience_line","x5_proper_noun_assist"]
        .map((k) => [k, { type: "object", properties: { status: { type: "string", enum: ["pass","fail","skip"] }, reason: { type: "string" } }, required: ["status","reason"] }]),
    ),
    required: ["r1_workflow_theme","r3_no_enemy","r6_assertive_conclusion","x2_stealth_disclosure_text","x4_audience_line","x5_proper_noun_assist"],
  },
} as const;

async function callAnthropicJudge(input: LlmJudgeInput): Promise<LlmJudgeResult> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    tools: [JUDGE_TOOL as never],
    tool_choice: { type: "tool", name: "judge" },
    messages: [{ role: "user", content: `platform=${input.platform} format=${input.format} affiliate=${input.hasAffiliateLink}\n---\n${input.body}\n---\n上記を Editor 6項目で判定し judge tool を呼べ。` }],
  });
  const tu = res.content.find((b) => b.type === "tool_use");
  if (!tu || tu.type !== "tool_use") throw new Error("judge: no tool_use in response");
  const costUsd = (res.usage.input_tokens / 1_000_000) * 3 + (res.usage.output_tokens / 1_000_000) * 15;
  return { ...(tu.input as Omit<LlmJudgeResult, "costUsd">), costUsd };
}
```
- [ ] **Step 4: テスト緑** — Run: `npx jest lib/editor/llm-judge.live.test.ts`。Expected: PASS。
- [ ] **Step 5: 既存 editor テスト緑（fallback 経路不変）** — Run: `IN_MEMORY_FALLBACK=true npx jest lib/editor`。Expected: PASS。
- [ ] **Step 6: Commit** — `git commit -m "feat(x-account/editor): LLM judge を Anthropic tool_use で実装 (本番 throw 解消)"`

### Task W2-3: optimizer の Supabase backend 実装

**Files:**
- Modify: `lib/optimizer/state-store.ts`（load/save/snapshot/rollback の throw を実装）
- Modify: `lib/optimizer/reward-extractor.ts`（extractSuccessSignals/aggregatePerformanceWindow の throw を実装）
- Create: `lib/optimizer/supabase-store.test.ts`（mock supabase client）

- [ ] **Step 1: Supabase client helper** — `state-store.ts` に `getSupabase()`（kill-switch.ts:18-33 と同型、`{db:{schema: process.env.SUPABASE_SCHEMA||"public"}}`）を追加。
- [ ] **Step 2: 失敗テスト（mock client で load/save 往復）** — `@supabase/supabase-js` を mock し、`from("optimizer_state").select/upsert` を検証。
- [ ] **Step 3: load/saveOptimizerState 実装** — `optimizer_state` は **singleton（`scope='global'` PK）**。load は `select state where scope='global'`、save は `upsert({scope:'global', state, generation: generation+1})`。snapshot は `optimizer_snapshot` insert、rollback は snapshot_id で取得。
- [ ] **Step 4: reward-extractor 実装** — `extractSuccessSignals` は `posted_records` join `performance_metrics`（PCR top30%/url_link_clicks>median）。`aggregatePerformanceWindow` は窓集計。`SuccessSignal.attribution.hook` は `OptimizerState.hookDistribution` の key（`number_lead/question_lead/...`）なので、`post_drafts.primary_hook`(`failure_story` 等) / `devices` から **hook key へ変換する関数 `toHookKey()` を追加**（変換不能は `other`）。`timeBand` は `post_drafts.slot` から。
- [ ] **Step 5: テスト緑** — Run: `npx jest lib/optimizer/supabase-store.test.ts` + `IN_MEMORY_FALLBACK=true npx jest lib/optimizer`（既存緑）。
- [ ] **Step 6: Commit** — `git commit -m "feat(x-account/optimizer): Supabase backend (state/snapshot/reward) 実装"`

### Task W2-4: digest 永続化 + cost 集計 + publisher DB gate

**Files:**
- Modify: `lib/dashboard/digest.ts`（`runDailyDigest` で `daily_digest_log` insert）
- Modify: `lib/dashboard/kpi-collector.ts`（`getMonthlyCostJpy` を `cost_ledger` 集計に）
- Modify: `lib/publisher/x-publisher.ts`（publish 前に `assertPublishingEnabled()` 呼び出し）

- [ ] **Step 1: digest 永続化テスト** — mock client で `runDailyDigest` 後 `from("daily_digest_log").insert` が `{digest_type:'daily', sent_at, recipient, body, alerts}` で呼ばれることを検証。
- [ ] **Step 2: runDailyDigest に insert 追加** — `sendToLine` 後に `daily_digest_log` insert（fallback時は skip）。
- [ ] **Step 3: getMonthlyCostJpy 実装** — `cost_ledger` の当月 `sum(cost_jpy)`（`makeProductionDeps` の TODO 0 を置換）。
- [ ] **Step 4: publisher gate テスト** — `safety_state.publishing_enabled=false` を mock し `publishToX` が blocked になることを検証。
- [ ] **Step 5: publishToX に DB gate 追加** — Gate3 の前で `await assertPublishingEnabled()`（kill-switch.ts の既存関数、`safety_state` 参照）を try/catch し、disabled なら `blocked: kill_switch`。既存 env override は維持。
- [ ] **Step 6: テスト緑** — Run: `IN_MEMORY_FALLBACK=true npx jest lib/dashboard lib/publisher` + 新規テスト。
- [ ] **Step 7: Commit** — `git commit -m "feat(x-account/backend): digest 永続化 + cost集計 + publisher DB gate"`

---

## Phase W3 — Queues 基盤 + 投稿系配線

### Task W3-1: Queues binding + consumer scaffold

**Files:**
- Modify: `wrangler.toml`（producer/consumer/DLQ binding、cron を 3 投稿+追加 job に是正）
- Modify: `src/worker.ts`（`Env` に Queue binding、`scheduled` を enqueue 化、`queue()` handler 追加）
- Create: `src/queue.ts`（consumer dispatch）

- [ ] **Step 1: wrangler.toml に Queues + cron 是正**
```toml
[[queues.producers]]
queue = "xad-jobs"
binding = "JOBS"

[[queues.consumers]]
queue = "xad-jobs"
max_batch_size = 1
max_retries = 3
dead_letter_queue = "xad-jobs-dlq"

[triggers]
crons = [
  "0 22 * * *",  # 朝07:00 JST post-morning
  "0 3 * * *",   # 昼12:00 post-noon
  "0 10 * * *",  # 夕19:00 post-evening (note送客)
  "0 21 * * *",  # 06:00 buzz-ingest
  "0 22 * * *",  # 07:00 github-trending (※同cronは別途分離 or 単一jobで2処理)
  "0 13 * * *",  # 21:00 daily-digest
  "0 14 * * *",  # 23:00 optimizer-update
  "0 */2 * * *", # rollback-monitor 2h毎
  "0 0 * * 1",   # 月09:00 inspirations-ingest
  "0 15 1 * *",  # 月初 rotation-notice
]
```
（注: cron 重複は実装時に時刻を分離。3 投稿は morning/noon/evening の 3 slot。）
- [ ] **Step 2: Env に Queue binding 型 + scheduled を enqueue 化**
```ts
// src/worker.ts Env に追加
export interface Env { /* ...既存... */ JOBS: Queue<JobMessage>; }
// discriminated union（post-* は slot、line-event は payload を持つ）
export type JobMessage =
  | { job: "post-morning" | "post-noon" | "post-evening"; date: string; slot: "morning" | "noon" | "evening" }
  | { job: "buzz-ingest" | "github-trending" | "daily-digest" | "optimizer-update" | "rollback-monitor" | "inspirations-ingest" | "rotation-notice"; date: string }
  | { job: "line-event"; date: string; payload: unknown };  // payload = LINE webhook event (W4)
// scheduled: dispatch 直呼びをやめ enqueue
async scheduled(event, env, ctx) {
  const job = CRON_JOBS[event.cron] ?? "unknown";
  if (job === "unknown") return;
  const date = jstDate(new Date());
  const slot = ({ "post-morning": "morning", "post-noon": "noon", "post-evening": "evening" } as const)[job as string];
  ctx.waitUntil(env.JOBS.send(slot ? { job, date, slot } as JobMessage : { job, date } as JobMessage));
}
```
- [ ] **Step 3: queue() handler + consumer** — `src/queue.ts` に `handleJob(msg, env)`。`export default` に `async queue(batch, env, ctx)` を追加し `for (const m of batch.messages) { try { await handleJob(m.body, env); m.ack(); } catch(e){ m.retry(); } }`。
- [ ] **Step 4: bundle-check + typecheck** — Run: `npm run worker:typecheck && npm run worker:bundle-check`。Expected: PASS。
- [ ] **Step 5: Commit** — `git commit -m "feat(x-account/worker): Cloudflare Queues 基盤 + scheduled enqueue 化 + cron 3投稿是正"`

### Task W3-2: 投稿系 job orchestrator（idea→draft→editor→承認 push）

**Files:**
- Create: `src/jobs/post-job.ts`
- Create: `src/jobs/post-job.test.ts`
- Modify: `src/queue.ts`（post-* を post-job に dispatch）

- [ ] **Step 1: 失敗テスト** — `draftForX`/`runEditor`/`pushLine` を mock し、(a) idea dequeue→draft→editor→post_drafts insert(status pending)→LINE 承認 push、(b) editor rejected は push せず digest 計上、を検証。`IN_MEMORY_FALLBACK` は使わず DB を mock。
- [ ] **Step 2: post-job 実装**（facts の型に厳密準拠）
```ts
// src/jobs/post-job.ts
import { draftForX } from "../../lib/writer/writer-x.ts";
import { runEditor } from "../../lib/editor/pipeline.ts";
import type { CoreIdea } from "../../lib/writer/types.ts";
import type { EditorInput } from "../../lib/editor/types.ts";

// core_ideas 行 → CoreIdea。topic/primary_hook/fmat/audience は 0007 追加列、
// contentType は既存 category、不足は meta jsonb fallback。
function toCoreIdea(row: CoreIdeaRow): CoreIdea {
  return {
    id: row.id,
    topic: row.topic ?? row.title ?? row.summary ?? "(no topic)",
    primaryHook: (row.primary_hook ?? row.meta?.primaryHook ?? "tips_enum") as CoreIdea["primaryHook"],
    fmat: (row.fmat ?? row.meta?.fmat ?? "medium") as CoreIdea["fmat"],
    contentType: (row.category ?? "first_hand") as CoreIdea["contentType"],
    audience: row.audience ?? row.meta?.audience ?? "非エンジニアの経営者",
    sourceMaterialIds: row.source_material_ids ?? [],
  };
}

export async function runPostJob(slot: string, env: Env): Promise<void> {
  // 1. ガード: kill-switch(safety_state) / brownout 段階 / 月予算 / X投稿枠
  if (!(await guardsPass(env, slot))) return;
  // 2. idea: core_ideas status='draft' 未消費を1件取得（取得時 status='approved' に進めて二重消費防止）
  const row = await dequeueIdeaRow(env, slot);
  if (!row) { await notifyLine(env, `[${slot}] core_ideas が空`); return; }
  const idea = toCoreIdea(row);
  // 3. draft（writer の draftId は非UUID なので DB UUID を別途採番）
  const draft = await draftForX(idea);
  const dbDraftId = crypto.randomUUID();  // post_drafts.id / posted_records.draft_id / postback に使う UUID
  // 4. editor（DB UUID を draftId に。CoreIdea + DraftOutput を EditorInput に合成）
  const ein: EditorInput = {
    traceId: crypto.randomUUID(), draftId: dbDraftId, coreIdeaId: idea.id,
    platform: "x", body: draft.body, fmat: idea.fmat,
    sourceMaterialIds: idea.sourceMaterialIds, hasAffiliateLink: false,
  };
  const out = await runEditor(ein);
  // 5. post_drafts upsert: id=dbDraftId, scheduled_date/slot 一意, editor_status,
  //    human_approval_status='pending', editor_output=out(jsonb), writer_draft_id=draft.draftId
  await persistDraft(env, { id: dbDraftId, idea, draft, out, slot, date: jstDate(new Date()) });
  // 6. editor approved → LINE 承認 push (postback data=approve:<dbDraftId>/reject:<dbDraftId>)
  if (out.decision === "approved") await pushApproval(env, dbDraftId, draft.body, out);
  else await logRejectToDigest(env, dbDraftId, out.rejectReasons);
}
```
> `CoreIdeaRow` は `core_ideas` の select 型（id/title/summary/category/source_material_ids/topic/primary_hook/fmat/audience/meta）。`guardsPass`/`dequeueIdeaRow`/`persistDraft`/`pushApproval` は同ファイル内 helper（テストで mock）。**承認 push の postback data は DB UUID `dbDraftId`**（writer draftId ではない）。
- [ ] **Step 3: テスト緑** — Run: `npx jest src/jobs/post-job.test.ts`。Expected: PASS。
- [ ] **Step 4: queue dispatch 接続** — `src/queue.ts` の `handleJob` で `post-morning/post-noon/post-evening` → `runPostJob(slot, env)`。
- [ ] **Step 5: typecheck + bundle-check** — Expected: PASS。
- [ ] **Step 6: Commit** — `git commit -m "feat(x-account/worker): 投稿系 job 配線 (idea→draft→editor→LINE承認)"`

---

## Phase W4 — LINE webhook（署名 + 承認 + interviewer）

### Task W4-1: webhook 署名検証 + enqueue

**Files:**
- Modify: `src/worker.ts`（`/line/webhook` の stub を署名検証+enqueue に）
- Create: `src/webhook.test.ts`

- [ ] **Step 1: 失敗テスト** — 正しい署名→enqueue+200、不正署名→401。`verifyLineSignature` 利用。
- [ ] **Step 2: 実装** — `/line/webhook`: body 取得 → `verifyLineSignature(body, req.headers.get("x-line-signature"), env.LINE_CHANNEL_SECRET)` → false で 401 → true で各 event を `env.JOBS.send({ job: "line-event", date: jstDate(new Date()), payload })`（**`date` 必須**、JobMessage union 整合）→ 200 即返し。
- [ ] **Step 3: テスト緑 + Commit** — `git commit -m "feat(x-account/worker): LINE webhook 署名検証(WebCrypto)+enqueue"`

### Task W4-2: 承認 postback → publish

**Files:**
- Create: `src/jobs/line-event.ts`
- Create: `src/jobs/line-event.test.ts`

- [ ] **Step 1: 失敗テスト** — postback `approve:<dbDraftId>` → `post_drafts` load（`editor_output` jsonb 含む）→ `publishToX`(highRiskApproved=true) → `posted_records` insert + `human_approval_status='approved'` + `published_at` + `core_ideas.status='published'` + 完了 push。`publishToX.__setFetchImpl` で X 投稿スタブ。`reject:<dbDraftId>` → `human_approval_status='rejected'`。既 published（published_at not null）は冪等 no-op。
- [ ] **Step 2: 実装** — PublishRequest の `editorOutput` は **post_drafts.editor_output jsonb から復元**（再 runEditor は非決定なので不可）。`PublishRequest = { draftId: dbDraftId, body, fmat, editorOutput: 復元, dryRun:false, highRiskApproved:true }`。publish 成功時: `posted_records` insert（platform_post_id=tweetId, utm_source=x_post を note 送客 URL に付与済の body）+ `post_drafts.human_approval_status='approved'`/`published_at=now()` + `core_ideas.status='published'`。失敗時: 状態据置 + 理由 push。**`post_drafts` に `status='published'` 列は無い**（公開は posted_records の存在 + published_at で表現）。
- [ ] **Step 3: テスト緑 + Commit** — `git commit -m "feat(x-account/worker): 承認 postback→publishToX (utm付与/冪等)"`

### Task W4-3: interviewer の DB-backed session

**Files:**
- Modify: `lib/interviewer/line-flow.ts`（`sessionStore` Map を `interview_sessions` 永続化に）
- Modify: `src/jobs/line-event.ts`（text message → interviewer flow）
- Create: テスト

- [ ] **Step 1: 失敗テスト** — text 入力で session が `interview_sessions` に load/save され、複数ターン跨ぎで進行することを mock client で検証。
- [ ] **Step 2: 実装** — **既存 `createSession`/`getSession` は同期関数なので DB 化できない** → 新規 async API `loadSession(id)`/`saveSession(session)` を `line-flow.ts` に追加（`interview_sessions` upsert/select、fallback は既存 `sessionStore` Map 維持）。`recordAnswer` は同期のまま session オブジェクトを変異させ、呼び出し側（line-event.ts）が `saveSession` で永続化。既存 `line-flow.test.ts` は sync API のまま緑（変更しない）。`src/jobs/line-event.ts`: text→`loadSession`(無ければ`createSession`)→`recordAnswer`/`nextQuestion`→`saveSession`→`pushLine`。
- [ ] **Step 3: テスト緑 + Commit** — `git commit -m "feat(x-account/worker): interviewer を DB-backed session 化 (Workers ステートレス対策)"`

### Task W4-4: 統合 smoke + deploy

- [ ] **Step 1: 全テスト（2 系統）** — (a) 既存+fallback: `IN_MEMORY_FALLBACK=true npm test`（既存148緑維持）。(b) **backend/live-mock テスト（IN_MEMORY_FALLBACK を立てない）**: `npx jest lib/editor/llm-judge.live.test.ts lib/optimizer/supabase-store.test.ts src/`。Expected: 両系統 PASS。
  - 注: backend テストは `IN_MEMORY_FALLBACK=true` だと stub に逃げる（`llm-judge.ts:117`）かつ top-level const が env を固定する（`state-store.ts:19` 等）ため、**flag なし + `jest.resetModules()` + import を test 内で行う**。`package.json` に `"test:worker-live": "jest lib/editor/llm-judge.live.test.ts lib/optimizer/supabase-store.test.ts src/"`（flag なし）を追加。
- [ ] **Step 2: bundle-check + typecheck** — Run: `npm run worker:bundle-check && npm run worker:typecheck`。Expected: PASS（node:* 残留なし）。
- [ ] **Step 3: deploy（人間確認）** — `wrangler deploy`（API token headless）。secret に未投入分（`SUPABASE_SCHEMA` は vars 化済）を確認。
- [ ] **Step 4: 実機 smoke** — `wrangler tail` で cron 発火が stub でなく実処理ログを出すか / `/line/webhook` に LINE からメッセージ→enqueue→処理 / テスト承認 postback→`__setFetchImpl` 経路で publish ガード確認。X 実投稿は soft launch 当日 1 本。
- [ ] **Step 5: Commit/PR** — W1-W4 を PR 化。

---

## Self-Review（計画作成者が実施済）

- **Spec coverage**: 設計 v2 の S1-S5（W1）/ backend B 5項目（W2）/ Queues+投稿（W3）/ webhook 3分岐（W4）を各タスクで対応。brownout 4段階・rollback-monitor・github-trending・ingest 系は **W5（本計画外、別計画）**。
- **型整合**: `CoreIdea`/`DraftOutput`/`EditorInput`/`EditorOutput`/`PublishRequest`/`LlmJudgeResult`/`OptimizerState`/`InterviewSession` は抽出した実型に準拠。draftForX→EditorInput の合成（coreIdeaId/platform/fmat/sourceMaterialIds/hasAffiliateLink 供給）を W3-2 で明示。
- **既存 DDL 整合**: `post_drafts` は `editor_status`/`human_approval_status`（status ではない）。0007 で `scheduled_date`/`slot` 追加。`safety_state`/`optimizer_state`/`interview_sessions` 新規。`daily_digest_log`/`optimizer_proposal`/`cost_ledger` は既存（書込追加）。
- **要実機検証（計画で確定不可、Step に明記済）**: top-level process.env populate / Queue bindings 実動 / Anthropic tool_use 応答形 / bundle node:* 残留 / X quota。

### Codex レビュー反映（2026-06-03）

Codex が実コード突合で発見した致命的/要修正を全反映:
- DB UUID 採番（`draftForX` の draftId は非UUID → `dbDraftId=crypto.randomUUID()`、postback/FK は DB UUID）
- `core_ideas`→`CoreIdea` 変換 `toCoreIdea()` + 0007 で writer 入力列追加
- 承認時 `EditorOutput` を `post_drafts.editor_output jsonb` から復元（再 runEditor 回避）
- `post_drafts` に `status published` 無し → 公開は `posted_records` + `published_at` + `core_ideas.status='published'` で表現
- **runEditor R5 が select する `post_drafts.embedding` 不在 → 0007 で列追加**（本番 throw 解消）
- `optimizer_state` singleton（`scope='global'` PK）/ reward の hook key 変換 `toHookKey()`
- interviewer は sync API を壊さず async `loadSession/saveSession` を別途追加
- `verifyLineSignature` は `string|null` + 定数時間比較
- Queue `JobMessage` を discriminated union 化 / `FALLBACK` 定数は残す
- backend テストは `IN_MEMORY_FALLBACK` を立てず `test:worker-live` で実行（stub 逃げ防止）
- 0007 に `create extension uuid-ossp`
