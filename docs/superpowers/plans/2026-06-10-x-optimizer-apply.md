# X optimizer 提案の実行（Stage 4：4A + 4B-1）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** optimizer の蓄積提案を人間が dashboard で accept→自動適用する実行系（レビューUI＋apply-engine 基盤＋tier-T数値適用）を作り、自己改善ループを閉じる。

**Architecture:** 2B 承認フローと同型の提案レビューUI（accept 時に reviewer が任意で構造化変更 `{paramId,value}` を付与）＋ queue job `optimizer-apply`（cron無・enqueue のみ）の apply-engine。engine は accepted 提案を ①🔒検証ゲートで安全領域をブロック ②tier 判定（T=数値DB / config / prompt / noop / blocked）③tier-T のみ snapshot 付きで Beta posterior の平均を guard 内に再パラメータ化して適用。config/prompt は手動推奨へルーティング（4B-2 で自動化）、measurement/anomaly/operational は no-op acknowledgment。全 apply は optimizer_state snapshot で可逆。

**Tech Stack:** TypeScript / Cloudflare Workers（x-account-system）/ Next.js App Router（xad-dashboard）/ Supabase Postgres（schema `xad`）/ jest（x-account-system, `IN_MEMORY_FALLBACK=true`）/ vitest（dashboard）/ Thompson Sampling state-store。

**確定方針（要件）:**
- accept がゲート。optimizer は勝手に apply しない。
- tier-T の「実際の数値適用」は **reviewer が accept 時に構造 `{paramId, value}` を付与**して成立（ユーザー確定 2026-06-10）。付与なし＝no-op acknowledgment。
- 🔒 不可侵（FORBIDDEN_PHRASES / SAFETY_GUARDRAILS / first_hand 下限 / industry_sop 下限 / AI画像上限 / hashtag / failure cap）はコードでブロック。疑わしきはブロック（手動送り）。
- 全 apply は optimizer_state snapshot で可逆。

---

## File Structure（作成 / 変更）

**x-account-system（`apps/x-account-system/`）— apply-engine 基盤:**
- `lib/optimizer-apply/types.ts`（新規）— `ProposalRow` / `ApplyDescriptor` / `Tier` / `ApplyDeps` / `ApplyEngineResult`。
- `lib/optimizer-apply/validation.ts`（新規）— `TIER_T_PARAM_IDS` / `getApplyDescriptor` / `validateProposalSafe` / `classifyTier`。安全回帰の要。
- `lib/optimizer-apply/tier-t.ts`（新規）— `resolvePosterior` / `clipToGuard` / `setBetaMean` / `applyTierT`。
- `lib/optimizer-apply/rollback.ts`（新規）— `rollbackProposal`。
- `lib/optimizer-apply/apply-engine.ts`（新規）— `runApplyEngine` / `defaultApplyDeps`。
- 各 `*.test.ts`（新規）。
- `src/worker.ts`（変更）— `JobMessage` に `"optimizer-apply"`、`CRON_JOBS_BY_NAME` に追加（cron無）。
- `src/queue.ts`（変更）— `case "optimizer-apply"`。
- `lib/safety/brownout-handler.ts`（変更）— `ALL_JOBS` ＋ `STOP_POSTING_ALLOWED` に追加（cron_halt/escalate には入れない）。
- `src/queue-brownout.test.ts`（変更）— optimizer-apply の brownout テスト。

**xad-dashboard（`apps/xad-dashboard/`）— 4A レビューUI:**
- `lib/proposals-queries.ts`（新規）— `ProposalRow` / `listPendingProposals` / `setProposalDecision`。
- `lib/proposals-queries.test.ts`（新規）。
- `app/api/proposals/decide/route.ts`（新規）— accept/reject ＋ reason ＋ apply 転送。
- `app/proposals/page.tsx` / `ProposalsClient.tsx` / `ProposalCard.tsx`（新規）。
- `app/components/NavBar.tsx`（変更）— `/proposals` リンク追加。

**migration:**
- `apps/x-account-system/migrations/0024_proposal_decision.sql`（新規）— RPC `xad.set_proposal_decision`。新列は不要（`optimizer_proposal` は accepted/implemented/implemented_at/reviewer_reason/rollback/rollback_at/meta を既保有）。

---

## 既存資産メモ（実装時の参照）

`xad.optimizer_proposal`（`migrations/0004_style_guide_optimizer.sql`）の列:
`id uuid, created_at, proposal_type text CHECK in (anomaly_alert|operational_friction|measurement_request|config_change|structural_change), scope text, hypothesis text, evidence jsonb, rank text CHECK in (A|B|C), accepted boolean, implemented boolean, implemented_at timestamptz, rollback boolean default false, rollback_at timestamptz, business_effect numeric, reviewer_reason text, meta jsonb default '{}'`。

`lib/optimizer/types.ts` の `OptimizerState`:
- `postingTime.{morning,noon,afternoon,evening,midnight}` = 各 `ParameterPosterior`（Beta）。
- `hookDistribution.{number_lead,negation_lead,question_lead,emotion_lead,authority_lead,promise_lead,other,failure_story_verified_cap_per_month}`。
- `xFormatRatio.{short,medium,long,thread}`（Beta）。
- `ParameterPosterior = { paramId, distType: "beta"|"dirichlet"|"discrete", params: Record<string, number|number[]>, categories?, meta? }`。Beta は `params.alpha` / `params.beta`。

`lib/optimizer/guards.ts` の `GUARD_RULES`（export 配列・`{paramId, lowerBound?, upperBound?, monthlyCap?, fixedValue?, note}`）。tier-T 対象 paramId とレンジ:
- `posting_time_{morning,noon,afternoon,evening,midnight}`: 0.05–0.40。
- `hook_{number,negation,question,emotion,authority,promise}_lead` ＋ `hook_other`: 0.05–0.30。
- `xfmt_short` 0.30–0.60 / `xfmt_medium` 0.15–0.35 / `xfmt_long` 0.05–0.20 / `xfmt_thread` 0.05–0.20。
- 🔒（apply不可）: `hook_failure_story_verified_cap_per_month`(monthlyCap 4) / `content_axis.first_hand`(≥0.3) / `industry_sop_rate`(≥5/30) / `hashtag_count`(fixed 0) / `visualizer_image_ai_generated`(≤0.1)。

`lib/optimizer/state-store.ts`:
- `loadOptimizerState(now?: Date): Promise<OptimizerState>`
- `saveOptimizerState(state: OptimizerState): Promise<void>`
- `snapshotState(timestamp?: Date): Promise<{ snapshotId: string }>`（現行 saved state を snapshot）
- `rollbackToSnapshot(snapshotId: string): Promise<OptimizerState>`
- `IN_MEMORY_FALLBACK=true` で in-memory 切替（テストはこれ）。

x-account-system のテストは `import "./foo.ts"`（拡張子付き）＋ `jest.mock("./state-store.ts")`。queue.ts の動的 import は `.js`（例 `import("../lib/optimizer-analyst/run-analyst.js")`）。dashboard は vitest。

---

## Task 1: migration 0024 — RPC `set_proposal_decision`

**Files:**
- Create: `apps/x-account-system/migrations/0024_proposal_decision.sql`

- [ ] **Step 1: migration SQL を書く**

`apps/x-account-system/migrations/0024_proposal_decision.sql`:

```sql
-- Stage 4 (4A): 提案レビュー accept/reject の記録 RPC。
-- 2B の set_approval_status と同型。新列は不要（optimizer_proposal は既保有）。
-- accept 時に reviewer が任意で tier-T 構造化変更 {paramId, value} を meta.apply に付与できる。

drop function if exists xad.set_proposal_decision(uuid[], boolean, text, jsonb);

create or replace function xad.set_proposal_decision(
  p_ids      uuid[],
  p_accepted boolean,
  p_reason   text  default null,
  p_apply    jsonb default null
)
returns integer language plpgsql as $$
declare
  n integer;
begin
  -- 境界ガード: p_apply は object（{paramId, value}）か null のみ
  if p_apply is not null and jsonb_typeof(p_apply) <> 'object' then
    raise exception 'p_apply must be a jsonb object';
  end if;

  with claimed as (
    update xad.optimizer_proposal pr
       set accepted        = p_accepted,
           reviewer_reason = coalesce(p_reason, pr.reviewer_reason),
           meta            = case
                               when p_apply is not null
                               then jsonb_set(coalesce(pr.meta, '{}'::jsonb), '{apply}', p_apply, true)
                               else pr.meta
                             end
     where pr.id = any(p_ids)
       and pr.implemented is not true   -- 適用済みは変更不可
    returning pr.id
  )
  select count(*) into n from claimed;
  return n;
end $$;

grant execute on function xad.set_proposal_decision(uuid[], boolean, text, jsonb) to service_role;
```

- [ ] **Step 2: ローカル検証は不要（本番適用は実装完了後に人間確認の上 MCP/CLI で）。SQL 構文を目視確認**

migration は本番 DB へ手動適用（人間確認必須）。この Task では **ファイル作成のみ**。実適用は最終検証フェーズ。

- [ ] **Step 3: Commit**

```bash
git add apps/x-account-system/migrations/0024_proposal_decision.sql
git commit -m "feat(xad/optimizer-apply): migration 0024 set_proposal_decision RPC"
```

---

## Task 2: dashboard `lib/proposals-queries.ts`

**Files:**
- Create: `apps/xad-dashboard/lib/proposals-queries.ts`
- Test: `apps/xad-dashboard/lib/proposals-queries.test.ts`

参照: `apps/xad-dashboard/lib/drafts-queries.ts`（`listPendingDrafts` / `setApprovalStatus`）と `lib/supabase.ts`（`serverSupabase()` / `_testClient` 差し込み）。

- [ ] **Step 1: 失敗するテストを書く**

`apps/xad-dashboard/lib/proposals-queries.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { __setTestClient } from "./supabase";
import { listPendingProposals, setProposalDecision } from "./proposals-queries";

function makeClient(over: Record<string, unknown> = {}) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [{ id: "p1", proposal_type: "config_change", scope: "lever_bandit", hypothesis: "h", evidence: {}, rank: "A", accepted: null, implemented: null, reviewer_reason: null, meta: {} }], error: null }),
    }),
    rpc: vi.fn().mockResolvedValue({ data: 2, error: null }),
    ...over,
  };
}

describe("proposals-queries", () => {
  beforeEach(() => __setTestClient(makeClient() as never));

  it("listPendingProposals が pending(accepted is null) を rank 順で返す", async () => {
    const rows = await listPendingProposals();
    expect(rows[0].id).toBe("p1");
  });

  it("setProposalDecision が RPC set_proposal_decision を 4 引数で呼ぶ", async () => {
    const client = makeClient();
    __setTestClient(client as never);
    const n = await setProposalDecision(["p1"], true, "良い", { paramId: "posting_time_evening", value: 0.28 });
    expect(n).toBe(2);
    expect(client.rpc).toHaveBeenCalledWith("set_proposal_decision", {
      p_ids: ["p1"], p_accepted: true, p_reason: "良い", p_apply: { paramId: "posting_time_evening", value: 0.28 },
    });
  });
});
```

- [ ] **Step 2: テストを実行して fail を確認**

Run: `cd apps/xad-dashboard && npx vitest run lib/proposals-queries.test.ts`
Expected: FAIL（`proposals-queries` モジュール未存在 / `__setTestClient` 未 export なら supabase.ts も要確認）

注: `lib/supabase.ts` に test client 差し込み口（`_testClient` / `__setTestClient`）が無い場合は、`drafts-queries.test.ts` がどう client を mock しているかに合わせる（既存テストのパターン踏襲）。

- [ ] **Step 3: 実装を書く**

`apps/xad-dashboard/lib/proposals-queries.ts`:

```ts
import { serverSupabase } from "./supabase";

export type ProposalRow = {
  id: string;
  proposal_type: string;
  scope: string;
  hypothesis: string;
  evidence: Record<string, unknown>;
  rank: "A" | "B" | "C" | null;
  accepted: boolean | null;
  implemented: boolean | null;
  reviewer_reason: string | null;
  meta: Record<string, unknown> | null;
};

export type ApplyDescriptor = { paramId: string; value: number };

const COLS =
  "id, proposal_type, scope, hypothesis, evidence, rank, accepted, implemented, reviewer_reason, meta";

/** 未レビュー（accepted is null）の提案を rank(A→B→C)・新しい順で返す。 */
export async function listPendingProposals(limit = 100): Promise<ProposalRow[]> {
  const sb = serverSupabase();
  const { data, error } = await sb
    .from("optimizer_proposal")
    .select(COLS)
    .is("accepted", null)
    .order("rank", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listPendingProposals failed: ${error.message}`);
  return (data ?? []) as ProposalRow[];
}

/** accept/reject を記録。accept 時に任意で tier-T 構造化変更を meta.apply へ。 */
export async function setProposalDecision(
  ids: string[],
  accepted: boolean,
  reason?: string | null,
  apply?: ApplyDescriptor | null,
): Promise<number> {
  const sb = serverSupabase();
  const { data, error } = await sb.rpc("set_proposal_decision", {
    p_ids: ids,
    p_accepted: accepted,
    p_reason: reason ?? null,
    p_apply: apply ?? null,
  });
  if (error) throw new Error(`setProposalDecision failed: ${error.message}`);
  return (data as number) ?? 0;
}
```

注: `.limit()` をチェーン末尾に置いたため、テストの mock は `order` が thenable を返す形にしている。実 supabase クライアントは `limit` 後に await される。テストが `order` 解決で完結している点に注意し、必要なら mock に `limit` を加える（実装に合わせ調整）。

- [ ] **Step 4: テストを実行して pass を確認**

Run: `cd apps/xad-dashboard && npx vitest run lib/proposals-queries.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/xad-dashboard/lib/proposals-queries.ts apps/xad-dashboard/lib/proposals-queries.test.ts
git commit -m "feat(xad-dashboard): proposals-queries (listPendingProposals/setProposalDecision)"
```

---

## Task 3: dashboard API route `/api/proposals/decide`

**Files:**
- Create: `apps/xad-dashboard/app/api/proposals/decide/route.ts`

参照: `apps/xad-dashboard/app/api/drafts/approve/route.ts`（body 検証・reason 2000字上限・RPC 転送・console.info ログ）。

- [ ] **Step 1: route を実装する**

`apps/xad-dashboard/app/api/proposals/decide/route.ts`:

```ts
import { NextResponse } from "next/server";
import { setProposalDecision, type ApplyDescriptor } from "../../../../lib/proposals-queries";
import { TIER_T_PARAM_IDS } from "../../../../lib/proposal-tier-t-params";

export const dynamic = "force-dynamic";

function validateApply(raw: unknown): { ok: true; value: ApplyDescriptor | null } | { ok: false; error: string } {
  if (raw == null) return { ok: true, value: null };
  if (typeof raw !== "object") return { ok: false, error: "apply は object で指定してください" };
  const o = raw as Record<string, unknown>;
  if (typeof o.paramId !== "string" || typeof o.value !== "number") {
    return { ok: false, error: "apply は {paramId:string, value:number} 形式で指定してください" };
  }
  if (!(TIER_T_PARAM_IDS as readonly string[]).includes(o.paramId)) {
    return { ok: false, error: `apply.paramId は tier-T 許可レバーのみ: ${o.paramId}` };
  }
  if (o.value < 0 || o.value > 1) {
    return { ok: false, error: "apply.value は 0〜1 の比率で指定してください" };
  }
  return { ok: true, value: { paramId: o.paramId, value: o.value } };
}

export async function POST(req: Request) {
  let body: { ids?: string[]; decision?: "accept" | "reject"; reason?: unknown; apply?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const ids = body.ids ?? [];
  const decision = body.decision;
  if (!decision || !["accept", "reject"].includes(decision) || ids.length === 0) {
    return NextResponse.json({ error: "ids/decision required" }, { status: 400 });
  }
  const accepted = decision === "accept";

  // reason: 任意（2000字上限）
  let reason: string | null = null;
  if (body.reason != null) {
    if (typeof body.reason !== "string") {
      return NextResponse.json({ error: "reason は文字列で指定してください" }, { status: 400 });
    }
    const trimmed = body.reason.trim();
    if (trimmed.length > 2000) {
      return NextResponse.json({ error: `reason が長すぎます（${trimmed.length}/2000字）` }, { status: 400 });
    }
    reason = trimmed.length > 0 ? trimmed : null;
  }

  // apply: accept かつ単一提案のときのみ
  let apply: ApplyDescriptor | null = null;
  if (body.apply != null) {
    if (!accepted || ids.length !== 1) {
      return NextResponse.json({ error: "apply は単一提案の accept 時のみ指定できます" }, { status: 400 });
    }
    const v = validateApply(body.apply);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    apply = v.value;
  }

  try {
    const updated = await setProposalDecision(ids, accepted, reason, apply);
    console.info(JSON.stringify({ level: "info", msg: "[proposals/decide]", decision, ids: ids.length, updated, has_reason: reason != null, has_apply: apply != null }));
    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    console.error(JSON.stringify({ level: "error", msg: "[proposals/decide] failed", err: String(e) }));
    return NextResponse.json({ error: "decision failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: tier-T paramId allowlist を共有モジュール化**

`apps/xad-dashboard/lib/proposal-tier-t-params.ts`（dashboard と engine で重複定義しないため dashboard 側にも置く。SSOT は engine の `validation.ts` だが Next.js から x-account-system を import できないので同値をミラー。コメントで明記）:

```ts
// SSOT: apps/x-account-system/lib/optimizer-apply/validation.ts TIER_T_PARAM_IDS のミラー。
// 変更時は両方同期すること（dashboard は x-account-system を import できないため）。
export const TIER_T_PARAM_IDS = [
  "posting_time_morning", "posting_time_noon", "posting_time_afternoon", "posting_time_evening", "posting_time_midnight",
  "hook_number_lead", "hook_negation_lead", "hook_question_lead", "hook_emotion_lead", "hook_authority_lead", "hook_promise_lead", "hook_other",
  "xfmt_short", "xfmt_medium", "xfmt_long", "xfmt_thread",
] as const;
```

- [ ] **Step 3: ビルド確認**

Run: `cd apps/xad-dashboard && npx tsc --noEmit`
Expected: 型エラーなし（相対 import の階層数 `../../../../` を実ファイル位置で要確認・調整）

- [ ] **Step 4: Commit**

```bash
git add apps/xad-dashboard/app/api/proposals/decide/route.ts apps/xad-dashboard/lib/proposal-tier-t-params.ts
git commit -m "feat(xad-dashboard): /api/proposals/decide route + tier-T param allowlist"
```

---

## Task 4: dashboard UI `app/proposals/`

**Files:**
- Create: `apps/xad-dashboard/app/proposals/page.tsx`
- Create: `apps/xad-dashboard/app/proposals/ProposalsClient.tsx`
- Create: `apps/xad-dashboard/app/proposals/ProposalCard.tsx`
- Modify: `apps/xad-dashboard/app/components/NavBar.tsx`

参照: `app/approval/{page,ApprovalClient,DraftCard}.tsx`。UI 実装は `ui-ux-pro-max` の指針に沿う（既存 dashboard のトーンに合わせ、過剰演出しない）。

- [ ] **Step 1: page.tsx（SSR entry）**

`apps/xad-dashboard/app/proposals/page.tsx`:

```tsx
import { listPendingProposals } from "../../lib/proposals-queries";
import { ProposalsClient } from "./ProposalsClient";

export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  const proposals = await listPendingProposals();
  return (
    <main style={{ padding: 24, maxWidth: 920, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>optimizer 提案レビュー</h1>
      <p style={{ color: "#666", fontSize: 13, marginBottom: 20 }}>
        未レビューの提案。accept すると apply-engine が処理（tier-T は構造を付与すると数値適用、それ以外は記録のみ）。
      </p>
      <ProposalsClient initial={proposals} />
    </main>
  );
}
```

- [ ] **Step 2: ProposalsClient.tsx**

`apps/xad-dashboard/app/proposals/ProposalsClient.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProposalRow, ApplyDescriptor } from "../../lib/proposals-queries";
import { ProposalCard } from "./ProposalCard";

export function ProposalsClient({ initial }: { initial: ProposalRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(id: string, decision: "accept" | "reject", reason: string, apply: ApplyDescriptor | null) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch("/api/proposals/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id], decision, reason: reason || undefined, apply: apply || undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  if (initial.length === 0) {
    return <p style={{ color: "#888" }}>未レビューの提案はありません。</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && <div style={{ color: "#c00", fontSize: 13 }}>エラー: {error}</div>}
      {initial.map((p) => (
        <ProposalCard key={p.id} proposal={p} busy={busy === p.id} onDecide={decide} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: ProposalCard.tsx**

`apps/xad-dashboard/app/proposals/ProposalCard.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { ProposalRow, ApplyDescriptor } from "../../lib/proposals-queries";
import { TIER_T_PARAM_IDS } from "../../lib/proposal-tier-t-params";

export function ProposalCard({
  proposal,
  busy,
  onDecide,
}: {
  proposal: ProposalRow;
  busy: boolean;
  onDecide: (id: string, decision: "accept" | "reject", reason: string, apply: ApplyDescriptor | null) => void;
}) {
  const [reason, setReason] = useState("");
  const [paramId, setParamId] = useState("");
  const [value, setValue] = useState("");

  const apply: ApplyDescriptor | null =
    paramId && value !== "" && !Number.isNaN(Number(value))
      ? { paramId, value: Number(value) }
      : null;

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, background: "#eef", padding: "2px 8px", borderRadius: 4 }}>
          rank {proposal.rank ?? "-"}
        </span>
        <span style={{ fontSize: 12, color: "#666" }}>{proposal.proposal_type}</span>
        <span style={{ fontSize: 12, color: "#999" }}>scope: {proposal.scope}</span>
      </div>
      <p style={{ fontSize: 14, marginBottom: 8 }}>{proposal.hypothesis}</p>
      <details style={{ marginBottom: 12 }}>
        <summary style={{ cursor: "pointer", fontSize: 12, color: "#555" }}>evidence</summary>
        <pre style={{ fontSize: 11, background: "#f7f7f7", padding: 8, borderRadius: 4, overflowX: "auto" }}>
          {JSON.stringify(proposal.evidence, null, 2)}
        </pre>
      </details>

      <details style={{ marginBottom: 12 }}>
        <summary style={{ cursor: "pointer", fontSize: 12, color: "#555" }}>
          tier-T 数値適用（任意・accept 時のみ）
        </summary>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <select value={paramId} onChange={(e) => setParamId(e.target.value)} style={{ fontSize: 13, padding: 4 }}>
            <option value="">（適用しない）</option>
            {TIER_T_PARAM_IDS.map((id) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
          <input
            type="number" step="0.01" min="0" max="1" placeholder="比率 0〜1"
            value={value} onChange={(e) => setValue(e.target.value)}
            style={{ fontSize: 13, padding: 4, width: 120 }}
          />
        </div>
        {apply && (
          <p style={{ fontSize: 11, color: "#0a0", marginTop: 4 }}>
            適用予定: {apply.paramId} = {apply.value}（guard 範囲外は自動 clip）
          </p>
        )}
      </details>

      <textarea
        placeholder="理由（任意）" value={reason} onChange={(e) => setReason(e.target.value)}
        style={{ width: "100%", minHeight: 48, fontSize: 13, padding: 8, marginBottom: 8 }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button
          disabled={busy}
          onClick={() => onDecide(proposal.id, "accept", reason, apply)}
          style={{ padding: "8px 16px", background: "#0a7", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
        >
          accept
        </button>
        <button
          disabled={busy}
          onClick={() => onDecide(proposal.id, "reject", reason, null)}
          style={{ padding: "8px 16px", background: "#c44", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
        >
          reject
        </button>
        {busy && <span style={{ fontSize: 12, color: "#888", alignSelf: "center" }}>処理中…</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: NavBar に `/proposals` リンクを追加**

`apps/xad-dashboard/app/components/NavBar.tsx` の `NAV` 配列に追加（`承認` の後）:

```tsx
  { href: "/approval", label: "承認" },
  { href: "/proposals", label: "提案" },
  { href: "/schedule", label: "スケジュール" },
```

- [ ] **Step 5: ビルド確認**

Run: `cd apps/xad-dashboard && npx tsc --noEmit && npx next build` （build が重い場合は `tsc --noEmit` のみで可）
Expected: 型エラーなし

- [ ] **Step 6: Commit**

```bash
git add apps/xad-dashboard/app/proposals apps/xad-dashboard/app/components/NavBar.tsx
git commit -m "feat(xad-dashboard): 提案レビューUI (proposals page + accept/reject + tier-T apply 付与)"
```

---

## Task 5: `lib/optimizer-apply/types.ts`

**Files:**
- Create: `apps/x-account-system/lib/optimizer-apply/types.ts`

- [ ] **Step 1: 型を定義する**

`apps/x-account-system/lib/optimizer-apply/types.ts`:

```ts
import type { OptimizerState } from "../optimizer/types.ts";

/** optimizer_proposal の 1 行（apply-engine が読む列）。 */
export type ProposalRow = {
  id: string;
  proposal_type: string;
  scope: string;
  hypothesis: string;
  evidence: Record<string, unknown>;
  rank: "A" | "B" | "C" | null;
  accepted: boolean | null;
  implemented: boolean | null;
  reviewer_reason: string | null;
  meta: Record<string, unknown> | null;
};

/** reviewer が accept 時に付与する tier-T 構造化変更。 */
export type ApplyDescriptor = { paramId: string; value: number };

export type Tier = "T" | "config" | "prompt" | "noop" | "blocked";

export type ApplyEngineResult = {
  applied: number; // tier-T 数値適用
  noop: number;    // acknowledgment（measurement/anomaly/operational・構造なし）
  skipped: number; // config/prompt（手動推奨）
  blocked: number; // 🔒
  errors: number;
};

export type ApplyDeps = {
  /** accepted=true かつ implemented でない・未処理（meta.apply_status 未設定）の提案。 */
  loadAcceptedProposals: () => Promise<ProposalRow[]>;
  /** 適用成功: implemented=true, implemented_at, meta patch をマージ。 */
  markImplemented: (id: string, metaPatch: Record<string, unknown>) => Promise<void>;
  /** 非適用（blocked/skip/error）: implemented は変えず meta.apply_status と理由を記録。 */
  markSkipped: (id: string, applyStatus: string, note: string) => Promise<void>;
  loadOptimizerState: (now?: Date) => Promise<OptimizerState>;
  saveOptimizerState: (s: OptimizerState) => Promise<void>;
  snapshotState: (ts?: Date) => Promise<{ snapshotId: string }>;
  notify: (summary: string) => Promise<void>;
};
```

- [ ] **Step 2: tsc 確認**

Run: `cd apps/x-account-system && npx tsc --noEmit -p src/tsconfig.json 2>/dev/null || npx tsc --noEmit`
Expected: 型エラーなし（`OptimizerState` import 解決）

- [ ] **Step 3: Commit**

```bash
git add apps/x-account-system/lib/optimizer-apply/types.ts
git commit -m "feat(xad/optimizer-apply): types (ProposalRow/ApplyDescriptor/Tier/ApplyDeps)"
```

---

## Task 6: `lib/optimizer-apply/validation.ts`（安全回帰の要・厚く）

**Files:**
- Create: `apps/x-account-system/lib/optimizer-apply/validation.ts`
- Test: `apps/x-account-system/lib/optimizer-apply/validation.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`apps/x-account-system/lib/optimizer-apply/validation.test.ts`:

```ts
import { classifyTier, getApplyDescriptor, validateProposalSafe, TIER_T_PARAM_IDS } from "./validation.ts";
import type { ProposalRow } from "./types.ts";

function row(over: Partial<ProposalRow> = {}): ProposalRow {
  return {
    id: "p", proposal_type: "config_change", scope: "lever_bandit", hypothesis: "evening を増やす",
    evidence: {}, rank: "A", accepted: true, implemented: false, reviewer_reason: null, meta: {}, ...over,
  };
}

describe("validateProposalSafe — 🔒 ブロック", () => {
  it.each([
    ["first_hand を下げる", "content_axis を調整"],
    ["industry_sop を減らす", "scope x"],
    ["hashtag を1つ付ける", "scope x"],
    ["AI生成画像を増やす", "visualizer"],
    ["failure_story cap を緩める", "hook"],
    ["FORBIDDEN_PHRASES を編集", "safety"],
    ["SAFETY_GUARDRAILS を変更", "guardrail"],
  ])("'%s' は blocked", (hypothesis, scope) => {
    expect(validateProposalSafe(row({ hypothesis, scope })).ok).toBe(false);
  });

  it("死守 paramId を apply に持つ提案は blocked", () => {
    const p = row({ hypothesis: "比率調整", scope: "lever", meta: { apply: { paramId: "industry_sop_rate", value: 0.1 } } });
    expect(validateProposalSafe(p).ok).toBe(false);
  });

  it("安全な提案は通す", () => {
    expect(validateProposalSafe(row({ hypothesis: "夜帯の投稿比率を上げる", scope: "lever_bandit" })).ok).toBe(true);
  });
});

describe("getApplyDescriptor", () => {
  it("meta.apply が正しい形なら返す", () => {
    expect(getApplyDescriptor(row({ meta: { apply: { paramId: "posting_time_evening", value: 0.28 } } })))
      .toEqual({ paramId: "posting_time_evening", value: 0.28 });
  });
  it("meta.apply が無ければ null", () => {
    expect(getApplyDescriptor(row({ meta: {} }))).toBeNull();
  });
  it("meta が null でも null（throw しない）", () => {
    expect(getApplyDescriptor(row({ meta: null }))).toBeNull();
  });
});

describe("classifyTier", () => {
  it("tier-T allowlist の apply を持てば T", () => {
    expect(classifyTier(row({ meta: { apply: { paramId: "xfmt_thread", value: 0.15 } } }))).toBe("T");
  });
  it("prompt/template scope は prompt", () => {
    expect(classifyTier(row({ scope: "writer_prompt", hypothesis: "プロンプト改善" }))).toBe("prompt");
  });
  it("config/threshold/query scope は config", () => {
    expect(classifyTier(row({ scope: "collector_query", hypothesis: "watchlist 追加" }))).toBe("config");
  });
  it("構造なし measurement_request は noop", () => {
    expect(classifyTier(row({ proposal_type: "measurement_request", scope: "metrics", hypothesis: "観測したい" }))).toBe("noop");
  });
  it("🔒 は何より優先で blocked", () => {
    expect(classifyTier(row({ scope: "writer_prompt", hypothesis: "first_hand を下げるプロンプト" }))).toBe("blocked");
  });
  it("TIER_T_PARAM_IDS は failure_story を含まない", () => {
    expect((TIER_T_PARAM_IDS as readonly string[]).some((x) => x.includes("failure"))).toBe(false);
    expect(TIER_T_PARAM_IDS).toContain("posting_time_evening");
  });
});
```

- [ ] **Step 2: テストを実行して fail を確認**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/optimizer-apply/validation.test.ts`
Expected: FAIL（`validation.ts` 未存在）

- [ ] **Step 3: 実装を書く**

`apps/x-account-system/lib/optimizer-apply/validation.ts`:

```ts
import type { ProposalRow, ApplyDescriptor, Tier } from "./types.ts";

/** Thompson 閉ループの live 3 レバーのみが tier-T 数値適用対象（content_axis 等の凍結レバー・failure_story は除外）。 */
export const TIER_T_PARAM_IDS = [
  "posting_time_morning", "posting_time_noon", "posting_time_afternoon", "posting_time_evening", "posting_time_midnight",
  "hook_number_lead", "hook_negation_lead", "hook_question_lead", "hook_emotion_lead", "hook_authority_lead", "hook_promise_lead", "hook_other",
  "xfmt_short", "xfmt_medium", "xfmt_long", "xfmt_thread",
] as const;

/** 🔒 死守領域。scope/hypothesis にこれらが現れたら apply 不可（保守的・疑わしきはブロック）。 */
const DEATH_GUARD_KEYWORDS = [
  "forbidden", "禁止フレーズ", "safety_guardrail", "safety guardrail", "guardrail",
  "first_hand", "primary_info", "一次情報", "industry_sop", "hashtag", "ハッシュタグ",
  "ai_generated", "ai生成", "ai 画像", "ai画像", "failure_story", "failure cap", "failure_cap",
];

/** 🔒 死守 paramId（apply に来たら拒否）。 */
const DEATH_GUARD_PARAM_IDS = [
  "hook_failure_story_verified_cap_per_month", "content_axis.first_hand",
  "industry_sop_rate", "hashtag_count", "visualizer_image_ai_generated",
];

export function getApplyDescriptor(p: ProposalRow): ApplyDescriptor | null {
  const apply = (p.meta as { apply?: unknown } | null)?.apply as { paramId?: unknown; value?: unknown } | undefined;
  if (apply && typeof apply.paramId === "string" && typeof apply.value === "number") {
    return { paramId: apply.paramId, value: apply.value };
  }
  return null;
}

export function validateProposalSafe(p: ProposalRow): { ok: boolean; reason: string } {
  const hay = `${p.scope} ${p.hypothesis}`.toLowerCase();
  for (const kw of DEATH_GUARD_KEYWORDS) {
    if (hay.includes(kw.toLowerCase())) {
      return { ok: false, reason: `🔒 死守領域キーワード "${kw}" を検出（手動対応）` };
    }
  }
  const d = getApplyDescriptor(p);
  if (d && DEATH_GUARD_PARAM_IDS.includes(d.paramId)) {
    return { ok: false, reason: `🔒 死守 paramId "${d.paramId}" は apply 不可` };
  }
  return { ok: true, reason: "" };
}

export function classifyTier(p: ProposalRow): Tier {
  if (!validateProposalSafe(p).ok) return "blocked";
  const d = getApplyDescriptor(p);
  if (d && (TIER_T_PARAM_IDS as readonly string[]).includes(d.paramId)) return "T";
  const scope = p.scope.toLowerCase();
  if (/prompt|template|テンプレ|プロンプト/.test(scope)) return "prompt";
  if (/config|threshold|閾値|query|watchlist|keyword|weight/.test(scope)) return "config";
  return "noop";
}
```

- [ ] **Step 4: テストを実行して pass を確認**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/optimizer-apply/validation.test.ts`
Expected: PASS（全ケース緑。特に 🔒 ブロック）

- [ ] **Step 5: Commit**

```bash
git add apps/x-account-system/lib/optimizer-apply/validation.ts apps/x-account-system/lib/optimizer-apply/validation.test.ts
git commit -m "feat(xad/optimizer-apply): validation (🔒検証ゲート + classifyTier)"
```

---

## Task 7: `lib/optimizer-apply/tier-t.ts`

**Files:**
- Create: `apps/x-account-system/lib/optimizer-apply/tier-t.ts`
- Test: `apps/x-account-system/lib/optimizer-apply/tier-t.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`apps/x-account-system/lib/optimizer-apply/tier-t.test.ts`:

```ts
process.env.IN_MEMORY_FALLBACK = "true";

import { resolvePosterior, clipToGuard, setBetaMean, applyTierT } from "./tier-t.ts";
import type { OptimizerState, ParameterPosterior } from "../optimizer/types.ts";

function beta(paramId: string, alpha: number, b: number): ParameterPosterior {
  return { paramId, distType: "beta", params: { alpha, beta: b } };
}

function fakeState(): OptimizerState {
  return {
    generation: 0, updatedAt: "2026-06-10T00:00:00Z", styleGuideVersion: "v10.3",
    postingTime: {
      morning: beta("posting_time_morning", 2, 8), noon: beta("posting_time_noon", 2, 8),
      afternoon: beta("posting_time_afternoon", 2, 8), evening: beta("posting_time_evening", 2, 8),
      midnight: beta("posting_time_midnight", 2, 8),
    },
    hookDistribution: {
      number_lead: beta("hook_number_lead", 1, 9), negation_lead: beta("hook_negation_lead", 1, 9),
      question_lead: beta("hook_question_lead", 1, 9), emotion_lead: beta("hook_emotion_lead", 1, 9),
      authority_lead: beta("hook_authority_lead", 1, 9), promise_lead: beta("hook_promise_lead", 1, 9),
      other: beta("hook_other", 1, 9),
      failure_story_verified_cap_per_month: beta("hook_failure_story_verified_cap_per_month", 1, 9),
    },
    publishingLag: beta("publishing_lag", 1, 1),
    contentAxis: { paramId: "content_axis", distType: "dirichlet", params: { alphas: [1, 2, 3, 4] } },
    citationExplicitRate: beta("citation_explicit_rate", 13, 7),
    xFormatRatio: {
      short: beta("xfmt_short", 5, 5), medium: beta("xfmt_medium", 2, 8),
      long: beta("xfmt_long", 1, 9), thread: beta("xfmt_thread", 1, 9),
    },
    visualizerMode: { paramId: "visualizer_mode", distType: "dirichlet", params: { alphas: [7, 1.5, 1.5] } },
    visualizerImageAiGen: beta("visualizer_image_ai_generated", 0.5, 9.5),
    industrySopRate: beta("industry_sop_rate", 4, 16),
  };
}

describe("resolvePosterior", () => {
  it("posting_time/hook/xfmt の paramId を解決", () => {
    const s = fakeState();
    expect(resolvePosterior(s, "posting_time_evening")).toBe(s.postingTime.evening);
    expect(resolvePosterior(s, "hook_other")).toBe(s.hookDistribution.other);
    expect(resolvePosterior(s, "hook_number_lead")).toBe(s.hookDistribution.number_lead);
    expect(resolvePosterior(s, "xfmt_thread")).toBe(s.xFormatRatio.thread);
  });
  it("未知 paramId は null", () => {
    expect(resolvePosterior(fakeState(), "nope")).toBeNull();
  });
});

describe("clipToGuard", () => {
  it("posting_time は 0.05〜0.40 に clip", () => {
    expect(clipToGuard("posting_time_evening", 0.9)).toBe(0.4);
    expect(clipToGuard("posting_time_evening", 0.01)).toBe(0.05);
    expect(clipToGuard("posting_time_evening", 0.28)).toBe(0.28);
  });
  it("xfmt_short は 0.30〜0.60 に clip", () => {
    expect(clipToGuard("xfmt_short", 0.9)).toBe(0.6);
  });
});

describe("setBetaMean", () => {
  it("strength(alpha+beta) を保ったまま target mean に再パラメータ化", () => {
    const post = beta("posting_time_evening", 2, 8); // strength 10, mean 0.2
    const { before, after } = setBetaMean(post, 0.3);
    expect(before).toEqual({ alpha: 2, beta: 8 });
    expect(post.params.alpha).toBeCloseTo(3, 5);
    expect(post.params.beta).toBeCloseTo(7, 5);
    expect(after).toEqual({ alpha: post.params.alpha, beta: post.params.beta });
  });
});

describe("applyTierT", () => {
  it("snapshot→guard clip→Beta mean 適用、snapshotId を返す", async () => {
    let saved: OptimizerState | null = null;
    const deps = {
      loadOptimizerState: async () => fakeState(),
      saveOptimizerState: async (s: OptimizerState) => { saved = s; },
      snapshotState: async () => ({ snapshotId: "snap_test_1" }),
    };
    const r = await applyTierT({ paramId: "posting_time_evening", value: 0.9 }, deps);
    expect(r.snapshotId).toBe("snap_test_1");
    expect(r.paramId).toBe("posting_time_evening");
    // 0.9 → clip 0.40。strength 10 → alpha 4 / beta 6
    expect((saved!.postingTime.evening.params.alpha as number)).toBeCloseTo(4, 5);
    expect((saved!.postingTime.evening.params.beta as number)).toBeCloseTo(6, 5);
  });
  it("未知 paramId は throw", async () => {
    const deps = { loadOptimizerState: async () => fakeState(), saveOptimizerState: async () => {}, snapshotState: async () => ({ snapshotId: "x" }) };
    await expect(applyTierT({ paramId: "nope", value: 0.2 }, deps)).rejects.toThrow(/unknown tier-T paramId/);
  });
});
```

- [ ] **Step 2: テストを実行して fail を確認**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/optimizer-apply/tier-t.test.ts`
Expected: FAIL（`tier-t.ts` 未存在）

- [ ] **Step 3: 実装を書く**

`apps/x-account-system/lib/optimizer-apply/tier-t.ts`:

```ts
import type { OptimizerState, ParameterPosterior } from "../optimizer/types.ts";
import { GUARD_RULES } from "../optimizer/guards.ts";
import type { ApplyDescriptor, ApplyDeps } from "./types.ts";

const POSTING_BANDS = ["morning", "noon", "afternoon", "evening", "midnight"] as const;
const HOOKS = ["number_lead", "negation_lead", "question_lead", "emotion_lead", "authority_lead", "promise_lead", "other"] as const;
const XFMTS = ["short", "medium", "long", "thread"] as const;

export function resolvePosterior(state: OptimizerState, paramId: string): ParameterPosterior | null {
  for (const b of POSTING_BANDS) if (paramId === `posting_time_${b}`) return state.postingTime[b];
  for (const h of HOOKS) {
    const expected = h === "other" ? "hook_other" : `hook_${h}`;
    if (paramId === expected) return state.hookDistribution[h];
  }
  for (const f of XFMTS) if (paramId === `xfmt_${f}`) return state.xFormatRatio[f];
  return null;
}

export function clipToGuard(paramId: string, value: number): number {
  const rule = GUARD_RULES.find((r) => r.paramId === paramId);
  let v = value;
  if (rule?.lowerBound != null) v = Math.max(v, rule.lowerBound);
  if (rule?.upperBound != null) v = Math.min(v, rule.upperBound);
  return v;
}

/** Beta posterior を strength(alpha+beta) 一定のまま target mean に再パラメータ化。 */
export function setBetaMean(
  post: ParameterPosterior,
  targetMean: number,
): { before: Record<string, number | number[]>; after: Record<string, number | number[]> } {
  const before = { ...post.params };
  const alpha = Number(post.params.alpha ?? 1);
  const beta = Number(post.params.beta ?? 1);
  const strength = alpha + beta > 0 ? alpha + beta : 2;
  post.params.alpha = Number((targetMean * strength).toFixed(6));
  post.params.beta = Number(((1 - targetMean) * strength).toFixed(6));
  return { before, after: { ...post.params } };
}

/** tier-T 適用: 現状を snapshot→guard 内 clip→Beta mean 更新→save。rollback handle = snapshotId。 */
export async function applyTierT(
  descriptor: ApplyDescriptor,
  deps: Pick<ApplyDeps, "loadOptimizerState" | "saveOptimizerState" | "snapshotState">,
): Promise<{ snapshotId: string; paramId: string; before: Record<string, number | number[]>; after: Record<string, number | number[]> }> {
  const state = await deps.loadOptimizerState();
  const post = resolvePosterior(state, descriptor.paramId);
  if (!post) throw new Error(`unknown tier-T paramId: ${descriptor.paramId}`);
  if (post.distType !== "beta") throw new Error(`tier-T applies only to beta posteriors: ${descriptor.paramId}`);

  const { snapshotId } = await deps.snapshotState(); // 変更前の状態を退避
  const clipped = clipToGuard(descriptor.paramId, descriptor.value);
  const { before, after } = setBetaMean(post, clipped);
  state.updatedAt = new Date().toISOString();
  await deps.saveOptimizerState(state);
  return { snapshotId, paramId: descriptor.paramId, before, after };
}
```

- [ ] **Step 4: テストを実行して pass を確認**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/optimizer-apply/tier-t.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/x-account-system/lib/optimizer-apply/tier-t.ts apps/x-account-system/lib/optimizer-apply/tier-t.test.ts
git commit -m "feat(xad/optimizer-apply): tier-T (snapshot付き Beta mean 適用・guard clip)"
```

---

## Task 8: `lib/optimizer-apply/rollback.ts`

**Files:**
- Create: `apps/x-account-system/lib/optimizer-apply/rollback.ts`
- Test: `apps/x-account-system/lib/optimizer-apply/rollback.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`apps/x-account-system/lib/optimizer-apply/rollback.test.ts`:

```ts
import { rollbackProposal } from "./rollback.ts";

describe("rollbackProposal", () => {
  it("meta.rollback_handle.snapshot_id で復元し markRolledBack する", async () => {
    const calls: string[] = [];
    const r = await rollbackProposal("p1", {
      getRollbackHandle: async () => ({ snapshot_id: "snap_9" }),
      rollbackToSnapshot: async (id: string) => { calls.push(`rollback:${id}`); },
      markRolledBack: async (id: string) => { calls.push(`mark:${id}`); },
    });
    expect(r.ok).toBe(true);
    expect(calls).toEqual(["rollback:snap_9", "mark:p1"]);
  });

  it("handle が無ければ ok:false（rollback しない）", async () => {
    const r = await rollbackProposal("p1", {
      getRollbackHandle: async () => null,
      rollbackToSnapshot: async () => { throw new Error("must not call"); },
      markRolledBack: async () => { throw new Error("must not call"); },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/no rollback_handle/);
  });
});
```

- [ ] **Step 2: テストを実行して fail を確認**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/optimizer-apply/rollback.test.ts`
Expected: FAIL（`rollback.ts` 未存在）

- [ ] **Step 3: 実装を書く**

`apps/x-account-system/lib/optimizer-apply/rollback.ts`:

```ts
export type RollbackDeps = {
  getRollbackHandle: (id: string) => Promise<{ snapshot_id?: string } | null>;
  rollbackToSnapshot: (snapshotId: string) => Promise<unknown>;
  markRolledBack: (id: string) => Promise<void>;
};

/** meta.rollback_handle の snapshot で optimizer_state を復元し、proposal を rollback=true に。 */
export async function rollbackProposal(
  proposalId: string,
  deps: RollbackDeps,
): Promise<{ ok: boolean; reason?: string }> {
  const handle = await deps.getRollbackHandle(proposalId);
  if (!handle?.snapshot_id) return { ok: false, reason: "no rollback_handle" };
  await deps.rollbackToSnapshot(handle.snapshot_id);
  await deps.markRolledBack(proposalId);
  return { ok: true };
}
```

- [ ] **Step 4: テストを実行して pass を確認**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/optimizer-apply/rollback.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/x-account-system/lib/optimizer-apply/rollback.ts apps/x-account-system/lib/optimizer-apply/rollback.test.ts
git commit -m "feat(xad/optimizer-apply): rollback (snapshot 復元)"
```

---

## Task 9: `lib/optimizer-apply/apply-engine.ts`

**Files:**
- Create: `apps/x-account-system/lib/optimizer-apply/apply-engine.ts`
- Test: `apps/x-account-system/lib/optimizer-apply/apply-engine.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`apps/x-account-system/lib/optimizer-apply/apply-engine.test.ts`:

```ts
import { runApplyEngine } from "./apply-engine.ts";
import type { ApplyDeps, ProposalRow } from "./types.ts";

function row(over: Partial<ProposalRow>): ProposalRow {
  return {
    id: "p", proposal_type: "config_change", scope: "lever_bandit", hypothesis: "h",
    evidence: {}, rank: "A", accepted: true, implemented: false, reviewer_reason: null, meta: {}, ...over,
  };
}

function makeDeps(proposals: ProposalRow[]) {
  const implemented: Record<string, Record<string, unknown>> = {};
  const skipped: { id: string; status: string; note: string }[] = [];
  const notify: string[] = [];
  const deps: ApplyDeps = {
    loadAcceptedProposals: async () => proposals,
    markImplemented: async (id, patch) => { implemented[id] = patch; },
    markSkipped: async (id, status, note) => { skipped.push({ id, status, note }); },
    loadOptimizerState: async () => ({} as never),
    saveOptimizerState: async () => {},
    snapshotState: async () => ({ snapshotId: "snap_eng" }),
    notify: async (s) => { notify.push(s); },
  };
  return { deps, implemented, skipped, notify };
}

describe("runApplyEngine", () => {
  it("tier-T(構造あり) を適用し implemented+rollback_handle 記録", async () => {
    // applyTierT を通すため loadOptimizerState を実状態に差し替え
    const state: any = {
      postingTime: { evening: { paramId: "posting_time_evening", distType: "beta", params: { alpha: 2, beta: 8 } } },
      hookDistribution: {}, xFormatRatio: {},
    };
    const { deps, implemented, notify } = makeDeps([
      row({ id: "t1", meta: { apply: { paramId: "posting_time_evening", value: 0.3 } } }),
    ]);
    deps.loadOptimizerState = async () => state;
    const r = await runApplyEngine(deps);
    expect(r.applied).toBe(1);
    expect(implemented.t1.apply_status).toBe("applied");
    expect((implemented.t1.rollback_handle as any).snapshot_id).toBe("snap_eng");
    expect(notify[0]).toMatch(/applied=1/);
  });

  it("🔒 は blocked で skip（implemented にしない）", async () => {
    const { deps, implemented, skipped } = makeDeps([row({ id: "b1", hypothesis: "first_hand を下げる" })]);
    const r = await runApplyEngine(deps);
    expect(r.blocked).toBe(1);
    expect(implemented.b1).toBeUndefined();
    expect(skipped[0]).toMatchObject({ id: "b1", status: "blocked" });
  });

  it("config/prompt は skipped_manual", async () => {
    const { deps, skipped } = makeDeps([
      row({ id: "c1", scope: "collector_query", hypothesis: "watchlist 追加" }),
      row({ id: "pr1", scope: "writer_prompt", hypothesis: "プロンプト改善" }),
    ]);
    const r = await runApplyEngine(deps);
    expect(r.skipped).toBe(2);
    expect(skipped.map((s) => s.status)).toEqual(["skipped_manual", "skipped_manual"]);
  });

  it("構造なし measurement は noop で implemented 化", async () => {
    const { deps, implemented } = makeDeps([
      row({ id: "n1", proposal_type: "measurement_request", scope: "metrics", hypothesis: "観測" }),
    ]);
    const r = await runApplyEngine(deps);
    expect(r.noop).toBe(1);
    expect(implemented.n1.apply_status).toBe("noop");
  });

  it("apply 失敗は errors++ で他は継続（fail-open）", async () => {
    const { deps, skipped } = makeDeps([
      row({ id: "e1", meta: { apply: { paramId: "posting_time_evening", value: 0.3 } } }),
      row({ id: "n2", proposal_type: "measurement_request", scope: "metrics", hypothesis: "観測" }),
    ]);
    deps.loadOptimizerState = async () => { throw new Error("state down"); };
    const r = await runApplyEngine(deps);
    expect(r.errors).toBe(1);
    expect(r.noop).toBe(1); // n2 は継続
    expect(skipped.find((s) => s.id === "e1")?.status).toBe("error");
  });
});
```

- [ ] **Step 2: テストを実行して fail を確認**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/optimizer-apply/apply-engine.test.ts`
Expected: FAIL（`apply-engine.ts` 未存在）

- [ ] **Step 3: 実装を書く**

`apps/x-account-system/lib/optimizer-apply/apply-engine.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
import { classifyTier, getApplyDescriptor, validateProposalSafe } from "./validation.ts";
import { applyTierT } from "./tier-t.ts";
import { loadOptimizerState, saveOptimizerState, snapshotState } from "../optimizer/state-store.ts";
import { pushLine } from "../line/line-client.ts";
import type { ApplyDeps, ApplyEngineResult } from "./types.ts";

/** accepted 提案を tier 別に処理。fail-open（全体は throw しない）。 */
export async function runApplyEngine(deps: ApplyDeps): Promise<ApplyEngineResult> {
  const res: ApplyEngineResult = { applied: 0, noop: 0, skipped: 0, blocked: 0, errors: 0 };
  const proposals = await deps.loadAcceptedProposals();

  for (const p of proposals) {
    try {
      const tier = classifyTier(p);
      if (tier === "blocked") {
        await deps.markSkipped(p.id, "blocked", validateProposalSafe(p).reason);
        res.blocked++;
        continue;
      }
      if (tier === "config" || tier === "prompt") {
        await deps.markSkipped(p.id, "skipped_manual", `tier-${tier}: 自動適用は 4B-2。手動 apply 推奨`);
        res.skipped++;
        continue;
      }
      if (tier === "T") {
        const d = getApplyDescriptor(p)!;
        const r = await applyTierT(d, deps);
        await deps.markImplemented(p.id, {
          apply_status: "applied",
          apply_param: r.paramId,
          apply_before: r.before,
          apply_after: r.after,
          rollback_handle: { snapshot_id: r.snapshotId },
        });
        res.applied++;
        continue;
      }
      // noop（measurement/anomaly/operational・構造なし）= 記録のみ
      await deps.markImplemented(p.id, { apply_status: "noop" });
      res.noop++;
    } catch (e) {
      res.errors++;
      try {
        await deps.markSkipped(p.id, "error", `apply error: ${String(e)}`);
      } catch {
        /* fail-open */
      }
    }
  }

  await deps.notify(
    `🛠 optimizer-apply: applied=${res.applied} noop=${res.noop} skipped=${res.skipped} blocked=${res.blocked} errors=${res.errors}`,
  );
  return res;
}

function applySb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    db: { schema: "xad" },
    auth: { persistSession: false },
  });
}

const COLS =
  "id, proposal_type, scope, hypothesis, evidence, rank, accepted, implemented, reviewer_reason, meta";

export function defaultApplyDeps(): ApplyDeps {
  const sb = applySb();
  return {
    async loadAcceptedProposals() {
      const { data, error } = await sb
        .from("optimizer_proposal")
        .select(COLS)
        .eq("accepted", true)
        .or("implemented.is.null,implemented.eq.false")
        .is("meta->>apply_status", null);
      if (error) throw new Error(`loadAcceptedProposals failed: ${error.message}`);
      return (data ?? []) as never;
    },
    async markImplemented(id, metaPatch) {
      const { data: cur } = await sb.from("optimizer_proposal").select("meta").eq("id", id).single();
      const meta = { ...((cur?.meta as Record<string, unknown>) ?? {}), ...metaPatch };
      const { error } = await sb
        .from("optimizer_proposal")
        .update({ implemented: true, implemented_at: new Date().toISOString(), meta })
        .eq("id", id);
      if (error) throw new Error(`markImplemented failed: ${error.message}`);
    },
    async markSkipped(id, applyStatus, note) {
      const { data: cur } = await sb.from("optimizer_proposal").select("meta, reviewer_reason").eq("id", id).single();
      const meta = { ...((cur?.meta as Record<string, unknown>) ?? {}), apply_status: applyStatus, apply_note: note };
      const reviewer_reason = [cur?.reviewer_reason, note].filter(Boolean).join(" / ");
      const { error } = await sb.from("optimizer_proposal").update({ meta, reviewer_reason }).eq("id", id);
      if (error) throw new Error(`markSkipped failed: ${error.message}`);
    },
    loadOptimizerState,
    saveOptimizerState,
    snapshotState,
    async notify(summary) {
      const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
      const userId = process.env.LINE_USER_ID_OFMETON;
      if (!token || !userId) {
        console.warn("[optimizer-apply] notify skipped: LINE env vars missing");
        return;
      }
      try {
        await pushLine(userId, summary, token);
      } catch (e) {
        console.warn("[optimizer-apply] notify failed (fail-open):", String(e));
      }
    },
  };
}
```

注: `loadAcceptedProposals` の `.is("meta->>apply_status", null)` フィルタは PostgREST の JSON 演算子。実 supabase-js での正確な記法（`meta->>apply_status` か `meta->apply_status`）は実装時に `list_tables`/簡易クエリで確認し、効かない場合は全件取得後に JS 側で `meta?.apply_status == null` フィルタへフォールバック（テストは DI なので影響なし）。

- [ ] **Step 4: テストを実行して pass を確認**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/optimizer-apply/apply-engine.test.ts`
Expected: PASS

注: `apply-engine.ts` は `state-store.ts` / `line-client.ts` を top-level import するが、テストは `runApplyEngine(deps)` に DI するため実 import 経路は走らない。もし import 副作用で落ちる場合は test 先頭で `process.env.IN_MEMORY_FALLBACK = "true"` を設定済みにする（state-store が in-memory 化）。

- [ ] **Step 5: Commit**

```bash
git add apps/x-account-system/lib/optimizer-apply/apply-engine.ts apps/x-account-system/lib/optimizer-apply/apply-engine.test.ts
git commit -m "feat(xad/optimizer-apply): apply-engine (tier振分け・implemented/skip記録・notify)"
```

---

## Task 10: worker / queue / brownout 配線

**Files:**
- Modify: `apps/x-account-system/src/worker.ts`
- Modify: `apps/x-account-system/src/queue.ts`
- Modify: `apps/x-account-system/lib/safety/brownout-handler.ts`
- Test: `apps/x-account-system/src/queue-brownout.test.ts`

- [ ] **Step 1: brownout テストを追加（失敗確認用）**

`apps/x-account-system/src/queue-brownout.test.ts` に optimizer-apply ケースを追加（既存のモック構造に合わせる）:

```ts
// optimizer-apply: 読み取り＆DB準備系。ok/reduce/stop_posting で許可、cron_halt/escalate で停止。
describe("optimizer-apply brownout", () => {
  it("ALL_JOBS と STOP_POSTING_ALLOWED に含まれ cron_halt/escalate には含まれない", async () => {
    const { ALLOWED_JOBS_BY_STATUS } = await import("../lib/safety/brownout-handler.ts");
    expect(ALLOWED_JOBS_BY_STATUS.ok).toContain("optimizer-apply");
    expect(ALLOWED_JOBS_BY_STATUS.stop_posting).toContain("optimizer-apply");
    expect(ALLOWED_JOBS_BY_STATUS.cron_halt).not.toContain("optimizer-apply");
    expect(ALLOWED_JOBS_BY_STATUS.escalate).not.toContain("optimizer-apply");
  });
});
```

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest src/queue-brownout.test.ts`
Expected: FAIL（optimizer-apply 未登録）

- [ ] **Step 2: brownout-handler に登録**

`apps/x-account-system/lib/safety/brownout-handler.ts`:
- `ALL_JOBS` 配列に `"optimizer-apply"` を追加。
- `STOP_POSTING_ALLOWED` 配列に `"optimizer-apply"` を追加。
- `CRON_HALT_ALLOWED` / `ESCALATE_ALLOWED` には**追加しない**。

```ts
const ALL_JOBS: string[] = [
  "collect", "compose", "check", "daily-digest", "metrics-ingest",
  "optimizer-update", "optimizer-analyst", "optimizer-apply", // ← 追加
  "rollback-monitor", "rotation-notice", "line-event",
];

const STOP_POSTING_ALLOWED: string[] = [
  "rollback-monitor", "rotation-notice", "daily-digest",
  "metrics-ingest", "optimizer-apply", // ← 追加（DB書込のみ・生成/公開でない）
  "line-event",
];
```

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest src/queue-brownout.test.ts`
Expected: PASS

- [ ] **Step 3: worker.ts に job 名を登録（cron無）**

`apps/x-account-system/src/worker.ts`:
- `JobMessage` の `job` リテラル union に `"optimizer-apply"` を追加。
- `CRON_JOBS` には**追加しない**（cron トリガー無）。
- `CRON_JOBS_BY_NAME` に `"optimizer-apply": true` を追加（`/admin/enqueue` で手動起動可に）。

```ts
// JobMessage.job union に追加:
        | "optimizer-analyst"
        | "optimizer-apply"   // ← 追加（cron無・enqueue のみ）
        | "rollback-monitor"
// ...
const CRON_JOBS_BY_NAME: Record<string, true> = {
  // ...既存...
  "optimizer-analyst": true,
  "optimizer-apply": true,   // ← 追加
  // ...
};
```

- [ ] **Step 4: queue.ts に case を追加**

`apps/x-account-system/src/queue.ts` の switch に（optimizer-analyst case の近くに）追加:

```ts
// ---- optimizer-apply (accept 後随時・enqueue のみ・cron 無)
case "optimizer-apply": {
  const { runApplyEngine, defaultApplyDeps } = await import("../lib/optimizer-apply/apply-engine.js");
  const result = await runApplyEngine(defaultApplyDeps());
  console.log(JSON.stringify({
    level: "info", msg: "[optimizer-apply] 提案適用 完了", date: msg.date,
    applied: result.applied, noop: result.noop, skipped: result.skipped,
    blocked: result.blocked, errors: result.errors,
  }));
  break;
}
```

- [ ] **Step 5: 型・全テスト確認**

Run: `cd apps/x-account-system && npx tsc --noEmit && IN_MEMORY_FALLBACK=true npx jest lib/optimizer-apply src/queue-brownout.test.ts`
Expected: 型エラーなし・全 PASS

- [ ] **Step 6: Commit**

```bash
git add apps/x-account-system/src/worker.ts apps/x-account-system/src/queue.ts apps/x-account-system/lib/safety/brownout-handler.ts apps/x-account-system/src/queue-brownout.test.ts
git commit -m "feat(xad/optimizer-apply): queue job 配線 (worker/queue/brownout・cron無 enqueueのみ)"
```

---

## Task 11: 検証 ＋ 本番実証（人間確認ポイント）

**Files:** なし（検証のみ）

- [ ] **Step 1: 全テスト緑を確認（verification-before-completion）**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/optimizer-apply src/`
Run: `cd apps/xad-dashboard && npx vitest run lib/proposals-queries.test.ts && npx tsc --noEmit`
Expected: 全 PASS・型エラーなし。実出力を貼って確認（緑の主張は証拠とセット）。

- [ ] **Step 2: migration 0024 を本番適用（人間確認必須）**

`migrations/0024_proposal_decision.sql` を Supabase MCP `apply_migration` か CLI で本番適用。DDL 前に `list_tables` で `optimizer_proposal` の現状を inspect（memory `feedback_db_migration_pre_inspect`）。**人間確認の上で実行**。

- [ ] **Step 3: dashboard deploy 確認（4A）**

dashboard（Vercel team `prj_IdHQhxygfAy9Lh7OKz5oZNLmQkwo`）は push で auto-deploy。`/proposals` で蓄積10提案が一覧表示→accept/reject が `optimizer_proposal.accepted` に反映されるか確認。tier-T 提案には paramId+value を付与して accept。

- [ ] **Step 4: apply-engine 本番実証（prod-lib-diag）**

`prod-lib-diag` スキルで本番 env を読み、ローカル tsx から `runApplyEngine(defaultApplyDeps())` を実行（または worker deploy 後 `/admin/enqueue?job=optimizer-apply&key=<secret>`）。確認:
- accept 済 tier-T 提案が implemented 化＋`meta.rollback_handle.snapshot_id` 記録。
- config/prompt 提案は skip＋手動推奨 notify。
- measurement/anomaly は noop で implemented 化。
- `rollbackProposal(id, ...)` で optimizer_state が snapshot に復元（可逆性検証）。
- 安全な tier-T 提案が無ければ measurement_request を accept→noop apply で経路確認（spec のフォールバック）。

worker は `npm ci` 後に deploy（memory `feedback_wrangler_deploy_npm_ci_first`）。deploy 前 `wrangler whoami`。

- [ ] **Step 5: finishing-a-development-branch**

`superpowers:finishing-a-development-branch` で PR / merge を決定。PR 本文に 4A+4B-1 の実証結果（適用/rollback ログ）を貼る。

---

## Self-Review（spec 突合）

- spec「4A レビュー/accept UI（2B 同型）」→ Task 1（RPC）+ Task 2（queries）+ Task 3（route）+ Task 4（UI/NavBar）✅
- spec「validation.ts: classifyTier ＋ validateProposalSafe・🔒 をコード強制・疑わしきはブロック」→ Task 6 ✅（厚いテスト）
- spec「tier-t.ts: snapshot→更新・guard 範囲・rollback handle」→ Task 7 ✅
- spec「apply-engine.ts: accepted取得→validate→tier振分け→implemented/rollback記録→notify、blocked/config/prompt は skip、失敗時継続」→ Task 9 ✅
- spec「rollback.ts」→ Task 8 ✅
- spec「配線: cron無・/admin/enqueue・brownout は ALL_JOBS＋STOP_POSTING_ALLOWED、cron_halt/escalate に入れない」→ Task 10 ✅
- spec「migration 0024（RPC、新列不要・view 任意）」→ Task 1 ✅（view は YAGNI で省略・dashboard は直 select）
- spec「本番実証: tier-T 1件 accept→apply→rollback、無ければ measurement no-op」→ Task 11 ✅
- ユーザー確定「tier-T はレビュー時に人が構造付与」→ Task 4 の ProposalCard 構造入力 ＋ Task 1 RPC `p_apply` ＋ Task 6 `getApplyDescriptor` で反映 ✅
- 型整合: `ApplyDescriptor`/`ProposalRow`/`Tier`/`ApplyDeps` は Task 5 で定義し Task 6–9 で一貫使用。`TIER_T_PARAM_IDS` は engine(SSOT)＋dashboard ミラーで同値 ✅

**非ゴール（このspec外）**: tier-config/tier-prompt の自動適用（file編集+CI+deploy）= 4B-2 別 spec。🔒 の変更。accept を経ない autonomous apply。
