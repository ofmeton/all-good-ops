// scripts/load.mjs — normalized.json を ローカル SQLite(data/mf-finance.db) へ冪等投入。
// 旧 Supabase 版は legacy/ に退避。ローカル無料運用のため better-sqlite3 を使う。
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { applyRecurringMigrations } from '../db/migrate.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, '..');
const dbPath = join(appRoot, 'data', 'mf-finance.db');
const schemaPath = join(appRoot, 'db', 'schema.sql');
const dataPath = join(appRoot, 'data', 'normalized.json');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(readFileSync(schemaPath, 'utf8'));
applyRecurringMigrations(db);

const records = JSON.parse(readFileSync(dataPath, 'utf8'));

// id 保持・冪等。ingested_at は既存行の値を温存（再投入で履歴を壊さない）。
const upsert = db.prepare(`
  INSERT INTO transactions
    (id, included, date, description, amount, account, category_major,
     category_middle, memo, is_transfer, is_internal_move, classification,
     source_type, source)
  VALUES
    (@id, @included, @date, @description, @amount, @account, @category_major,
     @category_middle, @memo, @is_transfer, @is_internal_move, @classification,
     @source_type, @source)
  ON CONFLICT(id) DO UPDATE SET
    included         = excluded.included,
    date             = excluded.date,
    description      = excluded.description,
    amount           = excluded.amount,
    account          = excluded.account,
    category_major   = excluded.category_major,
    category_middle  = excluded.category_middle,
    memo             = excluded.memo,
    is_transfer      = excluded.is_transfer,
    is_internal_move = excluded.is_internal_move,
    classification   = excluded.classification,
    source_type      = excluded.source_type,
    source           = excluded.source
`);

const b = (v) => (v ? 1 : 0); // bool→0/1（better-sqlite3 は bool を直接バインド不可）
const loadAll = db.transaction((rows) => {
  for (const r of rows) {
    upsert.run({
      id: r.id,
      included: b(r.included),
      date: r.date,
      description: r.description ?? null,
      amount: r.amount,
      account: r.account ?? null,
      category_major: r.category_major ?? null,
      category_middle: r.category_middle ?? null,
      memo: r.memo ?? null,
      is_transfer: b(r.is_transfer),
      is_internal_move: b(r.is_internal_move),
      classification: r.classification ?? null,
      source_type: r.source_type ?? null,
      source: r.source ?? 'mf_cf',
    });
  }
});
loadAll(records);

const total = db.prepare('SELECT COUNT(*) n FROM transactions').get().n;
const inScope = db
  .prepare('SELECT COUNT(*) n FROM transactions WHERE included = 1 AND is_transfer = 0')
  .get().n;
console.log(`loaded ${records.length} records → DB total ${total} 行`);
console.log(`収支対象（included=1 AND is_transfer=0）: ${inScope} 件`);
db.close();
