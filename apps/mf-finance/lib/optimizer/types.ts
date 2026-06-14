// Optimizer の共有型（全ワークストリームが read-only 参照する契約）。
// spec: docs/superpowers/specs/2026-06-13-mf-finance-optimizer-design.md §1/§5

export type ProposalKind =
  | "classify_unknown"
  | "fixed_vs_variable"
  | "relabel"
  | "transfer_pair"
  | "rule_suggest"
  | "rule_conflict"
  | "label_add"
  | "category_regroup"
  | "suggest_transfer";

export type ProposalSource = "signal" | "llm";

export type ProposalStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "dismissed"
  | "superseded";

export type Confidence = "high" | "med" | "low";

export type RuleMatchType = "exact" | "contains";

// 承認時に server action が実行する具体的変更。
export type ProposedAction =
  | {
      type: "add_rule";
      pattern: string;
      match_type: RuleMatchType;
      classification: string;
      category_major?: string;
      category_middle?: string;
    }
  | { type: "edit_rule"; rule_id: number; patch: Record<string, unknown> }
  | { type: "delete_rule"; rule_id: number }
  | {
      type: "set_override";
      txn_ids: string[];
      fields: {
        is_transfer?: 0 | 1;
        is_internal_move?: 0 | 1;
        classification?: string;
        category_major?: string;
        category_middle?: string;
      };
    }
  | { type: "mark_transfer"; txn_ids: string[] }
  | {
      type: "regroup";
      mappings: { category_major: string; group_name: string; sort_order?: number }[];
    }
  | {
      type: "add_recurring";
      kind: "income" | "expense";
      name: string;
      amount: number;
      day?: number | null;
    }
  | {
      type: "create_manual_transfer";
      from_account: string;
      to_account: string;
      amount: number;
      date: string;
      name?: string;
    };

export type ProposedActionType = ProposedAction["type"];

export interface OptimizerProposal {
  id: number;
  created_at: string;
  kind: ProposalKind;
  source: ProposalSource;
  status: ProposalStatus;
  title: string;
  rationale: string | null;
  confidence: Confidence;
  target_ref: unknown; // JSON parse 済み
  proposed_action: ProposedAction | null;
  dedup_key: string | null;
  decided_at: string | null;
  decided_note: string | null;
}

// DB 行（target_ref / proposed_action は TEXT のまま）。
export interface ProposalRow {
  id: number;
  created_at: string;
  kind: ProposalKind;
  source: ProposalSource;
  status: ProposalStatus;
  title: string;
  rationale: string | null;
  confidence: Confidence;
  target_ref: string | null;
  proposed_action: string | null;
  dedup_key: string | null;
  decided_at: string | null;
  decided_note: string | null;
}
