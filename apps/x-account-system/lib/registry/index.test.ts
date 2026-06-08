import { STAGES, validateRegistry } from "./index.js";

test("stage id は一意", () => {
  const ids = STAGES.map((s) => s.id);
  expect(new Set(ids).size).toBe(ids.length);
});
test("upstream/downstream は対称（A.downstream に B があれば B.upstream に A）", () => {
  expect(validateRegistry()).toEqual([]);
});
test("各 stage の logicKind は許可値", () => {
  for (const s of STAGES) expect(["llm", "deterministic", "io"]).toContain(s.logicKind);
});
test("10 ノード", () => {
  expect(STAGES).toHaveLength(10);
});
