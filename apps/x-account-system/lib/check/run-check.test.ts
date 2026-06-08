/**
 * lib/check/run-check.test.ts
 * stateful fake Supabase + 注入 runSession / pushApproval / fetchRecent で wiring を検証（実 API 不要）。
 * 正常(approved+flag) / 重複flag / ファクトflag / 不明=flag通す / 空 / MA失敗(pending据置) /
 * stubガード / no_submit / 冪等 / update失敗 / pushApproval 呼出 / 直近投稿の userMessage 同梱。
 * 元ネタ注入: # 元ネタツイート の raw_text＋translation 併記、source_grounded 捕捉、core_idea null は degrade。
 */
import { runCheck, type RunCheckDeps } from "./run-check";

type Draft = {
  id: string; body: string; fmat: string; core_idea_id: string | null; run_id: string | null;
  editor_status: string; human_approval_status: string;
  risk_level?: string; risk_reasons?: unknown; editor_output?: unknown;
};
type CoreIdea = { id: string; source_material_ids: string[] };
type Mat = { id: string; meta: Record<string, unknown>; raw_text?: string };
type St = { drafts: Draft[]; coreIdeas?: CoreIdea[]; materials?: Mat[]; failUpdate?: boolean; failMatUpdate?: boolean; failCiRead?: boolean };

/**
 * 必要最小の chainable Supabase mock。
 * post_drafts: read(pending) / update(approve or reject, CAS) / materials_store: read(.in) / update(meta) /
 * core_ideas: read(.single → source_material_ids)。
 */
function makeSb(state: St): any {
  function qb(table: string) {
    const ops: Array<{ m: string; a: any[] }> = [];
    const rec = (m: string) => (...a: any[]) => { ops.push({ m, a }); return builder; };
    const eqVal = (col: string) => ops.find((o) => o.m === "eq" && o.a[0] === col)?.a[1];
    const has = (m: string) => ops.some((o) => o.m === m);
    const resolve = (single: boolean): { data: any; error: any } => {
      if (table === "post_drafts") {
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
      }
      if (table === "core_ideas") {
        if (state.failCiRead) return { data: null, error: { message: "ci boom" } };
        const id = eqVal("id");
        const ci = (state.coreIdeas ?? []).find((c) => c.id === id);
        const data = ci ? { source_material_ids: ci.source_material_ids } : null;
        return { data: single ? data : data ? [data] : [], error: null };
      }
      if (table === "materials_store") {
        if (has("update")) {
          if (state.failMatUpdate) return { data: null, error: { message: "mat boom" } };
          const payload = ops.find((o) => o.m === "update")!.a[0];
          const id = eqVal("id");
          const mt = (state.materials ?? []).find((x) => x.id === id);
          if (mt) mt.meta = payload.meta;
          return { data: null, error: null };
        }
        // read: .in("id", ids) → {id, raw_text, meta}
        const inOp = ops.find((o) => o.m === "in" && o.a[0] === "id");
        const ids = (inOp?.a[1] ?? []) as string[];
        const rows = (state.materials ?? []).filter((x) => ids.includes(x.id)).map((x) => ({ id: x.id, raw_text: x.raw_text ?? "", meta: x.meta }));
        return { data: rows, error: null };
      }
      return { data: null, error: null };
    };
    const builder: any = {
      select: rec("select"), eq: rec("eq"), in: rec("in"), limit: rec("limit"), update: rec("update"),
      single: () => Promise.resolve(resolve(true)),
      then: (onF: any, onR: any) => Promise.resolve(resolve(false)).then(onF, onR),
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

  test("正常(approved+flag): unverifiable flag → approved・risk high・risk_reasons・editor_output・pushApproval", async () => {
    const state: St = { drafts: [draft("d1")] };
    const rec = recorder();
    const r = await runCheck(base(state, {
      runSession: checkSession({ verdict: "flag", risk_level: "high", factcheck: "unverifiable", flags: ["『導入社数1万社』を確認できず（要確認）"] }),
      pushApproval: rec.fn,
    }));
    expect(r).toMatchObject({ checked: 1, approved: 1, sentBack: 0, flagged: 1, errorCount: 0 });
    const d = state.drafts[0];
    expect(d.editor_status).toBe("approved");
    expect(d.risk_level).toBe("high");
    expect(d.risk_reasons).toEqual(["『導入社数1万社』を確認できず（要確認）"]);
    expect((d.editor_output as any).decision).toBe("approved");
    expect((d.editor_output as any).warnings).toEqual([{ rule: "『導入社数1万社』を確認できず（要確認）", reason: "『導入社数1万社』を確認できず（要確認）" }]);
    expect((d.editor_output as any).riskLevel).toBe("high");
    expect(rec.calls).toHaveLength(1);
    expect(rec.calls[0]).toMatchObject({ id: "d1", body: "本文 d1", fmat: "short" });
    expect(rec.calls[0].out.riskReasons).toEqual(["『導入社数1万社』を確認できず（要確認）"]);
    expect(r.perDraft[0]).toMatchObject({ draftId: "d1", verdict: "flag", duplicate: "ok", factcheck: "unverifiable", flagCount: 1, outcome: "ok" });
  });

  test("suspicious → 差し戻し(sent_back): draft rejected・素材 compose_attempts++/composed_at=null/last_check_flags・pushApproval なし", async () => {
    const state: St = {
      drafts: [draft("d1", { core_idea_id: "ci1" })],
      coreIdeas: [{ id: "ci1", source_material_ids: ["m1"] }],
      materials: [{ id: "m1", meta: { compose_attempts: 0, composed_at: "2026-06-07T00:00:00Z", compose_claimed_at: "2026-06-07T00:00:00Z" } }],
    };
    const rec = recorder();
    const r = await runCheck(base(state, {
      runSession: checkSession({ verdict: "flag", risk_level: "high", factcheck: "suspicious", flags: ["『〇〇が無料化』は事実と異なる可能性"] }),
      pushApproval: rec.fn,
    }));
    expect(r).toMatchObject({ checked: 1, approved: 0, sentBack: 1, flagged: 1, errorCount: 0 });
    const d = state.drafts[0];
    expect(d.editor_status).toBe("rejected");
    expect((d.editor_output as any).decision).toBe("rejected");
    expect(d.risk_reasons).toEqual(["『〇〇が無料化』は事実と異なる可能性"]);
    const m = state.materials![0];
    expect(m.meta.compose_attempts).toBe(1);
    expect(m.meta.composed_at).toBeNull();
    expect(m.meta.compose_claimed_at).toBeNull();
    expect(m.meta.last_check_flags).toEqual(["『〇〇が無料化』は事実と異なる可能性"]);
    expect(rec.calls).toHaveLength(0); // 人間へ push しない
    expect(r.perDraft[0]).toMatchObject({ draftId: "d1", outcome: "sent_back", factcheck: "suspicious", attempts: 1 });
  });

  test("差し戻しの素材再queue全失敗 → draft を pending に revert・errorCount・requeue_failed（silent loss 防止）", async () => {
    const state: St = {
      drafts: [draft("d1", { core_idea_id: "ci1" })],
      coreIdeas: [{ id: "ci1", source_material_ids: ["m1"] }],
      materials: [{ id: "m1", meta: { compose_attempts: 0 } }],
      failMatUpdate: true,
    };
    const rec = recorder();
    const r = await runCheck(base(state, {
      runSession: checkSession({ verdict: "flag", factcheck: "suspicious", flags: ["嘘"] }),
      pushApproval: rec.fn,
    }));
    expect(r.sentBack).toBe(0);
    expect(r.errorCount).toBe(1);
    expect(r.perDraft[0].outcome).toBe("requeue_failed");
    expect(state.drafts[0].editor_status).toBe("pending"); // revert（rejected のまま消えない）
    expect(rec.calls).toHaveLength(0);
  });

  test("差し戻し時の core_idea 読取失敗 → 枯渇扱いせず pending 据置・check_read_failed（suspicious を誤 approve しない）", async () => {
    const state: St = {
      drafts: [draft("d1", { core_idea_id: "ci1" })],
      coreIdeas: [{ id: "ci1", source_material_ids: ["m1"] }],
      materials: [{ id: "m1", meta: { compose_attempts: 0 } }],
      failCiRead: true,
    };
    const rec = recorder();
    const r = await runCheck(base(state, {
      runSession: checkSession({ verdict: "flag", factcheck: "suspicious", flags: ["嘘"] }),
      pushApproval: rec.fn,
    }));
    expect(r.errorCount).toBe(1);
    expect(r.perDraft[0].outcome).toBe("check_read_failed");
    expect(state.drafts[0].editor_status).toBe("pending"); // approve しない
    expect(rec.calls).toHaveLength(0);
  });

  test("similar → 差し戻し(sent_back): 重複も再生成へ", async () => {
    const state: St = {
      drafts: [draft("d1", { core_idea_id: "ci1" })],
      coreIdeas: [{ id: "ci1", source_material_ids: ["m1"] }],
      materials: [{ id: "m1", meta: { compose_attempts: 0 } }],
    };
    const rec = recorder();
    const r = await runCheck(base(state, {
      runSession: checkSession({ verdict: "flag", risk_level: "high", duplicate: "similar", flags: ["直近投稿と内容が重複気味"] }),
      pushApproval: rec.fn,
    }));
    expect(r).toMatchObject({ checked: 1, approved: 0, sentBack: 1 });
    expect(state.drafts[0].editor_status).toBe("rejected");
    expect(state.materials![0].meta.compose_attempts).toBe(1);
    expect(rec.calls).toHaveLength(0);
    expect(r.perDraft[0]).toMatchObject({ outcome: "sent_back", duplicate: "similar" });
  });

  test("上限到達 → flagged_max_retry: compose_attempts>=max は差し戻さず approved+flag+人間へ", async () => {
    const state: St = {
      drafts: [draft("d1", { core_idea_id: "ci1" })],
      coreIdeas: [{ id: "ci1", source_material_ids: ["m1"] }],
      materials: [{ id: "m1", meta: { compose_attempts: 2 } }], // maxRedoAttempts 既定 2 に到達
    };
    const rec = recorder();
    const r = await runCheck(base(state, {
      runSession: checkSession({ verdict: "flag", risk_level: "high", factcheck: "suspicious", flags: ["直らない嘘"] }),
      pushApproval: rec.fn,
    }));
    expect(r).toMatchObject({ checked: 1, approved: 1, sentBack: 0, flagged: 1 });
    expect(state.drafts[0].editor_status).toBe("approved"); // 差し戻さず人間へ
    expect(state.materials![0].meta.compose_attempts).toBe(2); // 素材は触らない（再生成しない）
    expect(rec.calls).toHaveLength(1); // 人間へ push
    expect(r.perDraft[0]).toMatchObject({ outcome: "flagged_max_retry", attempts: 2 });
  });

  test("差し戻し候補だが素材が引けない → flagged_max_retry で人間へ（無言で消さない）", async () => {
    const state: St = { drafts: [draft("d1", { core_idea_id: null })] };
    const rec = recorder();
    const r = await runCheck(base(state, {
      runSession: checkSession({ verdict: "flag", risk_level: "high", factcheck: "suspicious", flags: ["嘘疑い"] }),
      pushApproval: rec.fn,
    }));
    expect(r).toMatchObject({ approved: 1, sentBack: 0 });
    expect(state.drafts[0].editor_status).toBe("approved");
    expect(rec.calls).toHaveLength(1);
    expect(r.perDraft[0].outcome).toBe("flagged_max_retry");
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

  test("不明=flag通す: factcheck=unverifiable は差し戻さず soft で approved（従来パス）", async () => {
    const state: St = { drafts: [draft("d1")] };
    const r = await runCheck(base(state, {
      runSession: checkSession({ verdict: "flag", risk_level: "low", factcheck: "unverifiable", flags: ["『導入社数1万社』を確認できず（要確認）"] }),
    }));
    expect(r).toMatchObject({ checked: 1, approved: 1, sentBack: 0, errorCount: 0 });
    expect(state.drafts[0].editor_status).toBe("approved"); // block も差し戻しもしない
    expect(r.perDraft[0]).toMatchObject({ factcheck: "unverifiable", outcome: "ok" });
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
    const r = await runCheck(base(state, { config: { checkerModel: "claude-haiku-4-5", maxCheckPerRun: 2, recentPostsLookbackDays: 14, timeoutMs: 1000, maxRedoAttempts: 2 } }));
    expect(r.checked).toBe(2);
  });

  test("元ネタツイートを userMessage に注入（raw_text＋translation 併記・本文と直近の間）・source_grounded 捕捉", async () => {
    const state: St = {
      drafts: [draft("d1", { core_idea_id: "ci1" })],
      coreIdeas: [{ id: "ci1", source_material_ids: ["m1", "m2"] }],
      materials: [
        { id: "m1", raw_text: "Original English tweet", meta: { translation: "元の英語ツイート" } },
        { id: "m2", raw_text: "日本語の元ネタ", meta: {} }, // translation 欠損は原文のみ（安全側）
      ],
    };
    let seenMsg = "";
    const capture = (async (deps: any) => {
      seenMsg = deps.userMessage;
      deps.customToolHandler?.("submit_check", { verdict: "ok", risk_level: "low", duplicate: "ok", factcheck: "ok", source_grounded: true, flags: [] });
      return { ok: true, terminal: "idle", stopReason: "end_turn", transitions: [], agentText: "x", toolCalls: [], unhandledTools: [], wallClockMs: 1, ids: {}, sessionUsage: { input_tokens: 1, output_tokens: 1 } };
    }) as any;
    const recent: NonNullable<RunCheckDeps["fetchRecent"]> = (async () => [{ id: "p1", body: "過去の投稿A" }]) as any;
    const r = await runCheck(base(state, { runSession: capture, fetchRecent: recent }));
    expect(seenMsg).toContain("# 元ネタツイート");
    expect(seenMsg).toContain("Original English tweet");
    expect(seenMsg).toContain("[日本語訳] 元の英語ツイート");
    expect(seenMsg).toContain("日本語の元ネタ");
    // translation が無い素材には [日本語訳] を付けない（原文のみ＝安全側）→ 出現 1 回
    expect(seenMsg.match(/\[日本語訳\]/g)?.length).toBe(1);
    // 注入位置: # ドラフト本文 → # 元ネタツイート → # 直近の投稿 の順
    expect(seenMsg.indexOf("# ドラフト本文")).toBeLessThan(seenMsg.indexOf("# 元ネタツイート"));
    expect(seenMsg.indexOf("# 元ネタツイート")).toBeLessThan(seenMsg.indexOf("# 直近の投稿"));
    expect(r.perDraft[0]).toMatchObject({ source_grounded: true, outcome: "ok" });
  });

  test("core_idea_id null → 元ネタ節なしで degrade・点検続行・source_grounded 捕捉", async () => {
    const state: St = { drafts: [draft("d1", { core_idea_id: null })] };
    let seenMsg = "";
    const capture = (async (deps: any) => {
      seenMsg = deps.userMessage;
      deps.customToolHandler?.("submit_check", { verdict: "ok", risk_level: "low", duplicate: "ok", factcheck: "ok", source_grounded: false, flags: [] });
      return { ok: true, terminal: "idle", stopReason: "end_turn", transitions: [], agentText: "x", toolCalls: [], unhandledTools: [], wallClockMs: 1, ids: {}, sessionUsage: { input_tokens: 1, output_tokens: 1 } };
    }) as any;
    const r = await runCheck(base(state, { runSession: capture }));
    expect(seenMsg).not.toContain("# 元ネタツイート");
    expect(r.checked).toBe(1);
    expect(r.perDraft[0]).toMatchObject({ source_grounded: false, outcome: "ok" });
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
