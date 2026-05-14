import Database from 'better-sqlite3';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DB_PATH = join(
  homedir(),
  'Library/Application Support/bsa-pa/data.db'
);

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('foreign_keys = ON');
    _db.pragma('journal_mode = WAL');
  }
  return _db;
}

export interface JobWithProposal {
  job_id: string;
  platform_prefix: string;
  title: string;
  description: string | null;
  budget_text: string | null;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  proposal_count: number | null;
  client_name: string | null;
  client_verified: number | null;
  client_history_count: number | null;
  service_category: string | null;
  fit_score: number | null;
  fit_score_breakdown: string | null;
  estimated_product_line: string | null;
  detail_url: string;
  status: string;
  // proposal fields (joined, nullable)
  proposal_id: string | null;
  product_line: string | null;
  price: number | null;
  price_exclude_tax: number | null;
  delivery_days: number | null;
  body_md: string | null;
  description_md: string | null;
  estimate_md: string | null;
  milestones_json: string | null;
  options_json: string | null;
  research_notes: string | null;
  generated_at: string | null;
}

export function getTodaysSummary(): JobWithProposal[] {
  // collected_at は UTC 保存。「直近 24 時間に収集された案件」フィルタ + replied は常に表示。
  // 投下済み(submitted) / 不可(unable_to_submit) / 辞退(declined) / 失注(lost) / 期限切れ(expired) /
  // 受注(won) は履歴ページへ。replied（先方から返信あり・未確定）は最重要として
  // 24時間フィルタ無視で先頭表示。
  const db = getDb();
  return db
    .prepare(
      `SELECT j.*, p.proposal_id, p.product_line, p.price, p.price_exclude_tax, p.delivery_days,
              p.body_md, p.description_md, p.estimate_md, p.milestones_json, p.options_json,
              p.research_notes, p.generated_at
       FROM jobs j
       LEFT JOIN proposals p ON p.job_id = j.job_id
       WHERE (
         (j.collected_at >= datetime('now', '-24 hours') AND j.status IN ('collected', 'proposing'))
         OR j.status = 'replied'
       )
       ORDER BY (j.status = 'replied') DESC,
                (j.fit_score IS NULL),
                j.fit_score DESC,
                j.collected_at DESC`
    )
    .all() as JobWithProposal[];
}

export function getJobWithProposal(job_id: string): JobWithProposal | null {
  const db = getDb();
  return (
    (db
      .prepare(
        `SELECT j.*, p.proposal_id, p.product_line, p.price, p.price_exclude_tax, p.delivery_days,
                p.body_md, p.description_md, p.estimate_md, p.milestones_json, p.options_json,
                p.research_notes, p.generated_at
         FROM jobs j
         LEFT JOIN proposals p ON p.job_id = j.job_id
         WHERE j.job_id = ?`
      )
      .get(job_id) as JobWithProposal | undefined) ?? null
  );
}

export interface ProposalUpdate {
  body_md: string;
  product_line: string;
  price: number; // 税込み総額（互換用）
  price_exclude_tax: number | null;
  delivery_days: number;
  description_md?: string | null;
  estimate_md?: string | null;
  milestones_json?: string | null;
  options_json?: string | null;
}

export function updateProposal(
  job_id: string,
  patch: ProposalUpdate,
  changed_by: 'human' | 'claude' = 'human'
): void {
  const db = getDb();
  const proposal = db
    .prepare('SELECT * FROM proposals WHERE job_id = ?')
    .get(job_id) as
    | {
        proposal_id: string;
        body_md: string;
        product_line: string;
        price: number;
        delivery_days: number;
      }
    | undefined;
  if (!proposal) throw new Error(`No proposal for ${job_id}`);

  // 履歴に旧版を保存
  db.prepare(
    `INSERT INTO proposal_revisions (proposal_id, body_md, product_line, price, delivery_days, changed_by, note)
     VALUES (?, ?, ?, ?, ?, ?, 'manual edit')`
  ).run(
    proposal.proposal_id,
    proposal.body_md,
    proposal.product_line,
    proposal.price,
    proposal.delivery_days,
    changed_by
  );

  // 既存値を保持しつつ patch で上書き
  const description_md = patch.description_md ?? patch.body_md;
  db.prepare(
    `UPDATE proposals SET
       body_md = ?, product_line = ?, price = ?, price_exclude_tax = ?, delivery_days = ?,
       description_md = ?, estimate_md = COALESCE(?, estimate_md),
       milestones_json = COALESCE(?, milestones_json),
       options_json = COALESCE(?, options_json),
       edited_at = datetime('now')
     WHERE proposal_id = ?`
  ).run(
    patch.body_md,
    patch.product_line,
    patch.price,
    patch.price_exclude_tax,
    patch.delivery_days,
    description_md,
    patch.estimate_md ?? null,
    patch.milestones_json ?? null,
    patch.options_json ?? null,
    proposal.proposal_id
  );
}

export function updateJobStatus(
  job_id: string,
  to_status: string,
  note?: string
): void {
  const db = getDb();
  const job = db.prepare('SELECT status FROM jobs WHERE job_id = ?').get(job_id) as
    | { status: string }
    | undefined;
  if (!job) throw new Error(`No job ${job_id}`);
  const from_status = job.status;
  db.prepare(
    `UPDATE jobs SET status = ?, updated_at = datetime('now') WHERE job_id = ?`
  ).run(to_status, job_id);
  db.prepare(
    `INSERT INTO status_history (job_id, from_status, to_status, changed_by, note) VALUES (?, ?, ?, 'human', ?)`
  ).run(job_id, from_status, to_status, note ?? null);
  if (to_status === 'submitted') {
    db.prepare(
      `UPDATE proposals SET submitted_at = datetime('now') WHERE job_id = ?`
    ).run(job_id);
  }
}

// ─── 受注台帳（deals） ─────────────────────────────────────────
export interface DealInput {
  contract_amount: number;        // 税込総額（必須）
  delivery_due?: string | null;
  client_contact?: string | null;
  product_line_actual?: string | null;
  notes?: string | null;
}

export interface DealRow extends DealInput {
  job_id: string;
  contracted_at: string;
  delivered_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

// 受注を記録 → status を 'won' に遷移。upsert（同案件で再入力可）。
// status_history への記録は updateJobStatus 内で行うので、こちらは deals upsert のみ。
export function recordDeal(job_id: string, input: DealInput): void {
  const db = getDb();
  if (!Number.isFinite(input.contract_amount) || input.contract_amount <= 0) {
    throw new Error('contract_amount must be a positive number');
  }
  db.prepare(
    `INSERT INTO deals (job_id, contract_amount, delivery_due, client_contact, product_line_actual, notes)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(job_id) DO UPDATE SET
       contract_amount     = excluded.contract_amount,
       delivery_due        = COALESCE(excluded.delivery_due, deals.delivery_due),
       client_contact      = COALESCE(excluded.client_contact, deals.client_contact),
       product_line_actual = COALESCE(excluded.product_line_actual, deals.product_line_actual),
       notes               = COALESCE(excluded.notes, deals.notes),
       updated_at          = datetime('now')`
  ).run(
    job_id,
    input.contract_amount,
    input.delivery_due ?? null,
    input.client_contact ?? null,
    input.product_line_actual ?? null,
    input.notes ?? null
  );
  updateJobStatus(job_id, 'won', `受注記録: ¥${input.contract_amount.toLocaleString()}`);
}

export function getDeal(job_id: string): DealRow | null {
  const db = getDb();
  return (
    (db.prepare('SELECT * FROM deals WHERE job_id = ?').get(job_id) as
      | DealRow
      | undefined) ?? null
  );
}

export function createGenerationRequest(
  job_id: string,
  prompt_hint: string | null
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO generation_requests (job_id, prompt_hint, status) VALUES (?, ?, 'pending')`
  ).run(job_id, prompt_hint);
}

export function getRevisions(proposal_id: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM proposal_revisions WHERE proposal_id = ? ORDER BY changed_at DESC LIMIT 20`
    )
    .all(proposal_id);
}

export function getKpiStats() {
  const db = getDb();
  const submitted = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM jobs WHERE status IN ('submitted','replied','won','lost') AND collected_at >= datetime('now', '-30 days')`
      )
      .get() as { c: number }
  ).c;
  const replied = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM jobs WHERE status IN ('replied','won','lost') AND collected_at >= datetime('now', '-30 days')`
      )
      .get() as { c: number }
  ).c;
  const won = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM jobs WHERE status = 'won' AND collected_at >= datetime('now', '-30 days')`
      )
      .get() as { c: number }
  ).c;
  return {
    submitted,
    replied,
    won,
    conversionRate: submitted > 0 ? won / submitted : 0,
  };
}
