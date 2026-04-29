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
  delivery_days: number | null;
  body_md: string | null;
  research_notes: string | null;
  generated_at: string | null;
}

export function getTodaysSummary(): JobWithProposal[] {
  // collected_at は UTC で保存されているため、JST の「本日」判定だと
  // 日付境界（UTC 15時 = JST 0時）でズレる。
  // 「直近 24 時間に収集された案件」という実用的なフィルタに変更。
  const db = getDb();
  return db
    .prepare(
      `SELECT j.*, p.proposal_id, p.product_line, p.price, p.delivery_days,
              p.body_md, p.research_notes, p.generated_at
       FROM jobs j
       LEFT JOIN proposals p ON p.job_id = j.job_id
       WHERE j.collected_at >= datetime('now', '-24 hours')
       ORDER BY (j.fit_score IS NULL), j.fit_score DESC, j.collected_at DESC`
    )
    .all() as JobWithProposal[];
}

export function getJobWithProposal(job_id: string): JobWithProposal | null {
  const db = getDb();
  return (
    (db
      .prepare(
        `SELECT j.*, p.proposal_id, p.product_line, p.price, p.delivery_days,
                p.body_md, p.research_notes, p.generated_at
         FROM jobs j
         LEFT JOIN proposals p ON p.job_id = j.job_id
         WHERE j.job_id = ?`
      )
      .get(job_id) as JobWithProposal | undefined) ?? null
  );
}

export function updateProposal(
  job_id: string,
  body_md: string,
  product_line: string,
  price: number,
  delivery_days: number,
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

  db.prepare(
    `UPDATE proposals SET
       body_md = ?, product_line = ?, price = ?, delivery_days = ?,
       edited_at = datetime('now')
     WHERE proposal_id = ?`
  ).run(
    body_md,
    product_line,
    price,
    delivery_days,
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
