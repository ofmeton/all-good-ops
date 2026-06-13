"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ProposedAction, ProposalRow } from "@/lib/optimizer/types";

// Optimizer 承認 server actions（書込はこのファイルからのみ）。
// budget-actions.ts の作法を踏襲: client から直接 await されるため throw せず Result 型で返す
// （server action の例外は production で details が落ち、未ハンドルだと UI が壊れる）。
// 承認時 proposed_action(JSON) の type で分岐し prepared statement で DB 反映、
// rule系/override系は対応する apply スクリプトを execFile で再適用してから status を更新する。

export type OptimizerActionResult = { ok: true } | { ok: false; error: string };

const execFileAsync = promisify(execFile);

// 承認/却下/棄却後に再描画する経路。
function revalidate(): void {
  revalidatePath("/optimizer");
  revalidatePath("/");
}

// id ガード（正の整数のみ）。
function isValidId(id: unknown): id is number {
  return typeof id === "number" && Number.isInteger(id) && id > 0;
}

// 文字列を trim、空・非文字列は null。
function s(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

// proposed_action(JSON) を安全に parse。
function parseAction(raw: string | null): ProposedAction | null {
  if (raw == null || raw.length === 0) return null;
  try {
    return JSON.parse(raw) as ProposedAction;
  } catch {
    return null;
  }
}

// category_rules の編集で許可するカラム（patch のホワイトリスト）。
const RULE_PATCH_COLUMNS = [
  "pattern",
  "match_type",
  "classification",
  "category_major",
  "category_middle",
] as const;

// proposed_action を DB へ反映。どの apply スクリプトが必要かを返す（'rules' | 'overrides' | null）。
// 短トランザクション・prepared statement。検証エラーは throw（呼び元で {ok:false} に変換）。
function applyActionToDb(action: ProposedAction): "rules" | "overrides" | null {
  switch (action.type) {
    case "add_rule": {
      const pattern = s(action.pattern);
      const classification = s(action.classification);
      if (!pattern || !classification) {
        throw new Error("ルールの pattern / classification が不正です");
      }
      const matchType = action.match_type === "exact" ? "exact" : "contains";
      db.prepare(
        `INSERT INTO category_rules
           (pattern, match_type, classification, category_major, category_middle, source)
         VALUES (?, ?, ?, ?, ?, 'optimizer')`,
      ).run(
        pattern,
        matchType,
        classification,
        s(action.category_major),
        s(action.category_middle),
      );
      return "rules";
    }
    case "edit_rule": {
      if (!isValidId(action.rule_id)) throw new Error("rule_id が不正です");
      const sets: string[] = [];
      const vals: unknown[] = [];
      for (const col of RULE_PATCH_COLUMNS) {
        if (Object.prototype.hasOwnProperty.call(action.patch, col)) {
          sets.push(`${col} = ?`);
          const raw = action.patch[col];
          vals.push(typeof raw === "string" ? raw : raw == null ? null : String(raw));
        }
      }
      if (sets.length === 0) throw new Error("更新対象のフィールドがありません");
      vals.push(action.rule_id);
      db.prepare(
        `UPDATE category_rules SET ${sets.join(", ")} WHERE id = ?`,
      ).run(...vals);
      return "rules";
    }
    case "delete_rule": {
      if (!isValidId(action.rule_id)) throw new Error("rule_id が不正です");
      db.prepare("DELETE FROM category_rules WHERE id = ?").run(action.rule_id);
      return "rules";
    }
    case "set_override": {
      const ids = (action.txn_ids ?? []).map((x) => s(x)).filter((x): x is string => !!x);
      if (ids.length === 0) throw new Error("txn_ids が空です");
      const f = action.fields ?? {};
      const upsert = db.prepare(
        `INSERT INTO txn_overrides
           (txn_id, is_transfer, is_internal_move, classification, category_major, category_middle)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(txn_id) DO UPDATE SET
           is_transfer      = COALESCE(excluded.is_transfer, txn_overrides.is_transfer),
           is_internal_move = COALESCE(excluded.is_internal_move, txn_overrides.is_internal_move),
           classification   = COALESCE(excluded.classification, txn_overrides.classification),
           category_major   = COALESCE(excluded.category_major, txn_overrides.category_major),
           category_middle  = COALESCE(excluded.category_middle, txn_overrides.category_middle)`,
      );
      const tx = db.transaction(() => {
        for (const id of ids) {
          upsert.run(
            id,
            f.is_transfer ?? null,
            f.is_internal_move ?? null,
            s(f.classification),
            s(f.category_major),
            s(f.category_middle),
          );
        }
      });
      tx();
      return "overrides";
    }
    case "mark_transfer": {
      const ids = (action.txn_ids ?? []).map((x) => s(x)).filter((x): x is string => !!x);
      if (ids.length < 2) throw new Error("mark_transfer は2件の txn_id が必要です");
      const upsert = db.prepare(
        `INSERT INTO txn_overrides (txn_id, is_transfer, classification)
         VALUES (?, 1, 'transfer')
         ON CONFLICT(txn_id) DO UPDATE SET
           is_transfer = 1, classification = 'transfer'`,
      );
      const tx = db.transaction(() => {
        for (const id of ids) upsert.run(id);
      });
      tx();
      return "overrides";
    }
    case "regroup": {
      const mappings = action.mappings ?? [];
      if (mappings.length === 0) throw new Error("regroup の mappings が空です");
      const upsert = db.prepare(
        `INSERT INTO category_groups (category_major, group_name, sort_order)
         VALUES (?, ?, ?)
         ON CONFLICT(category_major) DO UPDATE SET
           group_name = excluded.group_name, sort_order = excluded.sort_order`,
      );
      const tx = db.transaction(() => {
        for (const m of mappings) {
          const major = s(m.category_major);
          const group = s(m.group_name);
          if (!major || !group) throw new Error("regroup の category_major / group_name が不正です");
          upsert.run(major, group, Number.isFinite(m.sort_order) ? Number(m.sort_order) : 0);
        }
      });
      tx();
      return null; // 表示時ロールアップのため apply 不要
    }
    case "add_recurring": {
      const name = s(action.name);
      if (!name) throw new Error("add_recurring の name が不正です");
      const kind = action.kind === "income" ? "income" : "expense";
      const amount = Math.abs(Math.round(Number(action.amount)));
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("add_recurring の amount が不正です");
      }
      let day: number | null = null;
      if (action.day != null) {
        const d = Number(action.day);
        if (Number.isInteger(d) && d >= 1 && d <= 31) day = d;
      }
      db.prepare(
        `INSERT INTO recurring_items (kind, name, amount, day, active, confirmed)
         VALUES (?, ?, ?, ?, 1, 'user')`,
      ).run(kind, name, amount, day);
      return null;
    }
    default: {
      // 型上は網羅済みだが、DB 由来の未知 type を弾く。
      throw new Error("未知のアクション種別です");
    }
  }
}

// rule系/override系の反映後に対応する apply スクリプトを実行（cwd=process.cwd・固定引数）。
async function runApply(which: "rules" | "overrides"): Promise<void> {
  const script =
    which === "rules" ? "scripts/apply-rules.mjs" : "scripts/apply-overrides.mjs";
  await execFileAsync("node", [script], { cwd: process.cwd() });
}

// 共通: 1件の proposal を承認扱いにし、proposed_action を DB 反映＋apply。
async function acceptProposal(id: number): Promise<OptimizerActionResult> {
  const row = db
    .prepare(
      `SELECT id, status, proposed_action FROM optimizer_proposals WHERE id = ?`,
    )
    .get(id) as Pick<ProposalRow, "id" | "status" | "proposed_action"> | undefined;
  if (!row) return { ok: false, error: "提案が見つかりません" };
  if (row.status !== "pending") return { ok: false, error: "この提案は既に処理済みです" };
  const action = parseAction(row.proposed_action);
  if (!action) return { ok: false, error: "提案にアクションが設定されていません" };

  let which: "rules" | "overrides" | null;
  try {
    which = applyActionToDb(action);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "適用に失敗しました" };
  }

  if (which) {
    try {
      await runApply(which);
    } catch (e) {
      // DB 反映済みだが apply 失敗。次回 refresh で整合するため accepted は維持しつつエラー通知。
      return {
        ok: false,
        error: `反映は保存しましたが再適用に失敗しました: ${e instanceof Error ? e.message : "unknown"}`,
      };
    }
  }

  db.prepare(
    `UPDATE optimizer_proposals
     SET status = 'accepted', decided_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
     WHERE id = ?`,
  ).run(id);
  revalidate();
  return { ok: true };
}

// 提案を承認して適用する。
export async function applyProposal(id: number): Promise<OptimizerActionResult> {
  if (!isValidId(id)) return { ok: false, error: "無効な id です" };
  return acceptProposal(id);
}

// proposed_action を修正してから承認・適用する。
export async function editAndApply(
  id: number,
  patchedAction: ProposedAction,
): Promise<OptimizerActionResult> {
  if (!isValidId(id)) return { ok: false, error: "無効な id です" };
  if (!patchedAction || typeof patchedAction !== "object" || !("type" in patchedAction)) {
    return { ok: false, error: "修正後のアクションが不正です" };
  }
  const upd = db
    .prepare(
      `UPDATE optimizer_proposals SET proposed_action = ?
       WHERE id = ? AND status = 'pending'`,
    )
    .run(JSON.stringify(patchedAction), id);
  if (upd.changes === 0) {
    return { ok: false, error: "対象の未処理提案が見つかりません" };
  }
  return acceptProposal(id);
}

// 提案を却下（理由は任意・学習用に decided_note へ）。
export async function rejectProposal(
  id: number,
  note?: string,
): Promise<OptimizerActionResult> {
  if (!isValidId(id)) return { ok: false, error: "無効な id です" };
  const upd = db
    .prepare(
      `UPDATE optimizer_proposals
       SET status = 'rejected', decided_at = strftime('%Y-%m-%dT%H:%M:%SZ','now'), decided_note = ?
       WHERE id = ? AND status = 'pending'`,
    )
    .run(s(note), id);
  if (upd.changes === 0) return { ok: false, error: "対象の未処理提案が見つかりません" };
  revalidate();
  return { ok: true };
}

// 提案を棄却（スキップ）。
export async function dismissProposal(id: number): Promise<OptimizerActionResult> {
  if (!isValidId(id)) return { ok: false, error: "無効な id です" };
  const upd = db
    .prepare(
      `UPDATE optimizer_proposals
       SET status = 'dismissed', decided_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
       WHERE id = ? AND status = 'pending'`,
    )
    .run(id);
  if (upd.changes === 0) return { ok: false, error: "対象の未処理提案が見つかりません" };
  revalidate();
  return { ok: true };
}

// 下層の決定的シグナル検出を再実行。signals.ts は W1 が提供する server 関数。
// W1 未完でも tsc を通すため dynamic import（型は any 許容）。失敗時は {ok:false}。
export async function refreshSignalsAction(): Promise<OptimizerActionResult> {
  try {
    // @ts-ignore — '@/lib/optimizer/signals' は W1 が後追いで追加する（未存在でも本 action は型安全に出荷）。
    const mod = await import("@/lib/optimizer/signals");
    const fn = (mod as { refreshSignals?: () => unknown }).refreshSignals;
    if (typeof fn !== "function") {
      return { ok: false, error: "シグナル更新機能がまだ利用できません" };
    }
    await fn();
    revalidate();
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "シグナル更新に失敗しました",
    };
  }
}
