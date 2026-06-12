// scripts/seed-recurring.mjs — recurring-candidates.json を recurring_items へ初期投入。
// home の固定費・定期収入見込みの素材。confirmed='auto'（後で UI が 'user' に確定）。
// 重要: 候補の amountAvg は支出が負値。disposable.mjs は income/expense とも正値前提
//       （test/disposable.test.mjs の規約）なので Math.abs で正の magnitude に揃える。
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, '..');
const dbPath = join(appRoot, 'data', 'mf-finance.db');
const schemaPath = join(appRoot, 'db', 'schema.sql');
const candPath = join(appRoot, 'data', 'recurring-candidates.json');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.exec(readFileSync(schemaPath, 'utf8'));

const candidates = JSON.parse(readFileSync(candPath, 'utf8'));

// 名前重複の再投入を避けるため、未確定(auto)分を入れ替える。user 確定分は温存。
const existingUserNames = new Set(
  db.prepare("SELECT name FROM recurring_items WHERE confirmed = 'user'").all().map((r) => r.name),
);
const wipeAuto = db.prepare("DELETE FROM recurring_items WHERE confirmed = 'auto'");
const insert = db.prepare(`
  INSERT INTO recurring_items (kind, name, amount, day, active, confirmed)
  VALUES (@kind, @name, @amount, @day, 1, 'auto')
`);

const seed = db.transaction((rows) => {
  wipeAuto.run();
  let n = 0;
  for (const c of rows) {
    if (existingUserNames.has(c.name)) continue; // user 確定済みは触らない
    insert.run({
      kind: c.kind,
      name: c.name,
      amount: Math.abs(c.amountAvg),
      day: c.day ?? null,
    });
    n += 1;
  }
  return n;
});
const inserted = seed(candidates);

const income = db
  .prepare("SELECT COUNT(*) n, COALESCE(SUM(amount),0) s FROM recurring_items WHERE kind='income' AND active=1")
  .get();
const expense = db
  .prepare("SELECT COUNT(*) n, COALESCE(SUM(amount),0) s FROM recurring_items WHERE kind='expense' AND active=1")
  .get();
console.log(`seeded ${inserted} 件（auto）`);
console.log(`定期収入見込み: ${income.n}件 / 合計 ${income.s.toLocaleString()}円`);
console.log(`固定費: ${expense.n}件 / 合計 ${expense.s.toLocaleString()}円`);
db.close();
