import { test } from "node:test";
import assert from "node:assert/strict";
import {
  capacityFrom,
  capacityNow,
  confirmedDmmHours,
  countDaikuDays,
  countDmmHours,
  dailySeries,
  hoursNeeded,
  payDate,
  projectCardCharges,
  troughs,
} from "../lib/weekly/estimate.mjs";

const RULES = {
  logSummary: "dmm_log",
  planSummary: "dmm_plan",
  taPattern: "【[^】]*TA[^】]*】",
  taHours: 1 / 6,
  regularPattern: "meet一元化PJ定例",
  regularHours: 0.5,
  seminarPattern: "【[^】]*(ゼミ|期)[^】]*】",
};

const ev = (summary, start, end, selfStatus) => ({
  summary,
  start: `${start}+09:00`,
  end: `${end}+09:00`,
  selfStatus,
});

test("confirmedDmmHours: TA課題共有は括弧に「期」があっても10分で数える", () => {
  const ta = ev("【5期・TA課題共有】Google AIマスターゼミ", "2026-10-17T09:30:00", "2026-10-17T10:00:00");
  assert.equal(confirmedDmmHours(ta, RULES), 1 / 6);
  const ta2 = ev("【TA】生成AI基礎マスターゼミ｜事前課題を講師へ共有", "2026-10-17T09:00:00", "2026-10-17T09:30:00");
  assert.equal(confirmedDmmHours(ta2, RULES), 1 / 6);
});

test("confirmedDmmHours: ゼミは承諾済みだけ実時間で数え、ゼミ定例やアワードは数えない", () => {
  assert.equal(confirmedDmmHours(ev("【6期ゼミ】LINE×AI活用", "2026-10-23T19:00:00", "2026-10-23T20:30:00", "accepted"), RULES), 1.5);
  assert.equal(confirmedDmmHours(ev("【5期】AI×SNS動画マーケ", "2026-10-29T19:00:00", "2026-10-29T20:30:00", "accepted"), RULES), 1.5);
  assert.equal(confirmedDmmHours(ev("【4期ゼミ】AIライティング", "2026-10-23T20:30:00", "2026-10-23T22:00:00", "declined"), RULES), 0);
  assert.equal(confirmedDmmHours(ev("【4期ゼミ】AIエンジニア入門", "2026-10-24T13:00:00", "2026-10-24T14:30:00", "needsAction"), RULES), 0);
  assert.equal(confirmedDmmHours(ev("ゼミ定例", "2026-10-19T15:00:00", "2026-10-19T15:30:00", "needsAction"), RULES), 0);
  assert.equal(confirmedDmmHours(ev("⭐DMMアワード2026 オンライン授賞式⭐", "2026-10-30T17:00:00", "2026-10-30T18:30:00"), RULES), 0);
  assert.equal(confirmedDmmHours(ev("イベントカレンダー/meet一元化PJ定例", "2026-10-19T17:00:00", "2026-10-19T17:30:00"), RULES), 0.5);
});

test("countDmmHours: 過去は dmm_log だけ、未来は kcgrp の確定分だけ、dmm_plan は別枠", () => {
  const now = "2026-10-17T07:00:00+09:00";
  const primary = [
    ev("dmm_log", "2026-10-16T14:00:00", "2026-10-16T19:30:00"),
    ev("dmm_log", "2026-09-30T10:45:00", "2026-09-30T11:00:00"),
    ev("dmm_plan", "2026-10-17T14:00:00", "2026-10-17T16:00:00"),
    ev("dmm_plan", "2026-10-09T14:00:00", "2026-10-09T15:00:00"),
  ];
  const kcgrp = [
    ev("【6期ゼミ】LINE×AI活用", "2026-10-16T19:00:00", "2026-10-16T20:30:00", "accepted"),
    ev("【6期ゼミ】Claude Codeマスター", "2026-10-17T17:30:00", "2026-10-17T19:00:00", "accepted"),
    ev("【5期・TA課題共有】Google AIマスターゼミ", "2026-10-17T09:30:00", "2026-10-17T10:00:00"),
    ev("【6期ゼミ】Claude Codeマスター", "2026-11-07T17:30:00", "2026-11-07T19:00:00", "accepted"),
  ];
  const r = countDmmHours({ primaryEvents: primary, kcgrpEvents: kcgrp, now, month: "2026-10", rules: RULES });
  assert.equal(r.logHours, 5.5);
  assert.equal(r.confirmedHours, 1.5 + 1 / 6);
  assert.equal(r.planHours, 2);
  assert.deepEqual(r.confirmed, { seminar: 1, ta: 1, regular: 0 });
});

test("countDaikuDays: 月内の「ジュンヤさん」予定を数え、休み・？付き・終日は除く", () => {
  const primary = [
    ev("ジュンヤさん 大工の現場", "2026-10-19T07:00:00", "2026-10-19T18:00:00"),
    ev("ジュンヤさん？", "2026-10-12T07:00:00", "2026-10-12T18:00:00"),
    { summary: "ジュンヤさん 休み", start: "2026-10-13", end: "2026-10-14" },
    ev("ジュンヤさん 大工の現場", "2026-11-02T07:00:00", "2026-11-02T18:00:00"),
    ev("つかさカテキョー", "2026-10-19T19:00:00", "2026-10-19T20:00:00"),
  ];
  assert.equal(countDaikuDays({ primaryEvents: primary, month: "2026-10", pattern: "ジュンヤさん", excludePattern: "休み|？|\\?" }), 1);
});

test("payDate: 31日指定は月末に丸める", () => {
  assert.equal(payDate("2026-11", 31), "2026-11-30");
  assert.equal(payDate("2026-12", 3), "2026-12-03");
});

test("projectCardCharges: override はそのまま、利用中は MF 利用残高から締め済みを引いて残り日数分を足す", () => {
  const charges = [
    { date: "2026-10-26", periodStart: "2026-09-01", periodEnd: "2026-09-30", appAmount: 178081, hasOverride: true },
    { date: "2026-11-26", periodStart: "2026-10-01", periodEnd: "2026-10-31", appAmount: 81655, hasOverride: false },
    { date: "2026-12-26", periodStart: "2026-11-01", periodEnd: "2026-11-30", appAmount: 0, hasOverride: false },
  ];
  const r = projectCardCharges({ charges, today: "2026-10-16", liability: 280520, monthlyAvg: 150000 });
  assert.equal(r[0].amount, 178081);
  assert.equal(r[1].soFar, 280520 - 178081);
  assert.equal(r[1].rest, 75000);
  assert.equal(r[1].amount, 102439 + 75000);
  assert.equal(r[2].amount, 150000);
});

test("dailySeries と troughs と capacity: 今日の手計算の形を再現する", () => {
  const events = [
    { date: "2026-10-26", kind: "expense", amount: 178081 },
    { date: "2026-10-31", kind: "income", amount: 171550 },
    { date: "2026-12-26", kind: "expense", amount: 140000 },
    { date: "2026-11-30", kind: "income", amount: 110550 },
  ];
  const s = dailySeries({ start: 225852, today: "2026-10-16", horizonEnd: "2026-12-31", events, dailySpend: 1000 });
  const t = troughs(s);
  assert.equal(t[0].date, "2026-10-30");
  assert.equal(t[0].balance, 225852 - 178081 - 14000);
  assert.equal(capacityNow(s, 30000), 3000);
  // 12/26 引落のカードなら、10月末の谷は関係ない
  assert.ok(capacityFrom(s, 30000, "2026-12-26") > capacityNow(s, 30000));
  const h = hoursNeeded({ series: s, buffer: 30000, rate: 2200, debitDate: "2026-12-26", dmmPayDate: "2026-11-30", amount: 50000 });
  assert.equal(h.feasible, true);
  const tooEarly = hoursNeeded({ series: s, buffer: 30000, rate: 2200, debitDate: "2026-10-26", dmmPayDate: "2026-11-30", amount: 50000 });
  assert.equal(tooEarly.feasible, false);
});
