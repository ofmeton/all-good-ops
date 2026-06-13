import { markScheduledReservations, type ScheduledMark } from "./mark-scheduled.ts";

describe("markScheduledReservations", () => {
  test("未予約(更新1行) は applied=true、引数を UPDATE に渡す", async () => {
    const calls: [string, string, string | null][] = [];
    const r = await markScheduledReservations(
      [{ draftId: "d1", scheduledFor: "2026-06-09T07:00:00+09:00", scheduledPostId: "x1" }],
      {
        updateDraftSchedule: async (id, when, post) => {
          calls.push([id, when, post]);
          return 1;
        },
      },
    );
    expect(r).toEqual([{ draftId: "d1", applied: true }]);
    expect(calls).toEqual([["d1", "2026-06-09T07:00:00+09:00", "x1"]]);
  });

  test("既予約(更新0行) は applied=false（冪等 no-op・二重予約防止）", async () => {
    const r = await markScheduledReservations(
      [{ draftId: "d1", scheduledFor: "2026-06-09T07:00:00+09:00", scheduledPostId: "x1" }],
      { updateDraftSchedule: async () => 0 },
    );
    expect(r).toEqual([{ draftId: "d1", applied: false }]);
  });

  test("scheduledPostId 未指定は null で渡す", async () => {
    let seen: string | null = "init";
    await markScheduledReservations(
      [{ draftId: "d1", scheduledFor: "2026-06-09T07:00:00+09:00" }],
      {
        updateDraftSchedule: async (_id, _when, post) => {
          seen = post;
          return 1;
        },
      },
    );
    expect(seen).toBeNull();
  });

  test("複数: applied/no-op が混在しても 1 件ずつ結果を返す", async () => {
    const marks: ScheduledMark[] = [
      { draftId: "d1", scheduledFor: "t1" },
      { draftId: "d2", scheduledFor: "t2" },
    ];
    const r = await markScheduledReservations(marks, {
      updateDraftSchedule: async (id) => (id === "d1" ? 1 : 0),
    });
    expect(r).toEqual([
      { draftId: "d1", applied: true },
      { draftId: "d2", applied: false },
    ]);
  });

  test("UPDATE エラーは throw（本体 write は fail-open にしない）", async () => {
    await expect(
      markScheduledReservations([{ draftId: "d1", scheduledFor: "t1" }], {
        updateDraftSchedule: async () => {
          throw new Error("db down");
        },
      }),
    ).rejects.toThrow("db down");
  });
});
