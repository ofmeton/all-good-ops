/**
 * Editor pipeline integration tests
 *
 * 15 fixture を __fixtures__/ から読み込み、各 fixture の expected を満たすか検証。
 *
 * mock 構成:
 *   - lib/editor/db.ts       → __mocks__/db.ts (state injection)
 *   - lib/editor/embedding.ts → __mocks__/embedding.ts (maxSim override)
 *   - lib/hook-classifier/classify.ts → __mocks__/classify.ts (hook override)
 *
 * 環境変数 IN_MEMORY_FALLBACK=true を test runner で set → llm-judge は stub
 */
import fs from "node:fs";
import path from "node:path";

// jest.mock 宣言は import より先に評価されるので先頭で書く
jest.mock("./db.ts");
jest.mock("./embedding.ts");
jest.mock("../hook-classifier/classify.ts");

process.env.IN_MEMORY_FALLBACK = "true";

import { runEditor } from "./pipeline.ts";
import type { EditorInput, EditorOutput, RuleId } from "./types.ts";

// jest.mock() で auto-mock した同一 module インスタンスから state helper を取り出す。
// 直接 `./__mocks__/db.ts` を import すると別 instance になり state injection が効かない。
const dbMock = jest.requireMock("./db.ts") as typeof import("./__mocks__/db.ts");
const embeddingMock = jest.requireMock("./embedding.ts") as typeof import(
  "./__mocks__/embedding.ts"
);
const hookMock = jest.requireMock("../hook-classifier/classify.ts") as typeof import(
  "../hook-classifier/__mocks__/classify.ts"
);
const { __resetMockState, __setMockState } = dbMock;
const { __resetMockEmbedding, __setMockSim } = embeddingMock;
const { __resetMockHook, __setMockHook } = hookMock;

const FIXTURES_DIR = path.join(__dirname, "__fixtures__");

type Fixture = {
  name: string;
  description?: string;
  input: EditorInput;
  mockOverrides?: {
    monthlyFailureStoryCount?: number;
    verifiedMaterialIdSet?: string[] | null;
    embedding?: { maxSim: number; matchedId: string | null };
    hook?: {
      primary_hook: "failure_story" | "business_repro" | "critique" | "tips_enum";
      devices: string[];
      confidence: number;
    };
  };
  expected: {
    decision: "approved" | "rejected";
    rejectReasons?: RuleId[];
    rejectReasonsAtLeast?: RuleId[];
    warningsAtLeast?: RuleId[];
    riskLevel?: "low" | "high";
    businessLawRiskFlag?: boolean;
  };
};

function loadFixtures(): Fixture[] {
  return fs
    .readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) =>
      JSON.parse(
        fs.readFileSync(path.join(FIXTURES_DIR, f), "utf-8"),
      ) as Fixture,
    );
}

function applyMockOverrides(fx: Fixture) {
  if (!fx.mockOverrides) return;
  const o = fx.mockOverrides;
  if (o.monthlyFailureStoryCount !== undefined) {
    __setMockState({ monthlyFailureStoryCount: o.monthlyFailureStoryCount });
  }
  if (o.verifiedMaterialIdSet !== undefined) {
    __setMockState({
      verifiedMaterialIdSet:
        o.verifiedMaterialIdSet === null
          ? null
          : new Set(o.verifiedMaterialIdSet),
    });
  }
  if (o.embedding) {
    __setMockSim(o.embedding.maxSim, o.embedding.matchedId);
  }
  if (o.hook) {
    __setMockHook(o.hook);
  }
}

describe("Editor pipeline (6+5 rules)", () => {
  beforeEach(() => {
    __resetMockState();
    __resetMockEmbedding();
    __resetMockHook();
  });

  const fixtures = loadFixtures();

  test.each(fixtures.map((fx) => [fx.name, fx] as const))(
    "%s",
    async (_name, fx) => {
      applyMockOverrides(fx);
      const out: EditorOutput = await runEditor(fx.input);

      // Decision
      expect(out.decision).toBe(fx.expected.decision);

      // Exact rejectReasons (sorted)
      if (fx.expected.rejectReasons !== undefined) {
        expect([...out.rejectReasons].sort()).toEqual(
          [...fx.expected.rejectReasons].sort(),
        );
      }

      // Subset assertion: soft warnings must include these
      if (fx.expected.warningsAtLeast) {
        const warnRules = out.warnings.map((w) => w.rule);
        for (const r of fx.expected.warningsAtLeast) {
          expect(warnRules).toContain(r);
        }
      }

      // Subset assertion: rejectReasons must include these
      if (fx.expected.rejectReasonsAtLeast) {
        for (const r of fx.expected.rejectReasonsAtLeast) {
          expect(out.rejectReasons).toContain(r);
        }
      }

      if (fx.expected.riskLevel) {
        expect(out.riskLevel).toBe(fx.expected.riskLevel);
      }
      if (fx.expected.businessLawRiskFlag !== undefined) {
        expect(out.businessLawRiskFlag).toBe(fx.expected.businessLawRiskFlag);
      }
    },
  );

  test("count: pipeline returns 11 rule results", async () => {
    const fx = fixtures.find((f) => f.name === "01_baseline_pass")!;
    const out = await runEditor(fx.input);
    expect(out.rules).toHaveLength(11);
  });

  test("pipeline runs under 10 seconds (E-46 budget) for baseline", async () => {
    const fx = fixtures.find((f) => f.name === "01_baseline_pass")!;
    const out = await runEditor(fx.input);
    expect(out.totalDurationMs).toBeLessThan(10_000);
  });
});
