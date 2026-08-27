"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { applyAllRules } from "@/lib/rules-apply";
import { applyOverrides } from "@/scripts/lib/overrides.mjs";
import { commitTriageToDb } from "@/scripts/lib/triage.mjs";
import type { Classification } from "@/lib/triage-classification";

export type TriageScope = "override" | "rule-exact" | "rule-contains";

export interface TriageDecision {
  description: string;
  scope: TriageScope;
  pattern: string;
  classification: Classification;
  categoryMajor: string;
  categoryMiddle: string;
  txnIds: string[];
}

export interface TriageResult {
  rulesAdded: number;
  rulesSkipped: number;
  overridesAdded: number;
  remainingUnknown: number;
}

export async function commitTriage(
  decisions: TriageDecision[],
): Promise<TriageResult> {
  const result = commitTriageToDb(db, decisions);
  if (decisions.length === 0) {
    const remainingUnknown = (
      db
        .prepare("SELECT COUNT(*) AS c FROM transactions WHERE classification = 'unknown'")
        .get() as { c: number }
    ).c;
    return { ...result, remainingUnknown };
  }

  // refresh と同じ順序。ルール後に取引固有 override を戻して優先させる。
  applyAllRules(db);
  applyOverrides(db);
  const remainingUnknown = (
    db
      .prepare("SELECT COUNT(*) AS c FROM transactions WHERE classification = 'unknown'")
      .get() as { c: number }
  ).c;
  revalidatePath("/rules/triage");
  revalidatePath("/rules");
  revalidatePath("/categories");
  revalidatePath("/");
  return { ...result, remainingUnknown };
}
