// scripts/optimizer-propose.mjs — LLM（Claude）が生成した提案 JSON 配列を optimizer_proposals へ取込。
//
// 使い方:
//   node scripts/optimizer-propose.mjs <proposals.json>   # ファイル
//   cat proposals.json | node scripts/optimizer-propose.mjs # stdin
//
// 設計: LLM 出力は信用しない（境界検証）。各行を spec §5 のアクション型・types.ts の
// ProposalKind に照合し、不正な行は弾いて理由をログ。妥当な行のみ source='llm',
// status='pending' で INSERT。dedup_key 指定があり同 key の既存提案（pending/決定済）が
// あればスキップ（再提案防止）。最後に optimizer_runs に ran_by='llm' を1行記録。
// spec: docs/superpowers/specs/2026-06-13-mf-finance-optimizer-design.md §4/§5
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

// --- 許容セット（lib/optimizer/types.ts の ProposalKind / RuleMatchType / Confidence に一致。
//     型は TS のため .mjs からは import できずハードコード。types.ts を変更したらここも追従） ---
const KINDS = new Set([
  "classify_unknown",
  "fixed_vs_variable",
  "relabel",
  "transfer_pair",
  "rule_suggest",
  "rule_conflict",
  "label_add",
  "category_regroup",
]);
const CONFIDENCES = new Set(["high", "med", "low"]);
const MATCH_TYPES = new Set(["exact", "contains"]);
const ACTION_TYPES = new Set([
  "add_rule",
  "edit_rule",
  "delete_rule",
  "set_override",
  "mark_transfer",
  "regroup",
  "add_recurring",
]);

const isNonEmptyStr = (v) => typeof v === "string" && v.trim() !== "";
const isStrArray = (v) => Array.isArray(v) && v.every((x) => isNonEmptyStr(x));
const isObj = (v) => v != null && typeof v === "object" && !Array.isArray(v);

// proposed_action の型ごとの必須フィールド検証。{ ok:true } | { ok:false, error }。
function validateAction(a) {
  if (!isObj(a)) return { ok: false, error: "proposed_action はオブジェクトでない" };
  if (!ACTION_TYPES.has(a.type)) return { ok: false, error: `未知の action type: ${a.type}` };
  switch (a.type) {
    case "add_rule":
      if (!isNonEmptyStr(a.pattern)) return { ok: false, error: "add_rule: pattern 必須" };
      if (!MATCH_TYPES.has(a.match_type))
        return { ok: false, error: "add_rule: match_type は exact|contains" };
      if (!isNonEmptyStr(a.classification))
        return { ok: false, error: "add_rule: classification 必須" };
      return { ok: true };
    case "edit_rule":
      if (!Number.isInteger(a.rule_id)) return { ok: false, error: "edit_rule: rule_id(整数) 必須" };
      if (!isObj(a.patch)) return { ok: false, error: "edit_rule: patch(オブジェクト) 必須" };
      return { ok: true };
    case "delete_rule":
      if (!Number.isInteger(a.rule_id))
        return { ok: false, error: "delete_rule: rule_id(整数) 必須" };
      return { ok: true };
    case "set_override":
      if (!isStrArray(a.txn_ids) || a.txn_ids.length < 1)
        return { ok: false, error: "set_override: txn_ids(非空文字列配列) 必須" };
      if (!isObj(a.fields)) return { ok: false, error: "set_override: fields(オブジェクト) 必須" };
      return { ok: true };
    case "mark_transfer":
      if (!isStrArray(a.txn_ids) || a.txn_ids.length !== 2)
        return { ok: false, error: "mark_transfer: txn_ids は2件の文字列" };
      return { ok: true };
    case "regroup":
      if (!Array.isArray(a.mappings) || a.mappings.length < 1)
        return { ok: false, error: "regroup: mappings(非空配列) 必須" };
      for (const m of a.mappings) {
        if (!isObj(m) || !isNonEmptyStr(m.category_major) || !isNonEmptyStr(m.group_name))
          return { ok: false, error: "regroup: 各 mapping に category_major/group_name 必須" };
      }
      return { ok: true };
    case "add_recurring":
      if (a.kind !== "income" && a.kind !== "expense")
        return { ok: false, error: "add_recurring: kind は income|expense" };
      if (!isNonEmptyStr(a.name)) return { ok: false, error: "add_recurring: name 必須" };
      if (typeof a.amount !== "number" || !Number.isFinite(a.amount))
        return { ok: false, error: "add_recurring: amount(数値) 必須" };
      return { ok: true };
    default:
      return { ok: false, error: `未対応 type: ${a.type}` };
  }
}

// 1提案の検証。{ ok:true, row } | { ok:false, error }。
function validateProposal(p) {
  if (!isObj(p)) return { ok: false, error: "提案がオブジェクトでない" };
  if (!KINDS.has(p.kind)) return { ok: false, error: `未知の kind: ${p.kind}` };
  if (!isNonEmptyStr(p.title)) return { ok: false, error: "title 必須" };

  // confidence: 不正・未指定は med（保守的既定）。
  const confidence = CONFIDENCES.has(p.confidence) ? p.confidence : "med";

  // proposed_action: あれば検証、無ければ null。
  let proposed_action = null;
  if (p.proposed_action != null) {
    const av = validateAction(p.proposed_action);
    if (!av.ok) return { ok: false, error: av.error };
    proposed_action = JSON.stringify(p.proposed_action);
  }

  const rationale = isNonEmptyStr(p.rationale) ? p.rationale : null;
  const target_ref = p.target_ref != null ? JSON.stringify(p.target_ref) : null;
  const dedup_key = isNonEmptyStr(p.dedup_key) ? p.dedup_key.trim() : null;

  return {
    ok: true,
    row: {
      kind: p.kind,
      title: p.title.trim(),
      rationale,
      confidence,
      target_ref,
      proposed_action,
      dedup_key,
    },
  };
}

function readInput() {
  const path = process.argv[2];
  if (path) return readFileSync(path, "utf8");
  // stdin（fd 0）を同期読み。
  return readFileSync(0, "utf8");
}

function main() {
  let raw;
  try {
    raw = readInput();
  } catch (e) {
    console.error(`入力読込エラー: ${e.message}`);
    process.exit(1);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error(`JSON パースエラー: ${e.message}`);
    process.exit(1);
  }
  if (!Array.isArray(parsed)) {
    console.error("入力は提案オブジェクトの JSON 配列である必要があります");
    process.exit(1);
  }

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const appRoot = join(__dirname, "..");
  const db = new Database(join(appRoot, "data", "mf-finance.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // dedup_key 一致の最新提案（id/status）を引く。
  // - pending（＝下層シグナルの「問い」）にLLMの答えが来たら UPDATE で答えを埋める（source→llm）。
  // - 決定済（accepted/rejected/dismissed/superseded）は再提案せずスキップ。
  // - 一致なしは INSERT。
  const findDedup = db.prepare(
    "SELECT id, status FROM optimizer_proposals WHERE dedup_key = ? ORDER BY id DESC LIMIT 1",
  );
  const insert = db.prepare(
    `INSERT INTO optimizer_proposals
       (kind, source, status, title, rationale, confidence, target_ref, proposed_action, dedup_key)
     VALUES (@kind, 'llm', 'pending', @title, @rationale, @confidence, @target_ref, @proposed_action, @dedup_key)`,
  );
  // pending の問いに答えを埋める（title は既存を尊重しつつ rationale/action/confidence を更新、source=llm）。
  const answer = db.prepare(
    `UPDATE optimizer_proposals
     SET source='llm', rationale=@rationale, confidence=@confidence,
         proposed_action=COALESCE(@proposed_action, proposed_action),
         target_ref=COALESCE(@target_ref, target_ref)
     WHERE id=@id`,
  );

  let inserted = 0;
  let answered = 0;
  let skippedInvalid = 0;
  let skippedDecided = 0;

  const run = db.transaction(() => {
    parsed.forEach((p, i) => {
      const v = validateProposal(p);
      if (!v.ok) {
        skippedInvalid++;
        console.warn(`[skip 不正] #${i}: ${v.error}`);
        return;
      }
      const existing = v.row.dedup_key ? findDedup.get(v.row.dedup_key) : null;
      if (existing) {
        if (existing.status === "pending") {
          answer.run({ ...v.row, id: existing.id });
          answered++;
        } else {
          skippedDecided++;
          console.warn(`[skip 決定済] #${i}: dedup_key '${v.row.dedup_key}' は ${existing.status}`);
        }
        return;
      }
      insert.run(v.row);
      inserted++;
    });
    // 作業ログ（proposed=新規投入+回答）。
    db.prepare(
      `INSERT INTO optimizer_runs (ran_by, proposed, note)
       VALUES ('llm', ?, ?)`,
    ).run(
      inserted + answered,
      `propose: 入力${parsed.length} / 新規${inserted} / 回答${answered} / 不正skip${skippedInvalid} / 決定済skip${skippedDecided}`,
    );
  });
  run();

  console.log(
    `optimizer-propose: 入力 ${parsed.length} 件 → 新規 ${inserted} / 既存pendingへ回答 ${answered} / 不正スキップ ${skippedInvalid} / 決定済スキップ ${skippedDecided}`,
  );
  db.close();
}

main();
