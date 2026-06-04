import { insertTrace, __setTraceSupabaseForTest } from "./trace-store.js";

test("insertTrace は Supabase が null でも throw しない（fail-open）", async () => {
  __setTraceSupabaseForTest(null);
  await expect(
    insertTrace({ runId: "r1", stageId: "writer", status: "ok", startedAt: new Date() }),
  ).resolves.toBeUndefined();
});

test("insertTrace は insert が reject しても握りつぶす", async () => {
  __setTraceSupabaseForTest({
    from: () => ({ insert: async () => ({ error: { message: "boom" } }) }),
  } as never);
  await expect(
    insertTrace({ runId: "r1", stageId: "writer", status: "ok", startedAt: new Date() }),
  ).resolves.toBeUndefined();
});
