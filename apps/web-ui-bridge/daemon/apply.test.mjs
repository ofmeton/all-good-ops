import { test } from "node:test";
import assert from "node:assert/strict";
import babelParser from "@babel/parser";
import { applyStyleBatch, structureBatch } from "./apply.mjs";

const SRC = `export default function P(){return(
  <div className="a px-2">
    <span className="b text-sm">x</span>
    <span className="c text-sm">y</span>
  </div>);}`;

test("applyStyleBatch: 複数要素を1回で置換", () => {
  const r = applyStyleBatch(SRC, [
    { oldClassName: "b text-sm", newClassName: "b text-lg" },
    { oldClassName: "c text-sm", newClassName: "c text-lg" },
  ]);
  assert.equal(r.ok, true);
  assert.equal(r.applied, 2);
  assert.match(r.src, /className="b text-lg"/);
  assert.match(r.src, /className="c text-lg"/);
  assert.equal(r.skipped.length, 0);
});

test("applyStyleBatch: 特定不可の edit だけ skip し他は適用", () => {
  const r = applyStyleBatch(SRC, [
    { oldClassName: "b text-sm", newClassName: "b text-lg" },
    { oldClassName: "missing", newClassName: "x" },
  ]);
  assert.equal(r.applied, 1);
  assert.equal(r.skipped.length, 1);
  assert.equal(r.skipped[0].reason, "not-found");
  assert.match(r.src, /className="b text-lg"/);
});

test("applyStyleBatch: 全 skip なら changed:false", () => {
  const r = applyStyleBatch(SRC, [{ oldClassName: "zzz", newClassName: "q" }]);
  assert.equal(r.changed, false);
});

const S2 = `export default function P(){return(
  <ul className="list">
    <li className="i1">1</li>
    <li className="i2">2</li>
    <li className="i3">3</li>
  </ul>);}`;

test("structureBatch delete: 複数要素を1回で削除・範囲ズレ無し", () => {
  const r = structureBatch(S2, "delete", ["i1", "i3"]);
  assert.equal(r.ok, true);
  assert.doesNotMatch(r.src, /className="i1"/);
  assert.doesNotMatch(r.src, /className="i3"/);
  assert.match(r.src, /className="i2"/);
  assert.equal(parseOk(r.src), true);
});

test("structureBatch duplicate: 各要素を直後に複製", () => {
  const r = structureBatch(S2, "duplicate", ["i2"]);
  assert.equal((r.src.match(/className="i2"/g) || []).length, 2);
});

test("structureBatch: 特定不可 target は skip", () => {
  const r = structureBatch(S2, "delete", ["i1", "nope"]);
  assert.equal(r.skipped.length, 1);
  assert.doesNotMatch(r.src, /className="i1"/);
});

function parseOk(s) {
  try {
    babelParser.parse(s, { sourceType: "module", plugins: ["typescript", "jsx"] });
    return true;
  } catch {
    return false;
  }
}
