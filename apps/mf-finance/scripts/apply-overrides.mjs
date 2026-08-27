// scripts/apply-overrides.mjs — txn_overrides を transactions へ冪等適用。
//
// パイプライン上 apply-rules の「後」に走り、取引固有の上書き（振替ペア・一点修正）を
// ルールより優先で反映する。各 override 行の非 NULL フィールドのみ UPDATE。
// 冪等: 同じ overrides を再適用しても結果は同じ。canonical な復元は normalize→load→
// apply-rules→apply-overrides の全再構築で行う（override を消したら次の refresh で元に戻る）。
import { join } from 'node:path';
import { dataDir } from './lib/paths.mjs';
import { applyOverrides } from './lib/overrides.mjs';
import Database from 'better-sqlite3';

const db = new Database(join(dataDir(), 'mf-finance.db'));
db.pragma('journal_mode = WAL');
const overrideCount = db.prepare('SELECT COUNT(*) AS c FROM txn_overrides').get().c;
const applied = applyOverrides(db);
console.log(`txn_overrides: ${overrideCount} 件 → transactions 反映 ${applied} 行`);
db.close();
