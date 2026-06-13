// Phase C: JSX 兄弟要素の決定的な並べ替え（Claude 不介在）。
//
// 方針: @babel/parser で TSX をパースし、各要素の正確なソース範囲(start/end)を得る。
// 編集は「要素テキストを元の“空白スロット”に入れ替える純粋な文字列操作」だけ。
//   - 同じ入力 → 必ず同じ出力（決定的）
//   - 兄弟以外の空白・他要素・整形は一切触らない（formatting 保持）
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

// AST を走査して全 JSXElement と「子要素→親コンテナ(JSXElement/JSXFragment)」の対応を作る。
function indexTree(ast) {
  const all = [];
  const parentOf = new Map();
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.type === "JSXElement") all.push(node);
    if (node.type === "JSXElement" || node.type === "JSXFragment") {
      for (const c of node.children || []) {
        if (c && c.type === "JSXElement") parentOf.set(c, node);
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

// JSXElement の静的 className 文字列リテラルを返す（式・テンプレートは null）。
function classNameOf(el) {
  const attrs = el.openingElement?.attributes || [];
  for (const a of attrs) {
    if (a.type === "JSXAttribute" && a.name?.name === "className") {
      if (a.value?.type === "StringLiteral") return a.value.value;
      // className={"..."} の単純ケースも拾う
      if (a.value?.type === "JSXExpressionContainer" && a.value.expression?.type === "StringLiteral") {
        return a.value.expression.value;
      }
      return null;
    }
  }
  return null;
}

/**
 * 純関数: src 内で className=dragClass の要素を、className=targetClass の要素の
 * before/after へ移動した新しい src を返す。
 * 失敗時は { ok:false, reason } を返す（src は変更しない）。
 */
export function reorderInSource(src, dragClass, targetClass, position = "before") {
  if (!dragClass || !targetClass) return { ok: false, reason: "missing-class" };
  if (dragClass === targetClass) return { ok: false, reason: "same-class" };
  if (!["before", "after"].includes(position)) return { ok: false, reason: "bad-position" };

  let ast;
  try { ast = parse(src); } catch (e) { return { ok: false, reason: "parse-error" }; }
  const { all, parentOf } = indexTree(ast);

  const drags = all.filter((el) => classNameOf(el) === dragClass);
  const targets = all.filter((el) => classNameOf(el) === targetClass);
  if (drags.length === 0 || targets.length === 0) return { ok: false, reason: "not-found" };
  if (drags.length > 1 || targets.length > 1) return { ok: false, reason: "ambiguous" };

  const dragEl = drags[0], targetEl = targets[0];
  const parent = parentOf.get(dragEl);
  if (!parent || parentOf.get(targetEl) !== parent) return { ok: false, reason: "not-siblings" };

  const children = parent.children;
  const elems = children.filter((c) => c.type === "JSXElement"); // ソース順の要素のみ
  // 新しい要素順を作る（dragEl を抜いて target の前/後へ挿入）
  const order = elems.filter((e) => e !== dragEl);
  const tIdx = order.indexOf(targetEl);
  if (tIdx === -1) return { ok: false, reason: "target-missing" };
  order.splice(position === "before" ? tIdx : tIdx + 1, 0, dragEl);

  // 子の範囲を、空白(JSXText 等)は据え置き・要素スロットだけ新順で再配置して再構築
  const firstStart = children[0].start;
  const lastEnd = children[children.length - 1].end;
  let slot = 0;
  let region = "";
  for (const c of children) {
    if (c.type === "JSXElement") {
      const e = order[slot++];
      region += src.slice(e.start, e.end);
    } else {
      region += src.slice(c.start, c.end);
    }
  }
  const out = src.slice(0, firstStart) + region + src.slice(lastEnd);
  if (out === src) return { ok: true, changed: false, src };
  return { ok: true, changed: true, src: out };
}
