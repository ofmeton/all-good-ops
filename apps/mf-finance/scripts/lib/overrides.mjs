// txn_overrides を transactions へ冪等適用する共有関数。
// 非 NULL フィールドだけを COALESCE で反映し、既存の振替フラグを壊さない。
export function applyOverrides(db) {
  const overrides = db
    .prepare(
      `SELECT txn_id, is_transfer, is_internal_move, classification, category_major, category_middle
       FROM txn_overrides`,
    )
    .all();
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
    for (const override of overrides) {
      applied += update.run(
        override.is_transfer,
        override.is_internal_move,
        override.classification,
        override.category_major,
        override.category_middle,
        override.txn_id,
      ).changes;
    }
    return applied;
  });
  return run();
}
