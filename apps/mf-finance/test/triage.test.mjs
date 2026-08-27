import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import ts from "typescript";
import { commitTriageToDb, todayJst } from "../scripts/lib/triage.mjs";
import { applyAllRules } from "../scripts/lib/rules-apply.mjs";
import { applyOverrides } from "../scripts/lib/overrides.mjs";

async function loadClassification() {
  const source = readFileSync(
    new URL("../lib/triage-classification.ts", import.meta.url),
    "utf8",
  );
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

function createDb() {
  const dir = mkdtempSync(join(tmpdir(), "mf-finance-triage-"));
  const previousDataDir = process.env.MF_FINANCE_DATA_DIR;
  process.env.MF_FINANCE_DATA_DIR = dir;
  const db = new Database(join(dir, "mf-finance.db"));
  db.exec(`
    CREATE TABLE transactions (
      id TEXT PRIMARY KEY, description TEXT, classification TEXT,
      category_major TEXT, category_middle TEXT, is_transfer INTEGER DEFAULT 0,
      is_internal_move INTEGER DEFAULT 0, llm_labeled INTEGER DEFAULT 0
    );
    CREATE TABLE category_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT, pattern TEXT NOT NULL, match_type TEXT,
      classification TEXT, category_major TEXT, category_middle TEXT,
      source TEXT NOT NULL DEFAULT 'manual', created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE txn_overrides (
      txn_id TEXT PRIMARY KEY, is_transfer INTEGER, is_internal_move INTEGER,
      classification TEXT, category_major TEXT, category_middle TEXT,
      note TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
  db.prepare(
    "INSERT INTO transactions (id, description, classification, category_major, category_middle) VALUES (?, ?, 'unknown', '未分類', '未分類')",
  ).run("a", "反復する店");
  db.prepare(
    "INSERT INTO transactions (id, description, classification, category_major, category_middle) VALUES (?, ?, 'unknown', '未分類', '未分類')",
  ).run("b", "一度だけ");
  return { db, dir, previousDataDir };
}

function restoreDataDir(previousDataDir) {
  if (previousDataDir === undefined) delete process.env.MF_FINANCE_DATA_DIR;
  else process.env.MF_FINANCE_DATA_DIR = previousDataDir;
}

test("inferClassification: 大カテゴリから分類を導く", async () => {
  const { inferClassification } = await loadClassification();
  assert.equal(inferClassification("収入"), "income");
  assert.equal(inferClassification("振替"), "transfer");
  assert.equal(inferClassification("現金・カード"), "transfer");
  for (const major of ["住宅", "通信費", "保険", "税・社会保障", "水道・光熱費"]) {
    assert.equal(inferClassification(major), "fixed");
  }
  assert.equal(inferClassification("食費"), "variable");
});

test("todayJst: UTC日付でなく日本時間の日付を使う", () => {
  assert.equal(todayJst(new Date("2026-08-26T16:00:00Z")), "2026-08-27");
});

test("commitTriageToDb: 不正な決定は何も書き込まない", () => {
  const { db, dir, previousDataDir } = createDb();
  try {
    assert.throws(
      () =>
        commitTriageToDb(db, [
          {
            description: "一度だけ", scope: "override", pattern: "",
            classification: "fixed", categoryMajor: "通信費", categoryMiddle: "携帯電話", txnIds: ["b"],
          },
          {
            description: "反復する店", scope: "rule-exact", pattern: " ",
            classification: "variable", categoryMajor: "食費", categoryMiddle: "食料品", txnIds: [],
          },
        ]),
      /pattern/,
    );
    assert.equal(db.prepare("SELECT COUNT(*) AS c FROM category_rules").get().c, 0);
    assert.equal(db.prepare("SELECT COUNT(*) AS c FROM txn_overrides").get().c, 0);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
    restoreDataDir(previousDataDir);
  }
});

test("commitTriageToDb: ルール追加・重複スキップ・override を保存する", () => {
  const { db, dir, previousDataDir } = createDb();
  try {
    db.prepare(
      "INSERT INTO category_rules (pattern, match_type, classification, category_major, category_middle, source) VALUES ('反復する店', 'exact', 'variable', '食費', '食料品', 'manual')",
    ).run();
    db.prepare(
      "INSERT INTO txn_overrides (txn_id, is_transfer, is_internal_move, classification) VALUES ('b', 1, 1, 'transfer')",
    ).run();
    const result = commitTriageToDb(db, [
      {
        description: "反復する店", scope: "rule-exact", pattern: "反復する店",
        classification: "variable", categoryMajor: "食費", categoryMiddle: "食料品", txnIds: [],
      },
      {
        description: "一度だけ", scope: "override", pattern: "",
        classification: "fixed", categoryMajor: "通信費", categoryMiddle: "携帯電話", txnIds: ["b"],
      },
      {
        description: "新しい反復", scope: "rule-contains", pattern: "新しい",
        classification: "variable", categoryMajor: "日用品", categoryMiddle: "日用品", txnIds: [],
      },
    ]);
    assert.deepEqual(result, { rulesAdded: 1, rulesSkipped: 1, overridesAdded: 1 });
    assert.deepEqual(
      db.prepare("SELECT pattern, match_type, classification FROM category_rules WHERE pattern = '新しい'").get(),
      { pattern: "新しい", match_type: "contains", classification: "variable" },
    );
    assert.deepEqual(
      db.prepare("SELECT txn_id, is_transfer, is_internal_move, classification, category_major, category_middle, note FROM txn_overrides").get(),
      {
        txn_id: "b", is_transfer: 1, is_internal_move: 1, classification: "fixed",
        category_major: "通信費", category_middle: "携帯電話", note: `triage UI ${todayJst()}`,
      },
    );
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
    restoreDataDir(previousDataDir);
  }
});

test("ルール再適用の後もoverrideが分類と振替フラグを優先する", () => {
  const { db, dir, previousDataDir } = createDb();
  try {
    db.prepare(
      "INSERT INTO category_rules (pattern, match_type, classification, category_major, category_middle, source) VALUES ('一度だけ', 'exact', 'variable', '食費', '食料品', 'manual')",
    ).run();
    db.prepare(
      "INSERT INTO txn_overrides (txn_id, is_transfer, classification, category_major, category_middle) VALUES ('b', 1, 'fixed', '通信費', '携帯電話')",
    ).run();

    applyAllRules(db);
    applyOverrides(db);
    applyAllRules(db);
    applyOverrides(db);

    assert.deepEqual(
      db.prepare("SELECT is_transfer, classification, category_major, category_middle FROM transactions WHERE id = 'b'").get(),
      { is_transfer: 1, classification: "fixed", category_major: "通信費", category_middle: "携帯電話" },
    );
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
    restoreDataDir(previousDataDir);
  }
});
