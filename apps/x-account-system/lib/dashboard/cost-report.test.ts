/**
 * cost-report.test.ts
 *
 * buildCostReport: 各ソース (LINE quota / Anthropic cost_report / posted_records /
 * cost_ledger) を mock し、REAL number 集計と fail-safe を検証。
 * formatCostReportJa: null → "取得不可"、残高注記の存在を検証。
 *
 * IN_MEMORY_FALLBACK=true 下でも buildCostReport は引数 env / fetchImpl のみ参照する
 * (process.env IN_MEMORY_FALLBACK を見ない) ため deterministic に走る。
 */

// ---- supabase mock (posted_records / cost_ledger) ----
const mockPostedLt = jest.fn().mockResolvedValue({ count: 0, error: null });
const mockPostedGte = jest.fn(() => ({ lt: mockPostedLt }));
const mockPostedEq = jest.fn(() => ({ gte: mockPostedGte }));
const mockPostedSelect = jest.fn(() => ({ eq: mockPostedEq }));

const mockLedgerEq = jest.fn().mockResolvedValue({ data: [], error: null });
const mockLedgerSelect = jest.fn(() => ({ eq: mockLedgerEq }));

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    from: (table: string) => {
      if (table === "posted_records") return { select: mockPostedSelect };
      if (table === "cost_ledger") return { select: mockLedgerSelect };
      return { select: jest.fn(() => ({})) };
    },
  })),
}));

import {
  buildCostReport,
  formatCostReportJa,
  type CostReport,
  type CostReportEnv,
} from "./cost-report.ts";

const FULL_ENV: CostReportEnv = {
  LINE_CHANNEL_ACCESS_TOKEN: "line-token",
  ANTHROPIC_ADMIN_KEY: "admin-key",
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role",
};

const NOW = new Date("2026-06-04T03:00:00Z");

/** LINE quota + consumption + Anthropic cost_report をまとめて返す fetch stub. */
function makeFetch(opts: {
  quota?: { type: string; value?: number } | { status: number };
  consumption?: { totalUsage: number } | { status: number };
  cost?:
    | { data: Array<{ results: Array<{ amount: string; currency: string }> }>; has_more?: boolean; next_page?: string }
    | { status: number };
}): typeof fetch {
  return (async (input: string | URL) => {
    const url = String(input);
    if (url.endsWith("/quota/consumption")) {
      const c = opts.consumption;
      if (c && "status" in c) return { ok: false, status: c.status, json: async () => ({}) };
      return { ok: true, json: async () => c ?? { totalUsage: 0 } };
    }
    if (url.endsWith("/message/quota")) {
      const q = opts.quota;
      if (q && "status" in q) return { ok: false, status: q.status, json: async () => ({}) };
      return { ok: true, json: async () => q ?? { type: "limited", value: 200 } };
    }
    if (url.includes("cost_report")) {
      const co = opts.cost;
      if (co && "status" in co) return { ok: false, status: co.status, json: async () => ({}) };
      return { ok: true, json: async () => co ?? { data: [], has_more: false } };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  mockPostedLt.mockResolvedValue({ count: 0, error: null });
  mockLedgerEq.mockResolvedValue({ data: [], error: null });
  jest.clearAllMocks();
  mockPostedSelect.mockImplementation(() => ({ eq: mockPostedEq }));
  mockPostedEq.mockImplementation(() => ({ gte: mockPostedGte }));
  mockPostedGte.mockImplementation(() => ({ lt: mockPostedLt }));
  mockLedgerSelect.mockImplementation(() => ({ eq: mockLedgerEq }));
});

describe("buildCostReport - LINE quota", () => {
  test("parses limit and consumption", async () => {
    mockPostedLt.mockResolvedValue({ count: 3, error: null });
    const fetchImpl = makeFetch({
      quota: { type: "limited", value: 500 },
      consumption: { totalUsage: 42 },
    });
    const r = await buildCostReport(FULL_ENV, NOW, fetchImpl);
    expect(r.lineSent).toBe(42);
    expect(r.lineLimit).toBe(500);
  });

  test("type 'none' (unlimited) → lineLimit null but sent parsed", async () => {
    const fetchImpl = makeFetch({
      quota: { type: "none" },
      consumption: { totalUsage: 10 },
    });
    const r = await buildCostReport(FULL_ENV, NOW, fetchImpl);
    expect(r.lineLimit).toBeNull();
    expect(r.lineSent).toBe(10);
  });

  test("no LINE token → both null", async () => {
    const fetchImpl = makeFetch({});
    const r = await buildCostReport(
      { ...FULL_ENV, LINE_CHANNEL_ACCESS_TOKEN: undefined },
      NOW,
      fetchImpl,
    );
    expect(r.lineSent).toBeNull();
    expect(r.lineLimit).toBeNull();
  });

  test("LINE non-200 → null (fail-safe)", async () => {
    const fetchImpl = makeFetch({
      quota: { status: 401 },
      consumption: { status: 401 },
    });
    const r = await buildCostReport(FULL_ENV, NOW, fetchImpl);
    expect(r.lineSent).toBeNull();
    expect(r.lineLimit).toBeNull();
  });
});

describe("buildCostReport - Claude cost_report", () => {
  test("amount (cents string) summed → USD", async () => {
    const fetchImpl = makeFetch({
      cost: {
        data: [
          { results: [{ amount: "123.45", currency: "USD" }] },
          { results: [{ amount: "76.55", currency: "USD" }] },
        ],
        has_more: false,
      },
    });
    const r = await buildCostReport(FULL_ENV, NOW, fetchImpl);
    // (123.45 + 76.55) cents = 200 cents = $2.00
    expect(r.claudeCostUsd).toBeCloseTo(2.0, 4);
  });

  test("no admin key → null", async () => {
    const fetchImpl = makeFetch({ cost: { data: [], has_more: false } });
    const r = await buildCostReport(
      { ...FULL_ENV, ANTHROPIC_ADMIN_KEY: undefined },
      NOW,
      fetchImpl,
    );
    expect(r.claudeCostUsd).toBeNull();
  });

  test("non-200 → null (fail-safe)", async () => {
    const fetchImpl = makeFetch({ cost: { status: 403 } });
    const r = await buildCostReport(FULL_ENV, NOW, fetchImpl);
    expect(r.claudeCostUsd).toBeNull();
  });
});

describe("buildCostReport - X post count", () => {
  test("posted_records count for month", async () => {
    mockPostedLt.mockResolvedValue({ count: 17, error: null });
    const r = await buildCostReport(FULL_ENV, NOW, makeFetch({}));
    expect(r.xPostCount).toBe(17);
    expect(r.xPostCap).toBe(500);
  });

  test("query error → null", async () => {
    mockPostedLt.mockResolvedValue({ count: null, error: new Error("db") });
    const r = await buildCostReport(FULL_ENV, NOW, makeFetch({}));
    expect(r.xPostCount).toBeNull();
  });
});

describe("buildCostReport - cost_ledger", () => {
  test("breakdown by category + total", async () => {
    mockLedgerEq.mockResolvedValue({
      data: [
        { category: "writer", cost_jpy: 300, cost_usd: 2.0 },
        { category: "twitterapi", cost_jpy: 80, cost_usd: null },
        { category: "writer", cost_jpy: 100, cost_usd: 0.7 },
      ],
      error: null,
    });
    const r = await buildCostReport(FULL_ENV, NOW, makeFetch({}));
    expect(r.ledgerTotalJpy).toBe(480);
    const writer = r.ledgerByCategory?.find((c) => c.category === "writer");
    expect(writer?.cost_jpy).toBe(400);
    expect(writer?.cost_usd).toBeCloseTo(2.7, 4);
    const twa = r.ledgerByCategory?.find((c) => c.category === "twitterapi");
    expect(twa?.cost_jpy).toBe(80);
  });

  test("query error → null", async () => {
    mockLedgerEq.mockResolvedValue({ data: null, error: new Error("db") });
    const r = await buildCostReport(FULL_ENV, NOW, makeFetch({}));
    expect(r.ledgerByCategory).toBeNull();
    expect(r.ledgerTotalJpy).toBeNull();
  });

  test("no supabase creds → null", async () => {
    const r = await buildCostReport(
      { ...FULL_ENV, SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined },
      NOW,
      makeFetch({}),
    );
    expect(r.ledgerByCategory).toBeNull();
    expect(r.xPostCount).toBeNull();
  });
});

describe("formatCostReportJa", () => {
  const FULL: CostReport = {
    lineSent: 42,
    lineLimit: 500,
    claudeCostUsd: 1.23,
    xPostCount: 7,
    xPostCap: 500,
    ledgerByCategory: [
      { category: "writer", cost_jpy: 400 },
      { category: "twitterapi", cost_jpy: 80 },
    ],
    ledgerTotalJpy: 480,
  };

  test("full report renders all REAL lines", () => {
    const s = formatCostReportJa(FULL);
    expect(s).toContain("◆ コスト実数 (今月)");
    expect(s).toContain("Claude 実コスト: $1.23");
    expect(s).toContain("LINE 送信: 42 通 / 無料枠 500 通");
    expect(s).toContain("X 投稿: 7 件 / 月キャップ 500");
    expect(s).toContain("twitterapi.io: ¥80");
    expect(s).toContain("自社集計合計: ¥480 / 予算 ¥10,000");
    expect(s).toContain("残クレジット/残高は各社 API 非提供");
  });

  test("null fields → 取得不可 / unlimited 表記", () => {
    const s = formatCostReportJa({
      lineSent: null,
      lineLimit: null,
      claudeCostUsd: null,
      xPostCount: null,
      xPostCap: 500,
      ledgerByCategory: null,
      ledgerTotalJpy: null,
    });
    expect(s).toContain("Claude 実コスト: 取得不可");
    expect(s).toContain("LINE 送信: 取得不可");
    expect(s).toContain("X 投稿: 取得不可");
    expect(s).toContain("twitterapi.io: 取得不可");
    expect(s).toContain("自社集計合計: 取得不可");
    // 残高注記は常に存在
    expect(s).toContain("残クレジット/残高は各社 API 非提供");
  });

  test("lineLimit null but sent present → 無制限 表記", () => {
    const s = formatCostReportJa({ ...FULL, lineLimit: null });
    expect(s).toContain("LINE 送信: 42 通 / 無料枠 無制限");
  });
});
