/**
 * lib/check/run-check.test.ts
 * stateful fake Supabase + 注入 runSession / pushApproval / fetchRecent で wiring を検証（実 API 不要）。
 * 正常(approved+flag) / 重複flag / ファクトflag / 不明=flag通す / 空 / MA失敗(pending据置) /
 * stubガード / no_submit / 冪等 / update失敗 / pushApproval 呼出 / 直近投稿の userMessage 同梱。
 */
import { runCheck, type RunCheckDeps } from "./run-check";

type Draft = {
  id: string; body: string; fmat: string; core_idea_id: string | null; run_id: string | null;
  editor_status: string; human_approval_status: string;
  risk_level?: string; risk_reasons?: unknown; editor_output?: unknown;
};
type St = { drafts: Draft[]; failUpdate?: boolean };

/** 必要最小の chainable Supabase mock。post_drafts の read(pending) と update(approve)。 */
function makeSb(state: St): any {
  function qb(table: string) {
    const ops: Array<{ m: string; a: any[] }> = [];
    const rec = (m: string) => (...a: any[]) => { ops.push({ m, a }); return builder; };
    const eqVal = (col: string) => ops.find((o) => o.m === "eq" && o.a[0] === col)?.a[1];
    const has = (m: string) => ops.some((o) => o.m === m);
    const resolve = (): { data: any; error: any } => {
      if (table !== "post_drafts") return { data: null, error: null };
      if (has("update")) {
        if (state.failUpdate) return { data: null, error: { message: "upd boom" } };
        const payload = ops.find((o) => o.m === "update")!.a[0];
        const id = eqVal("id");
        const d = state.drafts.find((x) => x.id === id);
        // CAS: .eq("editor_status","pending") ガードがあれば pending の時だけ成功し [{id}] を返す。
        const guardPending = ops.some((o) => o.m === "eq" && o.a[0] === "editor_status" && o.a[1] === "pending");
        if (guardPending && (!d || d.editor_status !== "pending")) return { data: [], error: null };
        if (d) Object.assign(d, payload);
        return { data: d ? [{ id: d.id }] : [], error: null };
      }
      // read: editor_status='pending' AND human_approval_status='pending'
      const limit = ops.find((o) => o.m === "limit")?.a[0] ?? 1000;
      const rows = state.drafts
        .filter((x) => x.editor_status === "pending" && x.human_approval_status === "pending")
        .slice(0, limit)
        .map((x) => ({ id: x.id, body: x.body, fmat: x.fmat, core_idea_id: x.core_idea_id, run_id: x.run_id }));
      return { data: rows, error: null };
    };
    const builder: any = {
      select: rec("select"), eq: rec("eq"), limit: rec("limit"), update: rec("update"),
      then: (onF: any, onR: any) => Promise.resolve(resolve()).then(onF, onR),
    };
    return builder;
  }
  return { from: (t: string) => qb(t) };
}

function draft(id: string, over: Partial<Draft> = {}): Draft {
  return { id, body: `本文 ${id}`, fmat: "short", core_idea_id: `ci_${id}`, run_id: "r1", editor_status: "pending", human_approval_status: "pending", ...over };
}

/** submit_check を呼ぶ runSession fake。verdict を差し込む。 */
function checkSession(v: Partial<Record<string, unknown>> = {}): NonNullable<RunCheckDeps["runSession"]> {
  return (async (deps: any) => {
    deps.customToolHandler?.("submit_check", { verdict: "ok", risk_level: "low", duplicate: "ok", factcheck: "ok", flags: [], ...v });
    return { ok: true, terminal: "idle", stopReason: "end_turn", transitions: [], agentText: "x", toolCalls: [], unhandledTools: [], wallClockMs: 1, ids: {}, sessionUsage: { input_tokens: 500, output_tokens: 100 } };
  }) as any;
}
const silent = { warn: () => {}, info: () => {} };
const noRecent: NonNullable<RunCheckDeps["fetchRecent"]> = (async () => []) as any;

/** pushApproval 呼出を記録する注入。 */
function recorder() {
  const calls: Array<{ id: string; body: string; out: any; fmat: string }> = [];
  const fn = (async (_env: any, id: string, body: string, out: any, fmat: string) => { calls.push({ id, body, out, fmat }); }) as NonNullable<RunCheckDeps["pushApproval"]>;
  return { calls, fn };
}

const base = (state: St, extra: Partial<RunCheckDeps> = {}): RunCheckDeps => ({
  env: {} as any, sb: makeSb(state), apiKey: "k", logger: silent, fetchRecent: noRecent, runSession: checkSession(), pushApproval: recorder().fn, ...extra,
});

describe("runCheck", () => {
  test("空: pending が無ければ noop", async () => {
    const state: St = { drafts: [draft("d1", { editor_status: "approved" })] };
    const r = await runCheck(base(state));
    expect(r).toMatchObject({ checked: 0, flagged: 0, errorCount: 0 });
    expect(r.perDraft).toHaveLength(0);
  });

  test("正常(approved+flag): 重複flag → approved・risk high・risk_reasons・editor_output・pushApproval", async () => {
    const state: St = { drafts: [draft("d1")] };
    const rec = recorder();
    const r = await runCheck(base(state, {
      runSession: checkSession({ verdict: "flag", risk_level: "high", duplicate: "similar", flags: ["直近投稿と内容が重複気味"] }),
      pushApproval: rec.fn,
    }));
    expect(r).toMatchObject({ checked: 1, flagged: 1, errorCount: 0 });
    const d = state.drafts[0];
    expect(d.editor_status).toBe("approved");
    expect(d.risk_level).toBe("high");
    expect(d.risk_reasons).toEqual(["直近投稿と内容が重複気味"]);
    expect((d.editor_output as any).decision).toBe("approved");
    expect((d.editor_output as any).warnings).toEqual([{ rule: "直近投稿と内容が重複気味", reason: "直近投稿と内容が重複気味" }]);
    expect((d.editor_output as any).riskLevel).toBe("high");
    expect(rec.calls).toHaveLength(1);
    expect(rec.calls[0]).toMatchObject({ id: "d1", body: "本文 d1", fmat: "short" });
    expect(rec.calls[0].out.riskReasons).toEqual(["直近投稿と内容が重複気味"]);
    expect(r.perDraft[0]).toMatchObject({ draftId: "d1", verdict: "flag", duplicate: "similar", factcheck: "ok", flagCount: 1, outcome: "ok" });
  });

  test("ok(flag無し): approved・warnings 空・flagged 0", async () => {
    const state: St = { drafts: [draft("d1")] };
    const rec = recorder();
    const r = await runCheck(base(state, { runSession: checkSession(), pushApproval: rec.fn }));
    expect(r).toMatchObject({ checked: 1, flagged: 0, errorCount: 0 });
    expect(state.drafts[0].editor_status).toBe("approved");
    expect(state.drafts[0].risk_level).toBe("low");
    expect((state.drafts[0].editor_output as any).warnings).toEqual([]);
    expect(rec.calls).toHaveLength(1);
  });

  test("ファクトflag: 完全な嘘は factcheck=suspicious・flag・but approved", async () => {
    const state: St = { drafts: [draft("d1")] };
    const r = await runCheck(base(state, {
      runSession: checkSession({ verdict: "flag", risk_level: "high", factcheck: "suspicious", flags: ["『〇〇が無料化』は事実と異なる可能性"] }),
    }));
    expect(r).toMatchObject({ checked: 1, flagged: 1 });
    expect(state.drafts[0].editor_status).toBe("approved");
    expect(r.perDraft[0]).toMatchObject({ factcheck: "suspicious", flagCount: 1 });
  });

  test("不明=flag通す: factcheck=unverifiable でも soft で approved", async () => {
    const state: St = { drafts: [draft("d1")] };
    const r = await runCheck(base(state, {
      runSession: checkSession({ verdict: "flag", risk_level: "low", factcheck: "unverifiable", flags: ["『導入社数1万社』を確認できず（要確認）"] }),
    }));
    expect(r).toMatchObject({ checked: 1, errorCount: 0 });
    expect(state.drafts[0].editor_status).toBe("approved"); // block しない
    expect(r.perDraft[0]).toMatchObject({ factcheck: "unverifiable" });
  });

  test("MA失敗: editor_status は pending 据置・errorCount・pushApproval 呼ばない", async () => {
    const state: St = { drafts: [draft("d1")] };
    const rec = recorder();
    const fail = (async () => ({ ok: false, terminal: "timeout", error: "timeout", transitions: ["TIMEOUT"], agentText: "", toolCalls: [], unhandledTools: [], wallClockMs: 1, ids: {} })) as any;
    const r = await runCheck(base(state, { runSession: fail, pushApproval: rec.fn }));
    expect(r).toMatchObject({ checked: 0, errorCount: 1 });
    expect(state.drafts[0].editor_status).toBe("pending");
    expect(r.perDraft[0]).toMatchObject({ draftId: "d1", outcome: "timeout", error: "timeout" });
    expect(rec.calls).toHaveLength(0);
  });

  test("stubガード: MA が stub 返却なら approved にせず outcome=stub", async () => {
    const state: St = { drafts: [draft("d1")] };
    const rec = recorder();
    const stub = (async () => ({ ok: true, stub: true, terminal: "idle", stopReason: "end_turn", transitions: [], agentText: "(stub) ok", toolCalls: [], unhandledTools: [], wallClockMs: 1, ids: {} })) as any;
    const r = await runCheck(base(state, { runSession: stub, pushApproval: rec.fn }));
    expect(r).toMatchObject({ checked: 0, errorCount: 1 });
    expect(state.drafts[0].editor_status).toBe("pending");
    expect(r.perDraft[0]).toMatchObject({ outcome: "stub", stub: true });
    expect(rec.calls).toHaveLength(0);
  });

  test("no_submit: submit_check 未呼び出しは pending 据置・errorCount", async () => {
    const state: St = { drafts: [draft("d1")] };
    const noSubmit = (async () => ({ ok: true, terminal: "idle", stopReason: "end_turn", transitions: [], agentText: "x", toolCalls: [], unhandledTools: [], wallClockMs: 1, ids: {}, sessionUsage: { input_tokens: 1, output_tokens: 1 } })) as any;
    const r = await runCheck(base(state, { runSession: noSubmit }));
    expect(r).toMatchObject({ checked: 0, errorCount: 1 });
    expect(state.drafts[0].editor_status).toBe("pending");
    expect(r.perDraft[0].outcome).toBe("no_submit");
  });

  test("冪等: approved 済は再処理されない（pending のみ拾う）", async () => {
    const state: St = { drafts: [draft("d1", { editor_status: "approved" }), draft("d2")] };
    const rec = recorder();
    const r = await runCheck(base(state, { pushApproval: rec.fn }));
    expect(r.checked).toBe(1);
    expect(rec.calls).toHaveLength(1);
    expect(rec.calls[0].id).toBe("d2");
  });

  test("update失敗: pending 据置・errorCount・pushApproval 呼ばない", async () => {
    const state: St = { drafts: [draft("d1")], failUpdate: true };
    const rec = recorder();
    const r = await runCheck(base(state, { pushApproval: rec.fn }));
    expect(r).toMatchObject({ checked: 0, errorCount: 1 });
    expect(state.drafts[0].editor_status).toBe("pending");
    expect(r.perDraft[0].outcome).toBe("update_failed");
    expect(rec.calls).toHaveLength(0);
  });

  test("raced: MA中に別ランが先に approve → CAS 0行で pushApproval せず outcome=raced", async () => {
    const state: St = { drafts: [draft("d1")] };
    const rec = recorder();
    // MA セッション中に別ランが d1 を approve したと仮定（CAS ガードに引っかかる）。
    const racingSession = (async (deps: any) => {
      deps.customToolHandler?.("submit_check", { verdict: "ok", risk_level: "low", duplicate: "ok", factcheck: "ok", flags: [] });
      state.drafts[0].editor_status = "approved";
      return { ok: true, terminal: "idle", stopReason: "end_turn", transitions: [], toolCalls: [], unhandledTools: [], agentText: "x", wallClockMs: 1, ids: {}, sessionUsage: { input_tokens: 1, output_tokens: 1 } };
    }) as any;
    const r = await runCheck(base(state, { runSession: racingSession, pushApproval: rec.fn }));
    expect(r.checked).toBe(0);
    expect(r.errorCount).toBe(0); // raced は errorCount を上げない
    expect(r.perDraft[0].outcome).toBe("raced");
    expect(rec.calls).toHaveLength(0); // 二重通知しない
  });

  test("pushApproval 失敗: approved だが outcome=push_failed で可視化（要手動回収）", async () => {
    const state: St = { drafts: [draft("d1")] };
    const failPush = (async () => { throw new Error("line down"); }) as NonNullable<RunCheckDeps["pushApproval"]>;
    const r = await runCheck(base(state, { pushApproval: failPush }));
    expect(state.drafts[0].editor_status).toBe("approved"); // 承認は済
    expect(r.perDraft[0].outcome).toBe("push_failed");
    expect(r.errorCount).toBe(1);
  });

  test("fetchRecent 失敗: recentFetchFailed を立てて続行（重複劣化を可視化）", async () => {
    const state: St = { drafts: [draft("d1")] };
    const failRecent = (async () => { throw new Error("recent down"); }) as any;
    const r = await runCheck(base(state, { fetchRecent: failRecent }));
    expect(r.recentFetchFailed).toBe(true);
    expect(r.checked).toBe(1); // ファクトのみで続行
  });

  test("maxCheckPerRun で件数を bound", async () => {
    const state: St = { drafts: [draft("d1"), draft("d2"), draft("d3")] };
    const r = await runCheck(base(state, { config: { checkerModel: "claude-haiku-4-5", maxCheckPerRun: 2, recentPostsLookbackDays: 14, timeoutMs: 1000 } }));
    expect(r.checked).toBe(2);
  });

  test("直近投稿を userMessage に同梱（重複チェック用）", async () => {
    const state: St = { drafts: [draft("d1")] };
    let seenMsg = "";
    const capture = (async (deps: any) => {
      seenMsg = deps.userMessage;
      deps.customToolHandler?.("submit_check", { verdict: "ok", risk_level: "low", duplicate: "ok", factcheck: "ok", flags: [] });
      return { ok: true, terminal: "idle", stopReason: "end_turn", transitions: [], agentText: "x", toolCalls: [], unhandledTools: [], wallClockMs: 1, ids: {}, sessionUsage: { input_tokens: 1, output_tokens: 1 } };
    }) as any;
    const recent: NonNullable<RunCheckDeps["fetchRecent"]> = (async () => [{ id: "p1", body: "過去の投稿A" }, { id: "p2", body: "過去の投稿B" }]) as any;
    await runCheck(base(state, { runSession: capture, fetchRecent: recent }));
    expect(seenMsg).toContain("# 直近の投稿（重複チェック用）");
    expect(seenMsg).toContain("過去の投稿A");
    expect(seenMsg).toContain("過去の投稿B");
  });
});
