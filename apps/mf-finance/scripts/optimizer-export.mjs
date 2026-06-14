// scripts/optimizer-export.mjs — Optimizer 上層（LLM思考）の入力素材を
// data/optimizer-input.json に出力する（読取のみ・DB 不変更）。spec §4-1。
// Claude が「オプティマイザー回して」で本ファイルを読み、判断の要る提案を生成する。
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, '..');
const dbPath = join(appRoot, 'data', 'mf-finance.db');
const outPath = join(appRoot, 'data', 'optimizer-input.json');

const db = new Database(dbPath, { readonly: true });

// JSON 文字列カラムを安全に parse（壊れていれば raw を残す）。
const parseJson = (s) => {
  if (s == null) return null;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
};

const tableExists = (name) =>
  Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));

// 1. pending シグナル（下層・上層問わず未処理の提案）
const pending_signals = db
  .prepare(
    `SELECT id, kind, source, title, rationale, confidence,
            target_ref, proposed_action, dedup_key, created_at
     FROM optimizer_proposals
     WHERE status = 'pending'
     ORDER BY (confidence = 'high') DESC, (confidence = 'med') DESC, kind, id`,
  )
  .all()
  .map((p) => ({
    ...p,
    target_ref: parseJson(p.target_ref),
    proposed_action: parseJson(p.proposed_action),
  }));

// 2. unknown descriptions（例・金額レンジ・口座）
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
  .all()
  .map((u) => ({
    description: u.description,
    count: u.count,
    amount_range: { min: u.amount_min, max: u.amount_max },
    sample_accounts: (u.accounts ?? '')
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a.length > 0)
      .slice(0, 5),
  }));

// 3. 既存 category_rules
const rules = db
  .prepare(
    `SELECT id, pattern, match_type, classification, category_major, category_middle, source
     FROM category_rules
     ORDER BY id`,
  )
  .all();

// 4. classification 分布
const classification_distribution = Object.fromEntries(
  db
    .prepare(
      `SELECT COALESCE(classification, '(null)') AS classification, COUNT(*) AS n
       FROM transactions GROUP BY classification ORDER BY n DESC`,
    )
    .all()
    .map((r) => [r.classification, r.n]),
);

// 5. category_groups（集計の括り直し設定）
const category_groups = db
  .prepare(`SELECT category_major, group_name, sort_order FROM category_groups ORDER BY sort_order, category_major`)
  .all();

// 6. 直近の決定ログ（accepted/rejected + note・学習用）
const decision_log = db
  .prepare(
    `SELECT id, kind, title, status, decided_at, decided_note, dedup_key
     FROM optimizer_proposals
     WHERE status IN ('accepted', 'rejected')
     ORDER BY decided_at DESC, id DESC
     LIMIT 30`,
  )
  .all();

// 7. 大項目一覧
const category_majors = db
  .prepare(
    `SELECT DISTINCT category_major FROM transactions
     WHERE category_major IS NOT NULL AND TRIM(category_major) != ''
     ORDER BY category_major`,
  )
  .all()
  .map((r) => r.category_major);

// 8. 資金移動提案向けの口座残高・手数料・口座別不足見込み（単純な現在残高ベース）
const account_balances = tableExists('account_balances')
  ? db
      .prepare(`SELECT account, kind, balance, as_of, source FROM account_balances ORDER BY kind, account`)
      .all()
  : [];

const transfer_fees = tableExists('transfer_fees')
  ? db
      .prepare(`SELECT from_account, fee, updated_at FROM transfer_fees ORDER BY from_account = '__default__' DESC, from_account`)
      .all()
  : [];

const account_shortfalls = account_balances
  .filter((row) => Number(row.balance) < 0)
  .map((row) => ({
    account: row.account,
    kind: row.kind,
    shortage: Math.abs(Number(row.balance)),
    as_of: row.as_of,
  }));

const out = {
  generated_at: new Date().toISOString(),
  pending_signals,
  unknowns,
  rules,
  classification_distribution,
  category_groups,
  decision_log,
  category_majors,
  account_balances,
  transfer_fees,
  account_shortfalls,
};

writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
db.close();

console.log(`optimizer-input.json -> ${outPath}`);
console.log(
  `  pending_signals=${pending_signals.length} unknowns=${unknowns.length} ` +
    `rules=${rules.length} category_groups=${category_groups.length} ` +
    `decision_log=${decision_log.length} category_majors=${category_majors.length} ` +
    `account_balances=${account_balances.length} transfer_fees=${transfer_fees.length}`,
);
