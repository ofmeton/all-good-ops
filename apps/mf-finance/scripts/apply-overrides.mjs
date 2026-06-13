// scripts/apply-overrides.mjs — txn_overrides を transactions へ冪等適用。
//
// パイプライン上 apply-rules の「後」に走り、取引固有の上書き（振替ペア・一点修正）を
// ルールより優先で反映する。各 override 行の非 NULL フィールドのみ UPDATE。
// 冪等: 同じ overrides を再適用しても結果は同じ。canonical な復元は normalize→load→
// apply-rules→apply-overrides の全再構築で行う（override を消したら次の refresh で元に戻る）。
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, '..');
const db = new Database(join(appRoot, 'data', 'mf-finance.db'));
db.pragma('journal_mode = WAL');

const overrides = db
  .prepare(
    `SELECT txn_id, is_transfer, is_internal_move, classification, category_major, category_middle
     FROM txn_overrides`,
  )
  .all();

// 非 NULL のみ反映（COALESCE で override 値があれば置換、無ければ現状維持）。
const update = db.prepare(
  `UPDATE transactions
   SET is_transfer      = COALESCE(?, is_transfer),
       is_internal_move = COALESCE(?, is_internal_move),
       classification   = COALESCE(?, classification),
       category_major   = COALESCE(?, category_major),
       category_middle  = COALESCE(?, category_middle)
   WHERE id = ?`,
);

const run = db.transaction(() => {
  let applied = 0;
  for (const o of overrides) {
    const r = update.run(
      o.is_transfer,
      o.is_internal_move,
      o.classification,
      o.category_major,
      o.category_middle,
      o.txn_id,
    );
    applied += r.changes;
  }
  return applied;
});

const applied = run();
console.log(`txn_overrides: ${overrides.length} 件 → transactions 反映 ${applied} 行`);
db.close();
