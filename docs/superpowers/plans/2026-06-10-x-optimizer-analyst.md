# X LLM-optimizer（x-optimizer-analyst MA）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 永続 MA `x-optimizer-analyst`（opus）が observability を読み、ランク付き改善提案を `xad.optimizer_proposal` に書き、LINE 通知する propose-only ループを作る。

**Architecture:** 新規 `lib/optimizer-analyst/`（snapshot 集約 / read-only クエリ＋submit_proposal ツール handler / system prompt / runMaSession オーケストレーション）＋ MA レジストリ登録（bootstrap-core）＋ cron/queue 配線。実行は人間ゲート（提案のみ）。

**Tech Stack:** TypeScript / Cloudflare Workers / Supabase(xad) / Anthropic Managed Agents (`runMaSession`) / jest（`IN_MEMORY_FALLBACK`）。

spec: `docs/superpowers/specs/2026-06-10-x-optimizer-analyst-design.md`
作業: `apps/x-account-system`。テスト: `IN_MEMORY_FALLBACK=true npx jest <path>`。

**実装前に読むべき既存パターン**（コピー元）:
- `lib/curation/run-compose.ts` — `runMaSession` を agentRef＋customToolHandler＋onEvent で呼ぶ persistent 経路の実例。
- `lib/optimizer/reward-extractor.ts`（冒頭）— `IN_MEMORY_FALLBACK`＋`SUPABASE_SCHEMA` の Supabase client 生成。
- `lib/check/check-prompts.ts` — custom tool schema（submit_check）の形。
- `lib/ma/bootstrap-core.ts` — `AGENT_MANIFESTS` / `SYSTEM_BUILDERS` / `MA_TOOL_REGISTRY`。
- `migrations/0004_*.sql` — `optimizer_proposal` の列（proposal_type/scope/hypothesis/evidence/rank/...）。

---

## File Structure

- `lib/optimizer-analyst/types.ts` — 共有型（Snapshot, ProposalInput, ツール I/O）。
- `lib/optimizer-analyst/snapshot.ts` — `buildSnapshot(deps)` 観測集約 → 構造化オブジェクト＋`renderSnapshotText()`。
- `lib/optimizer-analyst/tools.ts` — `OPTIMIZER_ANALYST_TOOL_REGISTRY`（schema）＋`makeToolHandler(deps)`（dispatch）＋各 handler。
- `lib/optimizer-analyst/prompts.ts` — `buildOptimizerAnalystSystemPrompt()`。
- `lib/optimizer-analyst/run-analyst.ts` — `runOptimizerAnalyst(deps?)` オーケストレーション。
- 改修: `lib/ma/bootstrap-core.ts` / `src/worker.ts` / `src/queue.ts` / `wrangler.toml` / `lib/safety/brownout-handler.ts`。

---

## Task 1: 型定義 `types.ts`

**Files:** Create `lib/optimizer-analyst/types.ts`（テスト不要・純型）

- [ ] **Step 1: 型を書く**

```typescript
// lib/optimizer-analyst/types.ts
export type ProposalType =
  | "anomaly_alert" | "operational_friction" | "measurement_request"
  | "config_change" | "structural_change";

/** submit_proposal が optimizer_proposal に書く 1 提案。 */
export interface ProposalInput {
  proposal_type: ProposalType;
  scope: string;            // 例 "writer_prompt" | "editor_threshold" | "collector_query" | "lever_bandit"
  hypothesis: string;       // 主張（何をどう変えると何が良くなるか）
  evidence: Record<string, unknown>; // 数値根拠（jsonb）
  rank: "A" | "B" | "C";
}

/** seed スナップショット（集約結果）。 */
export interface Snapshot {
  windowDays: number;
  leverPerformance: {
    timeBand: Record<string, { n: number; avgPcr: number; avgUrlClicks: number }>;
    hook: Record<string, { n: number; avgPcr: number; avgUrlClicks: number }>;
    xFormat: Record<string, { n: number; avgPcr: number; avgUrlClicks: number }>;
  };
  approvalReasons: Array<{ status: string; reason: string; riskLevel: string | null }>;
  funnel: { materials: number; coreIdeas: number; drafts: number; approved: number; published: number; measured: number };
  cost: Record<string, number>; // category -> jpy（当月）
  recentProposals: Array<{ proposal_type: string; scope: string; rank: string; accepted: boolean | null; implemented: boolean | null }>;
  postsMeasured: number;
}
```

- [ ] **Step 2: コミット**
```bash
git add lib/optimizer-analyst/types.ts
git commit -m "feat(xad/analyst): 型定義(types.ts)"
```

---

## Task 2: スナップショット集約 `snapshot.ts`（TDD）

集約の純ロジックを DI で分離してテストする。Supabase 取得は注入。

**Files:** Create `lib/optimizer-analyst/snapshot.ts`, Test `lib/optimizer-analyst/snapshot.test.ts`

- [ ] **Step 1: 失敗するテスト**

```typescript
// lib/optimizer-analyst/snapshot.test.ts
import { aggregateLeverPerformance, renderSnapshotText } from "./snapshot.ts";
import type { Snapshot } from "./types.ts";

describe("aggregateLeverPerformance", () => {
  test("groups rows by band/hook/fmat with avg pcr & url_clicks", () => {
    const rows = [
      { timeBand: "morning", hook: "number_lead", xFormat: "short", pcr: 0.04, urlLinkClicks: 4 },
      { timeBand: "morning", hook: "number_lead", xFormat: "short", pcr: 0.06, urlLinkClicks: 6 },
      { timeBand: "noon", hook: "other", xFormat: "medium", pcr: 0.02, urlLinkClicks: 0 },
    ];
    const out = aggregateLeverPerformance(rows);
    expect(out.timeBand.morning).toEqual({ n: 2, avgPcr: 0.05, avgUrlClicks: 5 });
    expect(out.timeBand.noon).toEqual({ n: 1, avgPcr: 0.02, avgUrlClicks: 0 });
    expect(out.hook.number_lead.n).toBe(2);
    expect(out.xFormat.short.avgUrlClicks).toBe(5);
  });
  test("empty → empty groups", () => {
    expect(aggregateLeverPerformance([])).toEqual({ timeBand: {}, hook: {}, xFormat: {} });
  });
});

describe("renderSnapshotText", () => {
  test("renders a non-empty human-readable digest mentioning windowDays and funnel", () => {
    const snap: Snapshot = {
      windowDays: 30,
      leverPerformance: { timeBand: { morning: { n: 2, avgPcr: 0.05, avgUrlClicks: 5 } }, hook: {}, xFormat: {} },
      approvalReasons: [{ status: "rejected", reason: "煽りすぎ", riskLevel: "high" }],
      funnel: { materials: 50, coreIdeas: 20, drafts: 18, approved: 12, published: 12, measured: 12 },
      cost: { writer: 300 },
      recentProposals: [],
      postsMeasured: 12,
    };
    const text = renderSnapshotText(snap);
    expect(text).toContain("30");
    expect(text).toContain("morning");
    expect(text).toContain("煽りすぎ");
    expect(text).toContain("published");
  });
});
```

- [ ] **Step 2: 失敗確認** `IN_MEMORY_FALLBACK=true npx jest lib/optimizer-analyst/snapshot.test.ts` → FAIL

- [ ] **Step 3: 実装**（`aggregateLeverPerformance` 純関数＋`renderSnapshotText`＋`buildSnapshot` を DI で）

```typescript
// lib/optimizer-analyst/snapshot.ts
import type { Snapshot } from "./types.ts";

export type PerfRow = { timeBand: string; hook: string; xFormat: string; pcr: number; urlLinkClicks: number };
type Group = Record<string, { n: number; avgPcr: number; avgUrlClicks: number }>;

function groupBy(rows: PerfRow[], key: keyof PerfRow): Group {
  const acc: Record<string, { n: number; pcr: number; url: number }> = {};
  for (const r of rows) {
    const k = String(r[key]);
    acc[k] ??= { n: 0, pcr: 0, url: 0 };
    acc[k].n += 1; acc[k].pcr += r.pcr; acc[k].url += r.urlLinkClicks;
  }
  const out: Group = {};
  for (const [k, v] of Object.entries(acc)) {
    out[k] = { n: v.n, avgPcr: v.pcr / v.n, avgUrlClicks: v.url / v.n };
  }
  return out;
}

export function aggregateLeverPerformance(rows: PerfRow[]): Snapshot["leverPerformance"] {
  return { timeBand: groupBy(rows, "timeBand"), hook: groupBy(rows, "hook"), xFormat: groupBy(rows, "xFormat") };
}

export function renderSnapshotText(s: Snapshot): string {
  const lines: string[] = [];
  lines.push(`# 観測スナップショット（直近 ${s.windowDays} 日 / 計測投稿 ${s.postsMeasured} 件）`);
  lines.push(`\n## レバー別 performance（avg PCR / avg url_clicks / n）`);
  for (const [axis, g] of Object.entries(s.leverPerformance)) {
    lines.push(`### ${axis}`);
    for (const [k, v] of Object.entries(g)) lines.push(`- ${k}: pcr=${v.avgPcr.toFixed(4)} url=${v.avgUrlClicks.toFixed(1)} n=${v.n}`);
  }
  lines.push(`\n## 承認/却下理由`);
  for (const a of s.approvalReasons) lines.push(`- [${a.status}] risk=${a.riskLevel ?? "-"}: ${a.reason}`);
  lines.push(`\n## funnel: materials=${s.funnel.materials} coreIdeas=${s.funnel.coreIdeas} drafts=${s.funnel.drafts} approved=${s.funnel.approved} published=${s.funnel.published} measured=${s.funnel.measured}`);
  lines.push(`\n## cost(当月JPY): ${Object.entries(s.cost).map(([k, v]) => `${k}=${v}`).join(" / ") || "なし"}`);
  lines.push(`\n## 過去提案: ${s.recentProposals.length} 件（${s.recentProposals.map((p) => `${p.scope}/${p.rank}${p.implemented ? "✓" : ""}`).join(", ") || "なし"}）`);
  return lines.join("\n");
}

/** buildSnapshot は IO を deps で注入（テストは aggregate/render を直接検証）。 */
export interface SnapshotDeps {
  loadPerfRows: () => Promise<PerfRow[]>;
  loadApprovalReasons: () => Promise<Snapshot["approvalReasons"]>;
  loadFunnel: () => Promise<Snapshot["funnel"]>;
  loadCost: () => Promise<Snapshot["cost"]>;
  loadRecentProposals: () => Promise<Snapshot["recentProposals"]>;
  windowDays?: number;
}

export async function buildSnapshot(deps: SnapshotDeps): Promise<Snapshot> {
  const windowDays = deps.windowDays ?? 30;
  const [rows, approvalReasons, funnel, cost, recentProposals] = await Promise.all([
    deps.loadPerfRows(), deps.loadApprovalReasons(), deps.loadFunnel(), deps.loadCost(), deps.loadRecentProposals(),
  ]);
  return {
    windowDays,
    leverPerformance: aggregateLeverPerformance(rows),
    approvalReasons, funnel, cost, recentProposals,
    postsMeasured: rows.length,
  };
}
```

- [ ] **Step 4: 緑確認** → PASS
- [ ] **Step 5: コミット** `git add lib/optimizer-analyst/snapshot.ts lib/optimizer-analyst/snapshot.test.ts && git commit -m "feat(xad/analyst): 観測スナップショット集約(snapshot.ts)"`

---

## Task 3: ツール schema＋handler `tools.ts`（TDD）

MA が呼ぶ read-only クエリツール＋`submit_proposal`。schema は bootstrap 用に export、handler は `customToolHandler` 用に dispatch。各 handler の Supabase 取得は deps で注入しテスト可能に。

**Files:** Create `lib/optimizer-analyst/tools.ts`, Test `lib/optimizer-analyst/tools.test.ts`

- [ ] **Step 1: 失敗するテスト**（dispatch と submit_proposal の整形を検証）

```typescript
// lib/optimizer-analyst/tools.test.ts
import { OPTIMIZER_ANALYST_TOOL_REGISTRY, makeToolHandler, type ToolDeps } from "./tools.ts";
import type { ProposalInput } from "./types.ts";

test("registry exposes submit_proposal + read tools as custom schemas", () => {
  const reg = OPTIMIZER_ANALYST_TOOL_REGISTRY as Record<string, any>;
  // tool キーは配列展開され bootstrap で resolve される。submit_proposal は単体。
  expect(reg.submit_proposal.name).toBe("submit_proposal");
  expect(Array.isArray(reg.optimizer_analyst_tools)).toBe(true);
  const names = (reg.optimizer_analyst_tools as any[]).map((t) => t.name);
  expect(names).toEqual(expect.arrayContaining([
    "get_lever_performance", "get_approval_reasons", "get_post_detail",
    "get_funnel_stats", "get_optimizer_state", "get_recent_proposals",
  ]));
});

describe("makeToolHandler", () => {
  function deps(over: Partial<ToolDeps> = {}): { d: ToolDeps; saved: ProposalInput[] } {
    const saved: ProposalInput[] = [];
    const d: ToolDeps = {
      getLeverPerformance: async () => ({ ok: true }),
      getApprovalReasons: async () => [],
      getPostDetail: async () => ({ id: "d1" }),
      getFunnelStats: async () => ({}),
      getOptimizerState: async () => ({}),
      getRecentProposals: async () => [],
      saveProposal: async (p) => { saved.push(p); },
      ...over,
    };
    return { d, saved };
  }

  test("submit_proposal saves and returns ok", async () => {
    const { d, saved } = deps();
    const h = makeToolHandler(d);
    const input: ProposalInput = { proposal_type: "structural_change", scope: "writer_prompt", hypothesis: "X", evidence: { a: 1 }, rank: "A" };
    const out = await h("submit_proposal", input);
    expect(saved).toHaveLength(1);
    expect(saved[0].scope).toBe("writer_prompt");
    expect(out).toContain("ok");
  });

  test("unknown tool → error string (not throw)", async () => {
    const { d } = deps();
    const out = await makeToolHandler(d)("nope", {});
    expect(out).toContain("unknown tool");
  });

  test("read tool returns JSON string of query result", async () => {
    const { d } = deps({ getFunnelStats: async () => ({ published: 12 }) });
    const out = await makeToolHandler(d)("get_funnel_stats", {});
    expect(JSON.parse(out)).toEqual({ published: 12 });
  });

  test("invalid submit_proposal payload → error string", async () => {
    const { d, saved } = deps();
    const out = await makeToolHandler(d)("submit_proposal", { scope: "x" }); // missing required
    expect(saved).toHaveLength(0);
    expect(out).toContain("invalid");
  });
});
```

- [ ] **Step 2: 失敗確認** → FAIL

- [ ] **Step 3: 実装**

```typescript
// lib/optimizer-analyst/tools.ts
import type { ProposalInput, ProposalType } from "./types.ts";

const RANKS = ["A", "B", "C"] as const;
const PROPOSAL_TYPES: ProposalType[] = [
  "anomaly_alert", "operational_friction", "measurement_request", "config_change", "structural_change",
];

/** read tool の host 実行。各クエリは deps で注入（テスト容易・本番は Supabase）。 */
export interface ToolDeps {
  getLeverPerformance: (input: unknown) => Promise<unknown>;
  getApprovalReasons: (input: unknown) => Promise<unknown>;
  getPostDetail: (input: unknown) => Promise<unknown>;
  getFunnelStats: (input: unknown) => Promise<unknown>;
  getOptimizerState: (input: unknown) => Promise<unknown>;
  getRecentProposals: (input: unknown) => Promise<unknown>;
  saveProposal: (p: ProposalInput) => Promise<void>;
}

const customTool = (name: string, description: string, properties: Record<string, unknown>, required: string[]) => ({
  type: "custom" as const, name, description,
  input_schema: { type: "object", properties, required },
});

/** bootstrap 用 schema レジストリ。配列キーは複数 tool に展開（collector_tools と同形）。 */
export const OPTIMIZER_ANALYST_TOOL_REGISTRY = {
  optimizer_analyst_tools: [
    customTool("get_lever_performance", "握る3レバー(time/hook/format)の値別 performance と posterior を取得", { window_days: { type: "number" } }, []),
    customTool("get_approval_reasons", "直近の承認/却下理由と draft の結末を取得", { status: { type: "string", enum: ["approved", "rejected", "all"] } }, []),
    customTool("get_post_detail", "特定 draft の本文/editor判定/writer・checkerの思考/performance を取得", { draft_id: { type: "string" } }, ["draft_id"]),
    customTool("get_funnel_stats", "素材→承認→公開→performance の変換をソース別に取得", {}, []),
    customTool("get_optimizer_state", "現 posterior と直近変化/異常を取得", {}, []),
    customTool("get_recent_proposals", "過去提案と採否/効果を取得", {}, []),
  ],
  submit_proposal: customTool(
    "submit_proposal",
    "改善提案を 1 件記録する。複数回呼んでよい。proposal_type/scope/hypothesis/evidence/rank を渡す。実行はしない（人間が後で適用）。",
    {
      proposal_type: { type: "string", enum: PROPOSAL_TYPES },
      scope: { type: "string", description: "対象（例 writer_prompt / editor_threshold / collector_query / lever_bandit）" },
      hypothesis: { type: "string" },
      evidence: { type: "object", description: "数値根拠(jsonb)" },
      rank: { type: "string", enum: ["A", "B", "C"] },
    },
    ["proposal_type", "scope", "hypothesis", "rank"],
  ),
};

function validateProposal(input: unknown): ProposalInput | null {
  const o = (input ?? {}) as Record<string, unknown>;
  if (!PROPOSAL_TYPES.includes(o.proposal_type as ProposalType)) return null;
  if (typeof o.scope !== "string" || !o.scope) return null;
  if (typeof o.hypothesis !== "string" || !o.hypothesis) return null;
  if (!RANKS.includes(o.rank as (typeof RANKS)[number])) return null;
  return {
    proposal_type: o.proposal_type as ProposalType,
    scope: o.scope, hypothesis: o.hypothesis,
    evidence: (o.evidence && typeof o.evidence === "object") ? (o.evidence as Record<string, unknown>) : {},
    rank: o.rank as "A" | "B" | "C",
  };
}

/** custom tool 名 → host 実行。runMaSession の customToolHandler に渡す。結果は文字列。 */
export function makeToolHandler(deps: ToolDeps) {
  return async (name: string, input: unknown): Promise<string> => {
    try {
      switch (name) {
        case "get_lever_performance": return JSON.stringify(await deps.getLeverPerformance(input));
        case "get_approval_reasons": return JSON.stringify(await deps.getApprovalReasons(input));
        case "get_post_detail": return JSON.stringify(await deps.getPostDetail(input));
        case "get_funnel_stats": return JSON.stringify(await deps.getFunnelStats(input));
        case "get_optimizer_state": return JSON.stringify(await deps.getOptimizerState(input));
        case "get_recent_proposals": return JSON.stringify(await deps.getRecentProposals(input));
        case "submit_proposal": {
          const p = validateProposal(input);
          if (!p) return "invalid proposal: proposal_type/scope/hypothesis/rank are required";
          await deps.saveProposal(p);
          return "ok: proposal recorded";
        }
        default: return `unknown tool: ${name}`;
      }
    } catch (e) {
      return `tool error (${name}): ${String(e)}`;
    }
  };
}
```

- [ ] **Step 4: 緑確認** → PASS
- [ ] **Step 5: コミット** `git add lib/optimizer-analyst/tools.ts lib/optimizer-analyst/tools.test.ts && git commit -m "feat(xad/analyst): MAツール schema+dispatch(tools.ts)"`

---

## Task 4: system prompt `prompts.ts`（TDD・軽量）

**Files:** Create `lib/optimizer-analyst/prompts.ts`, Test `lib/optimizer-analyst/prompts.test.ts`

- [ ] **Step 1: 失敗するテスト**（不可侵と propose-only が prompt に必ず含まれることを保証＝安全回帰防止）

```typescript
// lib/optimizer-analyst/prompts.test.ts
import { buildOptimizerAnalystSystemPrompt } from "./prompts.ts";

test("system prompt enforces propose-only and 🔒 invariants", () => {
  const p = buildOptimizerAnalystSystemPrompt();
  expect(p).toContain("submit_proposal");
  expect(p.toLowerCase()).toContain("propose");
  // 死守/安全は変更提案の対象外であることを明記
  expect(p).toContain("first_hand");
  expect(p).toContain("FORBIDDEN_PHRASES");
  expect(p).toContain("SAFETY_GUARDRAILS");
});
```

- [ ] **Step 2: 失敗確認** → FAIL

- [ ] **Step 3: 実装**

```typescript
// lib/optimizer-analyst/prompts.ts
/** x-optimizer-analyst の system 本文（bootstrap-core SYSTEM_BUILDERS から呼ばれる）。 */
export function buildOptimizerAnalystSystemPrompt(): string {
  return [
    "あなたは X 発信フロー全体の改善アナリストです。観測データを読み、評価・分析・仮説・リサーチを行い、",
    "根拠付き・ランク付きの改善提案を出します。**あなたは提案するだけで、実行は一切しません**（人間が後で適用します）。",
    "",
    "## 進め方",
    "1. 与えられた観測スナップショットを読む。",
    "2. 必要に応じて read ツール（get_lever_performance / get_approval_reasons / get_post_detail / get_funnel_stats / get_optimizer_state / get_recent_proposals）で深掘りする。",
    "3. 外部知見が要れば web_search で軽くリサーチする。",
    "4. 確度の高い改善案を **submit_proposal で1件ずつ**記録する（最大5件・重複や既出提案は避ける）。",
    "",
    "## 提案の質",
    "- 各提案に proposal_type / scope / hypothesis（何をどう変えると何が良くなるか）/ evidence（数値根拠）/ rank(A=高確度 B C) を必ず付ける。",
    "- データが薄い領域は無理に config を変えず proposal_type=measurement_request（観測の追加要望）に留める。",
    "- scope 例: writer_prompt / checker_prompt / collector_prompt / compose_template / editor_threshold / collector_query / lever_bandit。",
    "",
    "## 🔒 不可侵（変更を提案してはいけない）",
    "- 安全・法務: FORBIDDEN_PHRASES、SAFETY_GUARDRAILS（個人情報・業法・攻撃的表現・disclosure）。",
    "- 死守パラメータ: first_hand ≥ 30% / industry_sop ≥ 月5 / AI生成画像 ≤ 10% / hashtag = 0 / verified failure_story 月 ≤ 4。",
    "これらは前提として尊重し、その範囲内で改善を考える。",
    "",
    "## 提案できる範囲",
    "プロンプト/テンプレの patch（writer/checker/collector/テンプレ）、自由閾値（hook strength・重複cosine 等）、",
    "据え置きレバー（visualizer/publishing_lag/citation/content_axis）の bandit 化是非、収集クエリ（watchlist 追加削除・検索語・scoringWeights）、新規観測の要望。",
  ].join("\n");
}
```

- [ ] **Step 4: 緑確認** → PASS
- [ ] **Step 5: コミット** `git add lib/optimizer-analyst/prompts.ts lib/optimizer-analyst/prompts.test.ts && git commit -m "feat(xad/analyst): system prompt(propose-only+🔒)"`

---

## Task 5: オーケストレーション `run-analyst.ts`（TDD・DI）

`runMaSession` を DI で受け、snapshot→session→提案集計→通知。`lib/curation/run-compose.ts` の persistent 呼び出し（agentRef/customToolHandler/onEvent）を参照。

**Files:** Create `lib/optimizer-analyst/run-analyst.ts`, Test `lib/optimizer-analyst/run-analyst.test.ts`

- [ ] **Step 1: 失敗するテスト**

```typescript
// lib/optimizer-analyst/run-analyst.test.ts
import { runOptimizerAnalyst, type AnalystDeps } from "./run-analyst.ts";

test("builds snapshot, runs session with tool handler, returns proposal count", async () => {
  let userMessage = "";
  let handlerName = "";
  const deps: AnalystDeps = {
    buildSnapshotText: async () => "SNAPSHOT_TEXT",
    getAgentRef: async () => ({ id: "agent_x", version: "1", environmentId: "env_x" }),
    runSession: async (args) => {
      userMessage = args.userMessage;
      // simulate the agent calling submit_proposal once via the handler
      await args.customToolHandler("submit_proposal", { proposal_type: "structural_change", scope: "writer_prompt", hypothesis: "h", evidence: {}, rank: "A" });
      handlerName = "called";
      return { ok: true, proposalsSaved: 1 } as any;
    },
    countProposalsSince: async () => 1,
    notify: async () => {},
    recordCost: async () => {},
  };
  const r = await runOptimizerAnalyst(deps);
  expect(userMessage).toContain("SNAPSHOT_TEXT");
  expect(handlerName).toBe("called");
  expect(r.proposals).toBe(1);
});

test("no agent ref → returns ok:false, fail-open", async () => {
  const deps = {
    buildSnapshotText: async () => "S",
    getAgentRef: async () => null,
    runSession: async () => ({ ok: false } as any),
    countProposalsSince: async () => 0,
    notify: async () => {},
    recordCost: async () => {},
  } as any;
  const r = await runOptimizerAnalyst(deps);
  expect(r.ok).toBe(false);
});
```

- [ ] **Step 2: 失敗確認** → FAIL

- [ ] **Step 3: 実装**（既定 deps は本番配線。テストは明示 deps）

```typescript
// lib/optimizer-analyst/run-analyst.ts
import { makeToolHandler, type ToolDeps } from "./tools.ts";

export interface AnalystDeps {
  buildSnapshotText: () => Promise<string>;
  getAgentRef: () => Promise<{ id: string; version?: string; environmentId?: string } | null>;
  /** runMaSession を薄くラップ。customToolHandler を内部で tools に dispatch。 */
  runSession: (args: { userMessage: string; agentRef: { id: string; version?: string }; environmentId?: string; customToolHandler: (n: string, i: unknown) => Promise<string>; }) => Promise<{ ok: boolean }>;
  toolDeps?: ToolDeps;            // 本番は Supabase 配線、テストは省略可
  countProposalsSince: (sinceMs: number) => Promise<number>;
  notify: (summary: string) => Promise<void>;
  recordCost: () => Promise<void>;
  now?: () => number;
}

export interface AnalystResult { ok: boolean; proposals: number }

export async function runOptimizerAnalyst(deps: AnalystDeps): Promise<AnalystResult> {
  const now = deps.now ?? Date.now;
  const startedMs = now();
  const ref = await deps.getAgentRef();
  if (!ref) return { ok: false, proposals: 0 };

  const snapshotText = await deps.buildSnapshotText();
  const userMessage = `${snapshotText}\n\n---\n上記の観測を分析し、改善提案を submit_proposal で記録してください（最大5件）。`;

  // tool handler: 本番は toolDeps 経由、テストでは runSession に渡された handler を直接叩く想定。
  const handler = deps.toolDeps ? makeToolHandler(deps.toolDeps) : async () => "ok";

  const res = await deps.runSession({
    userMessage,
    agentRef: { id: ref.id, version: ref.version },
    environmentId: ref.environmentId,
    customToolHandler: handler,
  });
  await deps.recordCost();

  const proposals = await deps.countProposalsSince(startedMs);
  await deps.notify(`optimizer-analyst: ${proposals} 件の提案を記録（session ok=${res.ok}）`);
  return { ok: res.ok, proposals };
}
```

- [ ] **Step 4: 緑確認** → PASS
- [ ] **Step 5: コミット** `git add lib/optimizer-analyst/run-analyst.ts lib/optimizer-analyst/run-analyst.test.ts && git commit -m "feat(xad/analyst): オーケストレーション(run-analyst.ts・DI)"`

---

## Task 6: 本番依存配線 ＋ MA 登録 ＋ job 配線

**Files:** Modify `lib/optimizer-analyst/run-analyst.ts`（defaultAnalystDeps 追加）, `lib/optimizer-analyst/tools.ts`（defaultToolDeps 追加・Supabase）, `lib/ma/bootstrap-core.ts`, `src/worker.ts`, `src/queue.ts`, `wrangler.toml`, `lib/safety/brownout-handler.ts`

- [ ] **Step 1: bootstrap-core 登録**
  - `import { buildOptimizerAnalystSystemPrompt } from "../optimizer-analyst/prompts.js";` と `import { OPTIMIZER_ANALYST_TOOL_REGISTRY } from "../optimizer-analyst/tools.js";`
  - `SYSTEM_BUILDERS` に `buildOptimizerAnalystSystemPrompt` 追加。
  - `MA_TOOL_REGISTRY` に `...OPTIMIZER_ANALYST_TOOL_REGISTRY` 追加。
  - `AGENT_MANIFESTS` に追加: `{ key: "x-optimizer-analyst", name: "x-optimizer-analyst", model: "claude-opus-4-8", system_builder: "buildOptimizerAnalystSystemPrompt", tools: ["optimizer_analyst_tools", "web_toolset", "submit_proposal"] }`
  - 確認テスト（bootstrap-core の既存テストがあれば、resolveTools が新 agent の tools を解決できること。無ければ `IN_MEMORY_FALLBACK=true npx jest lib/ma` で回帰なし）。

- [ ] **Step 2: defaultToolDeps（Supabase read）を tools.ts に追加**
  reward-extractor.ts 冒頭の client 生成パターンを流用。各 get_* は対応するクエリ（lever performance は reward-extractor の signal 集計を再利用 or 直 SELECT、approval は post_drafts.approval_reason、funnel は materials/core_ideas/post_drafts/posted_records/performance_metrics の count、optimizer_state は xad.optimizer_state、recent_proposals は optimizer_proposal）。saveProposal は `insert into optimizer_proposal { proposal_type, scope, hypothesis, evidence, rank }`。**各 SELECT は失敗時 `{}`/`[]` を返し fail-open。** これは prod 配線（単体テストは Task 3 の DI で担保済）。

- [ ] **Step 3: defaultAnalystDeps を run-analyst.ts に追加**
  - `buildSnapshotText`: `buildSnapshot(defaultSnapshotDeps)` → `renderSnapshotText`。
  - `getAgentRef`: 既存 `agent-registry`（run-compose が使う getAgentRef）で `x-optimizer-analyst` を引く。
  - `runSession`: `runMaSession({ agentRef, environmentId, userMessage, customToolHandler, onEvent, onTrace })` を呼ぶ薄ラッパ（run-compose.ts 参照）。
  - `notify`: 既存 LINE push / digest 経路を再利用（`lib/dashboard/digest` か line push util）。
  - `recordCost`: onTrace の usage から cost-ledger に category "optimizer_analyst" で記録。
  - `runOptimizerAnalyst()`（引数なし）が defaultAnalystDeps を使うよう既定化。

- [ ] **Step 4: worker.ts**
  - JobMessage union に `"optimizer-analyst"` 追加。
  - `CRON_JOBS` に `"0 16 1 * *": "optimizer-analyst"`（毎月1日 01:00 JST = UTC 16:00 前日扱いに注意→ 実際は毎月1日 16:00 UTC = 翌 01:00 JST。月次で十分）。
  - `CRON_JOBS_BY_NAME` に `"optimizer-analyst": true`。

- [ ] **Step 5: queue.ts**（daily-digest case の後）
```typescript
    case "optimizer-analyst": {
      const { runOptimizerAnalyst } = await import("../lib/optimizer-analyst/run-analyst.js");
      const result = await runOptimizerAnalyst();
      console.log(JSON.stringify({ level: "info", msg: "[optimizer-analyst] 提案生成 完了", date: msg.date, ok: result.ok, proposals: result.proposals }));
      break;
    }
```

- [ ] **Step 6: brownout** — `lib/safety/brownout-handler.ts` の `ALL_JOBS` に `"optimizer-analyst"` を追加。**`STOP_POSTING_ALLOWED`/`CRON_HALT_ALLOWED`/`ESCALATE_ALLOWED` には入れない**（LLM 使用＝コスト圧時は停止。collect/compose/check と同列）。

- [ ] **Step 7: wrangler.toml** crons に `"0 16 1 * *"` 追加（コメント表にも `# 毎月1日 01:00 JST optimizer-analyst` 追記）。

- [ ] **Step 8: 検証** `IN_MEMORY_FALLBACK=true npx jest lib/optimizer-analyst lib/ma` → 全緑。`npx tsc --noEmit` で新規型エラー無し（TS5097 は無視）。

- [ ] **Step 9: コミット** `git add lib/optimizer-analyst src/worker.ts src/queue.ts wrangler.toml lib/safety/brownout-handler.ts lib/ma/bootstrap-core.ts && git commit -m "feat(xad/analyst): 本番依存配線+MA登録+job配線"`

---

## Task 7: MA bootstrap ＋ 本番実証（人間ゲート）

- [ ] **Step 1: render 差分**
`cd apps/x-account-system && npm run ma:render` → `git diff` で `agents/x-optimizer-analyst.agent.yaml` ＋ `x-optimizer-analyst.system.md` が生成されることを確認。コミット。

- [ ] **Step 2: bootstrap（人間ゲート・新 agent create）**
`npm run ma:bootstrap`（`ant` で x-optimizer-analyst を create・`xad.ma_agents` upsert）。**control plane への create は人間確認必須。** 環境変数は DEPLOY/MA 運用ノート参照（`DOTENV_CONFIG_PATH`＋`SUPABASE_SCHEMA=xad`）。

- [ ] **Step 3: 本番実証（prod-lib-diag・書込み＝人間確認）**
ローカル tsx で `runOptimizerAnalyst()` を本番 env 実行 → `optimizer_proposal` に提案が入り、`session_event` に agent 思考が残り、LINE 通知が飛ぶことを確認。一時スクリプトは実行後削除。

- [ ] **Step 4: worker deploy（cron 反映・人間ゲート）**
`npm ci && npx wrangler deploy` で月次 cron を登録（`0 16 1 * *`）。

- [ ] **Step 5: PR**（squash・auto-merge）。

---

## Self-Review

- **Spec coverage**: MA登録(T6) / snapshot(T2) / tools+submit_proposal(T3) / prompt+🔒(T4) / orchestration+notify(T5) / cron-queue-brownout(T6) / bootstrap+実証(T7)。propose-only と 🔒 は T3(submit のみ書込)・T4(prompt)・brownout(T6) でカバー。
- **型整合**: `ProposalInput`/`ToolDeps`/`AnalystDeps`/`Snapshot` を各 Task で一貫使用。`makeToolHandler(deps)` の戻りは `(name,input)=>Promise<string>`（runMaSession の customToolHandler と一致）。
- **人間ゲート**: ma:bootstrap（agent create）/ 本番書込み実証 / worker deploy（T7）。
- **既知の割り切り**: T6 Step2 の defaultToolDeps の各 SELECT は prod 配線で単体テスト対象外（DI で I/O 契約は T3 で担保）。SQL 詳細は reward-extractor/既存クエリのパターンに倣う。
