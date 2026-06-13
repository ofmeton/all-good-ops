/**
 * enforce-check.test.ts — maybeAutoEnforce ユニットテスト（fake-sb・実コストゼロ）。
 *
 * 実 DB / LINE API は一切叩かない。
 */
import { maybeAutoEnforce } from "./enforce-check.ts";
import type { EnforceCheckDeps } from "./enforce-check.ts";

// ---- fake-sb ----------------------------------------------------------------

/**
 * runtime_params と cost_ledger の 2 テーブルを模倣する in-memory fake-sb。
 * runtime_params: resolveRuntimeParams（select）と setRuntimeParam（select.eq.maybeSingle / upsert）に対応。
 * cost_ledger: select.eq.order.limit チェーンに対応（フィルタ等は無視してプリセット rows を返す）。
 */
function makeFakeSb(opts: {
  /** collector_prerank_enforce の初期値（undefined = DB に行が無い = default=0 扱い）。 */
  enforceParam?: number;
  /** cost_ledger から返す rows（新しい順を想定）。 */
  costLedgerRows?: Array<{ meta: unknown }>;
  /** cost_ledger クエリを error にする。 */
  costLedgerError?: boolean;
  /** cost_ledger クエリで例外を投げる。 */
  costLedgerThrow?: boolean;
  /** setRuntimeParam の upsert を error にする。 */
  upsertError?: boolean;
}) {
  // runtime_params store（param_id → value）
  const rpStore = new Map<string, number>();
  if (opts.enforceParam !== undefined) {
    rpStore.set("collector_prerank_enforce", opts.enforceParam);
  }

  const runtimeParamsTable = () => {
    const select = (_cols: string) => {
      let filterId: string | null = null;
      const rows = () => {
        const all = [...rpStore.entries()].map(([k, v]) => ({ param_id: k, value: v }));
        return filterId != null ? all.filter((r) => r.param_id === filterId) : all;
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b: any = {
        eq(_col: string, val: string) {
          filterId = val;
          return b;
        },
        maybeSingle() {
          return Promise.resolve({ data: rows()[0] ?? null, error: null });
        },
        then(onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) {
          return Promise.resolve({ data: rows(), error: null }).then(onF, onR);
        },
      };
      return b;
    };

    return {
      select,
      upsert(rowData: { param_id: string; value: unknown }) {
        if (opts.upsertError) return Promise.resolve({ error: { message: "upsert error" } });
        if (typeof rowData.value === "number") rpStore.set(rowData.param_id, rowData.value);
        return Promise.resolve({ error: null });
      },
      delete() {
        return {
          eq(_col: string, val: string) {
            rpStore.delete(val);
            return Promise.resolve({ error: null });
          },
        };
      },
    };
  };

  const costLedgerTable = () => {
    const clRows = opts.costLedgerRows ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b: any = {
      select() { return b; },
      eq() { return b; },
      order() { return b; },
      limit() { return b; },
      then(onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) {
        if (opts.costLedgerThrow) return Promise.reject(new Error("cost_ledger throw")).then(onF, onR);
        const result = opts.costLedgerError
          ? { data: null, error: { message: "forced error" } }
          : { data: clRows, error: null };
        return Promise.resolve(result).then(onF, onR);
      },
    };
    return b;
  };

  const from = (table: string) => {
    if (table === "runtime_params") return runtimeParamsTable();
    if (table === "cost_ledger") return costLedgerTable();
    throw new Error(`unexpected table: ${table}`);
  };

  return { sb: { from } as never, rpStore };
}

// ---- helpers ----------------------------------------------------------------

/** 指定の shadow メトリクスを持つ cost_ledger 行を n 件生成する。 */
function makeRows(
  n: number,
  shadow: { topN_retention: number; pruned_fine_max: number },
): Array<{ meta: unknown }> {
  return Array.from({ length: n }, () => ({ meta: { shadow } }));
}

function makeDeps(
  sb: never,
  notifyLog: string[] = [],
): EnforceCheckDeps {
  return {
    sb,
    notify: async (text) => { notifyLog.push(text); },
  };
}

// ---- テスト群 ---------------------------------------------------------------

describe("no-op ケース", () => {
  it("既に enforce=1 → flipped=false（冪等）", async () => {
    const { sb } = makeFakeSb({
      enforceParam: 1,
      costLedgerRows: makeRows(7, { topN_retention: 1.0, pruned_fine_max: 50 }),
    });
    const notifyLog: string[] = [];
    const result = await maybeAutoEnforce(makeDeps(sb, notifyLog));

    expect(result.flipped).toBe(false);
    expect(result.reason).toBe("already enforced");
    expect(result.runsEvaluated).toBe(0);
    expect(notifyLog).toHaveLength(0);
  });

  it("shadow run が 7 件未満（6 件）→ no flip", async () => {
    const { sb } = makeFakeSb({
      enforceParam: 0,
      costLedgerRows: makeRows(6, { topN_retention: 1.0, pruned_fine_max: 50 }),
    });
    const result = await maybeAutoEnforce(makeDeps(sb));

    expect(result.flipped).toBe(false);
    expect(result.reason).toMatch(/insufficient/);
    expect(result.runsEvaluated).toBe(6);
  });

  it("meta.shadow が欠損している行は shadow run として除外 → 安全側 no flip", async () => {
    // 14 行あっても meta.shadow が無い行は除外されて実質 5 件分しか有効でない
    const rows: Array<{ meta: unknown }> = [
      ...makeRows(5, { topN_retention: 1.0, pruned_fine_max: 50 }),
      ...Array.from({ length: 9 }, () => ({ meta: { other: "no shadow" } })),
    ];
    const { sb } = makeFakeSb({ enforceParam: 0, costLedgerRows: rows });
    const result = await maybeAutoEnforce(makeDeps(sb));

    expect(result.flipped).toBe(false);
    expect(result.reason).toMatch(/insufficient/);
    expect(result.runsEvaluated).toBe(5);
  });

  it("meta が null / 型不正の行は除外 → 安全側 no flip", async () => {
    const rows: Array<{ meta: unknown }> = [
      { meta: null },
      { meta: 42 },
      { meta: { shadow: null } },
      { meta: { shadow: { topN_retention: "bad", pruned_fine_max: 50 } } },
      { meta: { shadow: { topN_retention: 1.0, pruned_fine_max: Infinity } } },
      { meta: { shadow: { topN_retention: NaN, pruned_fine_max: 50 } } },
    ];
    const { sb } = makeFakeSb({ enforceParam: 0, costLedgerRows: rows });
    const result = await maybeAutoEnforce(makeDeps(sb));

    expect(result.flipped).toBe(false);
    expect(result.runsEvaluated).toBe(0);
  });
});

describe("flip ケース", () => {
  it("7 件すべて retention=1.0 かつ pruned_fine_max<70 → flip + LINE 通知", async () => {
    const { sb, rpStore } = makeFakeSb({
      enforceParam: 0,
      costLedgerRows: makeRows(7, { topN_retention: 1.0, pruned_fine_max: 60 }),
    });
    const notifyLog: string[] = [];
    const result = await maybeAutoEnforce(makeDeps(sb, notifyLog));

    expect(result.flipped).toBe(true);
    expect(result.reason).toBe("safety criteria met");
    expect(result.runsEvaluated).toBe(7);
    // runtime_params に enforce=1 が書き込まれる
    expect(rpStore.get("collector_prerank_enforce")).toBe(1);
    // LINE 通知が送信される
    expect(notifyLog).toHaveLength(1);
    expect(notifyLog[0]).toMatch(/collector enforce 自動切替/);
    expect(notifyLog[0]).toMatch(/revert=collector_prerank_enforce=0/);
  });

  it("14 件中後半に shadow 欠損があっても直近 7 件が全基準 OK → flip", async () => {
    // 新しい順: 最初の 7 件が完全、残り 7 件は欠損
    const rows: Array<{ meta: unknown }> = [
      ...makeRows(7, { topN_retention: 1.0, pruned_fine_max: 69 }),
      ...Array.from({ length: 7 }, () => ({ meta: {} })),
    ];
    const { sb, rpStore } = makeFakeSb({ enforceParam: 0, costLedgerRows: rows });
    const result = await maybeAutoEnforce(makeDeps(sb));

    expect(result.flipped).toBe(true);
    expect(rpStore.get("collector_prerank_enforce")).toBe(1);
  });
});

describe("基準違反 → no flip", () => {
  it("直近 7 件のうち 1 件でも topN_retention < 1.0 → no flip", async () => {
    const rows = makeRows(7, { topN_retention: 1.0, pruned_fine_max: 50 });
    // 4 番目だけ retention が 0.9
    rows[3] = { meta: { shadow: { topN_retention: 0.9, pruned_fine_max: 50 } } };
    const { sb, rpStore } = makeFakeSb({ enforceParam: 0, costLedgerRows: rows });
    const result = await maybeAutoEnforce(makeDeps(sb));

    expect(result.flipped).toBe(false);
    expect(result.reason).toMatch(/topN_retention < 1\.0/);
    // enforce は変化しない（0 のまま）
    expect(rpStore.get("collector_prerank_enforce")).toBe(0);
  });

  it("直近 7 件のうち 1 件でも pruned_fine_max >= 70 → no flip", async () => {
    const rows = makeRows(7, { topN_retention: 1.0, pruned_fine_max: 50 });
    // 1 番目（最新）が境界値 70 → 基準違反
    rows[0] = { meta: { shadow: { topN_retention: 1.0, pruned_fine_max: 70 } } };
    const { sb, rpStore } = makeFakeSb({ enforceParam: 0, costLedgerRows: rows });
    const result = await maybeAutoEnforce(makeDeps(sb));

    expect(result.flipped).toBe(false);
    expect(result.reason).toMatch(/pruned_fine_max >= 70/);
    // enforce は変化しない（0 のまま）
    expect(rpStore.get("collector_prerank_enforce")).toBe(0);
  });

  it("pruned_fine_max が 69.9（境界未満）→ flip する", async () => {
    const { sb } = makeFakeSb({
      enforceParam: 0,
      costLedgerRows: makeRows(7, { topN_retention: 1.0, pruned_fine_max: 69.9 }),
    });
    const result = await maybeAutoEnforce(makeDeps(sb));
    expect(result.flipped).toBe(true);
  });
});

describe("DB エラー → 安全側 no flip（fail-open）", () => {
  it("cost_ledger error → no flip", async () => {
    const { sb } = makeFakeSb({ enforceParam: 0, costLedgerError: true });
    const result = await maybeAutoEnforce(makeDeps(sb));

    expect(result.flipped).toBe(false);
    expect(result.reason).toMatch(/failed/);
    expect(result.runsEvaluated).toBe(0);
  });

  it("cost_ledger throw → no flip（例外握りつぶし）", async () => {
    const { sb } = makeFakeSb({ enforceParam: 0, costLedgerThrow: true });
    const result = await maybeAutoEnforce(makeDeps(sb));

    expect(result.flipped).toBe(false);
    expect(result.reason).toMatch(/threw/);
    expect(result.runsEvaluated).toBe(0);
  });

  it("setRuntimeParam (upsert) 失敗 → no flip（flip 前なので整合性保全）", async () => {
    const { sb, rpStore } = makeFakeSb({
      enforceParam: 0,
      costLedgerRows: makeRows(7, { topN_retention: 1.0, pruned_fine_max: 50 }),
      upsertError: true,
    });
    const notifyLog: string[] = [];
    const result = await maybeAutoEnforce(makeDeps(sb, notifyLog));

    expect(result.flipped).toBe(false);
    expect(result.reason).toMatch(/setRuntimeParam failed/);
    // enforce は書き変わっていない
    expect(rpStore.get("collector_prerank_enforce")).toBe(0);
    // LINE 通知も送信されない
    expect(notifyLog).toHaveLength(0);
  });
});

describe("dryRun オプション（nightly 統合）", () => {
  it("dryRun=true かつ安全基準 OK でも flip しない", async () => {
    const { sb, rpStore } = makeFakeSb({
      enforceParam: 0,
      costLedgerRows: makeRows(7, { topN_retention: 1.0, pruned_fine_max: 50 }),
    });
    const notifyLog: string[] = [];

    const result = await maybeAutoEnforce(
      makeDeps(sb, notifyLog),
      { dryRun: true },
    );

    expect(result.flipped).toBe(false);
    expect(result.reason).toMatch(/dry-run/);
    expect(result.reason).toMatch(/would flip/);
    // enforce は変化しない
    expect(rpStore.get("collector_prerank_enforce")).toBe(0);
    // LINE 通知は送信されない
    expect(notifyLog).toHaveLength(0);
  });

  it("dryRun=true でも shadow run 不足なら reason は insufficient", async () => {
    const { sb } = makeFakeSb({
      enforceParam: 0,
      costLedgerRows: makeRows(3, { topN_retention: 1.0, pruned_fine_max: 50 }),
    });
    const result = await maybeAutoEnforce(makeDeps(sb), { dryRun: true });

    expect(result.flipped).toBe(false);
    expect(result.reason).toMatch(/insufficient/);
  });
});
