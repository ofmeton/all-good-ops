// test/optimizer-grouping.test.mjs — lib/optimizer/grouping.ts の純関数テスト。
// Node 24 の型ストリップで .ts を直接 import（getCategoryGroups は DB 依存のため触れない）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { groupName, rollupByGroup } from "../lib/optimizer/grouping.ts";

test("groupName: マッピングにあればグループ名を返す", () => {
  const mapping = { 外食: "食費系", 食費: "食費系" };
  assert.equal(groupName("外食", mapping), "食費系");
  assert.equal(groupName("食費", mapping), "食費系");
});

test("groupName: マッピングに無ければ大項目名そのもの（素通し）", () => {
  const mapping = { 外食: "食費系" };
  assert.equal(groupName("交通費", mapping), "交通費");
  assert.equal(groupName("交通費", {}), "交通費"); // 空マッピングでも安全
});

test("rollupByGroup: 2大項目を1グループに合算（複数数値フィールド）", () => {
  const mapping = { 外食: "食費系", 食費: "食費系" };
  const rows = [
    { major: "外食", spend: 3000, prevSpend: 1000, count: 2 },
    { major: "食費", spend: 5000, prevSpend: 4000, count: 7 },
  ];
  const out = rollupByGroup(rows, mapping, "major", ["spend", "prevSpend", "count"]);
  assert.equal(out.length, 1);
  assert.equal(out[0].major, "食費系");
  assert.equal(out[0].spend, 8000);
  assert.equal(out[0].prevSpend, 5000);
  assert.equal(out[0].count, 9);
});

test("rollupByGroup: 未設定の大項目は自身名で1グループ（素通し）", () => {
  const mapping = { 外食: "食費系" };
  const rows = [
    { major: "外食", spend: 3000, count: 1 },
    { major: "交通費", spend: 2000, count: 4 },
  ];
  const out = rollupByGroup(rows, mapping, "major", ["spend", "count"]);
  assert.equal(out.length, 2);
  const byName = Object.fromEntries(out.map((r) => [r.major, r]));
  assert.equal(byName["食費系"].spend, 3000);
  assert.equal(byName["交通費"].spend, 2000);
  assert.equal(byName["交通費"].count, 4);
});

test("rollupByGroup: 空マッピングは全行を素通し（行数不変）", () => {
  const rows = [
    { major: "外食", spend: 3000, count: 1 },
    { major: "食費", spend: 5000, count: 2 },
  ];
  const out = rollupByGroup(rows, {}, "major", ["spend", "count"]);
  assert.equal(out.length, 2);
  assert.equal(out[0].major, "外食");
  assert.equal(out[1].major, "食費");
});

test("rollupByGroup: null/undefined の数値は0として合算（budget 風・category_major キー）", () => {
  const mapping = { 外食: "食費系", 食費: "食費系" };
  const rows = [
    { category_major: "外食", actual: 3000, budget: null, avg3: 2500 },
    { category_major: "食費", actual: 5000, budget: 4000, avg3: null },
  ];
  const out = rollupByGroup(rows, mapping, "category_major", ["actual", "budget", "avg3"]);
  assert.equal(out.length, 1);
  assert.equal(out[0].category_major, "食費系");
  assert.equal(out[0].actual, 8000);
  assert.equal(out[0].budget, 4000); // null は 0 扱い
  assert.equal(out[0].avg3, 2500);
});
