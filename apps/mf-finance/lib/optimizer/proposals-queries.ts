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

// 「修正して承認」の大項目・中項目プルダウン用の既存カテゴリ一覧。
export function getCategoryOptions(): { majors: string[]; middles: string[] } {
  const majors = (
    db
      .prepare(
        `SELECT DISTINCT category_major FROM transactions
         WHERE category_major IS NOT NULL AND category_major != '' AND category_major != '未分類'
         ORDER BY category_major`,
      )
      .all() as { category_major: string }[]
  ).map((r) => r.category_major);
  const middles = (
    db
      .prepare(
        `SELECT DISTINCT category_middle FROM transactions
         WHERE category_middle IS NOT NULL AND category_middle != '' AND category_middle != '未分類'
         ORDER BY category_middle`,
      )
      .all() as { category_middle: string }[]
  ).map((r) => r.category_middle);
  return { majors, middles };
}

// 提案カードに出す該当明細サンプル（金額を見せる）。
export interface ProposalSample {
  date: string;
  description: string;
  amount: number;
}

// 提案の対象取引を target_ref / proposed_action から導いてサンプル（最大8件）と総件数を返す。
export function getProposalSamples(p: OptimizerProposal): {
  samples: ProposalSample[];
  total: number;
} {
  const t = (p.target_ref ?? {}) as Record<string, unknown>;
  const a = p.proposed_action as { txn_ids?: unknown } | null;
  const ids = Array.isArray(t.txn_ids)
    ? (t.txn_ids as string[])
    : Array.isArray(a?.txn_ids)
      ? (a!.txn_ids as string[])
      : null;

  if (ids && ids.length > 0) {
    const shown = ids.slice(0, 8);
    const ph = shown.map(() => "?").join(",");
    const samples = db
      .prepare(
        `SELECT date, description, amount FROM transactions WHERE id IN (${ph}) ORDER BY date DESC`,
      )
      .all(...shown) as ProposalSample[];
    return { samples, total: ids.length };
  }

  if (typeof t.description === "string") {
    const desc = t.description;
    const total = (
      db
        .prepare("SELECT COUNT(*) AS n FROM transactions WHERE TRIM(description) = ?")
        .get(desc) as { n: number }
    ).n;
    const samples = db
      .prepare(
        `SELECT date, description, amount FROM transactions
         WHERE TRIM(description) = ? ORDER BY date DESC LIMIT 8`,
      )
      .all(desc) as ProposalSample[];
    return { samples, total };
  }

  if (typeof t.rule_id === "number") {
    const rule = db
      .prepare("SELECT pattern, match_type FROM category_rules WHERE id = ?")
      .get(t.rule_id) as { pattern: string; match_type: string } | undefined;
    if (rule) {
      const where =
        rule.match_type === "contains"
          ? "INSTR(TRIM(description), ?) > 0"
          : "TRIM(description) = ?";
      const total = (
        db
          .prepare(`SELECT COUNT(*) AS n FROM transactions WHERE ${where}`)
          .get(rule.pattern) as { n: number }
      ).n;
      const samples = db
        .prepare(
          `SELECT date, description, amount FROM transactions WHERE ${where} ORDER BY date DESC LIMIT 8`,
        )
        .all(rule.pattern) as ProposalSample[];
      return { samples, total };
    }
  }

  return { samples: [], total: 0 };
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
