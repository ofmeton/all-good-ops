// scripts/apply-rules.mjs — category_rules を transactions へ冪等適用（リセット方式）。
//
// 設計（カテゴリの扱い）:
//   ルールは classification に加えて category_major / category_middle も transactions へ適用する。
//   冪等性の根拠: classification='unknown' になり得る行は category が必ず '未分類'/'未分類'
//   （scripts/lib/classify.mjs の導出仕様）なので、リセット時に
//   classification='unknown', category_major='未分類', category_middle='未分類', llm_labeled=0
//   へ戻せば元状態を完全に復元できる。ルールの category が NULL の場合は '未分類' のまま
//   classification だけ更新する。
//
// 手順:
//   1. リセット: llm_labeled=1 の行を unknown/未分類 に戻す
//   2. category_rules を created_at, id 順（先勝ち）で全 unknown 行へ適用し llm_labeled=1
//   3. ログ: 適用前後の unknown 件数・ルール数・マッチ件数
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { applyRulesToRows } from './lib/rules.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, '..');
const db = new Database(join(appRoot, 'data', 'mf-finance.db'));
db.pragma('journal_mode = WAL');

const unknownCount = () =>
  db.prepare(`SELECT COUNT(*) AS c FROM transactions WHERE classification = 'unknown'`).get().c;

const rules = db
  .prepare(
    `SELECT id, pattern, match_type, classification, category_major, category_middle
     FROM category_rules ORDER BY created_at, id`,
  )
  .all();

const before = unknownCount();

const run = db.transaction(() => {
  // 1. リセット（llm_labeled 行のみ。手動分類・classify 由来の行には触れない）
  const reset = db
    .prepare(
      `UPDATE transactions
       SET classification = 'unknown', category_major = '未分類', category_middle = '未分類', llm_labeled = 0
       WHERE llm_labeled = 1`,
    )
    .run().changes;

  // 2. ルール適用（純関数で判定 → 機械的 UPDATE）
  const rows = db
    .prepare(`SELECT id, description FROM transactions WHERE classification = 'unknown'`)
    .all();
  const updates = applyRulesToRows(rules, rows);

  const update = db.prepare(
    `UPDATE transactions
     SET classification = ?,
         category_major = COALESCE(?, category_major),
         category_middle = COALESCE(?, category_middle),
         llm_labeled = 1
     WHERE id = ?`,
  );
  for (const [id, u] of updates) {
    update.run(u.classification, u.category_major, u.category_middle, id);
  }
  return { reset, scanned: rows.length, matched: updates.size };
});

const { reset, scanned, matched } = run();
const after = unknownCount();

console.log(`rules: ${rules.length}`);
console.log(`reset (llm_labeled rows reverted): ${reset}`);
console.log(`unknown rows scanned: ${scanned}, matched: ${matched}`);
console.log(`unknown count: ${before} -> ${after}`);
db.close();
