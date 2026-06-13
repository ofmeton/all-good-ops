import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildRolling,
  buildUpcomingWithdrawals,
  effectiveDay,
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
