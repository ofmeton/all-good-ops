// scripts/load-assets.mjs — MF 資産推移 CSV を ローカル SQLite(data/mf-finance.db) の
// asset_history へ冪等投入。scripts/load.mjs の作法（better-sqlite3 で開く・schema 適用・
// トランザクション upsert）を踏襲。CSV パーサは scripts/lib/csv.mjs を再利用。
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { parseCsv } from './lib/csv.mjs';
import { applyRecurringMigrations } from '../db/migrate.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, '..');
const repoRoot = join(appRoot, '..', '..'); // worktree ルート（raw/ はここ配下）
const dbPath = join(appRoot, 'data', 'mf-finance.db');
const schemaPath = join(appRoot, 'db', 'schema.sql');
const assetDir = join(repoRoot, 'raw', 'finance', 'moneyforward');

// 金額: カンマ・円記号・空白・全角ハイフン等を除去し整数化。空欄は null。
function toInt(raw) {
  if (raw == null) return null;
  const s = String(raw).replace(/[,¥\s円]/g, '').replace(/[−–—]/g, '-');
  if (s === '' || s === '-') return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

// 日付を 'YYYY-MM-DD' に正規化（元が 'YYYY/MM/DD' や 'YYYY-M-D' でも対応）。
function normalizeDate(raw) {
  if (raw == null) return null;
  const m = String(raw).trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!m) return null;
  const [, y, mo, d] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(readFileSync(schemaPath, 'utf8'));
applyRecurringMigrations(db);

// raw/finance/moneyforward/asset-history-*.csv を全て対象（複数あれば全部投入＝冪等）。
const files = readdirSync(assetDir)
  .filter((f) => /^asset-history-.*\.csv$/.test(f))
  .sort();
if (files.length === 0) {
  console.error(`資産CSVが見つかりません: ${assetDir}/asset-history-*.csv`);
  process.exit(1);
}

// date 主キーで冪等。列はヘッダ名でなく位置で解釈（'日付,合計,預金…,ポイント' 固定順）。
const upsert = db.prepare(`
  INSERT INTO asset_history (date, total, deposit_cash_crypto, points)
  VALUES (@date, @total, @deposit, @points)
  ON CONFLICT(date) DO UPDATE SET
    total               = excluded.total,
    deposit_cash_crypto = excluded.deposit_cash_crypto,
    points              = excluded.points
`);

const loadRows = db.transaction((rows) => {
  let n = 0;
  for (const row of rows) {
    const date = normalizeDate(row[0]);
    if (!date) continue; // ヘッダ行・空行・不正日付はスキップ
    upsert.run({
      date,
      total: toInt(row[1]),
      deposit: toInt(row[2]),
      points: toInt(row[3]),
    });
    n++;
  }
  return n;
});

let inserted = 0;
for (const file of files) {
  const text = readFileSync(join(assetDir, file), 'utf8');
  const rows = parseCsv(text);
  const n = loadRows(rows);
  inserted += n;
  console.log(`  ${file}: ${n} 行投入`);
}

const summary = db
  .prepare('SELECT COUNT(*) n, MAX(date) maxd FROM asset_history')
  .get();
const latest = db
  .prepare('SELECT date, total FROM asset_history ORDER BY date DESC LIMIT 1')
  .get();
console.log(`asset_history: 投入 ${inserted} 行 → 総 ${summary.n} 行`);
console.log(`最新日付 ${latest?.date} / 最新total ¥${latest?.total?.toLocaleString('ja-JP')}`);
db.close();
