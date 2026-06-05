import { buildRegistryJson } from "./build-registry.js";
import { STAGES } from "../lib/registry/index.js";

test("生成 JSON は version と stages を持つ", () => {
  const json = buildRegistryJson();
  expect(json.stages).toHaveLength(STAGES.length);
  expect(json.version).toBe(1);
});
