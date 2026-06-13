import "server-only";
import { db } from "@/lib/db";
import type {
  OptimizerProposal,
  ProposalRow,
  ProposedAction,
} from "@/lib/optimizer/types";

// Optimizer 提案キューの読取クエリ（server-only）。
// DB は target_ref / proposed_action を TEXT(JSON) で持つ。UI へ渡す前に JSON.parse して
// OptimizerProposal（parse 済み）へ正規化する。壊れた JSON は null に倒して UI を壊さない。

export interface OptimizerRunRow {
  id: number;
  ran_at: string;
  ran_by: "signal" | "llm";
  signals: number | null;
  proposed: number | null;
  decided: number | null;
  note: string | null;
}

export interface ProposalCounts {
  total: number;
  byKind: Record<string, number>;
}

// confidence の表示優先度（high>med>low）。SQL 側で並べ替えるための重み。
const CONFIDENCE_RANK = `CASE confidence WHEN 'high' THEN 0 WHEN 'med' THEN 1 ELSE 2 END`;

// TEXT(JSON) を安全に parse。null / 空 / 破損は null。
function parseJson<T>(raw: string | null): T | null {
  if (raw == null || raw.length === 0) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// DB 行（ProposalRow）→ parse 済み OptimizerProposal。
function hydrate(row: ProposalRow): OptimizerProposal {
  return {
    id: row.id,
    created_at: row.created_at,
    kind: row.kind,
    source: row.source,
    status: row.status,
    title: row.title,
    rationale: row.rationale,
    confidence: row.confidence,
    target_ref: parseJson<unknown>(row.target_ref),
    proposed_action: parseJson<ProposedAction>(row.proposed_action),
    dedup_key: row.dedup_key,
    decided_at: row.decided_at,
    decided_note: row.decided_note,
  };
}

// 未処理（pending）提案を confidence(high>med>low) → created_at 昇順で返す。
export function getPendingProposals(): OptimizerProposal[] {
  const rows = db
    .prepare(
      `SELECT id, created_at, kind, source, status, title, rationale, confidence,
              target_ref, proposed_action, dedup_key, decided_at, decided_note
       FROM optimizer_proposals
       WHERE status = 'pending'
       ORDER BY ${CONFIDENCE_RANK}, created_at`,
    )
    .all() as ProposalRow[];
  return rows.map(hydrate);
}

// pending のみの総数と kind 別件数。
export function getProposalCounts(): ProposalCounts {
  const rows = db
    .prepare(
      `SELECT kind, COUNT(*) AS c
       FROM optimizer_proposals
       WHERE status = 'pending'
       GROUP BY kind`,
    )
    .all() as { kind: string; c: number }[];
  const byKind: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    byKind[r.kind] = r.c;
    total += r.c;
  }
  return { total, byKind };
}

// 決定済み（accepted/rejected/dismissed）の履歴を decided_at 降順で返す。
export function getDecisionLog(limit = 50): OptimizerProposal[] {
  const rows = db
    .prepare(
      `SELECT id, created_at, kind, source, status, title, rationale, confidence,
              target_ref, proposed_action, dedup_key, decided_at, decided_note
       FROM optimizer_proposals
       WHERE status IN ('accepted','rejected','dismissed')
       ORDER BY decided_at DESC, id DESC
       LIMIT ?`,
    )
    .all(limit) as ProposalRow[];
  return rows.map(hydrate);
}

// 作業ログ（run 履歴）を新しい順で返す。
export function getRuns(limit = 20): OptimizerRunRow[] {
  return db
    .prepare(
      `SELECT id, ran_at, ran_by, signals, proposed, decided, note
       FROM optimizer_runs
       ORDER BY ran_at DESC, id DESC
       LIMIT ?`,
    )
    .all(limit) as OptimizerRunRow[];
}
