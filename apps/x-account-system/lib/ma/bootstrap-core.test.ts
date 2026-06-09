/**
 * lib/ma/bootstrap-core.test.ts
 * bootstrap の純ロジック（yaml パース / system materialize / tool 解決 / hash /
 * 差分計算）を実 API/DB を叩かず検証する。create/update は scripts 側（impure）。
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseManifest,
  materializeSystem,
  resolveTools,
  computeSystemHash,
  planAgentAction,
  planBootstrap,
  pickEnvironmentId,
  type MaAgentRow,
} from "./bootstrap-core";

const WRITER_YAML = readFileSync(
  join(__dirname, "../../agents/x-writer.agent.yaml"),
  "utf8",
);

describe("parseManifest", () => {
  test("seed の x-writer.agent.yaml を正しくパースする", () => {
    const m = parseManifest(WRITER_YAML);
    expect(m.key).toBe("x-writer");
    expect(m.model).toBe("claude-opus-4-8");
    expect(m.system_builder).toBe("buildWriterSystemPrompt");
    expect(m.tools).toEqual(["web_toolset", "submit_draft"]);
  });

  test("必須 string フィールド欠落は throw", () => {
    expect(() => parseManifest("name: x\nmodel: m\nsystem_builder: b\ntools: []")).toThrow(/key/);
  });

  test("tools が string[] でなければ throw", () => {
    expect(() => parseManifest("key: k\nname: n\nmodel: m\nsystem_builder: b\ntools: foo")).toThrow(/tools/);
  });

  test("空文書は throw", () => {
    expect(() => parseManifest("")).toThrow(/empty|invalid/i);
  });
});

describe("materializeSystem / resolveTools", () => {
  const manifest = parseManifest(WRITER_YAML);

  test("system_builder=buildWriterSystemPrompt から system 本文を materialize", () => {
    const sys = materializeSystem(manifest);
    expect(sys).toContain("執筆エージェント");
    expect(sys).toContain("submit_draft");
  });

  test("未知 system_builder は throw", () => {
    expect(() => materializeSystem({ ...manifest, system_builder: "no_such" })).toThrow(/system_builder/);
  });

  test("tool 種別キーを定義に解決（submit_draft / web_toolset）", () => {
    const tools = resolveTools(manifest) as Array<Record<string, unknown>>;
    expect(tools).toHaveLength(2);
    // web_toolset は内蔵 toolset、submit_draft は custom（name 持ち）
    const names = tools.map((t) => t.name ?? t.type);
    expect(names).toContain("submit_draft");
    expect(names).toContain("agent_toolset_20260401");
  });

  test("未知 tool キーは throw", () => {
    expect(() => resolveTools({ ...manifest, tools: ["bogus"] })).toThrow(/tool key/);
  });
});

describe("computeSystemHash", () => {
  test("決定的で 16 hex 桁", () => {
    const h1 = computeSystemHash("abc");
    const h2 = computeSystemHash("abc");
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{16}$/);
    expect(computeSystemHash("abc")).not.toBe(computeSystemHash("abd"));
  });
});

describe("planAgentAction", () => {
  const manifest = parseManifest(WRITER_YAML);
  const system = materializeSystem(manifest);
  const hash = computeSystemHash(system);
  const baseRow: MaAgentRow = {
    agent_key: "x-writer", agent_id: "agent_x", version: "1",
    environment_id: "env_x", model: manifest.model, system_hash: hash,
  };

  test("既存無し → create", () => {
    expect(planAgentAction(manifest, system, undefined, { update: false })).toBe("create");
  });

  test("hash/model 一致 → noop", () => {
    expect(planAgentAction(manifest, system, baseRow, { update: true })).toBe("noop");
  });

  test("drift あり + --update → update", () => {
    const drift = { ...baseRow, system_hash: "deadbeefdeadbeef" };
    expect(planAgentAction(manifest, system, drift, { update: true })).toBe("update");
  });

  test("drift あり + --update 無し → noop（誤って新 version を切らない）", () => {
    const drift = { ...baseRow, model: "claude-sonnet-4-6" };
    expect(planAgentAction(manifest, system, drift, { update: false })).toBe("noop");
  });
});

describe("planBootstrap / pickEnvironmentId", () => {
  const manifest = parseManifest(WRITER_YAML);

  test("既存 0 行 → 全 create、environment は未解決", () => {
    const plan = planBootstrap([manifest], [], { update: false });
    expect(plan).toHaveLength(1);
    expect(plan[0].action).toBe("create");
    expect(plan[0].systemHash).toMatch(/^[0-9a-f]{16}$/);
    expect(pickEnvironmentId([])).toBeUndefined();
  });

  test("既存行の environment_id を reuse", () => {
    const rows: MaAgentRow[] = [{
      agent_key: "x-writer", agent_id: "a", version: "1",
      environment_id: "env_reuse", model: manifest.model,
      system_hash: computeSystemHash(materializeSystem(manifest)),
    }];
    expect(pickEnvironmentId(rows)).toBe("env_reuse");
    expect(planBootstrap([manifest], rows, { update: true })[0].action).toBe("noop");
  });
});
