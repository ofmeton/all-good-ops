# X optimizer Stage 4-B2（apply-code runner）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** accepted な config/prompt 提案を、ローカル1コマンド（`npm run apply-code`）で coding agent 編集→決定的ゲート→review→squash merge→deploy/ma:bootstrap→DB記録まで自動適用する runner を作る。

**Architecture:** 決定的レール（TS orchestrator・DI・jest）＋ LLM 2点のみ（implement / review を `claude -p` 子プロセス）。安全境界 = allowlist 7ファイル＋render成果物＋同 dir テスト（コード強制・部分mergeなし）。merge 権限は runner の決定的コードのみが持つ（agent に push/gh/deploy ツールを与えない）。全 apply 可逆（git revert + 再 deploy/bootstrap）。

**Tech Stack:** TypeScript / tsx CLI / jest（`IN_MEMORY_FALLBACK=true`・`.ts` import）/ claude CLI（headless `-p`・サブスク内・`--model claude-opus-4-8` 明示）/ gh / wrangler / ant（ma:bootstrap）/ Supabase（schema `xad`）/ LINE push。

**Spec:** `docs/superpowers/specs/2026-06-11-x-optimizer-apply-code-design.md`（確定3方針: ローカル1コマンド / 全自動merge / allowlist 7ファイル）

---

## File Structure

**x-account-system（`apps/x-account-system/`）:**
- `lib/optimizer-apply-code/types.ts`（新規）— `CodeApplyDeps` / `CodeRollbackDeps` / `CodeApplyResult` 等
- `lib/optimizer-apply-code/allowlist.ts`（新規）— allowlist 判定・死守トークン regex・deploy 分岐判定。**安全回帰の要**
- `lib/optimizer-apply-code/prompts.ts`（新規）— implementer / fixer / reviewer の claude -p プロンプト組み立て（純関数）
- `lib/optimizer-apply-code/run-code-apply.ts`（新規）— `runCodeApply` / `runCodeRollback` オーケストレーション（DI・fail-open）
- 各 `*.test.ts`（新規）
- `scripts/optimizer-apply-code.ts`（新規）— CLI（env 読込・git/gh/claude/wrangler/ant シェルアウト＝`defaultCodeApplyDeps`・lock・引数）
- `package.json`（変更）— `"apply-code"` script 追加

**repo 直下:**
- `.claude/skills/x-optimizer-apply-code/SKILL.md`（新規）— 「提案を適用して」で自動起動

## 実装時の参照（既存資産）

- 提案行型 `ProposalRow`・🔒判定 `validateProposalSafe`・tier判定 `classifyTier` = `lib/optimizer-apply/{types,validation}.ts`（4B-1・既存）
- LINE = `lib/line/line-client.ts` の `pushLine(to, text, token)`
- env 読込パターン＝prod-lib-diag（main repo の `apps/x-account-system/.env.local` を process.env に流す）
- jest は `IN_MEMORY_FALLBACK=true npx jest <path>`、source import は `.ts` 拡張子
- クリーン tsc baseline = `npx tsc -p src/tsconfig.json --noEmit`（0 errors 確認済み 2026-06-11）
- worker URL = `https://ofmeton-x-account.off-me-ton.workers.dev`、enqueue 認証 = `OAUTH_ADMIN_SECRET`（.env.local 所収）

---

## Task 1: `lib/optimizer-apply-code/types.ts`

**Files:**
- Create: `apps/x-account-system/lib/optimizer-apply-code/types.ts`

- [ ] **Step 1: 型を書く**

```ts
import type { ProposalRow } from "../optimizer-apply/types.ts";

export type { ProposalRow };

export type ImplementResult = { ok: boolean; log: string };
export type ReviewResult = { verdict: "APPROVE" | "REJECT"; reasons: string[] };
export type DiffInfo = { files: string[]; diffText: string };
export type DeployResult = { deployed: ("ma-bootstrap" | "wrangler")[]; maVersions?: Record<string, string> };
export type Outcome = "applied_code" | "pr_pending" | "blocked" | "error" | "dry_run_ok";

export type CodeApplyOptions = { dryRun?: boolean; cap?: number; onlyId?: string };

export type CodeApplyResult = {
  processed: number;
  applied: number;
  prPending: number;
  blocked: number;
  errors: number;
  details: { id: string; outcome: Outcome; prUrl?: string; note?: string }[];
};

export type Workspace = { dir: string; branch: string };

export type CodeApplyDeps = {
  /** worker 側 tier-T/noop 処理を発火（fail-open） */
  enqueueWorkerApply: () => Promise<void>;
  /** accepted ∧ 未実装 ∧ apply_status∈(null,'skipped_manual') ∧ tier∈{config,prompt} を cap 件まで */
  loadTargets: (cap: number) => Promise<ProposalRow[]>;
  createWorkspace: (id: string) => Promise<Workspace>;
  runImplementer: (ws: Workspace, p: ProposalRow) => Promise<ImplementResult>;
  runFixer: (ws: Workspace, p: ProposalRow, reasons: string[]) => Promise<ImplementResult>;
  /** prompts 変更時に ma:render を流し成果物を commit（変更なしなら no-op） */
  renderArtifacts: (ws: Workspace) => Promise<void>;
  collectDiff: (ws: Workspace) => Promise<DiffInfo>;
  /** jest 全体 + tsc -p src/tsconfig.json */
  runChecks: (ws: Workspace) => Promise<{ ok: boolean; output: string }>;
  runReviewer: (ws: Workspace, p: ProposalRow, diff: DiffInfo) => Promise<ReviewResult>;
  pushAndCreatePr: (ws: Workspace, pr: { title: string; body: string }, draft: boolean) => Promise<{ prUrl: string }>;
  mergePr: (prUrl: string) => Promise<{ sha: string }>;
  deploy: (files: string[]) => Promise<DeployResult>;
  cleanupWorkspace: (ws: Workspace, keepBranch: boolean) => Promise<void>;
  markApplied: (id: string, metaPatch: Record<string, unknown>) => Promise<void>;
  markStatus: (id: string, applyStatus: string, note: string) => Promise<void>;
  notify: (msg: string) => Promise<void>;
};

export type RollbackHandle = { git_sha?: string; pr_url?: string; deployed?: string[] };

export type CodeRollbackDeps = Pick<
  CodeApplyDeps,
  | "createWorkspace" | "collectDiff" | "runChecks" | "pushAndCreatePr"
  | "mergePr" | "deploy" | "cleanupWorkspace" | "renderArtifacts" | "notify"
> & {
  getRollbackHandle: (id: string) => Promise<RollbackHandle | null>;
  revertCommit: (ws: Workspace, sha: string) => Promise<void>;
  markRolledBack: (id: string) => Promise<void>;
};
```

- [ ] **Step 2: tsc 確認**

Run: `cd apps/x-account-system && npx tsc -p src/tsconfig.json --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add apps/x-account-system/lib/optimizer-apply-code/types.ts
git commit -m "feat(xad/apply-code): types (CodeApplyDeps/CodeRollbackDeps)"
```

---

## Task 2: `allowlist.ts`（安全回帰の要・厚いテスト）

**Files:**
- Create: `apps/x-account-system/lib/optimizer-apply-code/allowlist.ts`
- Test: `apps/x-account-system/lib/optimizer-apply-code/allowlist.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

```ts
import {
  PROMPT_SSOT_FILES, CONFIG_SSOT_FILES, ALLOWED_SSOT_FILES,
  isFileAllowed, checkDiffAllowed, hasDeathGuardTokens,
  needsMaBootstrap, needsWranglerDeploy,
} from "./allowlist.ts";

describe("allowlist 構成", () => {
  it("SSOT は 7 ファイル（prompt4 + config3）", () => {
    expect(PROMPT_SSOT_FILES).toHaveLength(4);
    expect(CONFIG_SSOT_FILES).toHaveLength(3);
    expect(ALLOWED_SSOT_FILES).toHaveLength(7);
  });
  it("guards.ts / bootstrap-core.ts / editor / migrations は不許可", () => {
    for (const f of [
      "apps/x-account-system/lib/optimizer/guards.ts",
      "apps/x-account-system/lib/ma/bootstrap-core.ts",
      "apps/x-account-system/lib/editor/pipeline.ts",
      "apps/x-account-system/migrations/0025_x.sql",
      "apps/x-account-system/src/worker.ts",
    ]) expect(isFileAllowed(f)).toBe(false);
  });
  it("SSOT 7ファイル・render成果物・同dirテストは許可", () => {
    expect(isFileAllowed("apps/x-account-system/lib/curation/compose-prompts.ts")).toBe(true);
    expect(isFileAllowed("apps/x-account-system/agents/writer.system.md")).toBe(true);
    expect(isFileAllowed("apps/x-account-system/lib/check/check-prompts.test.ts")).toBe(true);
  });
  it("同dirでも .test.ts 以外の別ファイルは不許可", () => {
    expect(isFileAllowed("apps/x-account-system/lib/curation/compose.ts")).toBe(false);
  });
});

describe("checkDiffAllowed", () => {
  it("全許可なら ok", () => {
    expect(checkDiffAllowed([
      "apps/x-account-system/lib/ingest/collector-config.ts",
      "apps/x-account-system/lib/ingest/collector-config.test.ts",
    ]).ok).toBe(true);
  });
  it("1 ファイルでも逸脱したら fail（部分 merge しない）", () => {
    const r = checkDiffAllowed([
      "apps/x-account-system/lib/ingest/collector-config.ts",
      "apps/x-account-system/lib/optimizer/guards.ts",
    ]);
    expect(r.ok).toBe(false);
    expect(r.violations).toEqual(["apps/x-account-system/lib/optimizer/guards.ts"]);
  });
  it("空 diff は fail", () => {
    const r = checkDiffAllowed([]);
    expect(r.ok).toBe(false);
    expect(r.violations).toEqual(["<empty diff>"]);
  });
});

describe("hasDeathGuardTokens（変更行のみ検査）", () => {
  it("追加行に FORBIDDEN_PHRASES / SAFETY_GUARDRAILS / GUARD_RULES があれば true", () => {
    expect(hasDeathGuardTokens("+ import { FORBIDDEN_PHRASES } from './x'")).toBe(true);
    expect(hasDeathGuardTokens("- const a = SAFETY_GUARDRAILS")).toBe(true);
    expect(hasDeathGuardTokens("+const r = GUARD_RULES.find(x)")).toBe(true);
  });
  it("コンテキスト行（先頭スペース）や diff ヘッダは対象外", () => {
    expect(hasDeathGuardTokens(" const a = GUARD_RULES // 既存行")).toBe(false);
    expect(hasDeathGuardTokens("+++ b/lib/optimizer/GUARD_RULES.ts")).toBe(false);
  });
  it("無関係な変更行は false", () => {
    expect(hasDeathGuardTokens("+ watchlist: [...old, 'new_source'],")).toBe(false);
  });
});

describe("deploy 分岐判定", () => {
  it("prompt ファイル変更 → ma:bootstrap 要", () => {
    expect(needsMaBootstrap(["apps/x-account-system/lib/check/check-prompts.ts"])).toBe(true);
    expect(needsMaBootstrap(["apps/x-account-system/lib/check/check-config.ts"])).toBe(false);
  });
  it("config ファイル変更 → wrangler 要", () => {
    expect(needsWranglerDeploy(["apps/x-account-system/lib/check/check-config.ts"])).toBe(true);
    expect(needsWranglerDeploy(["apps/x-account-system/lib/check/check-prompts.ts"])).toBe(false);
  });
});
```

- [ ] **Step 2: 失敗確認**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/optimizer-apply-code/allowlist.test.ts`
Expected: FAIL（モジュール未存在）

- [ ] **Step 3: 実装**

```ts
/** Stage 4-B2 安全境界。allowlist 外への変更が 1 ファイルでもあれば無条件 fail（部分 merge しない）。 */

export const PROMPT_SSOT_FILES = [
  "apps/x-account-system/lib/curation/compose-prompts.ts",
  "apps/x-account-system/lib/check/check-prompts.ts",
  "apps/x-account-system/lib/ingest/collector-prompts.ts",
  "apps/x-account-system/lib/optimizer-analyst/prompts.ts",
] as const;

export const CONFIG_SSOT_FILES = [
  "apps/x-account-system/lib/curation/compose-config.ts",
  "apps/x-account-system/lib/ingest/collector-config.ts",
  "apps/x-account-system/lib/check/check-config.ts",
] as const;

export const ALLOWED_SSOT_FILES = [...PROMPT_SSOT_FILES, ...CONFIG_SSOT_FILES] as const;

/** ma:render の決定的成果物（runner 自身が生成・commit する） */
export const ARTIFACT_PREFIX = "apps/x-account-system/agents/";

const ALLOWED_TEST_DIRS = [...new Set(
  ALLOWED_SSOT_FILES.map((f) => f.slice(0, f.lastIndexOf("/") + 1)),
)];

export function isFileAllowed(file: string): boolean {
  if ((ALLOWED_SSOT_FILES as readonly string[]).includes(file)) return true;
  if (file.startsWith(ARTIFACT_PREFIX)) return true;
  return file.endsWith(".test.ts") && ALLOWED_TEST_DIRS.some((d) => file.startsWith(d));
}

export function checkDiffAllowed(files: string[]): { ok: boolean; violations: string[] } {
  if (files.length === 0) return { ok: false, violations: ["<empty diff>"] };
  const violations = files.filter((f) => !isFileAllowed(f));
  return { ok: violations.length === 0, violations };
}

/** 🔒 識別子（コードの死守シンボル）。一次防御は allowlist、これは二重ベルト。 */
const DEATH_GUARD_TOKEN_RE = /FORBIDDEN_PHRASES|SAFETY_GUARDRAILS|GUARD_RULES|DEATH_GUARD/;

/** diff の変更行（+/-、ヘッダ除く）のみ検査。 */
export function hasDeathGuardTokens(diffText: string): boolean {
  return diffText.split("\n").some(
    (l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l) && DEATH_GUARD_TOKEN_RE.test(l),
  );
}

export function needsMaBootstrap(files: string[]): boolean {
  return files.some((f) => (PROMPT_SSOT_FILES as readonly string[]).includes(f));
}

export function needsWranglerDeploy(files: string[]): boolean {
  return files.some((f) => (CONFIG_SSOT_FILES as readonly string[]).includes(f));
}
```

- [ ] **Step 4: pass 確認**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/optimizer-apply-code/allowlist.test.ts`
Expected: PASS（全ケース）

- [ ] **Step 5: Commit**

```bash
git add apps/x-account-system/lib/optimizer-apply-code/allowlist.ts apps/x-account-system/lib/optimizer-apply-code/allowlist.test.ts
git commit -m "feat(xad/apply-code): allowlist 安全境界（7 SSOT + artifacts + 同dirテスト・死守トークン）"
```

---

## Task 3: `prompts.ts`

**Files:**
- Create: `apps/x-account-system/lib/optimizer-apply-code/prompts.ts`
- Test: `apps/x-account-system/lib/optimizer-apply-code/prompts.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { buildImplementerPrompt, buildFixerPrompt, buildReviewerPrompt } from "./prompts.ts";
import type { ProposalRow } from "./types.ts";

const p: ProposalRow = {
  id: "abcd1234-0000-0000-0000-000000000000",
  proposal_type: "config_change", scope: "collector_query",
  hypothesis: "watchlist に foo を追加する", evidence: { funnel: 0.1 },
  rank: "A", accepted: true, implemented: false, reviewer_reason: null, meta: {},
};

describe("buildImplementerPrompt", () => {
  const s = buildImplementerPrompt(p);
  it("提案内容と allowlist と禁止事項を含む", () => {
    expect(s).toContain("watchlist に foo を追加する");
    expect(s).toContain("collector_query");
    expect(s).toContain("lib/ingest/collector-config.ts");   // allowlist 列挙
    expect(s).toContain("guards.ts");                        // 触ってはいけない旨
    expect(s).toContain("git commit");                       // commit まで指示
    expect(s).toContain("push");                             // push 禁止の明記
  });
});

describe("buildFixerPrompt", () => {
  it("却下理由を含む", () => {
    const s = buildFixerPrompt(p, ["テストが落ちている", "余計な変更がある"]);
    expect(s).toContain("テストが落ちている");
    expect(s).toContain("余計な変更がある");
  });
});

describe("buildReviewerPrompt", () => {
  it("diff と提案と JSON 出力指示を含む", () => {
    const s = buildReviewerPrompt(p, "+ added line");
    expect(s).toContain("+ added line");
    expect(s).toContain("watchlist に foo を追加する");
    expect(s).toContain('"verdict"');
    expect(s).toContain("REJECT");
    expect(s).toContain("TARGET_DEFINITION");                // 波及範囲チェック観点
  });
});
```

- [ ] **Step 2: 失敗確認**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/optimizer-apply-code/prompts.test.ts`
Expected: FAIL

- [ ] **Step 3: 実装**

```ts
import { ALLOWED_SSOT_FILES } from "./allowlist.ts";
import type { ProposalRow } from "./types.ts";

const ALLOWLIST_TEXT = ALLOWED_SSOT_FILES.map((f) => `- ${f}`).join("\n");

const COMMON_RULES = `
## 編集してよいファイル（これ以外への変更は自動 reject される）
${ALLOWLIST_TEXT}
（上記と同ディレクトリの *.test.ts の更新も可。テストの削除・弱体化は理由がない限り禁止）

## 絶対禁止
- guards.ts / FORBIDDEN_PHRASES / SAFETY_GUARDRAILS / lib/editor/** / lib/ma/bootstrap-core.ts / migrations/** に触れること
- git push / gh / deploy 系コマンド（merge 権限は外側の runner が持つ）
- 提案に書かれていない変更を混ぜること（YAGNI）

## 作業手順
1. 提案を読み、対象ファイルを特定して最小の変更を行う
2. 挙動が変わる場合は対応する *.test.ts も更新する
3. apps/x-account-system で IN_MEMORY_FALLBACK=true npx jest <関連パス> と npx tsc -p src/tsconfig.json --noEmit を緑にする
4. git add <変更ファイルのみ> && git commit -m "auto-apply: <要約>"（push はしない）
このセッションは headless 自動実行。質問はできない。判断に迷う場合は何も変更せず「SKIP: 理由」とだけ出力して終了する。CLAUDE.md のセッション儀式（raw保存・ブランチ確認等）は無視してこのタスクのみ行う。`;

export function buildImplementerPrompt(p: ProposalRow): string {
  return `あなたは X 発信システムの implementer。以下の「人間が accept 済みの改善提案」を、このリポジトリの TS SSOT に最小差分で実装せよ。

## 提案
- id: ${p.id}
- type: ${p.proposal_type} / scope: ${p.scope} / rank: ${p.rank ?? "-"}
- hypothesis: ${p.hypothesis}
- evidence: ${JSON.stringify(p.evidence)}
${COMMON_RULES}`;
}

export function buildFixerPrompt(p: ProposalRow, reasons: string[]): string {
  return `あなたは X 発信システムの implementer。直前の自動適用コミットがレビュー/ゲートで却下された。却下理由を解消する修正を行い、再度 commit せよ（push 禁止）。

## 元の提案
- scope: ${p.scope} / hypothesis: ${p.hypothesis}

## 却下理由（これを全て解消すること）
${reasons.map((r) => `- ${r}`).join("\n")}
${COMMON_RULES}`;
}

export function buildReviewerPrompt(p: ProposalRow, diffText: string): string {
  return `あなたは敵対的コードレビュアー。以下の diff が「人間が accept した提案」を過不足なく実装しているか審査せよ。read-only。コードは変更しない。

## 提案
- type: ${p.proposal_type} / scope: ${p.scope}
- hypothesis: ${p.hypothesis}
- evidence: ${JSON.stringify(p.evidence)}

## 審査観点（1つでも該当すれば REJECT）
- 提案に無い変更が混ざっている / 提案の意図を実装できていない
- 安全劣化: テストの削除・assertion 弱体化に正当な理由がない
- TARGET_DEFINITION 等の共有定義の変更が、提案 scope を超えて他工程へ波及する
- prompt の品質劣化（誤字・論理破綻・既存の掟との矛盾）

## diff
\`\`\`diff
${diffText}
\`\`\`

## 出力（最終行にこの JSON のみ。他の形式は不可）
{"verdict":"APPROVE"|"REJECT","reasons":["..."]}`;
}
```

- [ ] **Step 4: pass 確認**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/optimizer-apply-code/prompts.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/x-account-system/lib/optimizer-apply-code/prompts.ts apps/x-account-system/lib/optimizer-apply-code/prompts.test.ts
git commit -m "feat(xad/apply-code): implementer/fixer/reviewer プロンプト組み立て"
```

---

## Task 4: `run-code-apply.ts`（オーケストレータ）

**Files:**
- Create: `apps/x-account-system/lib/optimizer-apply-code/run-code-apply.ts`
- Test: `apps/x-account-system/lib/optimizer-apply-code/run-code-apply.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { runCodeApply, runCodeRollback } from "./run-code-apply.ts";
import type { CodeApplyDeps, CodeRollbackDeps, ProposalRow, Workspace } from "./types.ts";

const CFG = "apps/x-account-system/lib/ingest/collector-config.ts";
const PRM = "apps/x-account-system/lib/check/check-prompts.ts";
const GUARDS = "apps/x-account-system/lib/optimizer/guards.ts";

function row(over: Partial<ProposalRow> = {}): ProposalRow {
  return {
    id: "p1", proposal_type: "config_change", scope: "collector_query",
    hypothesis: "watchlist に foo を追加", evidence: {}, rank: "A",
    accepted: true, implemented: false, reviewer_reason: null, meta: {}, ...over,
  };
}

type Calls = Record<string, unknown[][]>;
function makeDeps(targets: ProposalRow[], diffFiles: string[] = [CFG]) {
  const calls: Calls = {};
  const rec = (k: string, ...a: unknown[]) => { (calls[k] ??= []).push(a); };
  const ws: Workspace = { dir: "/tmp/x", branch: "task/auto-apply-p1" };
  const deps: CodeApplyDeps = {
    enqueueWorkerApply: async () => rec("enqueue"),
    loadTargets: async () => targets,
    createWorkspace: async (id) => { rec("createWs", id); return ws; },
    runImplementer: async () => { rec("impl"); return { ok: true, log: "done" }; },
    runFixer: async (_w, _p, reasons) => { rec("fix", reasons); return { ok: true, log: "fixed" }; },
    renderArtifacts: async () => rec("render"),
    collectDiff: async () => ({ files: diffFiles, diffText: "+ watchlist: ['foo']" }),
    runChecks: async () => { rec("checks"); return { ok: true, output: "green" }; },
    runReviewer: async () => { rec("review"); return { verdict: "APPROVE", reasons: [] }; },
    pushAndCreatePr: async (_w, pr, draft) => { rec("pr", pr.title, draft); return { prUrl: "https://pr/1" }; },
    mergePr: async () => { rec("merge"); return { sha: "deadbeef" }; },
    deploy: async (files) => { rec("deploy", files); return { deployed: ["wrangler"] }; },
    cleanupWorkspace: async (_w, keep) => rec("cleanup", keep),
    markApplied: async (id, meta) => rec("markApplied", id, meta),
    markStatus: async (id, st, note) => rec("markStatus", id, st, note),
    notify: async (m) => rec("notify", m),
  };
  return { deps, calls };
}

describe("runCodeApply", () => {
  it("正常系: gate+review 緑 → merge → deploy → markApplied(rollback_handle 付き)", async () => {
    const { deps, calls } = makeDeps([row()]);
    const r = await runCodeApply(deps);
    expect(r.applied).toBe(1);
    expect(calls.merge).toHaveLength(1);
    expect(calls.deploy[0][0]).toEqual([CFG]);
    const meta = calls.markApplied[0][1] as Record<string, never>;
    expect(meta.apply_status).toBe("applied_code");
    expect((meta.rollback_handle as { git_sha: string }).git_sha).toBe("deadbeef");
    expect(calls.cleanup[0][0]).toBe(false); // branch 削除
  });

  it("🔒 提案は blocked（workspace を作らない）", async () => {
    const { deps, calls } = makeDeps([row({ hypothesis: "first_hand を下げる" })]);
    const r = await runCodeApply(deps);
    expect(r.blocked).toBe(1);
    expect(calls.createWs).toBeUndefined();
    expect(calls.markStatus[0][1]).toBe("blocked");
  });

  it("allowlist 逸脱 → fixer 1回 → なお逸脱 → draft PR + pr_pending + branch 残す", async () => {
    const { deps, calls } = makeDeps([row()], [GUARDS]);
    const r = await runCodeApply(deps);
    expect(r.prPending).toBe(1);
    expect(calls.fix).toHaveLength(1);          // 修正 1 回だけ
    expect(calls.pr[0][1]).toBe(true);          // draft
    expect(calls.merge).toBeUndefined();        // merge しない
    expect(calls.markStatus[0][1]).toBe("pr_pending");
    expect(calls.cleanup[0][0]).toBe(true);     // branch 残す
  });

  it("review REJECT → fixer → APPROVE → applied", async () => {
    const { deps, calls } = makeDeps([row()]);
    let first = true;
    deps.runReviewer = async () => {
      if (first) { first = false; return { verdict: "REJECT", reasons: ["余計な変更"] }; }
      return { verdict: "APPROVE", reasons: [] };
    };
    const r = await runCodeApply(deps);
    expect(r.applied).toBe(1);
    expect(calls.fix[0][0]).toEqual(["余計な変更"]);
  });

  it("prompt ファイルの diff があれば renderArtifacts を呼ぶ", async () => {
    const { deps, calls } = makeDeps([row({ scope: "checker_prompt" })], [PRM]);
    await runCodeApply(deps);
    expect(calls.render).toHaveLength(1);
  });

  it("config のみなら renderArtifacts を呼ばない", async () => {
    const { deps, calls } = makeDeps([row()], [CFG]);
    await runCodeApply(deps);
    expect(calls.render).toBeUndefined();
  });

  it("deploy 失敗でも markApplied は行い 🚨 通知（merge 済みのため）", async () => {
    const { deps, calls } = makeDeps([row()]);
    deps.deploy = async () => { throw new Error("wrangler down"); };
    const r = await runCodeApply(deps);
    expect(r.applied).toBe(1);
    expect(calls.markApplied).toHaveLength(1);
    expect((calls.notify as unknown[][]).some((a) => String(a[0]).includes("🚨"))).toBe(true);
  });

  it("dryRun は push/merge/deploy/markApplied をしない", async () => {
    const { deps, calls } = makeDeps([row()]);
    const r = await runCodeApply(deps, { dryRun: true });
    expect(r.applied).toBe(1); // dry_run_ok
    expect(calls.pr).toBeUndefined();
    expect(calls.merge).toBeUndefined();
    expect(calls.markApplied).toBeUndefined();
  });

  it("enqueue 失敗は fail-open（処理続行）", async () => {
    const { deps } = makeDeps([row()]);
    deps.enqueueWorkerApply = async () => { throw new Error("worker down"); };
    const r = await runCodeApply(deps);
    expect(r.applied).toBe(1);
  });

  it("implementer 失敗は error 計上で次へ", async () => {
    const { deps, calls } = makeDeps([row(), row({ id: "p2" })]);
    let n = 0;
    deps.runImplementer = async () => (++n === 1 ? { ok: false, log: "crash" } : { ok: true, log: "done" });
    const r = await runCodeApply(deps);
    expect(r.errors).toBe(1);
    expect(r.applied).toBe(1);
    expect((calls.markStatus as unknown[][]).some((a) => a[1] === "error")).toBe(true);
  });

  it("onlyId 指定時は他をスキップ", async () => {
    const { deps, calls } = makeDeps([row(), row({ id: "p2" })]);
    const r = await runCodeApply(deps, { onlyId: "p2" });
    expect(r.processed).toBe(1);
    expect((calls.createWs as unknown[][])[0][0]).toBe("p2");
  });
});

describe("runCodeRollback", () => {
  function makeRbDeps(handle: { git_sha?: string } | null) {
    const calls: Calls = {};
    const rec = (k: string, ...a: unknown[]) => { (calls[k] ??= []).push(a); };
    const deps: CodeRollbackDeps = {
      createWorkspace: async () => ({ dir: "/tmp/rb", branch: "task/auto-apply-rb" }),
      collectDiff: async () => ({ files: [CFG], diffText: "- foo" }),
      runChecks: async () => ({ ok: true, output: "green" }),
      pushAndCreatePr: async (_w, _pr, draft) => { rec("pr", draft); return { prUrl: "https://pr/2" }; },
      mergePr: async () => { rec("merge"); return { sha: "cafebabe" }; },
      deploy: async (f) => { rec("deploy", f); return { deployed: ["wrangler"] }; },
      cleanupWorkspace: async (_w, keep) => rec("cleanup", keep),
      renderArtifacts: async () => rec("render"),
      notify: async (m) => rec("notify", m),
      getRollbackHandle: async () => handle,
      revertCommit: async (_w, sha) => rec("revert", sha),
      markRolledBack: async (id) => rec("rolledBack", id),
    };
    return { deps, calls };
  }

  it("handle の git_sha を revert → merge → deploy → markRolledBack", async () => {
    const { deps, calls } = makeRbDeps({ git_sha: "deadbeef" });
    const r = await runCodeRollback("p1", deps);
    expect(r.ok).toBe(true);
    expect(calls.revert[0][0]).toBe("deadbeef");
    expect(calls.merge).toHaveLength(1);
    expect(calls.rolledBack[0][0]).toBe("p1");
  });

  it("handle 無しは ok:false（何もしない）", async () => {
    const { deps, calls } = makeRbDeps(null);
    const r = await runCodeRollback("p1", deps);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/git_sha/);
    expect(calls.revert).toBeUndefined();
  });
});
```

- [ ] **Step 2: 失敗確認**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/optimizer-apply-code/run-code-apply.test.ts`
Expected: FAIL

- [ ] **Step 3: 実装**

```ts
import { validateProposalSafe } from "../optimizer-apply/validation.ts";
import { checkDiffAllowed, hasDeathGuardTokens, needsMaBootstrap } from "./allowlist.ts";
import type {
  CodeApplyDeps, CodeApplyOptions, CodeApplyResult, CodeRollbackDeps,
  DiffInfo, ProposalRow, ReviewResult, Workspace,
} from "./types.ts";

type Detail = CodeApplyResult["details"][number];

async function runGates(
  ws: Workspace, deps: CodeApplyDeps,
): Promise<{ ok: boolean; failures: string[]; diff: DiffInfo }> {
  let diff = await deps.collectDiff(ws);
  if (needsMaBootstrap(diff.files)) {
    await deps.renderArtifacts(ws);
    diff = await deps.collectDiff(ws);
  }
  const failures: string[] = [];
  const allow = checkDiffAllowed(diff.files);
  if (!allow.ok) failures.push(`allowlist違反: ${allow.violations.join(", ")}`);
  if (hasDeathGuardTokens(diff.diffText)) failures.push("死守トークンが変更行に含まれる");
  if (failures.length === 0) {
    const checks = await deps.runChecks(ws);
    if (!checks.ok) failures.push(`tests/tsc 失敗: ${checks.output.slice(-400)}`);
  }
  return { ok: failures.length === 0, failures, diff };
}

function prTitle(p: ProposalRow): string {
  return `auto-apply(${p.id.slice(0, 8)}): ${p.scope}`;
}
function prBody(p: ProposalRow): string {
  return `optimizer 提案の自動適用（Stage 4-B2）。\n\n- proposal: ${p.id}\n- type: ${p.proposal_type} / rank: ${p.rank ?? "-"}\n- hypothesis: ${p.hypothesis}\n\n🤖 apply-code runner`;
}

async function applyOne(p: ProposalRow, deps: CodeApplyDeps, opts: CodeApplyOptions): Promise<Detail> {
  const safe = validateProposalSafe(p);
  if (!safe.ok) {
    await deps.markStatus(p.id, "blocked", safe.reason);
    return { id: p.id, outcome: "blocked", note: safe.reason };
  }
  const ws = await deps.createWorkspace(p.id);
  try {
    const impl = await deps.runImplementer(ws, p);
    if (!impl.ok) throw new Error(`implementer 失敗: ${impl.log.slice(-400)}`);

    let gate = await runGates(ws, deps);
    let review: ReviewResult | null = gate.ok ? await deps.runReviewer(ws, p, gate.diff) : null;

    if (!gate.ok || review?.verdict !== "APPROVE") {
      const reasons = gate.ok ? (review?.reasons ?? ["review REJECT"]) : gate.failures;
      const fix = await deps.runFixer(ws, p, reasons);
      if (fix.ok) {
        gate = await runGates(ws, deps);
        review = gate.ok ? await deps.runReviewer(ws, p, gate.diff) : null;
      }
    }

    if (!gate.ok || review?.verdict !== "APPROVE") {
      const note = (gate.ok ? (review?.reasons ?? []) : gate.failures).join("; ").slice(0, 500);
      const { prUrl } = await deps.pushAndCreatePr(ws, { title: prTitle(p), body: prBody(p) }, true);
      await deps.markStatus(p.id, "pr_pending", `自動ゲート不合格（人間レビュー要）: ${note}`);
      await deps.cleanupWorkspace(ws, true); // branch は PR 用に残す
      return { id: p.id, outcome: "pr_pending", prUrl, note };
    }

    if (opts.dryRun) {
      await deps.cleanupWorkspace(ws, false);
      return { id: p.id, outcome: "dry_run_ok" };
    }

    const { prUrl } = await deps.pushAndCreatePr(ws, { title: prTitle(p), body: prBody(p) }, false);
    const { sha } = await deps.mergePr(prUrl);

    let deployNote: string | undefined;
    let deployed: Awaited<ReturnType<CodeApplyDeps["deploy"]>> = { deployed: [] };
    try {
      deployed = await deps.deploy(gate.diff.files);
    } catch (e) {
      deployNote = `deploy失敗・要手動: ${String(e)}`;
      await deps.notify(`🚨 apply-code: merge 済みだが deploy 失敗 (${p.id.slice(0, 8)})。手動で ma:bootstrap / worker:deploy を実行してください: ${String(e)}`);
    }

    await deps.markApplied(p.id, {
      apply_status: "applied_code",
      pr_url: prUrl,
      changed_files: gate.diff.files,
      rollback_handle: {
        git_sha: sha, pr_url: prUrl,
        deployed: deployed.deployed, ma_versions: deployed.maVersions ?? null,
      },
      ...(deployNote ? { deploy_note: deployNote } : {}),
    });
    await deps.cleanupWorkspace(ws, false);
    return { id: p.id, outcome: "applied_code", prUrl, note: deployNote };
  } catch (e) {
    await deps.cleanupWorkspace(ws, false).catch(() => {});
    throw e;
  }
}

/** accepted な config/prompt 提案を直列処理。fail-open（1件の失敗で他を止めない）。 */
export async function runCodeApply(deps: CodeApplyDeps, opts: CodeApplyOptions = {}): Promise<CodeApplyResult> {
  const cap = opts.cap ?? 3;
  await deps.enqueueWorkerApply().catch(() => {}); // tier-T/noop は worker 側（fail-open）
  let targets = await deps.loadTargets(cap);
  if (opts.onlyId) targets = targets.filter((p) => p.id === opts.onlyId);

  const result: CodeApplyResult = { processed: 0, applied: 0, prPending: 0, blocked: 0, errors: 0, details: [] };
  for (const p of targets) {
    result.processed++;
    let d: Detail;
    try {
      d = await applyOne(p, deps, opts);
    } catch (e) {
      d = { id: p.id, outcome: "error", note: String(e).slice(0, 500) };
      await deps.markStatus(p.id, "error", d.note!).catch(() => {});
    }
    result.details.push(d);
    if (d.outcome === "applied_code" || d.outcome === "dry_run_ok") result.applied++;
    else if (d.outcome === "pr_pending") result.prPending++;
    else if (d.outcome === "blocked") result.blocked++;
    else result.errors++;
  }
  await deps.notify(
    `🧬 apply-code${opts.dryRun ? "(dry-run)" : ""}: applied=${result.applied} pr_pending=${result.prPending} blocked=${result.blocked} errors=${result.errors}` +
    result.details.map((d) => `\n- ${d.id.slice(0, 8)}: ${d.outcome}${d.prUrl ? ` ${d.prUrl}` : ""}`).join(""),
  );
  return result;
}

/** applied_code 提案の可逆復元: git revert → 同レール merge → 再 deploy → rollback=true。 */
export async function runCodeRollback(
  proposalId: string, deps: CodeRollbackDeps,
): Promise<{ ok: boolean; reason?: string }> {
  const handle = await deps.getRollbackHandle(proposalId);
  if (!handle?.git_sha) return { ok: false, reason: "no rollback_handle.git_sha" };
  const ws = await deps.createWorkspace(`rb-${proposalId.slice(0, 8)}`);
  try {
    await deps.revertCommit(ws, handle.git_sha);
    let diff = await deps.collectDiff(ws);
    if (needsMaBootstrap(diff.files)) {
      await deps.renderArtifacts(ws);
      diff = await deps.collectDiff(ws);
    }
    const checks = await deps.runChecks(ws);
    if (!checks.ok) {
      await deps.cleanupWorkspace(ws, true);
      return { ok: false, reason: `revert 後の tests 失敗（人間対応要）: ${checks.output.slice(-300)}` };
    }
    const { prUrl } = await deps.pushAndCreatePr(ws, {
      title: `auto-apply rollback(${proposalId.slice(0, 8)})`,
      body: `revert of ${handle.git_sha}\n\n🤖 apply-code runner`,
    }, false);
    await deps.mergePr(prUrl);
    await deps.deploy(diff.files).catch(async (e) => {
      await deps.notify(`🚨 apply-code rollback: merge 済みだが deploy 失敗。手動対応要: ${String(e)}`);
    });
    await deps.markRolledBack(proposalId);
    await deps.cleanupWorkspace(ws, false);
    await deps.notify(`↩️ apply-code rollback 完了 (${proposalId.slice(0, 8)}) ${prUrl}`);
    return { ok: true };
  } catch (e) {
    await deps.cleanupWorkspace(ws, false).catch(() => {});
    return { ok: false, reason: String(e) };
  }
}
```

- [ ] **Step 4: pass 確認**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/optimizer-apply-code/run-code-apply.test.ts`
Expected: PASS（全 13 ケース）

- [ ] **Step 5: Commit**

```bash
git add apps/x-account-system/lib/optimizer-apply-code/run-code-apply.ts apps/x-account-system/lib/optimizer-apply-code/run-code-apply.test.ts
git commit -m "feat(xad/apply-code): orchestrator (runCodeApply/runCodeRollback・fail-open・修正1回)"
```

---

## Task 5: CLI `scripts/optimizer-apply-code.ts` ＋ package.json

**Files:**
- Create: `apps/x-account-system/scripts/optimizer-apply-code.ts`
- Modify: `apps/x-account-system/package.json`（scripts に追加）

- [ ] **Step 1: ma_agents の実カラム名を確認**

Run: `grep -nE "from\(.ma_agents.\)|agent_key|agent_id|version" apps/x-account-system/scripts/bootstrap-ma-agents.ts | head -20`
deploy 後の MA version 採取 select のカラム名（下記コードの `agent_key, version`）を実カラムに合わせて調整する。

- [ ] **Step 2: CLI を実装**

```ts
/**
 * Stage 4-B2 apply-code runner CLI。
 * 使い方: npm run apply-code [-- --dry-run] [-- --cap N] [-- --id <uuid>] [-- --rollback <uuid>]
 * 前提: main repo の apps/x-account-system/.env.local に prod creds。claude / gh / wrangler / ant ログイン済み。
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync, symlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { runCodeApply, runCodeRollback } from "../lib/optimizer-apply-code/run-code-apply.ts";
import { buildImplementerPrompt, buildFixerPrompt, buildReviewerPrompt } from "../lib/optimizer-apply-code/prompts.ts";
import { needsMaBootstrap, needsWranglerDeploy } from "../lib/optimizer-apply-code/allowlist.ts";
import { classifyTier } from "../lib/optimizer-apply/validation.ts";
import { pushLine } from "../lib/line/line-client.ts";
import type { CodeApplyDeps, CodeRollbackDeps, ProposalRow, Workspace } from "../lib/optimizer-apply-code/types.ts";

const MAIN_REPO = "/Users/rikukudo/Projects/private-agents/all-good-ops";
const APP_DIR = "apps/x-account-system";
const WORKER_URL = process.env.XAD_WORKER_URL ?? "https://ofmeton-x-account.off-me-ton.workers.dev";
const LOCK = path.join(tmpdir(), "optimizer-apply-code.lock");
const CLAUDE_MODEL = "claude-opus-4-8"; // Fable はユーザー既定でも runner では使わない（最難関4局面ルール）

// ---- env（main repo の .env.local。worktree discard の影響を受けない）
for (const l of readFileSync(path.join(MAIN_REPO, APP_DIR, ".env.local"), "utf8").split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
delete process.env.IN_MEMORY_FALLBACK;

// ---- shell helper
function sh(cmd: string, args: string[], o: { cwd?: string; env?: Record<string, string>; timeoutMs?: number } = {}) {
  const r = spawnSync(cmd, args, {
    cwd: o.cwd, encoding: "utf8", timeout: o.timeoutMs ?? 600_000,
    env: { ...process.env, ...o.env }, maxBuffer: 64 * 1024 * 1024,
  });
  return { ok: r.status === 0, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}
function mustSh(cmd: string, args: string[], o?: Parameters<typeof sh>[2]): string {
  const r = sh(cmd, args, o);
  if (!r.ok) throw new Error(`${cmd} ${args.join(" ")} failed:\n${r.out.slice(-1500)}`);
  return r.out;
}

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "xad" } });
const COLS = "id, proposal_type, scope, hypothesis, evidence, rank, accepted, implemented, reviewer_reason, meta";

// ---- claude -p（implement は編集系、review は read-only。push/gh/deploy 系は与えない）
const IMPLEMENT_TOOLS = "Read,Edit,Write,Grep,Glob,Bash(npm test:*),Bash(npx jest:*),Bash(npx tsc:*),Bash(git add:*),Bash(git commit:*),Bash(git diff:*),Bash(git status:*)";
const REVIEW_TOOLS = "Read,Grep,Glob,Bash(git diff:*)";
function runClaude(cwd: string, prompt: string, allowedTools: string) {
  const r = sh("claude", ["-p", prompt, "--model", CLAUDE_MODEL, "--allowedTools", allowedTools],
    { cwd, timeoutMs: 1_200_000, env: { ALLOW_BRANCH_CONFLICT: "1" } });
  return { ok: r.ok, log: r.out };
}

function defaultCodeApplyDeps(): CodeApplyDeps {
  return {
    async enqueueWorkerApply() {
      const res = await fetch(`${WORKER_URL}/admin/enqueue?job=optimizer-apply`, {
        headers: { authorization: `Bearer ${process.env.OAUTH_ADMIN_SECRET}` },
      });
      if (!res.ok) throw new Error(`enqueue ${res.status}`);
    },
    async loadTargets(cap) {
      const { data, error } = await sb.from("optimizer_proposal").select(COLS)
        .eq("accepted", true).or("implemented.is.null,implemented.eq.false")
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return ((data ?? []) as ProposalRow[]).filter((r) => {
        const st = (r.meta as { apply_status?: string } | null)?.apply_status;
        if (st != null && st !== "skipped_manual") return false;
        const tier = classifyTier(r);
        return tier === "config" || tier === "prompt";
      }).slice(0, cap);
    },
    async createWorkspace(id) {
      const slug = id.slice(0, 8);
      const branch = `task/auto-apply-${slug}`;
      const dir = path.join(tmpdir(), `auto-apply-${slug}`);
      mustSh("git", ["-C", MAIN_REPO, "fetch", "origin", "main"]);
      if (existsSync(dir)) sh("git", ["-C", MAIN_REPO, "worktree", "remove", "--force", dir]);
      sh("git", ["-C", MAIN_REPO, "branch", "-D", branch]); // 残骸掃除（無ければ fail で無視）
      mustSh("git", ["-C", MAIN_REPO, "worktree", "add", dir, "-b", branch, "origin/main"]);
      symlinkSync(path.join(MAIN_REPO, APP_DIR, "node_modules"), path.join(dir, APP_DIR, "node_modules"), "dir");
      return { dir, branch };
    },
    async runImplementer(ws, p) { return runClaude(ws.dir, buildImplementerPrompt(p), IMPLEMENT_TOOLS); },
    async runFixer(ws, p, reasons) { return runClaude(ws.dir, buildFixerPrompt(p, reasons), IMPLEMENT_TOOLS); },
    async renderArtifacts(ws) {
      mustSh("npm", ["run", "ma:render"], { cwd: path.join(ws.dir, APP_DIR) });
      sh("git", ["-C", ws.dir, "add", `${APP_DIR}/agents`]);
      sh("git", ["-C", ws.dir, "commit", "-m", "chore(ma): render artifacts"]); // 変更なしなら fail → 無視
    },
    async collectDiff(ws) {
      const files = mustSh("git", ["-C", ws.dir, "diff", "--name-only", "origin/main...HEAD"])
        .split("\n").map((s) => s.trim()).filter(Boolean);
      const diffText = mustSh("git", ["-C", ws.dir, "diff", "origin/main...HEAD"]);
      return { files, diffText };
    },
    async runChecks(ws) {
      const app = path.join(ws.dir, APP_DIR);
      const jest = sh("npx", ["jest", "--silent"], { cwd: app, env: { IN_MEMORY_FALLBACK: "true" }, timeoutMs: 900_000 });
      if (!jest.ok) return { ok: false, output: `jest:\n${jest.out.slice(-1500)}` };
      const tsc = sh("npx", ["tsc", "-p", "src/tsconfig.json", "--noEmit"], { cwd: app });
      if (!tsc.ok) return { ok: false, output: `tsc:\n${tsc.out.slice(-1500)}` };
      return { ok: true, output: "jest+tsc green" };
    },
    async runReviewer(ws, p, diff) {
      const r = runClaude(ws.dir, buildReviewerPrompt(p, diff.diffText), REVIEW_TOOLS);
      try {
        const m = r.log.match(/\{[^{}]*"verdict"[^{}]*\}/s);
        const j = JSON.parse(m ? m[0] : "");
        if (j.verdict === "APPROVE" || j.verdict === "REJECT") {
          return { verdict: j.verdict, reasons: Array.isArray(j.reasons) ? j.reasons.map(String) : [] };
        }
      } catch { /* fail-closed へ */ }
      return { verdict: "REJECT", reasons: ["reviewer 出力を JSON 解釈できない（fail-closed）"] };
    },
    async pushAndCreatePr(ws, pr, draft) {
      mustSh("git", ["-C", ws.dir, "push", "-u", "origin", ws.branch]);
      const args = ["pr", "create", "--title", pr.title, "--body", pr.body, "--base", "main", "--head", ws.branch];
      if (draft) args.push("--draft");
      const out = mustSh("gh", args, { cwd: ws.dir });
      return { prUrl: out.trim().split("\n").pop()!.trim() };
    },
    async mergePr(prUrl) {
      mustSh("gh", ["pr", "merge", prUrl, "--squash"], { cwd: MAIN_REPO });
      const view = JSON.parse(mustSh("gh", ["pr", "view", prUrl, "--json", "mergeCommit"], { cwd: MAIN_REPO }));
      return { sha: view.mergeCommit.oid as string };
    },
    async deploy(files) {
      const app = path.join(MAIN_REPO, APP_DIR);
      mustSh("git", ["-C", MAIN_REPO, "pull", "origin", "main"]); // main repo は main 前提（終了儀式）
      const deployed: ("ma-bootstrap" | "wrangler")[] = [];
      let maVersions: Record<string, string> | undefined;
      if (needsMaBootstrap(files)) {
        mustSh("npm", ["run", "ma:bootstrap"], { cwd: app, timeoutMs: 300_000 });
        const { data } = await sb.from("ma_agents").select("agent_key, version"); // Step1 で実カラム名に合わせる
        maVersions = Object.fromEntries(((data ?? []) as { agent_key: string; version: string }[]).map((r) => [r.agent_key, r.version]));
        deployed.push("ma-bootstrap");
      }
      if (needsWranglerDeploy(files)) {
        mustSh("npm", ["ci"], { cwd: app, timeoutMs: 600_000 });   // 依存 drift 防止（memory 方針）
        mustSh("npm", ["run", "worker:deploy"], { cwd: app, timeoutMs: 300_000 });
        deployed.push("wrangler");
      }
      return { deployed, maVersions };
    },
    async cleanupWorkspace(ws, keepBranch) {
      sh("git", ["-C", MAIN_REPO, "worktree", "remove", "--force", ws.dir]);
      if (!keepBranch) sh("git", ["-C", MAIN_REPO, "branch", "-D", ws.branch]);
      sh("git", ["-C", MAIN_REPO, "worktree", "prune"]);
    },
    async markApplied(id, metaPatch) {
      const { data: cur } = await sb.from("optimizer_proposal").select("meta").eq("id", id).single();
      const meta = { ...((cur?.meta as Record<string, unknown>) ?? {}), ...metaPatch };
      const { error } = await sb.from("optimizer_proposal")
        .update({ implemented: true, implemented_at: new Date().toISOString(), meta }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    async markStatus(id, applyStatus, note) {
      const { data: cur } = await sb.from("optimizer_proposal").select("meta").eq("id", id).single();
      const meta = { ...((cur?.meta as Record<string, unknown>) ?? {}), apply_status: applyStatus, apply_note: note };
      const { error } = await sb.from("optimizer_proposal").update({ meta }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    async notify(msg) {
      console.log(`[notify] ${msg}`);
      const token = process.env.LINE_CHANNEL_ACCESS_TOKEN, user = process.env.LINE_USER_ID_OFMETON;
      if (token && user) await pushLine(user, msg, token).catch((e) => console.warn("LINE failed:", String(e)));
    },
  };
}

// ---- main
(async () => {
  const args = process.argv.slice(2);
  const flag = (n: string) => args.includes(n);
  const opt = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };

  if (existsSync(LOCK)) { console.error(`多重起動防止 lock が存在: ${LOCK}（異常終了の残骸なら手動削除）`); process.exit(2); }
  writeFileSync(LOCK, String(process.pid));
  try {
    const deps = defaultCodeApplyDeps();
    const rbId = opt("--rollback");
    if (rbId) {
      const rbDeps: CodeRollbackDeps = {
        createWorkspace: deps.createWorkspace, collectDiff: deps.collectDiff, runChecks: deps.runChecks,
        pushAndCreatePr: deps.pushAndCreatePr, mergePr: deps.mergePr, deploy: deps.deploy,
        cleanupWorkspace: deps.cleanupWorkspace, renderArtifacts: deps.renderArtifacts, notify: deps.notify,
        async getRollbackHandle(id) {
          const { data } = await sb.from("optimizer_proposal").select("meta").eq("id", id).single();
          return ((data?.meta as { rollback_handle?: never } | null)?.rollback_handle ?? null);
        },
        async revertCommit(ws: Workspace, sha: string) { mustSh("git", ["-C", ws.dir, "revert", "--no-edit", sha]); },
        async markRolledBack(id) {
          const { error } = await sb.from("optimizer_proposal")
            .update({ rollback: true, rollback_at: new Date().toISOString() }).eq("id", id);
          if (error) throw new Error(error.message);
        },
      };
      const r = await runCodeRollback(rbId, rbDeps);
      console.log(JSON.stringify(r));
      process.exitCode = r.ok ? 0 : 1;
      return;
    }
    const result = await runCodeApply(deps, {
      dryRun: flag("--dry-run"),
      cap: opt("--cap") ? Number(opt("--cap")) : 3,
      onlyId: opt("--id"),
    });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.errors > 0 ? 1 : 0;
  } finally {
    unlinkSync(LOCK);
  }
})();
```

- [ ] **Step 3: package.json に script 追加**

`apps/x-account-system/package.json` の scripts に（`"budget"` 行の近くへ）:

```json
    "apply-code": "tsx scripts/optimizer-apply-code.ts",
```

- [ ] **Step 4: 型・既存テスト確認**

Run: `cd apps/x-account-system && npx tsc -p src/tsconfig.json --noEmit && IN_MEMORY_FALLBACK=true npx jest lib/optimizer-apply-code`
Expected: tsc 0 errors・jest 全 PASS

（tsconfig は `**/*.ts` include なので scripts/ も型検査対象。CLI が型エラーを出さないこと）

- [ ] **Step 5: Commit**

```bash
git add apps/x-account-system/scripts/optimizer-apply-code.ts apps/x-account-system/package.json
git commit -m "feat(xad/apply-code): CLI runner (claude -p/gh/wrangler/ant 配線・lock・dry-run/rollback)"
```

---

## Task 6: skill `.claude/skills/x-optimizer-apply-code/SKILL.md`

**Files:**
- Create: `.claude/skills/x-optimizer-apply-code/SKILL.md`（repo 直下）

- [ ] **Step 1: SKILL.md を書く**

```markdown
---
name: x-optimizer-apply-code
description: X発信システム optimizer の accepted 提案（tier-config/tier-prompt）を apply-code runner で自動コード適用する。coding agent 編集→allowlist/test/review ゲート→squash merge→deploy(ma:bootstrap/wrangler)→DB記録→LINE通知まで1コマンド。ユーザーが「提案を適用して」「accepted を反映して」「apply-code 回して」「提案をコードに落として」等と依頼したとき起動する。tier-T(DB数値)は worker 側 optimizer-apply job（runner が enqueue も発火する）。
---

# x-optimizer-apply-code — accepted 提案の自動コード適用

## 実行

​```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/apps/x-account-system
npm run apply-code                      # 既定: cap 3 件
npm run apply-code -- --dry-run         # merge せずゲートまで検証
npm run apply-code -- --id <uuid>       # 1 件だけ
npm run apply-code -- --rollback <uuid> # applied_code の可逆復元
​```

## 前提（実行前に確認）

- main repo が `main` ブランチ・クリーンであること（runner は deploy 時に main を pull する）
- `claude` / `gh` / `wrangler whoami` / `ant` がログイン済み
- creds は `apps/x-account-system/.env.local`（main repo 側）

## 挙動の要点

- 人間ゲートは dashboard `/proposals` の accept のみ。runner は accepted ∧ tier∈{config,prompt} だけ処理
- 安全境界: allowlist 7 SSOT ファイル＋ma:render 成果物＋同 dir テストのみ編集可。逸脱・死守トークン・test/tsc 赤・review REJECT（修正1回後）は draft PR 保留＋LINE 人間送り
- deploy 失敗は merge 済み未反映＝🚨 LINE が来る。手動で `npm run ma:bootstrap` / `npm run worker:deploy`
- 結果（PR URL・outcome）は LINE と stdout の JSON で報告

## 終了後の報告

実行結果 JSON を要約し、applied / pr_pending / blocked / errors と各 PR URL をユーザーへ報告する。pr_pending がある場合は draft PR の人間レビューを促す。
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/x-optimizer-apply-code/SKILL.md
git commit -m "feat(skills): x-optimizer-apply-code（提案適用 runner の自動起動）"
```

---

## Task 7: 検証 ＋ 本番実証（人間確認ポイント）

**Files:** なし（検証のみ）

- [ ] **Step 1: 全テスト緑（verification-before-completion）**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/optimizer-apply-code && npx tsc -p src/tsconfig.json --noEmit`
Expected: 全 PASS・0 errors。出力を貼って確認。

- [ ] **Step 2: dry-run で配線検証（本番 DB read + claude/gh 不使用経路）**

Run: `cd apps/x-account-system && npm run apply-code -- --dry-run --cap 1`
accepted な config/prompt 提案が 0 件なら `processed: 0` の JSON と LINE 通知が出る＝env/DB/lock/enqueue 配線の検証になる。enqueue は本番 worker に飛ぶ（tier-T 対象も 0 件なら no-op）。

- [ ] **Step 3: PR 作成・merge**

`superpowers:finishing-a-development-branch` で PR 作成（auto-merge 既定）。PR 本文にテスト結果と dry-run 出力を貼る。

- [ ] **Step 4: 本番実証（merge 後・人間と対話しながら）**

1. dashboard `/proposals` で安全な config/prompt 提案を 1 件 accept（例: collector watchlist 追加系）。無ければ optimizer-analyst を enqueue して新提案を待つか、検証用提案を insert→accept→最後に削除（4B-1 実証と同様の throwaway 方式）
2. `npm run apply-code -- --id <uuid>` 実行 → coding agent の編集 → ゲート → PR → merge → deploy/ma:bootstrap → DB（implemented・rollback_handle）→ LINE を確認
3. `npm run apply-code -- --rollback <uuid>` → revert PR → merge → 再 deploy → `rollback=true` を確認（フル可逆性実証）
4. 結果を memory `project_x_optimizer_redesign` に反映

---

## Self-Review

- Spec「ローカル1コマンド runner」→ Task 5 CLI ＋ Task 6 skill ✅
- Spec「enqueue 発火（tier-T は worker）」→ `runCodeApply` 冒頭・fail-open ✅
- Spec「🔒再検証」→ `applyOne` の `validateProposalSafe`（4B-1 再利用）✅
- Spec「決定的ゲート（allowlist/死守トークン/jest/tsc）」→ Task 2 ＋ `runGates` ✅（tsc は確認済みクリーン baseline `-p src/tsconfig.json`）
- Spec「review agent・REJECT→修正1回→人間送り」→ `applyOne` ＋ テスト ✅
- Spec「全自動 merge・不合格は draft PR + pr_pending + LINE」→ ✅
- Spec「deploy 分岐（prompts→ma:render/bootstrap・config→npm ci+wrangler）」→ Task 2 判定 ＋ Task 5 `deploy` ✅。render 成果物は worktree 内で runner が commit（allowlist に ARTIFACT_PREFIX）✅
- Spec「rollback_handle={git_sha, ma_versions, pr_url}・`--rollback`」→ `markApplied` ＋ `runCodeRollback` ✅
- Spec「deploy 失敗 = merge済み未反映の🚨通知・revert しない」→ `applyOne` の deploy catch ✅
- Spec「lock・cap 3・直列・fail-open」→ CLI lock ＋ `cap ?? 3` ＋ for 直列 ＋ per-proposal catch ✅
- Spec「4B-1 の skipped_manual も拾う」→ `loadTargets` filter ✅
- Spec「agent に push/merge/deploy 権限を与えない」→ `IMPLEMENT_TOOLS`/`REVIEW_TOOLS` に push/gh/wrangler なし ✅
- Spec「コスト: claude -p サブスク内」→ `--model claude-opus-4-8` 明示（Fable 既定を踏まない）✅
- 型整合: `CodeApplyDeps` のシグネチャは Task 1 定義を Task 4/5 で一貫使用。`pushAndCreatePr(ws, {title,body}, draft)` 形で統一 ✅
- 検証ステップ: ma_agents カラム名の実機確認（Task 5 Step 1）・dry-run 配線検証（Task 7 Step 2）✅

**プラン外（spec の v2 候補のまま）**: editor 閾値 / AGENT_MANIFESTS / compose テンプレ / PR CI（GH Actions）。
