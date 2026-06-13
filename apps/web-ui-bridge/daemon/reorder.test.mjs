// 構造編集（move/delete/duplicate）の決定性・整形保持・ガードを検証。
import { moveInSource, deleteInSource, duplicateInSource } from "./reorder.mjs";

let pass = 0, fail = 0;
const t = (cond, label) => { if (cond) { pass++; console.log("✅", label); } else { fail++; console.log("❌", label); } };
const classes = (s) => [...s.matchAll(/className="([\w-]+)"/g)].map((m) => m[1]);

const SRC = `export default function Page() {
  return (
    <div className="wrap">
      <p className="eyebrow">Hayama</p>
      <h1 className="title">ゆっくり</h1>
      <p className="lead">一色海岸</p>
    </div>
  );
}
`;

// --- move: 同じ親の並べ替え ---
const m1 = moveInSource(SRC, "lead", "title", "before");
t(m1.ok && m1.changed, "move: lead before title (ok)");
t(JSON.stringify(classes(m1.src).filter((c) => c !== "wrap")) === JSON.stringify(["eyebrow", "lead", "title"]), "順序 eyebrow,lead,title : " + classes(m1.src));
t(m1.src.split("\n").length === SRC.split("\n").length, "整形保持(行数不変)");
t(m1.src === moveInSource(SRC, "lead", "title", "before").src, "決定的(バイト同一)");

// --- move: 別親への reparent ---
const NEST = `export default function P(){return (
    <main className="m">
      <section className="a">
        <p className="x">X</p>
      </section>
      <section className="b">
        <p className="y">Y</p>
      </section>
    </main>
);}
`;
const mv = moveInSource(NEST, "x", "y", "after"); // x を b の中の y の後ろへ
t(mv.ok && mv.changed, "reparent: x → after y (ok)");
const aBlock = mv.src.slice(mv.src.indexOf('className="a"'), mv.src.indexOf('className="b"'));
const bBlock = mv.src.slice(mv.src.indexOf('className="b"'));
t(!aBlock.includes('className="x"'), "reparent: a から x が消えた");
t(bBlock.includes('className="x"') && bBlock.indexOf('"y"') < bBlock.indexOf('"x"'), "reparent: b 内で y の後ろに x");
t(mv.src === moveInSource(NEST, "x", "y", "after").src, "reparent: 決定的(バイト同一)");

// --- delete ---
const del = deleteInSource(SRC, "title");
t(del.ok && !del.src.includes('className="title"'), "delete: title 消去");
t(classes(del.src).filter((c) => c !== "wrap").join(",") === "eyebrow,lead", "delete: 残り eyebrow,lead");
t(del.src.split("\n").length === SRC.split("\n").length - 1, "delete: 1 行減（行ごと削除）");

// --- duplicate ---
const dup = duplicateInSource(SRC, "title");
t(dup.ok && classes(dup.src).filter((c) => c === "title").length === 2, "duplicate: title が 2 つ");
t(dup.src.split("\n").length === SRC.split("\n").length + 1, "duplicate: 1 行増");
t(dup.src === duplicateInSource(SRC, "title").src, "duplicate: 決定的");

// --- ガード ---
t(moveInSource(SRC, "nope", "title", "before").reason === "not-found", "guard: not-found");
t(moveInSource(SRC, "wrap", "title", "before").reason === "nested", "guard: nested(祖先/子孫へは不可)");
t(deleteInSource(`<ul className="l"><li className="x">a</li><li className="x">b</li></ul>`, "x").reason === "ambiguous", "guard: ambiguous");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
