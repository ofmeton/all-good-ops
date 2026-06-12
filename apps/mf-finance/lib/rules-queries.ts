import "server-only";
import { db } from "@/lib/db";

// /rules ページ用の読取クエリ。
// SSOT はルール（category_rules）。transactions への反映は rules-actions / scripts/apply-rules.mjs が機械的に行う。

export interface RuleRow {
  id: number;
  pattern: string;
  match_type: "exact" | "contains";
  classification: string | null;
  category_major: string | null;
  category_middle: string | null;
  source: string; // 'llm' | 'manual'
  created_at: string;
  hits: number; // ルール適用ドメイン内の生マッチ件数（下記コメント参照）
}

export interface RulesSummary {
  ruleCount: number;
  unknownCount: number; // classification='unknown' の残数
  labeledCount: number; // llm_labeled=1（ルール適用済み）の行数
}

// hits の定義: ルール適用ドメイン（llm_labeled=1 ∪ classification='unknown'）内で
// パターンがマッチする行数。適用は先勝ちなので、ルール同士が重なる場合は
// SUM(hits) > 実適用行数 になり得る（一覧の目安として十分）。
// contains は INSTR の部分一致で判定（LIKE のワイルドカードエスケープ問題を回避）。
// exact は scripts/lib/rules.mjs と同じく TRIM 後の完全一致。
export function getRules(): RuleRow[] {
  return db
    .prepare(
      `SELECT r.id, r.pattern, r.match_type, r.classification,
              r.category_major, r.category_middle, r.source, r.created_at,
              (SELECT COUNT(*)
                 FROM transactions t
                WHERE (t.llm_labeled = 1 OR t.classification = 'unknown')
                  AND t.description IS NOT NULL
                  AND CASE r.match_type
                        WHEN 'exact' THEN TRIM(t.description) = r.pattern
                        WHEN 'contains' THEN INSTR(TRIM(t.description), r.pattern) > 0
                        ELSE 0
                      END) AS hits
         FROM category_rules r
        ORDER BY r.created_at, r.id`,
    )
    .all() as RuleRow[];
}

export function getRulesSummary(): RulesSummary {
  const ruleCount = (
    db.prepare("SELECT COUNT(*) AS c FROM category_rules").get() as { c: number }
  ).c;
  const unknownCount = (
    db
      .prepare(
        "SELECT COUNT(*) AS c FROM transactions WHERE classification = 'unknown'",
      )
      .get() as { c: number }
  ).c;
  const labeledCount = (
    db
      .prepare("SELECT COUNT(*) AS c FROM transactions WHERE llm_labeled = 1")
      .get() as { c: number }
  ).c;
  return { ruleCount, unknownCount, labeledCount };
}
