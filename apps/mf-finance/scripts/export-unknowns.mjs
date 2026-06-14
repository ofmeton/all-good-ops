// scripts/export-unknowns.mjs — classification='unknown' の distinct description を
// LLM ラベリング素材として data/unknowns.json に出力する（読取のみ・DB 不変更）。
// 出力: [{ description, count, amount_min, amount_max, sample_amounts, category_major_examples }]
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, '..');
const dbPath = join(appRoot, 'data', 'mf-finance.db');
const outPath = join(appRoot, 'data', 'unknowns.json');

const db = new Database(dbPath, { readonly: true });

const rows = db
  .prepare(
    `SELECT TRIM(description) AS description,
            COUNT(*)            AS count,
            MIN(amount)         AS amount_min,
            MAX(amount)         AS amount_max,
            GROUP_CONCAT(DISTINCT category_major) AS category_major_examples
     FROM transactions
     WHERE classification = 'unknown' AND description IS NOT NULL AND TRIM(description) != ''
     GROUP BY TRIM(description)
     ORDER BY count DESC, description`,
  )
  .all();

// 各 description の金額サンプル（最大5件）を付与し、収入/支出/混在の判断材料にする。
const sampleStmt = db.prepare(
  `SELECT amount FROM transactions
   WHERE classification = 'unknown' AND TRIM(description) = ?
   ORDER BY date DESC LIMIT 5`,
);
const out = rows.map((r) => ({
  ...r,
  sample_amounts: sampleStmt.all(r.description).map((s) => s.amount),
}));

writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');

const totalTx = db
  .prepare(`SELECT COUNT(*) AS c FROM transactions WHERE classification = 'unknown'`)
  .get().c;
console.log(`exported ${out.length} distinct descriptions (${totalTx} unknown transactions) -> ${outPath}`);
db.close();
