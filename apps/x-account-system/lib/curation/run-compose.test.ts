/**
 * lib/curation/run-compose.test.ts
 * stateful fake Supabase + 注入 runSession で wiring を検証（実 API 不要）。
 * 正常 / 空 / no_draft / MA失敗 / 部分失敗 / maxPerRun / claim・冪等 /
 * post_draft 失敗時の orphan core_idea 補償削除 / stub ガード / 観測 output。
 */
import { runCompose, type RunComposeDeps } from "./run-compose";

type Mat = { id: string; raw_text: string | null; redacted_text: string | null; source_ref: string | null; meta: Record<string, unknown> };
type St = { materials: Mat[]; coreIdeas: any[]; postDrafts: any[]; failPostDraft?: boolean };

/** 必要最小の chainable Supabase mock。materials_store / core_ideas / post_drafts。 */
function makeSb(state: St): any {
  let ciSeq = 0;
  function qb(table: string) {
    const ops: Array<{ m: string; a: any[] }> = [];
    const rec = (m: string) => (...a: any[]) => { ops.push({ m, a }); return builder; };
    const eqVal = (col: string) => ops.find((o) => o.m === "eq" && o.a[0] === col)?.a[1];
    const has = (m: string) => ops.some((o) => o.m === m);
    const resolve = (single: boolean): { data: any; error: any } => {
      if (table === "materials_store") {
        if (has("update")) {
          const payload = ops.find((o) => o.m === "update")!.a[0];
          const id = eqVal("id");
          const mat = state.materials.find((x) => x.id === id);
          const claimGuard = ops.some((o) => o.m === "is" && o.a[0] === "meta->>compose_claimed_at");
          if (has("select")) {
            if (mat && claimGuard && mat.meta.compose_claimed_at == null) {
              mat.meta = payload.meta;
              return { data: [{ id: mat.id }], error: null };
            }
            return { data: [], error: null };
          }
          if (mat) mat.meta = payload.meta;
          return { data: null, error: null };
        }
        const limit = ops.find((o) => o.m === "limit")?.a[0] ?? 1000;
        const rows = state.materials
          .filter((x) => x.meta.selection_status === "queued" && x.meta.composed_at == null && x.meta.compose_claimed_at == null)
          .slice(0, limit);
        return { data: rows, error: null };
      }
      if (table === "core_ideas") {
        if (has("delete")) {
          const id = eqVal("id");
          state.coreIdeas = state.coreIdeas.filter((c) => c.id !== id);
          return { data: null, error: null };
        }
        const payload = ops.find((o) => o.m === "insert")!.a[0];
        const row = { id: `ci_${++ciSeq}`, ...payload };
        state.coreIdeas.push(row);
        return single ? { data: { id: row.id }, error: null } : { data: [{ id: row.id }], error: null };
      }
      if (table === "post_drafts") {
        if (state.failPostDraft) return { data: null, error: { message: "pd boom" } };
        const payload = ops.find((o) => o.m === "insert")!.a[0];
        state.postDrafts.push(payload);
        return { data: null, error: null };
      }
      return { data: null, error: null };
    };
    const builder: any = {
      select: rec("select"), eq: rec("eq"), is: rec("is"), limit: rec("limit"),
      update: rec("update"), insert: rec("insert"), delete: rec("delete"), order: rec("order"),
      single: () => Promise.resolve(resolve(true)),
      then: (onF: any, onR: any) => Promise.resolve(resolve(false)).then(onF, onR),
    };
    return builder;
  }
  return { from: (t: string) => qb(t) };
}

function mat(id: string, extraMeta: Record<string, unknown> = {}): Mat {
  return { id, raw_text: `text ${id}`, redacted_text: null, source_ref: "@src", meta: { selection_status: "queued", tweet_url: "https://x.com/t", ...extraMeta } };
}

/** submit_draft を呼ぶ正常 runSession fake。 */
function okSession(draft: Partial<Record<string, unknown>> = {}): NonNullable<RunComposeDeps["runSession"]> {
  return (async (deps: any) => {
    deps.customToolHandler?.("submit_draft", { body: "【速報】Xが新機能。\n\nこれは強い。\n\n・要点1\n・要点2", fmat: "short", topic: "新機能", category: "paraphrase", primary_hook: "number", citations: ["https://src"], ...draft });
    return { ok: true, terminal: "idle", stopReason: "end_turn", transitions: [], agentText: "x", toolCalls: [], unhandledTools: [], wallClockMs: 1, ids: {}, sessionUsage: { input_tokens: 1000, output_tokens: 200 } };
  }) as any;
}
const silent = { warn: () => {}, info: () => {} };

describe("runCompose", () => {
  test("空: queued が無ければ noop", async () => {
    const state: St = { materials: [mat("m1", { selection_status: "selected" })], coreIdeas: [], postDrafts: [] };
    const r = await runCompose({ sb: makeSb(state), apiKey: "k", runSession: okSession(), logger: silent });
    expect(r).toMatchObject({ processed: 0, draftCount: 0, errorCount: 0 });
    expect(state.postDrafts).toHaveLength(0);
  });

  test("正常: core_idea + post_draft 生成・composed_at 付与・観測 output", async () => {
    const state: St = { materials: [mat("m1")], coreIdeas: [], postDrafts: [] };
    const r = await runCompose({ sb: makeSb(state), apiKey: "k", runId: "run1", runSession: okSession(), logger: silent });
    expect(r.draftCount).toBe(1);
    expect(r.errorCount).toBe(0);
    expect(state.coreIdeas).toHaveLength(1);
    expect(state.coreIdeas[0]).toMatchObject({ category: "paraphrase", source_material_ids: ["m1"] });
    expect(state.postDrafts).toHaveLength(1);
    expect(state.postDrafts[0]).toMatchObject({ platform: "x", core_idea_id: "ci_1", editor_status: "pending", human_approval_status: "pending", run_id: "run1" });
    expect(["failure_story", "business_repro", "critique", "tips_enum"]).toContain(state.postDrafts[0].primary_hook);
    expect(state.materials[0].meta.composed_at).toBeDefined();
    expect(r.perMaterial[0]).toMatchObject({ materialId: "m1", outcome: "ok", content_type: "paraphrase", citationCount: 1 });
    expect(typeof r.perMaterial[0].costJpy).toBe("number");
  });

  test("no_draft: submit 未呼び出しは errorCount + claim 解除 + 理由を perMaterial に残す", async () => {
    const state: St = { materials: [mat("m1")], coreIdeas: [], postDrafts: [] };
    const noSubmit = (async () => ({ ok: true, terminal: "idle", stopReason: "end_turn", transitions: [], agentText: "", toolCalls: [], unhandledTools: [], wallClockMs: 1, ids: {} })) as any;
    const r = await runCompose({ sb: makeSb(state), apiKey: "k", runSession: noSubmit, logger: silent });
    expect(r.draftCount).toBe(0);
    expect(r.errorCount).toBe(1);
    expect(r.perMaterial[0].outcome).toBe("no_draft");
    expect(state.postDrafts).toHaveLength(0);
    expect(state.materials[0].meta.composed_at).toBeUndefined();
    expect(state.materials[0].meta.compose_claimed_at).toBeUndefined(); // 解除済（再試行可）
  });

  test("MA失敗(timeout): draft 化せず claim 解除・error を残す", async () => {
    const state: St = { materials: [mat("m1")], coreIdeas: [], postDrafts: [] };
    const fail = (async () => ({ ok: false, terminal: "timeout", error: "timeout", transitions: ["TIMEOUT"], agentText: "", toolCalls: [], unhandledTools: [], wallClockMs: 1, ids: {} })) as any;
    const r = await runCompose({ sb: makeSb(state), apiKey: "k", runSession: fail, logger: silent });
    expect(r.errorCount).toBe(1);
    expect(r.perMaterial[0].outcome).toBe("timeout");
    expect(r.perMaterial[0].error).toBe("timeout");
    expect(state.materials[0].meta.composed_at).toBeUndefined();
    expect(state.materials[0].meta.compose_claimed_at).toBeUndefined();
  });

  test("stub ガード: MA が stub 返却なら draft 化せず outcome=stub", async () => {
    const state: St = { materials: [mat("m1")], coreIdeas: [], postDrafts: [] };
    const stub = (async () => ({ ok: true, stub: true, terminal: "idle", stopReason: "end_turn", transitions: [], agentText: "(stub) ok", toolCalls: [], unhandledTools: [], wallClockMs: 1, ids: {} })) as any;
    const r = await runCompose({ sb: makeSb(state), apiKey: "k", runSession: stub, logger: silent });
    expect(r.draftCount).toBe(0);
    expect(r.perMaterial[0]).toMatchObject({ outcome: "stub", stub: true });
    expect(state.postDrafts).toHaveLength(0);
  });

  test("post_draft 失敗: 作成済み core_idea を補償削除し orphan を残さない", async () => {
    const state: St = { materials: [mat("m1")], coreIdeas: [], postDrafts: [], failPostDraft: true };
    const r = await runCompose({ sb: makeSb(state), apiKey: "k", runSession: okSession(), logger: silent });
    expect(r.draftCount).toBe(0);
    expect(r.errorCount).toBe(1);
    expect(r.perMaterial[0].outcome).toBe("error");
    expect(state.coreIdeas).toHaveLength(0); // 補償削除済（orphan なし）
    expect(state.postDrafts).toHaveLength(0);
    expect(state.materials[0].meta.compose_claimed_at).toBeUndefined(); // claim 解除（再試行可）
  });

  test("部分失敗: 2件中1件失敗でも他は生成", async () => {
    const state: St = { materials: [mat("m1"), mat("m2")], coreIdeas: [], postDrafts: [] };
    let n = 0;
    const mixed = (async (deps: any) => {
      n++;
      if (n === 1) { deps.customToolHandler?.("submit_draft", { body: "本文A", fmat: "short", topic: "t", category: "paraphrase" }); return { ok: true, terminal: "idle", stopReason: "end_turn", unhandledTools: [], toolCalls: [], transitions: [], agentText: "a", wallClockMs: 1, ids: {}, sessionUsage: { input_tokens: 10, output_tokens: 5 } }; }
      return { ok: false, terminal: "error", error: "boom", unhandledTools: [], toolCalls: [], transitions: [], agentText: "", wallClockMs: 1, ids: {} };
    }) as any;
    const r = await runCompose({ sb: makeSb(state), apiKey: "k", runSession: mixed, logger: silent });
    expect(r.processed).toBe(2);
    expect(r.draftCount).toBe(1);
    expect(r.errorCount).toBe(1);
  });

  test("maxComposePerRun で件数を bound", async () => {
    const state: St = { materials: [mat("m1"), mat("m2"), mat("m3"), mat("m4")], coreIdeas: [], postDrafts: [] };
    const r = await runCompose({ sb: makeSb(state), apiKey: "k", config: { writerModel: "claude-haiku-4-5", maxComposePerRun: 2, timeoutMs: 1000 }, runSession: okSession(), logger: silent });
    expect(r.processed).toBe(2);
    expect(r.draftCount).toBe(2);
  });

  test("冪等: composed_at 済の素材は対象外", async () => {
    const state: St = { materials: [mat("m1", { composed_at: "2026-06-07T00:00:00Z" })], coreIdeas: [], postDrafts: [] };
    const r = await runCompose({ sb: makeSb(state), apiKey: "k", runSession: okSession(), logger: silent });
    expect(r.processed).toBe(0);
  });
});
