import "server-only";
import { db } from "@/lib/db";
import { pairTransfers, ruleConflicts, labelInconsistencies } from "./detect.mjs";
import type { ProposalKind, Confidence, ProposedAction } from "./types";

// lib/optimizer/signals.ts — 下層＝決定的シグナル（コード・常時無料）の DB 配線。
// detect.mjs の純関数 + unknown 塊 + unconfirmed_recurring から提案を生成し、
// optimizer_proposals へ dedup_key 単位で INSERT する（同 dedup_key の
// pending / 決定済(accepted/rejected/dismissed) があれば再提案しない）。
// spec: docs/superpowers/specs/2026-06-13-mf-finance-optimizer-design.md §3。

// 1 提案の組み立て前データ。source='signal' 固定。
interface SignalProposal {
  kind: ProposalKind;
  title: string;
  rationale: string;
  confidence: Confidence;
  target_ref: unknown;
  proposed_action: ProposedAction | null;
  dedup_key: string;
}

interface TxnRow {
  id: string;
  date: string;
  amount: number;
  account: string | null;
  description: string | null;
  classification: string | null;
}

interface RuleRow {
  id: number;
  pattern: string;
  match_type: string;
  classification: string | null;
}

interface RecurringRow {
  id: number;
  kind: "income" | "expense";
  name: string;
  amount: number;
  day: number | null;
}

interface UnknownRow {
  description: string;
  count: number;
  amount_min: number;
  amount_max: number;
  accounts: string | null;
}

/**
 * 全検出器を実行し、新規シグナルを optimizer_proposals へ投入する。
 * @returns detected=検出シグナル総数 / inserted=dedup 後に新規 INSERT した数
 */
export function refreshSignals(): { detected: number; inserted: number } {
  const txns = db
    .prepare(
      `SELECT id, date, amount, account, description, classification
       FROM transactions`,
    )
    .all() as TxnRow[];

  const rules = db
    .prepare(`SELECT id, pattern, match_type, classification FROM category_rules`)
    .all() as RuleRow[];

  const recurring = db
    .prepare(
      `SELECT id, kind, name, amount, day FROM recurring_items WHERE confirmed = 'auto'`,
    )
    .all() as RecurringRow[];

  const unknowns = db
    .prepare(
      `SELECT TRIM(description)              AS description,
              COUNT(*)                        AS count,
              MIN(amount)                     AS amount_min,
              MAX(amount)                     AS amount_max,
              GROUP_CONCAT(DISTINCT account)  AS accounts
       FROM transactions
       WHERE classification = 'unknown'
         AND description IS NOT NULL AND TRIM(description) != ''
       GROUP BY TRIM(description)
       ORDER BY count DESC, description`,
    )
    .all() as UnknownRow[];

  const byId = new Map(txns.map((t) => [t.id, t]));
  const ruleById = new Map(rules.map((r) => [r.id, r]));

  const proposals: SignalProposal[] = [];

  // 1. unknown 塊 → classify_unknown（要判断・高優先。分類は人/LLM が決める）
  for (const u of unknowns) {
    const sampleAccounts = (u.accounts ?? "")
      .split(",")
      .map((a) => a.trim())
      .filter((a) => a.length > 0)
      .slice(0, 5);
    proposals.push({
      kind: "classify_unknown",
      title: `未分類: 「${u.description}」(${u.count}件) はどの分類？`,
      rationale: `classification='unknown' が ${u.count} 件。金額 ${u.amount_min}〜${u.amount_max}円。分類を決めてルール化すると再取込後も再現します。`,
      confidence: "high",
      target_ref: {
        description: u.description,
        count: u.count,
        amount_range: { min: u.amount_min, max: u.amount_max },
        sample_accounts: sampleAccounts,
      },
      proposed_action: null, // 分類が未確定のため事前充填しない（要判断）
      dedup_key: `classify_unknown:${u.description}`,
    });
  }

  // 2. transfer_pair → mark_transfer（決定的・両者を transfer 化）
  for (const p of pairTransfers(txns)) {
    const ids = [p.a_id, p.b_id].sort();
    const a = byId.get(p.a_id);
    const b = byId.get(p.b_id);
    const accLabel = `${a?.account ?? "?"} ↔ ${b?.account ?? "?"}`;
    proposals.push({
      kind: "transfer_pair",
      title: `振替では？: ${p.date} ${p.amount.toLocaleString()}円（${accLabel}）`,
      rationale: `同日±1日・反対符号・同額・別口座の2件。振替なら収支から除外されます。`,
      confidence: "high",
      target_ref: { txn_ids: ids, amount: p.amount, date: p.date },
      proposed_action: { type: "mark_transfer", txn_ids: ids },
      dedup_key: `transfer_pair:${ids[0]}_${ids[1]}`,
    });
  }

  // 3. rule_conflict → 要判断（ルールが古いのか・データが誤りか）
  for (const c of ruleConflicts(rules, txns)) {
    const rule = ruleById.get(c.rule_id);
    proposals.push({
      kind: "rule_conflict",
      title: `ルール矛盾: 「${rule?.pattern ?? c.rule_id}」は ${c.expected ?? "(未設定)"} 指定だが実データは ${c.actual_majority} が多数`,
      rationale: `一致 ${c.sample_count} 件の多数決は ${c.actual_majority}。ルールの分類を見直すか、外れ値を個別修正します。`,
      confidence: "med",
      target_ref: {
        rule_id: c.rule_id,
        pattern: rule?.pattern ?? null,
        expected: c.expected,
        actual_majority: c.actual_majority,
        sample_count: c.sample_count,
      },
      proposed_action: null, // 修正方向が一意でないため要判断
      dedup_key: `rule_conflict:${c.rule_id}`,
    });
  }

  // 4. label_inconsistency → relabel（一貫化提案・要判断）
  for (const li of labelInconsistencies(txns)) {
    proposals.push({
      kind: "relabel",
      title: `分類ゆれ: 「${li.description}」が ${li.classifications.join(" / ")} に混在`,
      rationale: `同じ明細に複数分類が付いています（${li.classifications
        .map((c) => `${c}:${li.counts[c]}`)
        .join("・")}）。一貫した分類に揃えるとルール化できます。`,
      confidence: "med",
      target_ref: {
        description: li.description,
        classifications: li.classifications,
        counts: li.counts,
      },
      proposed_action: null, // どの分類に揃えるかは要判断
      dedup_key: `relabel:${li.description}`,
    });
  }

  // 5. unconfirmed_recurring → rule_suggest（定期として確定?）
  for (const r of recurring) {
    proposals.push({
      kind: "rule_suggest",
      title: `定期として確定？: ${r.name}（約${r.amount.toLocaleString()}円・${r.kind === "income" ? "収入" : "支出"}）`,
      rationale: `自動検出された定期項目（未レビュー）。確定すると recurring_items に user 確定で登録されます。`,
      confidence: "med",
      target_ref: { recurring_id: r.id, name: r.name, amount: r.amount, kind: r.kind, day: r.day },
      proposed_action: {
        type: "add_recurring",
        kind: r.kind,
        name: r.name,
        amount: r.amount,
        day: r.day,
      },
      dedup_key: `rule_suggest:recurring:${r.id}`,
    });
  }

  const detected = proposals.length;

  // dedup: 同 dedup_key で superseded 以外（pending/accepted/rejected/dismissed）が
  // 既にあれば再提案しない。
  const existing = new Set(
    (
      db
        .prepare(
          `SELECT DISTINCT dedup_key FROM optimizer_proposals
           WHERE dedup_key IS NOT NULL AND status != 'superseded'`,
        )
        .all() as { dedup_key: string }[]
    ).map((r) => r.dedup_key),
  );

  const insert = db.prepare(
    `INSERT INTO optimizer_proposals
       (kind, source, status, title, rationale, confidence, target_ref, proposed_action, dedup_key)
     VALUES
       (@kind, 'signal', 'pending', @title, @rationale, @confidence, @target_ref, @proposed_action, @dedup_key)`,
  );

  const runInsert = db.transaction((items: SignalProposal[]) => {
    let inserted = 0;
    for (const p of items) {
      if (existing.has(p.dedup_key)) continue;
      existing.add(p.dedup_key); // 同一 run 内の重複も防ぐ
      insert.run({
        kind: p.kind,
        title: p.title,
        rationale: p.rationale,
        confidence: p.confidence,
        target_ref: JSON.stringify(p.target_ref),
        proposed_action: p.proposed_action ? JSON.stringify(p.proposed_action) : null,
        dedup_key: p.dedup_key,
      });
      inserted += 1;
    }
    return inserted;
  });

  const inserted = runInsert(proposals);

  db.prepare(
    `INSERT INTO optimizer_runs (ran_by, signals, proposed) VALUES ('signal', ?, ?)`,
  ).run(detected, inserted);

  return { detected, inserted };
}
