// Phase C: JSX 要素の決定的な構造編集（並べ替え/別親移動/複製/削除）。Claude 不介在。
//
// 方針: @babel/parser で TSX をパースし、各要素の正確なソース範囲(start/end)を得る。
// 編集は AST のオフセットを使った「純粋な文字列操作」だけ。
//   - 同じ入力 → 必ず同じ出力（決定的）
//   - 触らない要素・整形は一切変えない（formatting 保持。別親移動だけは移動先 1 行目の
//     インデントを移動先に合わせ、内側行は元の深さを保つ best-effort）
//   - className(静的文字列)で一意特定できない時は安全側で拒否（誤爆しない）

import babelParser from "@babel/parser";

function parse(src) {
  return babelParser.parse(src, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
    errorRecovery: true,
  });
}

const SKIP_KEYS = new Set(["loc", "start", "end", "range", "leadingComments", "trailingComments", "innerComments", "extra", "tokens", "comments"]);

// 全 JSXElement と「子(element/fragment)→親コンテナ(element/fragment)」の対応を作る。
function indexTree(ast) {
  const all = [];
  const parentOf = new Map();
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.type === "JSXElement") all.push(node);
    if (node.type === "JSXElement" || node.type === "JSXFragment") {
      for (const c of node.children || []) {
        if (c && (c.type === "JSXElement" || c.type === "JSXFragment")) parentOf.set(c, node);
      }
    }
    for (const k in node) {
      if (SKIP_KEYS.has(k)) continue;
      const v = node[k];
      if (v && typeof v === "object") walk(v);
    }
  };
  walk(ast.program);
  return { all, parentOf };
}

function classNameOf(el) {
  const attrs = el.openingElement?.attributes || [];
  for (const a of attrs) {
    if (a.type === "JSXAttribute" && a.name?.name === "className") {
      if (a.value?.type === "StringLiteral") return a.value.value;
      if (a.value?.type === "JSXExpressionContainer" && a.value.expression?.type === "StringLiteral") {
        return a.value.expression.value;
      }
      return null;
    }
  }
  return null;
}

const isWs = (c) => c && c.type === "JSXText" && /^\s*$/.test(c.value);

// a が b の祖先か（parentOf を辿る）
function isAncestor(a, b, parentOf) {
  let cur = parentOf.get(b);
  while (cur) { if (cur === a) return true; cur = parentOf.get(cur); }
  return false;
}

// 要素 + 隣接する空白 1 つ（=その要素の「行」）の削除範囲
function lineRange(children, el) {
  const idx = children.indexOf(el);
  let start = el.start, end = el.end;
  const prev = children[idx - 1], next = children[idx + 1];
  if (isWs(prev)) start = prev.start;
  else if (isWs(next)) end = next.end;
  return [start, end];
}

// 要素の直前にある改行込みインデント文字列（挿入の区切りに使う）
function indentBefore(children, el) {
  const prev = children[children.indexOf(el) - 1];
  if (prev && prev.type === "JSXText" && /\n/.test(prev.value)) {
    const m = prev.value.match(/\n[^\n]*$/);
    return m ? m[0] : "\n";
  }
  return "\n";
}

// className でただ 1 つの JSXElement を特定（0/複数は理由付きで失敗）
function unique(all, cls) {
  const hits = all.filter((el) => classNameOf(el) === cls);
  if (hits.length === 0) return { err: "not-found" };
  if (hits.length > 1) return { err: "ambiguous" };
  return { el: hits[0] };
}

function load(src) {
  let ast;
  try { ast = parse(src); } catch { return { err: "parse-error" }; }
  return { ...indexTree(ast) };
}

/**
 * 移動: dragClass を targetClass の before/after へ。同じ親なら空白スロット入替、
 * 別の親なら「削除＋挿入」で reparent。決定的。
 */
export function moveInSource(src, dragClass, targetClass, position = "before") {
  if (!dragClass || !targetClass) return { ok: false, reason: "missing-class" };
  if (dragClass === targetClass) return { ok: false, reason: "same-class" };
  if (!["before", "after"].includes(position)) return { ok: false, reason: "bad-position" };

  const tree = load(src);
  if (tree.err) return { ok: false, reason: tree.err };
  const { all, parentOf } = tree;
  const d = unique(all, dragClass); if (d.err) return { ok: false, reason: d.err };
  const t = unique(all, targetClass); if (t.err) return { ok: false, reason: t.err };
  const dragEl = d.el, targetEl = t.el;

  if (isAncestor(dragEl, targetEl, parentOf) || isAncestor(targetEl, dragEl, parentOf)) {
    return { ok: false, reason: "nested" }; // 自分の中/外へは動かせない
  }

  const dragParent = parentOf.get(dragEl);
  const targetParent = parentOf.get(targetEl);
  if (!dragParent || !targetParent) return { ok: false, reason: "no-parent" };

  // 同じ親 → 空白スロットを保ったまま要素順だけ入替（整形完全保持）
  if (dragParent === targetParent) {
    const children = dragParent.children;
    const elems = children.filter((c) => c.type === "JSXElement");
    const order = elems.filter((e) => e !== dragEl);
    const tIdx = order.indexOf(targetEl);
    order.splice(position === "before" ? tIdx : tIdx + 1, 0, dragEl);
    const firstStart = children[0].start, lastEnd = children[children.length - 1].end;
    let slot = 0, region = "";
    for (const c of children) {
      if (c.type === "JSXElement") { const e = order[slot++]; region += src.slice(e.start, e.end); }
      else region += src.slice(c.start, c.end);
    }
    const out = src.slice(0, firstStart) + region + src.slice(lastEnd);
    return out === src ? { ok: true, changed: false, src } : { ok: true, changed: true, src: out };
  }

  // 別の親 → reparent（削除＋挿入）。範囲は非ネストなので必ず disjoint。
  const dragText = src.slice(dragEl.start, dragEl.end);
  const [rmStart, rmEnd] = lineRange(dragParent.children, dragEl);
  const indent = indentBefore(targetParent.children, targetEl);
  const insertPos = position === "before" ? targetEl.start : targetEl.end;
  const insertText = position === "before" ? dragText + indent : indent + dragText;
  const edits = [
    { s: rmStart, e: rmEnd, text: "" },
    { s: insertPos, e: insertPos, text: insertText },
  ].sort((a, b) => b.s - a.s);
  let out = src;
  for (const ed of edits) out = out.slice(0, ed.s) + ed.text + out.slice(ed.e);
  return { ok: true, changed: true, src: out };
}

/** 削除: className=targetClass の要素 1 つを（その行ごと）削除。 */
export function deleteInSource(src, targetClass) {
  if (!targetClass) return { ok: false, reason: "missing-class" };
  const tree = load(src);
  if (tree.err) return { ok: false, reason: tree.err };
  const u = unique(tree.all, targetClass); if (u.err) return { ok: false, reason: u.err };
  const el = u.el;
  const parent = tree.parentOf.get(el);
  const [s, e] = parent ? lineRange(parent.children, el) : [el.start, el.end];
  const out = src.slice(0, s) + src.slice(e);
  return { ok: true, changed: true, src: out };
}

/** 複製: className=targetClass の要素 1 つを、同じインデントで直後に複製。 */
export function duplicateInSource(src, targetClass) {
  if (!targetClass) return { ok: false, reason: "missing-class" };
  const tree = load(src);
  if (tree.err) return { ok: false, reason: tree.err };
  const u = unique(tree.all, targetClass); if (u.err) return { ok: false, reason: u.err };
  const el = u.el;
  const parent = tree.parentOf.get(el);
  const indent = parent ? indentBefore(parent.children, el) : "\n";
  const elemText = src.slice(el.start, el.end);
  const out = src.slice(0, el.end) + indent + elemText + src.slice(el.end);
  return { ok: true, changed: true, src: out };
}

export function findElement(src, cls) {
  const tree = load(src);
  if (tree.err) return { err: tree.err };
  return unique(tree.all, cls);
}

export function elementLineRange(src, cls) {
  const tree = load(src);
  if (tree.err) return { err: tree.err };
  const u = unique(tree.all, cls); if (u.err) return u;
  const parent = tree.parentOf.get(u.el);
  const [s, e] = parent ? lineRange(parent.children, u.el) : [u.el.start, u.el.end];
  return { s, e, el: u.el };
}

export function moveGroupInSource(src, dragClasses, targetClass, position = "before") {
  if (!Array.isArray(dragClasses) || dragClasses.length === 0) return { ok: false, reason: "missing-class" };
  if (!targetClass) return { ok: false, reason: "missing-class" };
  if (!["before", "after"].includes(position)) return { ok: false, reason: "bad-position" };
  if (dragClasses.includes(targetClass)) return { ok: false, reason: "target-in-group" };

  const tree = load(src); if (tree.err) return { ok: false, reason: tree.err };
  const { all, parentOf } = tree;

  const dragEls = [];
  for (const cls of dragClasses) {
    const u = unique(all, cls); if (u.err) return { ok: false, reason: u.err };
    dragEls.push(u.el);
  }
  const t = unique(all, targetClass); if (t.err) return { ok: false, reason: t.err };
  const targetEl = t.el;

  // 全 dragEl が同一親であること（散らばりは Claude 経路）
  const parents = new Set(dragEls.map((e) => parentOf.get(e)));
  if (parents.size !== 1) return { ok: false, reason: "not-same-parent" };
  const dragParent = [...parents][0];
  if (!dragParent) return { ok: false, reason: "no-parent" };
  const targetParent = parentOf.get(targetEl); if (!targetParent) return { ok: false, reason: "no-parent" };

  // 非ネスト（target が group の祖先/子孫でない）
  for (const d of dragEls) {
    if (isAncestor(d, targetEl, parentOf) || isAncestor(targetEl, d, parentOf)) return { ok: false, reason: "nested" };
  }

  const dragSet = new Set(dragEls);
  // dragClasses の順（=選択順）に並べた移動要素列
  const orderedDrag = dragClasses.map((cls) => all.find((el) => classNameOf(el) === cls));

  // --- 同一親移動: 空白スロット保持で要素順だけ入替（moveInSource と同方式の複数版） ---
  if (dragParent === targetParent) {
    const children = dragParent.children;
    const elems = children.filter((c) => c.type === "JSXElement");
    const rest = elems.filter((e) => !dragSet.has(e));         // 移動要素を抜いた残り
    const tIdx = rest.indexOf(targetEl);
    rest.splice(position === "before" ? tIdx : tIdx + 1, 0, ...orderedDrag); // target 位置にまとめて挿入
    const firstStart = children[0].start, lastEnd = children[children.length - 1].end;
    let slot = 0, region = "";
    for (const c of children) {
      if (c.type === "JSXElement") { const e = rest[slot++]; region += src.slice(e.start, e.end); }
      else region += src.slice(c.start, c.end);
    }
    const out = src.slice(0, firstStart) + region + src.slice(lastEnd);
    return out === src ? { ok: true, changed: false, src } : { ok: true, changed: true, src: out };
  }

  // --- 別親 reparent: group をまとめて削除し target 位置へ選択順で挿入 ---
  const indent = indentBefore(targetParent.children, targetEl);
  const joined = orderedDrag.map((e) => src.slice(e.start, e.end)).join(indent);
  const insertText = position === "before" ? joined + indent : indent + joined;
  const insertPos = position === "before" ? targetEl.start : targetEl.end;
  // 各 dragEl の lineRange 削除 op（降順）＋挿入 op を集めて offset 降順適用
  const removeOps = orderedDrag.map((e) => { const [s, en] = lineRange(dragParent.children, e); return { s, e: en, text: "" }; });
  const orderedRemovals = [...removeOps].sort((a, b) => a.s - b.s);
  for (let i = 1; i < orderedRemovals.length; i++) {
    if (orderedRemovals[i].s < orderedRemovals[i - 1].e) return { ok: false, reason: "overlap" };
  }
  const ops = [...removeOps];
  ops.push({ s: insertPos, e: insertPos, text: insertText });
  ops.sort((a, b) => b.s - a.s);
  let out = src; for (const op of ops) out = out.slice(0, op.s) + op.text + out.slice(op.e);
  return { ok: true, changed: true, src: out };
}

// 後方互換（Phase C slice1 の呼び出し名）
export const reorderInSource = moveInSource;
