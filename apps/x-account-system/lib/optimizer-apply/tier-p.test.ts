import { applyTierP, rollbackTierP } from "./tier-p.ts";

/** in-memory fake supabase（runtime_params のみ）。実 DB/API を叩かない。 */
type Row = { param_id: string; value: unknown };
function makeFakeSb(initial: Record<string, unknown> = {}) {
  const store = new Map<string, Row>();
  for (const [k, v] of Object.entries(initial)) store.set(k, { param_id: k, value: v });
  const from = (table: string) => {
    if (table !== "runtime_params") throw new Error(`unexpected table: ${table}`);
    return {
      select(_cols: string) {
        let filterId: string | null = null;
        const builder: {
          eq: (c: string, v: string) => typeof builder;
          maybeSingle: () => Promise<{ data: unknown; error: null }>;
        } = {
          eq(_col, val) {
            filterId = val;
            return builder;
          },
          maybeSingle() {
            const row = filterId != null ? store.get(filterId) : undefined;
            return Promise.resolve({ data: row ? { value: row.value } : null, error: null });
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

describe("applyTierP", () => {
  it("新規レバー: clip して upsert し {before:null, after} を返す", async () => {
    const { sb, store } = makeFakeSb({});
    const r = await applyTierP(sb, "collector_shortlist_top_k", 200);
    expect(r).toEqual({ paramId: "collector_shortlist_top_k", before: null, after: 120 });
    expect((store.get("collector_shortlist_top_k") as Row).value).toBe(120);
  });

  it("既存レバー: before に旧値、after に clip 後の新値", async () => {
    const { sb } = makeFakeSb({ collector_exploration_quota: 10 });
    const r = await applyTierP(sb, "collector_exploration_quota", 40);
    expect(r).toEqual({ paramId: "collector_exploration_quota", before: 10, after: 30 });
  });

  it("enforce レバーも適用できる（0/1 clip）", async () => {
    const { sb, store } = makeFakeSb({});
    const r = await applyTierP(sb, "collector_prerank_enforce", 1);
    expect(r.after).toBe(1);
    expect((store.get("collector_prerank_enforce") as Row).value).toBe(1);
  });

  it("未知 paramId は throw（runtime param 以外は適用させない）", async () => {
    const { sb } = makeFakeSb({});
    await expect(applyTierP(sb, "posting_time_evening", 0.3)).rejects.toThrow(/unknown tier-P paramId/);
  });
});

describe("rollbackTierP", () => {
  it("before が数値: 元値へ書き戻す", async () => {
    const { sb, store } = makeFakeSb({ collector_exploration_quota: 30 });
    // apply で 10→30 になったとして before=10 を rollback。
    await rollbackTierP(sb, "collector_exploration_quota", 10);
    expect((store.get("collector_exploration_quota") as Row).value).toBe(10);
  });

  it("before が null: 行を削除して復帰", async () => {
    const { sb, store } = makeFakeSb({ collector_shortlist_top_k: 120 });
    await rollbackTierP(sb, "collector_shortlist_top_k", null);
    expect(store.has("collector_shortlist_top_k")).toBe(false);
  });
});

describe("applyTierP → rollbackTierP 往復", () => {
  it("適用前の状態に完全復帰する（新規レバー）", async () => {
    const { sb, store } = makeFakeSb({});
    const r = await applyTierP(sb, "collector_prerank_enforce", 1);
    expect(store.has("collector_prerank_enforce")).toBe(true);
    await rollbackTierP(sb, r.paramId, r.before); // before=null → 削除
    expect(store.has("collector_prerank_enforce")).toBe(false);
  });
});
