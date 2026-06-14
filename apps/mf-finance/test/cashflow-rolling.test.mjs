import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildRolling,
  buildUpcomingWithdrawals,
  effectiveDay,
  monthlyOccurrences,
  monthlyRecurringContribution,
  weekdayOf,
} from "../lib/cashflow/rolling.mjs";

test("effectiveDay は月末超過をクランプ", () => {
  assert.equal(effectiveDay(31, 2026, 2), 28); // 2026-02 は28日
  assert.equal(effectiveDay(15, 2026, 6), 15);
  assert.equal(effectiveDay(31, 2026, 4), 30); // 4月は30日
});

test("buildRolling: 起点残高に recurring/scheduled を日付順で適用し残高推移", () => {
  const r = buildRolling({
    today: "2026-06-14",
    days: 30,
    startBalance: 100000,
    recurring: [
      { kind: "expense", name: "家賃", amount: 80000, day: 27 },
      { kind: "income", name: "給与", amount: 30000, day: 20 },
    ],
    scheduled: [{ kind: "income", name: "案件報酬", amount: 200000, date: "2026-06-25" }],
  });
  // 6/20 給与 +3万 →13万, 6/25 報酬 +20万 →33万, 6/27 家賃 -8万 →25万
  assert.equal(r.events.length, 3);
  assert.equal(r.events[0].date, "2026-06-20");
  assert.equal(r.events[0].balanceAfter, 130000);
  assert.equal(r.events[1].date, "2026-06-25");
  assert.equal(r.events[1].balanceAfter, 330000);
  assert.equal(r.events[2].date, "2026-06-27");
  assert.equal(r.end, 250000);
  assert.equal(r.minBalance, 100000); // 起点が最小
  assert.equal(r.firstNegativeDate, null);
});

test("buildRolling: ゼロ割れ検出", () => {
  const r = buildRolling({
    today: "2026-06-14",
    days: 30,
    startBalance: 5000,
    recurring: [{ kind: "expense", name: "大型支払い", amount: 20000, day: 18 }],
    scheduled: [],
  });
  assert.equal(r.firstNegativeDate, "2026-06-18");
  assert.equal(r.minBalance, -15000);
});

test("buildRolling: 月跨ぎで翌月の recurring も発火", () => {
  const r = buildRolling({
    today: "2026-06-20",
    days: 30, // 〜7/20
    startBalance: 0,
    recurring: [{ kind: "expense", name: "サブスク", amount: 1000, day: 5 }],
    scheduled: [],
  });
  // 7/5 が範囲内 → 1件
  assert.equal(r.events.length, 1);
  assert.equal(r.events[0].date, "2026-07-05");
});

test("buildUpcomingWithdrawals: 今日以降の当月引落のみ合算", () => {
  const u = buildUpcomingWithdrawals({
    today: "2026-06-14",
    recurring: [
      { kind: "expense", name: "家賃", amount: 80000, day: 27 }, // 27>=14 → 含む
      { kind: "expense", name: "サブスク", amount: 1000, day: 4 }, // 4<14 → 除外
      { kind: "income", name: "給与", amount: 30000, day: 20 }, // income → 除外
    ],
    scheduled: [
      { kind: "expense", name: "税金", amount: 50000, date: "2026-06-30" }, // 含む
      { kind: "expense", name: "来月分", amount: 9999, date: "2026-07-10" }, // 当月外 → 除外
    ],
  });
  assert.equal(u.total, 130000); // 80000 + 50000
  assert.equal(u.items.length, 2);
  assert.equal(u.items[0].date, "2026-06-27");
  assert.equal(u.items[1].date, "2026-06-30");
});

test("buildUpcomingWithdrawals: day 月末クランプ", () => {
  const u = buildUpcomingWithdrawals({
    today: "2026-02-15",
    recurring: [{ kind: "expense", name: "末日引落", amount: 5000, day: 31 }],
    scheduled: [],
  });
  assert.equal(u.items.length, 1);
  assert.equal(u.items[0].date, "2026-02-28"); // 31→28
});

test("buildRolling: weekly income は曜日一致の日に展開される", () => {
  const r = buildRolling({
    today: "2026-06-01",
    days: 29,
    startBalance: 0,
    recurring: [{ id: 1, kind: "income", name: "週次報酬", amount: 10000, frequency: "weekly", weekday: 1, amount_type: "fixed" }],
    scheduled: [],
  });
  assert.deepEqual(r.events.map((e) => e.date), ["2026-06-01", "2026-06-08", "2026-06-15", "2026-06-22", "2026-06-29"]);
  assert.ok(r.events.every((e) => weekdayOf(e.date) === 1));
  assert.equal(r.end, 50000);
});

test("buildRolling: weekly skip はイベントに出ず残高にも入らない", () => {
  const r = buildRolling({
    today: "2026-06-01",
    days: 14,
    startBalance: 0,
    recurring: [{ id: 1, kind: "income", name: "週次報酬", amount: 10000, frequency: "weekly", weekday: 1, amount_type: "fixed" }],
    scheduled: [],
    overrides: [{ recurring_id: 1, occurrence_date: "2026-06-08", skip: 1, amount: null }],
  });
  assert.deepEqual(r.events.map((e) => e.date), ["2026-06-01", "2026-06-15"]);
  assert.equal(r.end, 20000);
});

test("buildRolling: variable pending は表示されるが残高とゼロ割れ判定に入らない", () => {
  const r = buildRolling({
    today: "2026-06-01",
    days: 1,
    startBalance: -100,
    recurring: [{ id: 1, kind: "income", name: "変動報酬", amount: 0, day: 1, frequency: "monthly", weekday: null, amount_type: "variable" }],
    scheduled: [],
  });
  assert.equal(r.events.length, 1);
  assert.equal(r.events[0].status, "pending");
  assert.equal(r.events[0].amount, 0);
  assert.equal(r.events[0].balanceAfter, -100);
  assert.equal(r.end, -100);
  assert.equal(r.minBalance, -100);
  assert.equal(r.firstNegativeDate, null);
});

test("buildRolling: variable amount override は normal として残高に加算される", () => {
  const r = buildRolling({
    today: "2026-06-01",
    days: 1,
    startBalance: 1000,
    recurring: [{ id: 1, kind: "income", name: "変動報酬", amount: 0, day: 1, frequency: "monthly", weekday: null, amount_type: "variable" }],
    scheduled: [],
    overrides: [{ recurring_id: 1, occurrence_date: "2026-06-01", skip: 0, amount: 25000 }],
  });
  assert.equal(r.events[0].status, "normal");
  assert.equal(r.events[0].amount, 25000);
  assert.equal(r.end, 26000);
});

test("buildRolling: monthly recurring は既存 day 指定で後方互換", () => {
  const r = buildRolling({
    today: "2026-06-01",
    days: 30,
    startBalance: 0,
    recurring: [{ id: 1, kind: "income", name: "月次報酬", amount: 10000, day: 20 }],
    scheduled: [],
  });
  assert.equal(r.events.length, 1);
  assert.equal(r.events[0].date, "2026-06-20");
  assert.equal(r.events[0].status, "normal");
  assert.equal(r.end, 10000);
});

test("monthlyOccurrences: weekly は月により4回/5回、monthly は月末クランプ", () => {
  const weekly = { id: 1, frequency: "weekly", weekday: 1 };
  assert.equal(monthlyOccurrences(weekly, 2026, 2).length, 4);
  assert.equal(monthlyOccurrences(weekly, 2026, 6).length, 5);
  assert.deepEqual(monthlyOccurrences({ id: 2, frequency: "monthly", day: 31 }, 2026, 2), ["2026-02-28"]);
});

test("monthlyRecurringContribution: skip除外・variable overrideのみ・fixedは回数分", () => {
  const overrides = [
    { recurring_id: 1, occurrence_date: "2026-06-08", skip: 1, amount: null },
    { recurring_id: 2, occurrence_date: "2026-06-15", skip: 0, amount: 30000 },
  ];
  assert.equal(
    monthlyRecurringContribution(
      { id: 1, kind: "income", amount: 10000, frequency: "weekly", weekday: 1, amount_type: "fixed" },
      2026,
      6,
      overrides,
    ),
    40000,
  );
  assert.equal(
    monthlyRecurringContribution(
      { id: 2, kind: "income", amount: 0, frequency: "weekly", weekday: 1, amount_type: "variable" },
      2026,
      6,
      overrides,
    ),
    30000,
  );
  assert.equal(
    monthlyRecurringContribution(
      { id: 3, kind: "income", amount: 0, frequency: "weekly", weekday: 1, amount_type: "variable" },
      2026,
      6,
      overrides,
    ),
    0,
  );
});
