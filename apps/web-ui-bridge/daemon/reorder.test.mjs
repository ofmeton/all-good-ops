// reorderInSource の決定性・整形保持・ガードを検証（node reorder.test.mjs）。
import { reorderInSource } from "./reorder.mjs";

let pass = 0, fail = 0;
const t = (cond, label) => { if (cond) { pass++; console.log("✅", label); } else { fail++; console.log("❌", label); } };

// terra の hero を模した兄弟 3 要素（インデント・改行あり）
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

// 1) lead を title の before へ → 順序が eyebrow, lead, title になる
const r1 = reorderInSource(SRC, "lead", "title", "before");
t(r1.ok && r1.changed, "ok & changed (lead before title)");
const order1 = [...r1.src.matchAll(/className="(\w+)"/g)].map((m) => m[1]).filter((c) => c !== "wrap");
t(JSON.stringify(order1) === JSON.stringify(["eyebrow", "lead", "title"]), "順序 = eyebrow,lead,title : " + order1.join(","));

// 2) 整形保持: 行数・インデント不変（要素テキストはそのまま移動）
t(r1.src.split("\n").length === SRC.split("\n").length, "行数不変（整形保持）");
t(r1.src.includes('      <p className="lead">一色海岸</p>'), "lead 行のインデント保持");
t(r1.src.includes('export default function Page() {'), "周辺コード不変");

// 3) 決定性: 同じ入力 → バイト同一
const r1b = reorderInSource(SRC, "lead", "title", "before");
t(r1.src === r1b.src, "決定的（2回実行でバイト同一）");

// 4) after
const r2 = reorderInSource(SRC, "eyebrow", "lead", "after");
const order2 = [...r2.src.matchAll(/className="(\w+)"/g)].map((m) => m[1]).filter((c) => c !== "wrap");
t(JSON.stringify(order2) === JSON.stringify(["title", "lead", "eyebrow"]), "eyebrow after lead → title,lead,eyebrow : " + order2.join(","));

// 5) ガード: 存在しない class
t(reorderInSource(SRC, "nope", "title", "before").reason === "not-found", "not-found ガード");

// 6) ガード: 兄弟でない（wrap は title の親で兄弟でない）
t(reorderInSource(SRC, "wrap", "title", "before").reason === "not-siblings", "not-siblings ガード");

// 7) ガード: 同一 class が複数 → ambiguous
const DUP = `<ul className="l"><li className="x">a</li><li className="x">b</li></ul>`;
t(reorderInSource(DUP, "x", "l", "before").reason === "ambiguous", "ambiguous ガード（同一class複数）");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
