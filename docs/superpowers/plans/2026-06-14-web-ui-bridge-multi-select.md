# web-ui-bridge 複数選択 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **本プロジェクト規約**: 実装は Codex(gpt-5.5 high) 委任が既定（`skill:codex-implement`）。Claude は各フェーズで設計確認＋レビュー(pr-review-toolkit / spec-validator)＋実機 chrome-devtools 検証を握る。各タスクは前タスクが緑（テスト＋実機）になってから次へ。

**Goal:** overlay で複数要素を修飾クリック選択し、1操作で「まとめてプロンプト／D&D移動／スタイル一括編集／複製・削除」を決定的に（できない時のみ Claude 経路へ）実行できるようにする。

**Architecture:** 単一 `selected` を選択配列 `selection[]` に拡張（単一選択は従来挙動を維持）。編集は daemon の**アトミック・バッチ endpoint**（1書込=1 undo）で適用。D&D group 移動は reorder.mjs に `moveGroupInSource` を新設し、全選択が同一親の時だけ決定的・別親混在は Claude 経路へ自動ルーティング。

**Tech Stack:** vanilla JS overlay（Shadow DOM）/ Node http daemon / `@babel/parser`（AST）/ `node --test`（reorder.test.mjs）/ chrome-devtools MCP（実機検証）。

**設計 SSOT:** `docs/superpowers/specs/2026-06-14-web-ui-bridge-multi-select-design.md`

---

## File Structure

| ファイル | 役割 | 本計画での変更 |
|---|---|---|
| `apps/web-ui-bridge/daemon/reorder.mjs` | AST 構造編集（純コード・決定的） | `moveGroupInSource` 追加。既存の単数関数・ヘルパは不変 |
| `apps/web-ui-bridge/daemon/reorder.test.mjs` | reorder の単体テスト | group 移動の正常/異常テスト追加（既存17は不変） |
| `apps/web-ui-bridge/daemon/server.mjs` | http endpoint・className 特定・recordedWrite | `/apply-style-batch` `/structure-batch` `/reorder-group` 追加・`/enqueue` payloads 拡張 |
| `apps/web-ui-bridge/daemon/apply.mjs`（新規 or server 内） | className リテラル特定→範囲置換の共通関数 | バッチ用に「複数 edit を1書込で適用」する純関数を切り出し（単体テスト可能に） |
| `apps/web-ui-bridge/overlay/overlay.js` | 選択・UI・daemon 配線 | `selection[]` 化・修飾クリック・複数ハイライト・バッチ配線・mixed 表示・group D&D・有効/無効判定 |
| `apps/web-ui-bridge/STUDIO-PARITY.md` / `HANDOFF.md` | ドキュメント | 複数選択の章追記 |
| memory `project_web_ui_bridge.md` / `MEMORY.md` | recall | 完了追記 |

各タスクは独立してテスト可能。daemon 側（純関数＋endpoint）を先に固め、overlay は後段で配線する（daemon が先に緑だと overlay 配線の検証が容易）。

---

## Task 1: バッチ適用の純関数を切り出す（daemon・style/structure の土台）

**狙い:** 「className リテラルで一意特定→ソース範囲を集めて1回で適用」を純関数化し、部分 skip と range 降順適用（範囲ズレ防止）を単体テストで固める。overlay 配線前にここを緑にする。

**Files:**
- Create: `apps/web-ui-bridge/daemon/apply.mjs`
- Create: `apps/web-ui-bridge/daemon/apply.test.mjs`
- Reference: `apps/web-ui-bridge/daemon/reorder.mjs`（`classNameOf`/`unique`/`lineRange`/`load` を import 再利用）

- [ ] **Step 1: reorder.mjs の内部ヘルパを export する（最小変更）**

`reorder.mjs` の `classNameOf` `lineRange` `indentBefore` を `export function` に変更（`load`/`indexTree` は内部のままで良いが、`apply.mjs` から要素特定するため `findAllByClassName(src, cls)` を1つ追加 export）。

```js
// reorder.mjs 末尾に追加
export function findElement(src, cls) {        // className でただ1つ特定（apply 用）
  const tree = load(src);
  if (tree.err) return { err: tree.err };
  return unique(tree.all, cls);                // { el } | { err: "not-found"|"ambiguous" }
}
export function elementLineRange(src, cls) {    // 行ごと範囲（structure 用）
  const tree = load(src);
  if (tree.err) return { err: tree.err };
  const u = unique(tree.all, cls); if (u.err) return u;
  const parent = tree.parentOf.get(u.el);
  const [s, e] = parent ? lineRange(parent.children, u.el) : [u.el.start, u.el.end];
  return { s, e, el: u.el };
}
```

- [ ] **Step 2: apply.test.mjs に失敗テストを書く（className 置換バッチ）**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyStyleBatch } from "./apply.mjs";

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
```

- [ ] **Step 3: テスト失敗を確認**

Run: `cd apps/web-ui-bridge/daemon && node --test apply.test.mjs`
Expected: FAIL（`applyStyleBatch` 未定義）

- [ ] **Step 4: apply.mjs を実装**

className リテラルの**全出現を文字列で探す**のではなく、AST の要素範囲 + className 属性値範囲を使う。シンプル化のため「className 文字列リテラルの値部分」を AST で特定し置換する。複数 edit は range を集め**降順 splice**（前方編集が後方 offset をズラさない）。

```js
import babelParser from "@babel/parser";

function parse(src){ return babelParser.parse(src,{sourceType:"module",plugins:["typescript","jsx"],errorRecovery:true}); }

// className 属性値(StringLiteral)の {start,end,value} を全要素ぶん集める
function classNameLiterals(ast){
  const hits=[]; const SKIP=new Set(["loc","start","end","range","leadingComments","trailingComments","innerComments","extra","tokens","comments"]);
  const walk=(n)=>{ if(!n||typeof n!=="object")return; if(Array.isArray(n))return n.forEach(walk);
    if(n.type==="JSXAttribute"&&n.name?.name==="className"){
      const v=n.value;
      if(v?.type==="StringLiteral") hits.push({start:v.start+1,end:v.end-1,value:v.value}); // +/-1 = quote の内側
      else if(v?.type==="JSXExpressionContainer"&&v.expression?.type==="StringLiteral") hits.push({start:v.expression.start+1,end:v.expression.end-1,value:v.expression.value});
    }
    for(const k in n){ if(SKIP.has(k))continue; const c=n[k]; if(c&&typeof c==="object")walk(c); } };
  walk(ast.program); return hits;
}

// edits: [{oldClassName,newClassName}]. 戻り: {ok,changed,applied,skipped:[{oldClassName,reason}],src}
export function applyStyleBatch(src, edits){
  let ast; try{ ast=parse(src);}catch{ return {ok:false,reason:"parse-error"}; }
  const lits=classNameLiterals(ast);
  const ranges=[]; const skipped=[];
  for(const e of edits){
    if(e.oldClassName===e.newClassName) continue; // no-op
    const m=lits.filter(l=>l.value===e.oldClassName);
    if(m.length===0){ skipped.push({oldClassName:e.oldClassName,reason:"not-found"}); continue; }
    if(m.length>1){ skipped.push({oldClassName:e.oldClassName,reason:"ambiguous"}); continue; }
    ranges.push({s:m[0].start,e:m[0].end,text:e.newClassName});
  }
  if(ranges.length===0) return {ok:true,changed:false,applied:0,skipped,src};
  // 重なり防止（同一 className を複数 edit が指す等）: 降順適用前に overlap 検出
  ranges.sort((a,b)=>b.s-a.s);
  for(let i=1;i<ranges.length;i++){ if(ranges[i].e>ranges[i-1].s) return {ok:false,reason:"overlap"}; }
  let out=src; for(const r of ranges) out=out.slice(0,r.s)+r.text+out.slice(r.e);
  return {ok:true,changed:true,applied:ranges.length,skipped,src:out};
}

// targets: [className...]. kind: "delete"|"duplicate". 1書込で全 target に適用。
export function structureBatch(src, kind, targets){
  let ast; try{ ast=parse(src);}catch{ return {ok:false,reason:"parse-error"}; }
  // reorder.mjs の elementLineRange / duplicate ロジックを使うため、ここでは AST を内部再利用
  // （実装者注: elementLineRange を import し、各 target の {s,e,el,indent} を集め降順適用）
  return structureBatchImpl(src, kind, targets); // 下の Step 6 で具体化
}
```

- [ ] **Step 5: apply.test.mjs（style 部分）を緑化**

Run: `cd apps/web-ui-bridge/daemon && node --test apply.test.mjs`
Expected: PASS（3件）

- [ ] **Step 6: structureBatch の失敗テスト→実装→緑化**

テスト（apply.test.mjs に追記）:

```js
import { structureBatch } from "./apply.mjs";
const S2=`export default function P(){return(
  <ul className="list">
    <li className="i1">1</li>
    <li className="i2">2</li>
    <li className="i3">3</li>
  </ul>);}`;

test("structureBatch delete: 複数要素を1回で削除・範囲ズレ無し", () => {
  const r = structureBatch(S2, "delete", ["i1","i3"]);
  assert.equal(r.ok, true);
  assert.doesNotMatch(r.src, /className="i1"/);
  assert.doesNotMatch(r.src, /className="i3"/);
  assert.match(r.src, /className="i2"/);
  assert.equal(parseOk(r.src), true); // 再 parse 可能
});
test("structureBatch duplicate: 各要素を直後に複製", () => {
  const r = structureBatch(S2, "duplicate", ["i2"]);
  assert.equal((r.src.match(/className="i2"/g)||[]).length, 2);
});
test("structureBatch: 特定不可 target は skip", () => {
  const r = structureBatch(S2, "delete", ["i1","nope"]);
  assert.equal(r.skipped.length, 1);
  assert.doesNotMatch(r.src, /className="i1"/);
});
// helper
function parseOk(s){ try{ require("@babel/parser").parse(s,{sourceType:"module",plugins:["typescript","jsx"]}); return true;}catch{ return false;} }
```

実装方針（`structureBatchImpl`）: 各 target を `elementLineRange(src, cls)` で `{s,e}` 特定（duplicate は要素範囲＋indent も）。**全 target の編集 op を集め offset 降順で適用**。delete=範囲を空文字へ、duplicate=`el.end` 位置に `indent+elemText` 挿入。特定不可は `skipped[]`。1書込=呼び出し側 server で recordedWrite 1回。

Run: `cd apps/web-ui-bridge/daemon && node --test apply.test.mjs`
Expected: PASS（全6件）

- [ ] **Step 7: コミット**

```bash
git add apps/web-ui-bridge/daemon/apply.mjs apps/web-ui-bridge/daemon/apply.test.mjs apps/web-ui-bridge/daemon/reorder.mjs
git commit -m "feat(web-ui-bridge): バッチ適用の純関数 applyStyleBatch/structureBatch + 単体テスト"
```

---

## Task 2: reorder.mjs に moveGroupInSource を追加（D&D group 移動の核）

**狙い:** N 要素を**選択順を保って一括移動**。naive ループ不可（範囲ズレ）なのでグループ専用関数。全選択が同一親の時のみ決定的、別親混在は `not-same-parent` で拒否（呼び出し側が Claude 経路へ）。

**Files:**
- Modify: `apps/web-ui-bridge/daemon/reorder.mjs`
- Modify: `apps/web-ui-bridge/daemon/reorder.test.mjs`（既存17は不変・追記のみ）

- [ ] **Step 1: 失敗テストを追記**

```js
const GRP = `export default function P(){return(
  <div className="wrap">
    <section className="x1">1</section>
    <section className="x2">2</section>
    <section className="x3">3</section>
    <section className="x4">4</section>
  </div>);}`;

test("moveGroupInSource: 同一親で x1,x3 を x4 の before へ・選択順保持", () => {
  const r = moveGroupInSource(GRP, ["x1","x3"], "x4", "before");
  assert.equal(r.ok, true); assert.equal(r.changed, true);
  // 期待順: x2, x1, x3, x4
  const order = [...r.src.matchAll(/className="(x\d)"/g)].map(m=>m[1]);
  assert.deepEqual(order, ["x2","x1","x3","x4"]);
  assert.equal(parseOk(r.src), true);
});
test("moveGroupInSource: 別親混在は not-same-parent で拒否", () => {
  const MIX = `export default function P(){return(<main>
    <div className="pa"><span className="c1">a</span></div>
    <div className="pb"><span className="c2">b</span></div>
  </main>);}`;
  const r = moveGroupInSource(MIX, ["c1","c2"], "pb", "after");
  assert.equal(r.ok, false); assert.equal(r.reason, "not-same-parent");
});
test("moveGroupInSource: target が選択内なら target-in-group", () => {
  const r = moveGroupInSource(GRP, ["x1","x2"], "x1", "before");
  assert.equal(r.ok, false); assert.equal(r.reason, "target-in-group");
});
test("moveGroupInSource: 特定不可は理由付き失敗", () => {
  const r = moveGroupInSource(GRP, ["x1","zzz"], "x4", "before");
  assert.equal(r.ok, false); assert.equal(r.reason, "not-found");
});
```

（`parseOk` helper を reorder.test.mjs にも用意。既存ファイルに無ければ追加。）

- [ ] **Step 2: テスト失敗を確認**

Run: `cd apps/web-ui-bridge/daemon && node --test reorder.test.mjs`
Expected: 新規4件が FAIL（`moveGroupInSource` 未定義）、既存17は PASS

- [ ] **Step 3: moveGroupInSource を実装**

```js
export function moveGroupInSource(src, dragClasses, targetClass, position = "before") {
  if (!Array.isArray(dragClasses) || dragClasses.length === 0) return { ok:false, reason:"missing-class" };
  if (!targetClass) return { ok:false, reason:"missing-class" };
  if (!["before","after"].includes(position)) return { ok:false, reason:"bad-position" };
  if (dragClasses.includes(targetClass)) return { ok:false, reason:"target-in-group" };

  const tree = load(src); if (tree.err) return { ok:false, reason: tree.err };
  const { all, parentOf } = tree;

  const dragEls = [];
  for (const cls of dragClasses) { const u = unique(all, cls); if (u.err) return { ok:false, reason:u.err }; dragEls.push(u.el); }
  const t = unique(all, targetClass); if (t.err) return { ok:false, reason:t.err };
  const targetEl = t.el;

  // 全 dragEl が同一親であること（散らばりは Claude 経路）
  const parents = new Set(dragEls.map(e => parentOf.get(e)));
  if (parents.size !== 1) return { ok:false, reason:"not-same-parent" };
  const dragParent = [...parents][0];
  if (!dragParent) return { ok:false, reason:"no-parent" };
  const targetParent = parentOf.get(targetEl); if (!targetParent) return { ok:false, reason:"no-parent" };

  // 非ネスト（target が group の祖先/子孫でない）
  for (const d of dragEls) if (isAncestor(d, targetEl, parentOf) || isAncestor(targetEl, d, parentOf)) return { ok:false, reason:"nested" };

  const dragSet = new Set(dragEls);
  // dragClasses の順（=選択順）に並べた移動要素列
  const orderedDrag = dragClasses.map(cls => all.find(el => classNameOf(el) === cls));

  // --- 同一親移動: 空白スロット保持で要素順だけ入替（moveInSource と同方式の複数版） ---
  if (dragParent === targetParent) {
    const children = dragParent.children;
    const elems = children.filter(c => c.type === "JSXElement");
    const rest = elems.filter(e => !dragSet.has(e));         // 移動要素を抜いた残り
    const tIdx = rest.indexOf(targetEl);
    rest.splice(position === "before" ? tIdx : tIdx + 1, 0, ...orderedDrag); // target 位置にまとめて挿入
    const firstStart = children[0].start, lastEnd = children[children.length-1].end;
    let slot = 0, region = "";
    for (const c of children) {
      if (c.type === "JSXElement") { const e = rest[slot++]; region += src.slice(e.start, e.end); }
      else region += src.slice(c.start, c.end);
    }
    const out = src.slice(0, firstStart) + region + src.slice(lastEnd);
    return out === src ? { ok:true, changed:false, src } : { ok:true, changed:true, src: out };
  }

  // --- 別親 reparent: group をまとめて削除し target 位置へ選択順で挿入 ---
  const indent = indentBefore(targetParent.children, targetEl);
  const joined = orderedDrag.map(e => src.slice(e.start, e.end)).join(indent);
  const insertText = position === "before" ? joined + indent : indent + joined;
  const insertPos = position === "before" ? targetEl.start : targetEl.end;
  // 各 dragEl の lineRange 削除 op（降順）＋挿入 op を集めて offset 降順適用
  const ops = orderedDrag.map(e => { const [s,en] = lineRange(dragParent.children, e); return { s, e: en, text: "" }; });
  ops.push({ s: insertPos, e: insertPos, text: insertText });
  ops.sort((a,b) => b.s - a.s);
  let out = src; for (const op of ops) out = out.slice(0, op.s) + op.text + out.slice(op.e);
  return { ok:true, changed:true, src: out };
}
```

（`classNameOf` を reorder.mjs 内で参照可能に。既に module 内関数なので OK。`isAncestor`/`unique`/`lineRange`/`indentBefore`/`load` は既存を再利用。）

- [ ] **Step 4: 全テスト緑化**

Run: `cd apps/web-ui-bridge/daemon && node --test reorder.test.mjs`
Expected: PASS（既存17＋新規4 = 21件）

- [ ] **Step 5: コミット**

```bash
git add apps/web-ui-bridge/daemon/reorder.mjs apps/web-ui-bridge/daemon/reorder.test.mjs
git commit -m "feat(web-ui-bridge): reorder に moveGroupInSource(N要素一括移動・同一親のみ決定的) 追加"
```

---

## Task 3: daemon endpoint 追加（バッチ＝1書込=1 undo）

**狙い:** Task1/2 の純関数を http に露出。**recordedWrite を1回だけ**呼んで undo を1操作に保つ。`/enqueue` を payloads 配列対応に拡張。

**Files:**
- Modify: `apps/web-ui-bridge/daemon/server.mjs`
- Reference: 既存 `/apply-style` `/reorder` `/delete` の route→ファイル解決・`recordedWrite`・token/Origin ガード（同じ作法を踏襲）

- [ ] **Step 1: `/apply-style-batch` を追加**

req `{ route, edits:[{oldClassName,newClassName}] }`。既存 `/apply-style` と同じく route からファイル特定 → ファイル内容に `applyStyleBatch(content, edits)` → `changed` なら `recordedWrite(file, out, ラベル "スタイル一括(N)")`。res `{ ok, file, applied, skipped }`。全 skip は `{ ok:true, changed:false }`。

```js
// server.mjs の routing に追加（既存 handler の作法に合わせる）
if (url.pathname === "/apply-style-batch" && req.method === "POST") {
  const { route, edits } = body;
  const file = resolveRouteFile(route);                 // 既存の解決関数を流用
  if (!file) return json(res, 200, { ok:false, reason:"not-found" });
  const src = fs.readFileSync(file, "utf8");
  const r = applyStyleBatch(src, edits || []);
  if (!r.ok) return json(res, 200, r);
  if (!r.changed) return json(res, 200, { ok:true, changed:false, applied:0, skipped:r.skipped });
  recordedWrite(file, r.src, `スタイル一括(${r.applied})`);
  return json(res, 200, { ok:true, file: rel(file), applied:r.applied, skipped:r.skipped });
}
```

- [ ] **Step 2: `/structure-batch` を追加**

req `{ route, kind:"delete"|"duplicate", targets:[className] }` → `structureBatch` → recordedWrite 1回（ラベル `削除一括(N)`/`複製一括(N)`）。res `{ ok, file, skipped }`。

- [ ] **Step 3: `/reorder-group` を追加**

req `{ route, dragClasses:[], targetClass, position }` → `moveGroupInSource` → recordedWrite 1回（`グループ移動(N)`）。`ok:false` の reason（`not-same-parent`/`nested`/`ambiguous`/`target-in-group`/`not-found`）はそのまま返す。

- [ ] **Step 4: `/enqueue` を payloads 対応に**

既存は items[] の各要素が単一 payload + prompt。複数選択時は `payloads:[...]` を持つ item を許可。後方互換のため単一 payload もそのまま受ける。daemon は単に queue 行へ JSON 追記するだけなので、**payloads をそのまま透過**（スキーマ拡張のみ）。

- [ ] **Step 5: 手動スモーク（tsx/curl で endpoint 動作確認）**

daemon を起動した状態で、terra の実 page に対し curl で各 endpoint を叩き `ok`/`applied`/`skipped` 形状を確認。1回ずつ叩いて undo で1操作戻ることを確認（`/undo` 1回で batch 全体が戻る）。

Run（例）:
```bash
curl -s -XPOST localhost:7331/apply-style-batch -H "X-Bridge-Token: $(cat <target>/.web-ui-bridge-token)" -H "Origin: http://localhost:3001" -H 'Content-Type: application/json' -d '{"route":"/","edits":[...]}'
```
Expected: `{"ok":true,"applied":N,...}`、その後 `/undo` 1回で原状復帰。

- [ ] **Step 6: コミット**

```bash
git add apps/web-ui-bridge/daemon/server.mjs
git commit -m "feat(web-ui-bridge): batch endpoints(/apply-style-batch /structure-batch /reorder-group) + enqueue payloads 拡張・各1書込=1undo"
```

---

## Task 4: overlay 状態モデル＆修飾クリック選択（単一選択は回帰なし）

**狙い:** `selected/selectedEl` 単一 → `selection[]` 配列化。素クリック=置換、⌘/Shift+クリック=トグル。複数ハイライト・ヘッダ「N個選択中」。**単一選択時の既存挙動（全コントロール）は完全維持**。

**Files:**
- Modify: `apps/web-ui-bridge/overlay/overlay.js`

- [ ] **Step 1: 状態モデルを配列化**

`apps/web-ui-bridge/overlay/overlay.js:25-27` 付近:
```js
// 旧: let selected = null, selectedEl = null;
let selection = [];     // [{ el, payload, sourceClass, liveClass }]（選択順）
let primaryIdx = -1;    // 値表示の基準（最後にクリックした要素）
// 互換アクセサ（単一前提の既存コードを温存）
const cur = () => (primaryIdx >= 0 ? selection[primaryIdx] : null);
// 既存コードの `selected` 参照は cur()?.payload, `selectedEl` は cur()?.el に置換
```
既存の `selected`/`selectedEl` 参照箇所（grep 一覧: collect 結果代入・commitStyle・doStruct・closePanel・applyLive・spacing 各所）を `cur()` 経由に機械置換。**1ファイル試験→diff→全適用**（[[feedback_bash_bulk_replace_one_file_first]]）。

- [ ] **Step 2: クリックハンドラを修飾対応に**

`overlay.js:791` 付近のクリック選択を分岐:
```js
function selectFromClick(el, e) {
  const additive = e.metaKey || e.shiftKey;
  const idx = selection.findIndex(s => s.el === el);
  if (additive) {
    if (idx >= 0) { selection.splice(idx, 1); primaryIdx = selection.length - 1; }   // トグル除去
    else { selection.push(makeSel(el)); primaryIdx = selection.length - 1; }          // 追加
  } else {
    selection = [makeSel(el)]; primaryIdx = 0;                                         // 置換
  }
  resetEditState();                 // state="", locks=null, mixed 再計算
  highlightSelection(); renderBody();
}
function makeSel(el){ const p = collect(el); return { el, payload:p, sourceClass:p.classes, liveClass:p.classes }; }
```

- [ ] **Step 3: 複数ハイライト**

`highlightSelected()` を `highlightSelection()` に拡張。primary=濃い青枠、その他=半透明青枠。要素ごとに `.hl` を複製 or 複数 box を描画。既存単一ハイライト CSS（`.hl`）を流用し、複数時は `.hl2` を要素数ぶん生成。

- [ ] **Step 4: インスペクタヘッダ**

`selection.length >= 2` のとき「N個選択中」＋各チップ（タグ名・×で個別解除）。`Esc` で全解除（`selection=[]; primaryIdx=-1; closePanel 相当`）。1個なら従来のタグ/class 表示。

- [ ] **Step 5: 実機検証（chrome-devtools・必須）**

terra で: 素クリック=単一選択（従来通り全コントロール表示）→ ⌘+クリックで2個目追加（両方ハイライト・ヘッダ「2個選択中」）→ 既選択を⌘クリックで解除 → Esc 全解除。スクショ目視。**単一選択の既存編集（spacing/色/サイズ等）が従来通り効くこと**を1つ実操作で確認（回帰なし）。

- [ ] **Step 6: コミット**

```bash
git add apps/web-ui-bridge/overlay/overlay.js
git commit -m "feat(web-ui-bridge): 選択を配列化+修飾クリック選択+複数ハイライト/ヘッダ(単一は回帰なし)"
```

---

## Task 5: まとめてプロンプト＋まとめて複製/削除（最短で価値が出る2アクション）

**狙い:** Claude 経路（常に可）と structure-batch を overlay に配線。

**Files:**
- Modify: `apps/web-ui-bridge/overlay/overlay.js`
- Reference: `send()`（overlay.js:708）・`doStruct()`（overlay.js:423）

- [ ] **Step 1: まとめてプロンプト**

複数選択時、`send()` は1 item に payloads をまとめて送る:
```js
const items = [{ ...cur().payload, payloads: selection.map(s => s.payload), prompt }];
await post("/enqueue", { items });
```
add ボタン（overlay.js:700）も `pending.push({ payloads: selection.map(s=>s.payload), prompt })` に対応。pending 表示は「N要素 + プロンプト」。

- [ ] **Step 2: まとめて複製/削除**

複数選択時の複製/削除ボタンは `/structure-batch`:
```js
async function doStructBatch(kind){
  const targets = selection.map(s => s.sourceClass).filter(Boolean);
  if(targets.length < selection.length) toast("一部は class 無→Claude経路", "warn");
  const j = await post("/structure-batch", { route: cur().payload.route, kind, targets });
  if(j.ok){ toast(`${kind==="delete"?"削除":"複製"}一括 → ${j.file}（skip ${j.skipped?.length||0}）`); if(kind==="delete") closePanel(); }
  else toast(`失敗: ${j.reason}`, "warn");
}
```
単一選択時は従来の `/delete` `/duplicate` のまま（分岐）。

- [ ] **Step 3: 実機検証（必須）**

terra で 2要素選択→まとめてプロンプト送信（queue に payloads 入りで1件）→ 2要素選択→まとめて複製（両方複製・**undo 1回で両方戻る**）→まとめて削除（両方消える・undo 1回で復帰）。スクショ＋queue ファイル目視。

- [ ] **Step 4: コミット**

```bash
git commit -am "feat(web-ui-bridge): まとめてプロンプト(payloads)+まとめて複製/削除(structure-batch・undo1回)"
```

---

## Task 6: まとめてスタイル一括編集＋mixed 表示（絶対一律/相対増減ハイブリッド）

**狙い:** 各スタイルコントロールを「選択横断」に。不一致は「—」、絶対入力=全要素一律、±ステッパ=各要素の現値から相対増減。適用は `/apply-style-batch`（1 undo）。

**Files:**
- Modify: `apps/web-ui-bridge/overlay/overlay.js`
- Reference: `readUtil/readSpacingPx/setUtil/setSpacingValue/applyLive/commitStyle` 等

- [ ] **Step 1: 横断読み `readAcross`**

```js
// prop の各要素現値を集め、全一致なら値・不一致なら {mixed:true}
function readAcross(readFn){
  const vals = selection.map(s => readFn(s));   // readFn は要素 s を受け値を返すよう薄くラップ
  const uniq = [...new Set(vals.map(v => JSON.stringify(v)))];
  return uniq.length === 1 ? { mixed:false, value: vals[0] } : { mixed:true };
}
```
各コントロールの value 表示は単一なら現行、複数なら `readAcross` → mixed は空欄＋placeholder「—」。

- [ ] **Step 2: 絶対適用（一律）**

数値セル確定 / picker 確定 / enum 選択時、複数選択なら**全要素について新 className を計算**し edits を組んで `/apply-style-batch`:
```js
async function applyAbsoluteBatch(computeNewClass){      // computeNewClass(sel) → newClassName
  const edits = selection.map(s => ({ oldClassName: s.sourceClass, newClassName: computeNewClass(s) }))
                         .filter(e => e.newClassName !== e.oldClassName);
  const j = await post("/apply-style-batch", { route: cur().payload.route, edits });
  if(j.ok){ // sourceClass/liveClass 同期 + ハイライト維持
    selection.forEach((s,i)=>{ const e=edits.find(x=>x.oldClassName===s.sourceClass); if(e){ s.sourceClass=e.newClassName; s.liveClass=e.newClassName; if(s.el?.isConnected) s.el.setAttribute("class", e.newClassName); }});
    toast(`一括反映(${j.applied}) skip ${j.skipped?.length||0}`); highlightSelection();
  } else toast(`失敗: ${j.reason}`, "warn");
}
```
`computeNewClass` は既存の単一編集ロジック（setUtil/setSpacingValue 等）を「指定要素の className に対して」適用する純関数に薄く一般化（現状 cur() 前提のものを引数化）。

- [ ] **Step 3: 相対増減（± ステッパ）**

spacing/サイズの ± は各要素の**現値 px から ±step**して新 className を算出 → 同じく `/apply-style-batch`。mixed を保ったまま全体が動く。

- [ ] **Step 4: bp/state 連動**

`PFX()=bp+state` は UI グローバルなので、batch でも各要素に同じ bp/state prefix を適用（既存ヘルパをそのまま要素別に呼ぶ）。

- [ ] **Step 5: 有効/無効判定（R5）**

選択変化時 `allSameParent(selection)` を計算（overlay 側は DOM 親で近似 or daemon 問い合わせは不要＝DOM の `parentElement` 比較で十分）。false なら ⇅（決定移動）をグレーアウト＋ツールチップ「親が異なるため決定移動不可。『まとめて Claude 移動』を使用」。class 欠落要素があればスタイル一括・複製削除に注記「一部 Claude 経路」。

- [ ] **Step 6: 実機検証（必須）**

terra で値の異なる2要素を選択→ spacing が「—」表示→ 絶対値入力で両方が同値に→ ± で両方が各現値から相対増減→ 色/サイズも一括→ **各操作 undo 1回で復帰**。別親2要素選択時に⇅がグレーアウト＋ツールチップ。スクショ目視。

- [ ] **Step 7: コミット**

```bash
git commit -am "feat(web-ui-bridge): スタイル一括編集(mixed表示・絶対一律/相対増減)+有効無効判定"
```

---

## Task 7: D&D group 移動の overlay 配線（同一親=決定的／別親=Claude 経路）

**狙い:** 複数選択を掴んでドラッグ→ドロップ。同一親なら `/reorder-group`、別親混在なら「まとめて Claude 移動」プロンプトを enqueue。

**Files:**
- Modify: `apps/web-ui-bridge/overlay/overlay.js`
- Reference: `doReorder()`（overlay.js:746）・D&D ドラッグ機構（mousedown/updateDrop/オートスクロール）

- [ ] **Step 1: グループドラッグ**

⇅モードで選択内のどれかを掴んだら、ドラッグ対象=`selection` 全体。ドロップ時:
```js
async function doReorderGroup(targetEl, pos){
  const dragClasses = selection.map(s => s.sourceClass);
  const targetClass = targetEl.getAttribute("class");
  if (dragClasses.some(c=>!c) || !targetClass) return claudeMoveFallback(targetEl, pos); // class 無→Claude
  if (!allSameParent(selection)) return claudeMoveFallback(targetEl, pos);                // 別親→Claude
  const j = await post("/reorder-group", { route: location.pathname, dragClasses, targetClass, position: pos });
  if(j.ok && !j.noop) toast(`グループ移動 → ${j.file}`);
  else if(j.reason==="not-same-parent") return claudeMoveFallback(targetEl, pos);
  else if(j.ok) toast("変更なし");
  else toast(`失敗: ${j.reason}`, "warn");
}
```

- [ ] **Step 2: Claude 経路フォールバック**

```js
function claudeMoveFallback(targetEl, pos){
  const tinfo = collect(targetEl);
  pending.push({ payloads: selection.map(s=>s.payload),
    prompt: `次の${selection.length}要素を、${tinfo.text?`「${tinfo.text}」`:targetEl.tagName}の${pos==="before"?"前":"後"}へ、選択順を保ってまとめて移動してください。`,
    moveTarget: tinfo });
  toast("別親のため Claude 経路にまとめて移動を積みました", "warn"); renderBody();
}
```

- [ ] **Step 3: 単一選択時は従来 `/reorder`**

`selection.length === 1` のときは既存 `doReorder` のまま（分岐）。

- [ ] **Step 4: 実機検証（必須・D&D は実ドラッグ）**

terra で: 同一親の隣接2要素を選択→ドラッグして別兄弟の前後へドロップ→順序が正しく変わる（**undo 1回で復帰**）。別親の2要素を選択→ドラッグ→Claude 経路に積まれる（toast＋pending 表示）。実ドラッグ＋オートスクロール＋スクショ目視（[[feedback_browser_test_all_user_ops]]）。

- [ ] **Step 5: コミット**

```bash
git commit -am "feat(web-ui-bridge): D&D group移動(同一親=reorder-group決定的/別親=Claude経路)"
```

---

## Task 8: ドキュメント＆検証総仕上げ

**Files:**
- Modify: `apps/web-ui-bridge/STUDIO-PARITY.md` `apps/web-ui-bridge/HANDOFF.md`
- Modify: memory `project_web_ui_bridge.md` / `MEMORY.md`（main repo 側 memory ディレクトリ）

- [ ] **Step 1: reorder.test 全緑＋apply.test 全緑を最終確認**

Run: `cd apps/web-ui-bridge/daemon && node --test`
Expected: reorder 21件＋apply 6件 全 PASS

- [ ] **Step 2: 実機 E2E 総点検（pr-review-toolkit 依頼前）**

選択（修飾クリック追加/解除/Esc）→まとめてプロンプト→複製/削除→スタイル一括(mixed/絶対/相対)→同一親 D&D→別親 Claude 経路、**各操作後 undo 1回で完全復帰**。スクショ。

- [ ] **Step 3: pr-review-toolkit:code-reviewer + silent-failure-hunter でレビュー**

差分をレビュー（特に batch の部分 skip がサイレント脱落になっていないか・undo 原子性・mixed の取り違え・group 移動の範囲ズレ）。指摘は improvement-log でなくその場で修正（[[feedback_known_bug_no_defer]]）。

- [ ] **Step 4: HANDOFF.md / STUDIO-PARITY.md に複数選択章を追記**

「複数選択（修飾クリック・4アクション・同一親決定的/別親 Claude 経路・1操作=1undo）」を記載。残課題（ルート跨ぎ選択・入れ子並べ替えは非スコープ）を明記。

- [ ] **Step 5: memory 追記**

`project_web_ui_bridge.md` に複数選択完了を1段落追記、`MEMORY.md` の該当行を更新。

- [ ] **Step 6: finishing-a-development-branch で PR/merge 判断**

`superpowers:finishing-a-development-branch` で PR 作成 or merge を決定。

---

## Self-Review

**1. Spec coverage（設計書 §6 ルーティング表との対応）:**
- ③スタイル一括 → Task 6 ✓ / ④複製削除 → Task 5 ✓ / ②D&D 移動 → Task 2(関数)+Task 7(配線) ✓ / ①まとめてプロンプト → Task 5 ✓
- バッチ endpoint(§7) → Task 3 ✓ / moveGroupInSource(§8) → Task 2 ✓ / mixed 表示(§9 R4) → Task 6 ✓ / 有効無効(§R5) → Task 6 Step5 ✓ / 修飾クリック(R3) → Task 4 ✓
- テスト計画(§10) → Task1/2 単体＋各 Task の実機検証 ✓

**2. Placeholder スキャン:** Step 6 の `structureBatchImpl` は「elementLineRange を import し降順適用」と方針＋契約を明示済（純関数・テストで縛る）。UI rendering は behavioral-precise（Codex 実装）。

**3. 型整合:** endpoint 名（`/apply-style-batch` `/structure-batch` `/reorder-group`）・関数名（`applyStyleBatch`/`structureBatch`/`moveGroupInSource`/`readAcross`/`allSameParent`/`claudeMoveFallback`）・戻り形（`{ok,changed,applied,skipped,reason,src}`）を全タスクで統一。`payloads` キーは enqueue/skill で一致。

**実装規約:** 各 Task は Codex 委任（`skill:codex-implement`）で実装し、daemon 側は `node --test` 緑、overlay 側は chrome-devtools 実機＋スクショで検証してから次タスクへ。決定的編集の原則（Claude 不介在・同入力同出力・特定不可は安全側で Claude 経路）を全アクションで維持。
