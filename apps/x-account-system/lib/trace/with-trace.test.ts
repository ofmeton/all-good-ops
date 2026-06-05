import { withTrace } from "./with-trace.js";
import * as store from "./trace-store.js";

test("成功時に status=ok の trace を記録し result を返す", async () => {
  const spy = jest.spyOn(store, "insertTrace").mockResolvedValue();
  const r = await withTrace(undefined, { runId: "r1", stageId: "writer" }, async () => ({
    result: 7, output: { body: "x" },
  }));
  expect(r).toBe(7);
  expect(spy).toHaveBeenCalledWith(expect.objectContaining({ stageId: "writer", status: "ok" }));
  spy.mockRestore();
});

test("fn が throw したら status=error を記録しつつ再 throw する", async () => {
  const spy = jest.spyOn(store, "insertTrace").mockResolvedValue();
  await expect(
    withTrace(undefined, { runId: "r1", stageId: "writer" }, async () => { throw new Error("boom"); }),
  ).rejects.toThrow("boom");
  expect(spy).toHaveBeenCalledWith(expect.objectContaining({ status: "error" }));
  spy.mockRestore();
});

test("ctx があれば waitUntil で書込を延命する", async () => {
  jest.spyOn(store, "insertTrace").mockResolvedValue();
  const waitUntil = jest.fn();
  await withTrace({ waitUntil } as unknown as ExecutionContext, { runId: "r1", stageId: "writer" },
    async () => ({ result: 1 }));
  expect(waitUntil).toHaveBeenCalledTimes(1);
});
