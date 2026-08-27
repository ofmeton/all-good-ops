const CLASSIFICATIONS = new Set([
  "income",
  "fixed",
  "variable",
  "transfer",
  "internal",
]);
const SCOPES = new Set(["override", "rule-exact", "rule-contains"]);

export function todayJst(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${value.year}-${value.month}-${value.day}`;
}

function nonEmpty(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} が不正です`);
  }
  return value.trim();
}

function validateDecision(decision) {
  if (!decision || typeof decision !== "object") throw new Error("決定が不正です");
  if (!SCOPES.has(decision.scope)) throw new Error("scope が不正です");
  if (!CLASSIFICATIONS.has(decision.classification)) {
    throw new Error("classification が不正です");
  }
  const categoryMajor = nonEmpty(decision.categoryMajor, "categoryMajor");
  const categoryMiddle = nonEmpty(decision.categoryMiddle, "categoryMiddle");
  if (decision.scope === "override") {
    if (!Array.isArray(decision.txnIds) || decision.txnIds.length === 0) {
      throw new Error("txnIds が不正です");
    }
    const txnIds = decision.txnIds.map((id) => nonEmpty(id, "txnIds"));
    return { ...decision, categoryMajor, categoryMiddle, txnIds };
  }
  return {
    ...decision,
    categoryMajor,
    categoryMiddle,
    pattern: nonEmpty(decision.pattern, "pattern"),
  };
}

// DB 引数の小さな書込みコア。server action と一時DBテストで同じ実体を使う。
export function commitTriageToDb(db, rawDecisions) {
  if (!Array.isArray(rawDecisions)) throw new Error("decisions が不正です");
  const decisions = rawDecisions.map(validateDecision); // 書込み前に全件検証
  if (decisions.length === 0) {
    return { rulesAdded: 0, rulesSkipped: 0, overridesAdded: 0 };
  }

  const findRule = db.prepare(
    "SELECT 1 FROM category_rules WHERE pattern = ? AND match_type = ? LIMIT 1",
  );
  const insertRule = db.prepare(
    `INSERT INTO category_rules
       (pattern, match_type, classification, category_major, category_middle, source)
     VALUES (?, ?, ?, ?, ?, 'manual')`,
  );
  const insertOverride = db.prepare(
    `INSERT INTO txn_overrides
       (txn_id, classification, category_major, category_middle, note)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(txn_id) DO UPDATE SET
       classification = excluded.classification,
       category_major = excluded.category_major,
       category_middle = excluded.category_middle,
       note = excluded.note`,
  );
  const note = `triage UI ${todayJst()}`;

  const run = db.transaction(() => {
    const result = { rulesAdded: 0, rulesSkipped: 0, overridesAdded: 0 };
    for (const decision of decisions) {
      if (decision.scope === "override") {
        for (const txnId of decision.txnIds) {
          insertOverride.run(
            txnId,
            decision.classification,
            decision.categoryMajor,
            decision.categoryMiddle,
            note,
          );
          result.overridesAdded += 1;
        }
        continue;
      }
      const matchType = decision.scope === "rule-exact" ? "exact" : "contains";
      if (findRule.get(decision.pattern, matchType)) {
        result.rulesSkipped += 1;
        continue;
      }
      insertRule.run(
        decision.pattern,
        matchType,
        decision.classification,
        decision.categoryMajor,
        decision.categoryMiddle,
      );
      result.rulesAdded += 1;
    }
    return result;
  });
  return run();
}
