import { applyRulesToRows } from "./rules.mjs";

// category_rules を transactions へリセット方式で冪等適用する共有関数。
export function applyAllRules(db) {
  const rules = db
    .prepare(
      `SELECT id, pattern, match_type, classification, category_major, category_middle
         FROM category_rules ORDER BY created_at, id`,
    )
    .all();
  const run = db.transaction(() => {
    const reset = db
      .prepare(
        `UPDATE transactions
            SET classification = 'unknown', category_major = '未分類',
                category_middle = '未分類', llm_labeled = 0
          WHERE llm_labeled = 1`,
      )
      .run().changes;
    const rows = db
      .prepare("SELECT id, description FROM transactions WHERE classification = 'unknown'")
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
    let matched = 0;
    for (const [id, values] of updates) {
      if (values.classification == null) continue;
      update.run(values.classification, values.category_major, values.category_middle, id);
      matched += 1;
    }
    return { reset, scanned: rows.length, matched, ruleCount: rules.length };
  });
  return run();
}
