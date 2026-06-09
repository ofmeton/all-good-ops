import {
  insertSessionEvents,
  recordRunSession,
  __setSessionTraceSupabaseForTest,
} from "./session-event-store";
import { redactForTrace } from "./redact-io";
import type { SupabaseClient } from "@supabase/supabase-js";

function makeFakeSb() {
  const inserts: Array<{ table: string; rows: unknown }> = [];
  const sb = {
    from(table: string) {
      return {
        insert(rows: unknown) {
          inserts.push({ table, rows });
          return Promise.resolve({ error: null });
        },
      };
    },
  } as unknown as SupabaseClient;
  return { sb, inserts };
}

describe("session-event-store", () => {
  afterEach(() => __setSessionTraceSupabaseForTest(undefined as never));

  test("insertSessionEvents は session_event に redact 済 payload を 1 行/イベントで insert", async () => {
    const { sb, inserts } = makeFakeSb();
    __setSessionTraceSupabaseForTest(sb);
    const payload = { text: "hello", email: "a@b.com" };
    await insertSessionEvents("sesn_1", "writer", [{ seq: 0, type: "text", payload }]);
    expect(inserts).toHaveLength(1);
    expect(inserts[0].table).toBe("session_event");
    const rows = inserts[0].rows as Array<Record<string, unknown>>;
    expect(rows[0]).toMatchObject({
      session_id: "sesn_1",
      seq: 0,
      type: "text",
      agent_key: "writer",
      payload: redactForTrace(payload),
    });
  });

  test("空配列では insert しない", async () => {
    const { sb, inserts } = makeFakeSb();
    __setSessionTraceSupabaseForTest(sb);
    await insertSessionEvents("sesn_1", "writer", []);
    expect(inserts).toHaveLength(0);
  });

  test("recordRunSession は run_session に 1 行 insert", async () => {
    const { sb, inserts } = makeFakeSb();
    __setSessionTraceSupabaseForTest(sb);
    await recordRunSession({ runId: "r1", stageId: "compose", sessionId: "sesn_1", agentKey: "writer" });
    expect(inserts[0]).toMatchObject({
      table: "run_session",
      rows: { run_id: "r1", stage_id: "compose", session_id: "sesn_1", agent_key: "writer" },
    });
  });

  test("client 未設定なら fail-open（throw しない）", async () => {
    __setSessionTraceSupabaseForTest(null);
    await expect(insertSessionEvents("s", "writer", [{ seq: 0, type: "text", payload: {} }])).resolves.toBeUndefined();
    await expect(recordRunSession({ runId: "r", stageId: "x", sessionId: "s" })).resolves.toBeUndefined();
  });
});
