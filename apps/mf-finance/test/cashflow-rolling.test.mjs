import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildAccountRolling,
  buildRolling,
  buildUpcomingWithdrawals,
  effectiveDay,
  monthEndOffsetDays,
  monthlyOccurrences,
  monthlyRecurringContribution,
  weekdayOf,
} from "../lib/cashflow/rolling.mjs";

test("effectiveDay は月末超過をクランプ", () => {
  assert.equal(effectiveDay(31, 2026, 2), 28); // 2026-02 は28日
  assert.equal(effectiveDay(15, 2026, 6), 15);
  assert.equal(effectiveDay(31, 2026, 4), 30); // 4月は30日
});

test("monthEndOffsetDays: 当月/来月/再来月の月末までの日数を返す", () => {
  assert.equal(monthEndOffsetDays("2026-06-14", 0), 16);
  assert.equal(monthEndOffsetDays("2026-06-14", 1), 47);
  assert.equal(monthEndOffsetDays("2026-06-14", 2), 78);
  assert.equal(monthEndOffsetDays("2026-01-31", 1), 28);
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

test("buildRolling: recurring/scheduled の account をイベントへ伝播し未設定は null", () => {
  const r = buildRolling({
    today: "2026-06-01",
    days: 2,
    startBalance: 0,
    recurring: [
      { id: 1, kind: "income", name: "給与", amount: 1000, day: 1, account: "銀行A" },
      { id: 2, kind: "expense", name: "現金支払", amount: 300, day: 2 },
    ],
    scheduled: [
      { kind: "expense", name: "PayPay", amount: 200, date: "2026-06-01", account: "PayPay" },
      { kind: "income", name: "未指定入金", amount: 100, date: "2026-06-02" },
    ],
  });
  assert.deepEqual(
    r.events.map((event) => [event.name, event.account]),
    [
      ["給与", "銀行A"],
      ["PayPay", "PayPay"],
      ["現金支払", null],
      ["未指定入金", null],
    ],
  );
});

test("buildAccountRolling: 口座別・未指定へ分配し total の rolling 結果は不変", () => {
  const opts = {
    today: "2026-06-01",
    days: 5,
    startBalance: 15700,
    balances: [
      { account: "銀行A", kind: "bank", balance: 10000 },
      { account: "PayPay", kind: "emoney", balance: 5000 },
      { account: "空口座", kind: "cash", balance: 700 },
    ],
    recurring: [
      { id: 1, kind: "income", name: "給与", amount: 2000, day: 1, frequency: "monthly", amount_type: "fixed", account: "銀行A" },
      { id: 2, kind: "expense", name: "未指定固定費", amount: 300, day: 2, frequency: "monthly", amount_type: "fixed" },
      { id: 3, kind: "income", name: "変動報酬", amount: 0, day: 3, frequency: "monthly", amount_type: "variable", account: "銀行A" },
      { id: 4, kind: "income", name: "スキップ報酬", amount: 9999, day: 4, frequency: "monthly", amount_type: "fixed", account: "銀行A" },
    ],
    scheduled: [
      { kind: "expense", name: "PayPay支払", amount: 8000, date: "2026-06-01", account: "PayPay" },
      { kind: "expense", name: "外部口座支払", amount: 1200, date: "2026-06-05", account: "新口座" },
    ],
    overrides: [{ recurring_id: 4, occurrence_date: "2026-06-04", skip: 1, amount: null }],
  };
  const totalOnly = buildRolling(opts);
  const byAccount = buildAccountRolling(opts);

  assert.equal(byAccount.total.end, totalOnly.end);
  assert.equal(byAccount.total.minBalance, totalOnly.minBalance);
  assert.equal(byAccount.total.firstNegativeDate, totalOnly.firstNegativeDate);
  assert.equal(byAccount.total.events.length, totalOnly.events.length);

  const locations = new Map(byAccount.locations.map((location) => [location.key, location]));
  assert.equal(locations.get("銀行A").start, 10000);
  assert.equal(locations.get("銀行A").end, 12000);
  assert.equal(locations.get("銀行A").events.find((event) => event.name === "変動報酬").balanceAfter, 12000);
  assert.equal(locations.get("PayPay").start, 5000);
  assert.equal(locations.get("PayPay").end, -3000);
  assert.equal(locations.get("PayPay").firstNegativeDate, "2026-06-01");
  assert.equal(locations.get(null).start, 0);
  assert.equal(locations.get(null).end, -300);
  assert.equal(locations.get(null).firstNegativeDate, "2026-06-02");
  assert.equal(locations.get("新口座").start, 0);
  assert.equal(locations.get("新口座").end, -1200);
  assert.equal(locations.get("空口座").start, 700);
  assert.equal(locations.get("空口座").end, 700);
  assert.equal(byAccount.total.events.some((event) => event.name === "スキップ報酬"), false);
});

test("buildAccountRolling: balances 空で asset 起点だけある場合は未指定に起点を寄せる", () => {
  const byAccount = buildAccountRolling({
    today: "2026-06-01",
    days: 1,
    startBalance: 10000,
    balances: [],
    recurring: [],
    scheduled: [{ kind: "expense", name: "未指定支払", amount: 3000, date: "2026-06-01" }],
  });

  const locations = new Map(byAccount.locations.map((location) => [location.key, location]));
  const unspecified = locations.get(null);
  assert.equal(unspecified.start, 10000);
  assert.equal(unspecified.end, 7000);
  assert.equal(unspecified.firstNegativeDate, null);
  assert.equal(
    byAccount.locations.reduce((sum, location) => sum + location.start, 0),
    byAccount.total.start,
  );
});

test("buildAccountRolling: balances 非空で合計が total 起点と一致する通常時は未指定 start=0", () => {
  const byAccount = buildAccountRolling({
    today: "2026-06-01",
    days: 1,
    startBalance: 15000,
    balances: [
      { account: "銀行A", kind: "bank", balance: 10000 },
      { account: "PayPay", kind: "emoney", balance: 5000 },
    ],
    recurring: [],
    scheduled: [{ kind: "expense", name: "未指定支払", amount: 1000, date: "2026-06-01" }],
  });

  const locations = new Map(byAccount.locations.map((location) => [location.key, location]));
  assert.equal(locations.get(null).start, 0);
  assert.equal(locations.get(null).end, -1000);
  assert.equal(
    byAccount.locations.reduce((sum, location) => sum + location.start, 0),
    byAccount.total.start,
  );
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
