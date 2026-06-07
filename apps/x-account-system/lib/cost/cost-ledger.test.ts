/**
 * lib/cost/cost-ledger.test.ts — recordCostLedger の payload 形・skip・fail-open。
 * in-memory mock sb（insert 捕捉）で実 DB なしに検証。
 */
import { recordCostLedger } from "./cost-ledger";

type Inserted = Record<string, unknown>;

function makeSb(opts: { fail?: boolean } = {}): {
  sb: { from: (t: string) => { insert: (row: Inserted) => Promise<{ error: unknown }> } };
  inserts: Inserted[];
  tables: string[];
} {
  const inserts: Inserted[] = [];
  const tables: string[] = [];
  const sb = {
    from: (t: string) => {
      tables.push(t);
      return {
        insert: async (row: Inserted) => {
          inserts.push(row);
          return { error: opts.fail ? { message: "ledger boom" } : null };
        },
      };
    },
  };
  return { sb, inserts, tables };
}

describe("recordCostLedger", () => {
  test("insert payload: month は UTC YYYY-MM・category・cost_jpy を持つ", async () => {
    const { sb, inserts, tables } = makeSb();
    await recordCostLedger(sb as never, { category: "writer", costJpy: 12.34, unitCount: 1500 });
    expect(tables).toEqual(["cost_ledger"]);
    expect(inserts).toHaveLength(1);
    const row = inserts[0];
    expect(String(row.month)).toMatch(/^\d{4}-\d{2}$/);
    expect(row.category).toBe("writer");
    expect(row.cost_jpy).toBe(12.34);
    expect(row.unit_count).toBe(1500);
  });

  test("costUsd 未指定なら cost_jpy / 150 を 4 桁で補完", async () => {
    const { sb, inserts } = makeSb();
    await recordCostLedger(sb as never, { category: "checker", costJpy: 150 });
    expect(inserts[0].cost_usd).toBe(1); // 150 / 150 = 1.0
  });

  test("costJpy <= 0 は skip（無駄行を作らない）", async () => {
    const { sb, inserts } = makeSb();
    await recordCostLedger(sb as never, { category: "writer", costJpy: 0 });
    await recordCostLedger(sb as never, { category: "writer", costJpy: -5 });
    expect(inserts).toHaveLength(0);
  });

  test("insert error でも throw しない（fail-open）", async () => {
    const { sb } = makeSb({ fail: true });
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      await expect(
        recordCostLedger(sb as never, { category: "collector", costJpy: 10 }),
      ).resolves.toBeUndefined();
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  test("sb が throw しても飲み込む（完全 fail-open）", async () => {
    const sb = {
      from: () => {
        throw new Error("connection lost");
      },
    };
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      await expect(
        recordCostLedger(sb as never, { category: "writer", costJpy: 10 }),
      ).resolves.toBeUndefined();
    } finally {
      warn.mockRestore();
    }
  });
});
