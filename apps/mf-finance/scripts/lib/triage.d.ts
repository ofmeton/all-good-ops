import type Database from "better-sqlite3";

export type TriageScope = "override" | "rule-exact" | "rule-contains";
export interface TriageDecisionInput {
  description: string;
  scope: TriageScope;
  pattern: string;
  classification: string;
  categoryMajor: string;
  categoryMiddle: string;
  txnIds: string[];
}
export interface TriageCommitResult {
  rulesAdded: number;
  rulesSkipped: number;
  overridesAdded: number;
}
export function todayJst(date?: Date): string;
export function commitTriageToDb(
  db: Database.Database,
  decisions: TriageDecisionInput[],
): TriageCommitResult;
