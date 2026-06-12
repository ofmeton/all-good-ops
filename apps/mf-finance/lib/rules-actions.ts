"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { applyRulesToRows } from "@/scripts/lib/rules.mjs";

// /rules ページ用の書込 server actions。全て prepared statement（インジェクション防止）。
// 設計（SSOT=ルール）: 判断は category_rules に永続化し、transactions への反映は
// テスト済み純関数 applyRulesToRows（scripts/lib/rules.mjs と同一実体）で機械的に行う。
// 追加・削除の直後も自動で全ルール再適用し、ルールと transactions のドリフトを防ぐ。

const CLASSIFICATIONS = [
  "income",
  "fixed",
  "variable",
  "transfer",
  "internal",
] as const;
export type Classification = (typeof CLASSIFICATIONS)[number];

function revalidate(): void {
  revalidatePath("/rules");
  revalidatePath("/");
}

function trimOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

interface DbRule {
  id: number;
  pattern: string;
  match_type: string;
  classification: string | null;
  category_major: string | null;
  category_middle: string | null;
}

// scripts/apply-rules.mjs と同じリセット方式の冪等適用（短トランザクション）。
// unknown になり得る行のカテゴリは必ず '未分類'/'未分類'（classify.mjs の導出仕様）なので、
// llm_labeled=1 の行を unknown/未分類 へ戻してから全ルールを先勝ちで再適用すれば完全に再現できる。
function applyAllRules(): { reset: number; matched: number } {
  const rules = db
    .prepare(
      `SELECT id, pattern, match_type, classification, category_major, category_middle
         FROM category_rules ORDER BY created_at, id`,
    )
    .all() as DbRule[];

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
      .prepare(
        "SELECT id, description FROM transactions WHERE classification = 'unknown'",
      )
      .all() as { id: string; description: string | null }[];

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
    for (const [id, u] of updates) {
      // classification の無いルールは適用しない（unknown のまま残す）。
      if (u.classification == null) continue;
      update.run(u.classification, u.category_major, u.category_middle, id);
      matched += 1;
    }
    return { reset, matched };
  });
  return run();
}

export interface AddRuleInput {
  pattern: string;
  match_type: "exact" | "contains";
  classification: Classification;
  category_major?: string | null;
  category_middle?: string | null;
}

export async function addRule(input: AddRuleInput): Promise<void> {
  const pattern = trimOrNull(input.pattern);
  if (!pattern) throw new Error("パターンは必須です");
  const matchType = input.match_type === "contains" ? "contains" : "exact";
  if (!CLASSIFICATIONS.includes(input.classification)) {
    throw new Error("分類が不正です");
  }
  const major = trimOrNull(input.category_major);
  const middle = trimOrNull(input.category_middle);

  const dup = db
    .prepare(
      "SELECT COUNT(*) AS c FROM category_rules WHERE pattern = ? AND match_type = ?",
    )
    .get(pattern, matchType) as { c: number };
  if (dup.c > 0) throw new Error("同じパターン・一致方式のルールが既にあります");

  db.prepare(
    `INSERT INTO category_rules (pattern, match_type, classification, category_major, category_middle, source)
     VALUES (?, ?, ?, ?, ?, 'manual')`,
  ).run(pattern, matchType, input.classification, major, middle);

  applyAllRules();
  revalidate();
}

export async function deleteRule(id: number): Promise<void> {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new Error("無効な id です");
  db.prepare("DELETE FROM category_rules WHERE id = ?").run(n);
  applyAllRules();
  revalidate();
}

export async function reapplyRules(): Promise<void> {
  applyAllRules();
  revalidate();
}
