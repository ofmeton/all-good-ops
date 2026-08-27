import type Database from "better-sqlite3";

export interface RuleApplyResult {
  reset: number;
  scanned: number;
  matched: number;
  ruleCount: number;
}

export function applyAllRules(db: Database.Database): RuleApplyResult;
