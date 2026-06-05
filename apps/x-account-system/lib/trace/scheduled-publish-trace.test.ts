import { recordScheduledPublish } from "./scheduled-publish-trace.ts";
import type { RunRow, TraceRow } from "./types.ts";

describe("recordScheduledPublish", () => {
  function setup() {
    const runs: RunRow[] = [];
    const traces: TraceRow[] = [];
    const deps = {
      insertRun: async (r: RunRow) => {
        runs.push(r);
      },
      insertTrace: async (t: TraceRow) => {
        traces.push(t);
      },
      now: () => new Date("2026-06-06T00:30:00Z"), // = 09:30 JST
      newRunId: () => "run-fixed-1",
    };
    return { runs, traces, deps };
  }

  test("1 run (job=scheduled-publish, trigger=manual) を作る", async () => {
    const { runs, deps } = setup();
    const runId = await recordScheduledPublish(
      [{ draftId: "d1", scheduledFor: "2026-06-07T07:00:00+09:00", scheduledPostId: "x1" }],
      deps,
    );
    expect(runId).toBe("run-fixed-1");
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      id: "run-fixed-1",
      job: "scheduled-publish",
      trigger: "manual",
      status: "ok",
      attempt: 1,
      date: "2026-06-06", // JST 基準
    });
  });

  test("予約 1 件ごとに stageId=scheduled-publish / outcome=scheduled の trace を書く", async () => {
    const { traces, deps } = setup();
    await recordScheduledPublish(
      [
        { draftId: "d1", scheduledFor: "2026-06-07T07:00:00+09:00", scheduledPostId: "x1" },
        { draftId: "d2", scheduledFor: "2026-06-07T12:00:00+09:00" },
      ],
      deps,
    );
    expect(traces).toHaveLength(2);
    for (const t of traces) {
      expect(t.runId).toBe("run-fixed-1");
      expect(t.stageId).toBe("scheduled-publish");
      expect(t.status).toBe("ok");
      expect(t.outcome).toBe("scheduled");
    }
    // input/output に中身 (どの draft を / いつの予約に / どの識別子で) が残る
    expect(traces[0].input).toEqual({ draftId: "d1" });
    expect(traces[0].output).toEqual({
      scheduledFor: "2026-06-07T07:00:00+09:00",
      scheduledPostId: "x1",
    });
    // scheduledPostId 未指定は null
    expect((traces[1].output as { scheduledPostId: unknown }).scheduledPostId).toBeNull();
  });

  test("予約 0 件なら run のみで trace は書かない", async () => {
    const { runs, traces, deps } = setup();
    await recordScheduledPublish([], deps);
    expect(runs).toHaveLength(1);
    expect(traces).toHaveLength(0);
  });
});
