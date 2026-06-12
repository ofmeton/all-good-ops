import {
  RUNTIME_PARAM_BOUNDS,
  RUNTIME_PARAM_IDS,
  RUNTIME_PARAM_DEFAULTS,
  clipRuntimeParam,
  resolveRuntimeParams,
  setRuntimeParam,
  deleteRuntimeParam,
} from "./runtime-params.ts";

/**
 * in-memory fake supabase（runtime_params テーブルのみ）。実 DB/API を一切叩かない。
 * 対応 chain: from().select() / .select().eq().maybeSingle() / .upsert() / .delete().eq()
 */
type Row = { param_id: string; value: unknown };
function makeFakeSb(
  initial: Record<string, unknown> = {},
  opts: { selectError?: boolean; selectThrow?: boolean } = {},
) {
  const store = new Map<string, Row>();
  for (const [k, v] of Object.entries(initial)) store.set(k, { param_id: k, value: v });

  const from = (table: string) => {
    if (table !== "runtime_params") throw new Error(`unexpected table: ${table}`);
    return {
      select(_cols: string) {
        let filterId: string | null = null;
        const result = () => {
          if (opts.selectThrow) throw new Error("transient select throw");
          if (opts.selectError) return { data: null, error: { message: "select err" } };
          let rows = [...store.values()];
          if (filterId != null) rows = rows.filter((r) => r.param_id === filterId);
          return { data: rows.map((r) => ({ param_id: r.param_id, value: r.value })), error: null };
        };
        const builder: {
          eq: (c: string, v: string) => typeof builder;
          maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
          then: (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) => Promise<unknown>;
        } = {
          eq(_col, val) {
            filterId = val;
            return builder;
          },
          maybeSingle() {
            return new Promise((resolve) => {
              const r = result();
              resolve(r.error ? { data: null, error: r.error } : { data: r.data[0] ?? null, error: null });
            });
          },
          then(onF, onR) {
            // executor が throw すれば reject → await 側で fail-open catch に入る。
            return new Promise((resolve) => resolve(result())).then(onF, onR);
          },
        };
        return builder;
      },
      upsert(rowData: { param_id: string; value: unknown }) {
        store.set(rowData.param_id, { param_id: rowData.param_id, value: rowData.value });
        return Promise.resolve({ error: null });
      },
      delete() {
        return {
          eq(_col: string, val: string) {
            store.delete(val);
            return Promise.resolve({ error: null });
          },
        };
      },
    };
  };
  return { sb: { from } as never, store };
}

describe("RUNTIME_PARAM_BOUNDS / IDS / DEFAULTS", () => {
  it("4 レバーが定義され、enforce 下限=0・quota 下限>0（計測ループ不滅）", () => {
    expect(RUNTIME_PARAM_IDS.sort()).toEqual(
      ["collector_exploration_quota", "collector_prerank_enforce", "collector_prerank_max_age_hours", "collector_shortlist_top_k"],
    );
    expect(RUNTIME_PARAM_BOUNDS.collector_prerank_enforce).toEqual({ min: 0, max: 1 });
    expect(RUNTIME_PARAM_BOUNDS.collector_exploration_quota.min).toBeGreaterThan(0);
    // default に全レバーが揃う。enforce は 0=shadow。
    expect(RUNTIME_PARAM_DEFAULTS.collector_prerank_enforce).toBe(0);
    for (const id of RUNTIME_PARAM_IDS) expect(typeof RUNTIME_PARAM_DEFAULTS[id]).toBe("number");
  });
});

describe("clipRuntimeParam", () => {
  it("bounds で上下に clip", () => {
    expect(clipRuntimeParam("collector_shortlist_top_k", 999)).toBe(120);
    expect(clipRuntimeParam("collector_shortlist_top_k", 1)).toBe(20);
    expect(clipRuntimeParam("collector_exploration_quota", 1)).toBe(5);
    expect(clipRuntimeParam("collector_prerank_enforce", 5)).toBe(1);
    expect(clipRuntimeParam("collector_prerank_enforce", -3)).toBe(0);
  });
  it("未知 paramId は素通し", () => {
    expect(clipRuntimeParam("nope", 42)).toBe(42);
  });
});

describe("resolveRuntimeParams — overlay / clip / fail-open", () => {
  it("行なし → 全 default", async () => {
    const { sb } = makeFakeSb({});
    expect(await resolveRuntimeParams(sb)).toEqual(RUNTIME_PARAM_DEFAULTS);
  });

  it("DB 値を default に overlay する", async () => {
    const { sb } = makeFakeSb({ collector_shortlist_top_k: 80, collector_prerank_enforce: 1 });
    const r = await resolveRuntimeParams(sb);
    expect(r.collector_shortlist_top_k).toBe(80);
    expect(r.collector_prerank_enforce).toBe(1);
    // 未指定レバーは default 維持。
    expect(r.collector_exploration_quota).toBe(RUNTIME_PARAM_DEFAULTS.collector_exploration_quota);
  });

  it("bounds 外の DB 値は clip される", async () => {
    const { sb } = makeFakeSb({ collector_shortlist_top_k: 999, collector_exploration_quota: 1, collector_prerank_enforce: 7 });
    const r = await resolveRuntimeParams(sb);
    expect(r.collector_shortlist_top_k).toBe(120);
    expect(r.collector_exploration_quota).toBe(5);
    expect(r.collector_prerank_enforce).toBe(1);
  });

  it("壊れ値（非数）は default 維持", async () => {
    const { sb } = makeFakeSb({ collector_shortlist_top_k: "abc", collector_exploration_quota: null });
    const r = await resolveRuntimeParams(sb);
    expect(r.collector_shortlist_top_k).toBe(RUNTIME_PARAM_DEFAULTS.collector_shortlist_top_k);
    expect(r.collector_exploration_quota).toBe(RUNTIME_PARAM_DEFAULTS.collector_exploration_quota);
  });

  it("未知 paramId は無視する", async () => {
    const { sb } = makeFakeSb({ bogus_param: 123, collector_shortlist_top_k: 50 });
    const r = await resolveRuntimeParams(sb);
    expect(r.bogus_param).toBeUndefined();
    expect(r.collector_shortlist_top_k).toBe(50);
  });

  it("DB error → fail-open（全 default）", async () => {
    const { sb } = makeFakeSb({ collector_shortlist_top_k: 50 }, { selectError: true });
    expect(await resolveRuntimeParams(sb)).toEqual(RUNTIME_PARAM_DEFAULTS);
  });

  it("DB throw → fail-open（全 default）", async () => {
    const { sb } = makeFakeSb({ collector_shortlist_top_k: 50 }, { selectThrow: true });
    expect(await resolveRuntimeParams(sb)).toEqual(RUNTIME_PARAM_DEFAULTS);
  });
});

describe("setRuntimeParam", () => {
  it("新規（before=null）: clip して upsert し before=null を返す", async () => {
    const { sb, store } = makeFakeSb({});
    const r = await setRuntimeParam(sb, "collector_shortlist_top_k", 999, "tester");
    expect(r).toEqual({ before: null, after: 120 });
    expect((store.get("collector_shortlist_top_k") as Row).value).toBe(120);
  });

  it("既存（before=旧値）: 上書きし before を返す", async () => {
    const { sb } = makeFakeSb({ collector_exploration_quota: 10 });
    const r = await setRuntimeParam(sb, "collector_exploration_quota", 25);
    expect(r).toEqual({ before: 10, after: 25 });
  });

  it("既存値が clip 下限未満でも before は記録された生値、after は clip 値", async () => {
    const { sb } = makeFakeSb({ collector_exploration_quota: 10 });
    const r = await setRuntimeParam(sb, "collector_exploration_quota", 1);
    expect(r).toEqual({ before: 10, after: 5 });
  });

  it("未知 paramId は throw", async () => {
    const { sb } = makeFakeSb({});
    await expect(setRuntimeParam(sb, "nope", 1)).rejects.toThrow(/unknown runtime param/);
  });

  it("非有限値は throw", async () => {
    const { sb } = makeFakeSb({});
    await expect(setRuntimeParam(sb, "collector_shortlist_top_k", NaN)).rejects.toThrow(/finite/);
  });
});

describe("deleteRuntimeParam", () => {
  it("行を削除する", async () => {
    const { sb, store } = makeFakeSb({ collector_prerank_enforce: 1 });
    await deleteRuntimeParam(sb, "collector_prerank_enforce");
    expect(store.has("collector_prerank_enforce")).toBe(false);
  });
});
