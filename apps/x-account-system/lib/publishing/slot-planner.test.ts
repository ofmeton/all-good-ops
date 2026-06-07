import { planSlots, type StockDraft } from "./slot-planner.js";
import { SCHEDULE_CONFIG } from "./schedule-config.js";

// 固定 now で決定的に検証する。
// 2026-06-08 09:00 JST = 月曜。翌日 2026-06-09 は火曜(平日)。
const NOW_MON = new Date("2026-06-08T09:00:00+09:00");
// 2026-06-12 は金曜。翌日 2026-06-13 は土曜(週末)。
const NOW_FRI = new Date("2026-06-12T10:00:00+09:00");

const WEEKDAY_TUE_SLOTS = [
  "2026-06-09T07:00:00+09:00",
  "2026-06-09T08:00:00+09:00",
  "2026-06-09T12:00:00+09:00",
  "2026-06-09T15:00:00+09:00",
  "2026-06-09T17:00:00+09:00",
];

const WEEKEND_SAT_SLOTS = [
  "2026-06-13T08:00:00+09:00",
  "2026-06-13T12:00:00+09:00",
  "2026-06-13T17:00:00+09:00",
];

function draft(id: string, approvedAt: string | null): StockDraft {
  return { id, human_approved_at: approvedAt };
}

test("FIFO: human_approved_at 昇順で早いものから先頭スロットへ", () => {
  const stock = [
    draft("c", "2026-06-07T12:00:00+09:00"),
    draft("a", "2026-06-07T08:00:00+09:00"),
    draft("b", "2026-06-07T10:00:00+09:00"),
  ];
  const plan = planSlots(stock, { now: NOW_MON });
  expect(plan).toEqual([
    { draftId: "a", scheduledForISO: WEEKDAY_TUE_SLOTS[0] },
    { draftId: "b", scheduledForISO: WEEKDAY_TUE_SLOTS[1] },
    { draftId: "c", scheduledForISO: WEEKDAY_TUE_SLOTS[2] },
  ]);
});

test("human_approved_at が null の draft は末尾に回る(安定)", () => {
  const stock = [
    draft("n1", null),
    draft("a", "2026-06-07T08:00:00+09:00"),
    draft("n2", null),
  ];
  const plan = planSlots(stock, { now: NOW_MON });
  expect(plan.map((p) => p.draftId)).toEqual(["a", "n1", "n2"]);
});

test("過去スロット skip: now が当日でも翌日スロットのみ・全て now より後", () => {
  const noonMon = new Date("2026-06-08T13:00:00+09:00");
  const stock = [draft("a", "2026-06-07T08:00:00+09:00"), draft("b", "2026-06-07T09:00:00+09:00")];
  const plan = planSlots(stock, { now: noonMon });
  // 当日(06-08)のスロットは含まれない。全て翌日 06-09。
  for (const p of plan) {
    expect(p.scheduledForISO.startsWith("2026-06-09")).toBe(true);
    expect(new Date(p.scheduledForISO).getTime()).toBeGreaterThan(noonMon.getTime());
  }
});

test("曜日別: 平日(翌日火)は5枠", () => {
  const stock = Array.from({ length: 6 }, (_, i) => draft(`d${i}`, `2026-06-07T0${i}:00:00+09:00`));
  const plan = planSlots(stock, { now: NOW_MON });
  expect(plan).toHaveLength(5);
  expect(plan.map((p) => p.scheduledForISO)).toEqual(WEEKDAY_TUE_SLOTS);
});

test("曜日別: 週末(翌日土)は3枠", () => {
  const stock = Array.from({ length: 6 }, (_, i) => draft(`d${i}`, `2026-06-07T0${i}:00:00+09:00`));
  const plan = planSlots(stock, { now: NOW_FRI });
  expect(plan).toHaveLength(3);
  expect(plan.map((p) => p.scheduledForISO)).toEqual(WEEKEND_SAT_SLOTS);
});

test("existing 衝突回避: 既予約スロットは飛ばす(+09:00 形式)", () => {
  const stock = Array.from({ length: 5 }, (_, i) => draft(`d${i}`, `2026-06-07T0${i}:00:00+09:00`));
  const plan = planSlots(stock, {
    now: NOW_MON,
    existing: ["2026-06-09T08:00:00+09:00"],
  });
  const used = plan.map((p) => p.scheduledForISO);
  expect(used).not.toContain("2026-06-09T08:00:00+09:00");
  expect(used).toEqual([
    WEEKDAY_TUE_SLOTS[0],
    WEEKDAY_TUE_SLOTS[2],
    WEEKDAY_TUE_SLOTS[3],
    WEEKDAY_TUE_SLOTS[4],
  ]);
});

test("existing 衝突回避: 別タイムゾーン表記(+00:00)でも同一スロットとして除外", () => {
  const stock = [draft("a", "2026-06-07T08:00:00+09:00")];
  // 2026-06-09T07:00:00+09:00 == 2026-06-08T22:00:00+00:00
  const plan = planSlots(stock, {
    now: NOW_MON,
    existing: ["2026-06-08T22:00:00+00:00"],
  });
  // 07:00 は埋まっているので 08:00 へ
  expect(plan).toEqual([{ draftId: "a", scheduledForISO: WEEKDAY_TUE_SLOTS[1] }]);
});

test("lookahead 超過: stock がスロット数を超えても枠数だけ割当(余剰は次回)", () => {
  const stock = Array.from({ length: 10 }, (_, i) => draft(`d${i}`, `2026-06-07T${String(i).padStart(2, "0")}:00:00+09:00`));
  const plan = planSlots(stock, { now: NOW_MON });
  expect(plan).toHaveLength(5); // 平日翌日1日=5枠
});

test("空 stock → 空プラン", () => {
  expect(planSlots([], { now: NOW_MON })).toEqual([]);
});

test("lookaheadDays=2: 翌日(火5枠)+翌々日(水5枠)へ FIFO で跨ぐ", () => {
  const config = { ...SCHEDULE_CONFIG, lookaheadDays: 2 };
  const stock = Array.from({ length: 7 }, (_, i) => draft(`d${i}`, `2026-06-07T${String(i).padStart(2, "0")}:00:00+09:00`));
  const plan = planSlots(stock, { now: NOW_MON, config });
  expect(plan).toHaveLength(7);
  // 先頭5枠は火(06-09)、6-7枠目は水(06-10)の朝
  expect(plan[4].scheduledForISO).toBe("2026-06-09T17:00:00+09:00");
  expect(plan[5].scheduledForISO).toBe("2026-06-10T07:00:00+09:00");
  expect(plan[6].scheduledForISO).toBe("2026-06-10T08:00:00+09:00");
});

test("maxPerDay 上限ガード: maxPerDay 未満なら平日ピークを切り詰める", () => {
  const config = { ...SCHEDULE_CONFIG, maxPerDay: 3 };
  const stock = Array.from({ length: 6 }, (_, i) => draft(`d${i}`, `2026-06-07T0${i}:00:00+09:00`));
  const plan = planSlots(stock, { now: NOW_MON, config });
  expect(plan).toHaveLength(3);
  expect(plan.map((p) => p.scheduledForISO)).toEqual(WEEKDAY_TUE_SLOTS.slice(0, 3));
});
