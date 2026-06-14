// scripts/load-freee.mjs — data/freee-pl.json を business_pl へ冪等投入（freee統合・薄切り）。
// 実データ JSON は親セッションが freee MCP（読取専用）で生成してから実行する。
// 形式: [{"month":"2026-01","revenue":123,"expense":45,"profit":78}, ...]
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { applyRecurringMigrations } from '../db/migrate.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, '..');
const dbPath = join(appRoot, 'data', 'mf-finance.db');
const schemaPath = join(appRoot, 'db', 'schema.sql');
const dataPath = join(appRoot, 'data', 'freee-pl.json');

if (!existsSync(dataPath)) {
  console.log('未取込: data/freee-pl.json を置いて再実行してください。');
  console.log('形式: [{"month":"2026-01","revenue":123,"expense":45,"profit":78}, ...]');
  process.exit(0);
}

let records;
try {
  records = JSON.parse(readFileSync(dataPath, 'utf8'));
} catch (e) {
  console.error(`data/freee-pl.json の JSON parse に失敗: ${e.message}`);
  process.exit(1);
}
if (!Array.isArray(records)) {
  console.error('data/freee-pl.json は配列である必要があります。');
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(readFileSync(schemaPath, 'utf8')); // IF NOT EXISTS のみ＝冪等
applyRecurringMigrations(db);

const ymRe = /^\d{4}-(0[1-9]|1[0-2])$/;
// 数値正規化。非数値は null（NOT NULL 制約なしの列なので欠損許容）。
const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
};

// 冪等 upsert。captured_at は取込時刻で更新（最終取込のタイムスタンプとして扱う）。
const upsert = db.prepare(`
  INSERT INTO business_pl (month, revenue, expense, profit, source)
  VALUES (@month, @revenue, @expense, @profit, 'freee')
  ON CONFLICT(month) DO UPDATE SET
    revenue     = excluded.revenue,
    expense     = excluded.expense,
    profit      = excluded.profit,
    source      = excluded.source,
    captured_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
`);

let ok = 0;
const skipped = [];
const loadAll = db.transaction((rows) => {
  for (const r of rows) {
    if (!r || typeof r.month !== 'string' || !ymRe.test(r.month)) {
      skipped.push(r && r.month != null ? String(r.month) : '(month欠落)');
      continue;
    }
    const revenue = toInt(r.revenue);
    const expense = toInt(r.expense);
    // profit 欠損時は revenue - expense で補完（両方あるときのみ）。
    const profit =
      toInt(r.profit) ?? (revenue != null && expense != null ? revenue - expense : null);
    upsert.run({ month: r.month, revenue, expense, profit });
    ok++;
  }
});

try {
  loadAll(records);
} catch (e) {
  console.error(`投入に失敗（rollback済み）: ${e.message}`);
  db.close();
  process.exit(1);
}

const range = db
  .prepare('SELECT MIN(month) lo, MAX(month) hi, COUNT(*) n FROM business_pl')
  .get();
console.log(
  `freee PL 取込: ${ok} 行 upsert` +
    (skipped.length ? `（skip ${skipped.length} 件: ${skipped.join(', ')}）` : ''),
);
console.log(`business_pl: ${range.n} 行（${range.lo ?? '-'} 〜 ${range.hi ?? '-'}）`);
db.close();
