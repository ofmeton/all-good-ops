import babelParser from "@babel/parser";
import { elementLineRange, findElement } from "./reorder.mjs";

function parse(src) {
  return babelParser.parse(src, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
    errorRecovery: true,
  });
}

const SKIP_KEYS = new Set(["loc", "start", "end", "range", "leadingComments", "trailingComments", "innerComments", "extra", "tokens", "comments"]);

function classNameLiterals(ast) {
  const hits = [];
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.type === "JSXAttribute" && node.name?.name === "className") {
      const v = node.value;
      if (v?.type === "StringLiteral") hits.push({ start: v.start + 1, end: v.end - 1, value: v.value });
      else if (v?.type === "JSXExpressionContainer" && v.expression?.type === "StringLiteral") {
        hits.push({ start: v.expression.start + 1, end: v.expression.end - 1, value: v.expression.value });
      }
    }
    for (const k in node) {
      if (SKIP_KEYS.has(k)) continue;
      const c = node[k];
      if (c && typeof c === "object") walk(c);
    }
  };
  walk(ast.program);
  return hits;
}

function hasOverlap(ranges) {
  const ordered = [...ranges].sort((a, b) => a.s - b.s);
  for (let i = 1; i < ordered.length; i++) {
    if (ordered[i].s < ordered[i - 1].e) return true;
  }
  return false;
}

function applyRanges(src, ranges) {
  let out = src;
  for (const r of [...ranges].sort((a, b) => b.s - a.s)) {
    out = out.slice(0, r.s) + r.text + out.slice(r.e);
  }
  return out;
}

// edits: [{oldClassName,newClassName}]
export function applyStyleBatch(src, edits) {
  let ast;
  try { ast = parse(src); } catch { return { ok: false, reason: "parse-error" }; }

  const lits = classNameLiterals(ast);
  const ranges = [];
  const skipped = [];
  for (const e of edits) {
    if (e.oldClassName === e.newClassName) continue;
    const matches = lits.filter((l) => l.value === e.oldClassName);
    if (matches.length === 0) { skipped.push({ oldClassName: e.oldClassName, reason: "not-found" }); continue; }
    if (matches.length > 1) { skipped.push({ oldClassName: e.oldClassName, reason: "ambiguous" }); continue; }
    ranges.push({ s: matches[0].start, e: matches[0].end, text: e.newClassName });
  }

  if (ranges.length === 0) return { ok: true, changed: false, applied: 0, skipped, src };
  if (hasOverlap(ranges)) return { ok: false, reason: "overlap" };

  return { ok: true, changed: true, applied: ranges.length, skipped, src: applyRanges(src, ranges) };
}

function indentBeforeOffset(src, offset) {
  const m = src.slice(0, offset).match(/\n[^\n]*$/);
  return m ? m[0] : "\n";
}

// targets: [className...]. kind: "delete"|"duplicate".
export function structureBatch(src, kind, targets) {
  if (!["delete", "duplicate"].includes(kind)) return { ok: false, reason: "bad-kind" };
  try { parse(src); } catch { return { ok: false, reason: "parse-error" }; }

  // 同一 className の重複を除去（map/loop で 1 ソース→複数 DOM の時、二重削除/二重複製を防ぐ）。
  const uniqueTargets = [...new Set(targets)];

  const skipped = [];
  const ranges = [];
  for (const targetClass of uniqueTargets) {
    if (kind === "delete") {
      const r = elementLineRange(src, targetClass);
      if (r.err) { skipped.push({ targetClass, reason: r.err }); continue; }
      ranges.push({ s: r.s, e: r.e, text: "" });
      continue;
    }

    const r = findElement(src, targetClass);
    if (r.err) { skipped.push({ targetClass, reason: r.err }); continue; }
    const elemText = src.slice(r.el.start, r.el.end);
    ranges.push({ s: r.el.end, e: r.el.end, text: indentBeforeOffset(src, r.el.start) + elemText });
  }

  if (ranges.length === 0) return { ok: true, changed: false, skipped, src };
  if (hasOverlap(ranges)) return { ok: false, reason: "overlap" };

  return { ok: true, changed: true, skipped, src: applyRanges(src, ranges) };
}
