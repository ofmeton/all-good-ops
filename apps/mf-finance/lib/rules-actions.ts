"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { applyAllRules } from "@/lib/rules-apply";
import { applyOverrides } from "@/scripts/lib/overrides.mjs";

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
  revalidatePath("/rules/triage");
  revalidatePath("/categories");
  revalidatePath("/");
}

function reapplyRulesAndOverrides(): void {
  applyAllRules(db);
  applyOverrides(db);
}

function trimOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
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

  reapplyRulesAndOverrides();
  revalidate();
}

export async function deleteRule(id: number): Promise<void> {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new Error("無効な id です");
  db.prepare("DELETE FROM category_rules WHERE id = ?").run(n);
  reapplyRulesAndOverrides();
  revalidate();
}

export async function reapplyRules(): Promise<void> {
  reapplyRulesAndOverrides();
  revalidate();
}
