import Database from 'better-sqlite3';
import { ulid } from 'ulid';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const DEFAULT_DB_PATH = join(
  homedir(),
  'Library/Application Support/bsa-pa/data.db'
);

export function openDb(path = DEFAULT_DB_PATH): Database.Database {
  const db = new Database(path);
  db.pragma('foreign_keys = ON');
  return db;
}

export interface JobRow {
  job_id: string;
  platform_prefix: string;
  source_url: string;
  detail_url: string;
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
  posted_at: string | null;
  collected_at: string;
  fit_score: number | null;
  fit_score_breakdown: string | null;
  estimated_product_line: string | null;
  status: string;
}

export function getTopJobs(db: Database.Database, limit: number): JobRow[] {
  return db
    .prepare(
      `SELECT * FROM jobs
       WHERE status = 'collected'
       ORDER BY fit_score DESC, collected_at DESC
       LIMIT ?`
    )
    .all(limit) as JobRow[];
}

export interface ProposalInsert {
  job_id: string;
  product_line: string;
  price: number;
  delivery_days: number;
  body_md: string;
  research_notes: string | null;
  generated_by: string;
}

export function upsertProposal(
  db: Database.Database,
  p: ProposalInsert
): string {
  const existing = db
    .prepare('SELECT * FROM proposals WHERE job_id = ?')
    .get(p.job_id) as
    | {
        proposal_id: string;
        body_md: string;
        product_line: string;
        price: number;
        delivery_days: number;
      }
    | undefined;

  if (existing) {
    // 既存の値を proposal_revisions に retire
    db.prepare(
      `INSERT INTO proposal_revisions (proposal_id, body_md, product_line, price, delivery_days, changed_by, note)
       VALUES (?, ?, ?, ?, ?, 'claude', 're-generated')`
    ).run(
      existing.proposal_id,
      existing.body_md,
      existing.product_line,
      existing.price,
      existing.delivery_days
    );

    db.prepare(
      `UPDATE proposals SET
         product_line = ?, price = ?, delivery_days = ?,
         body_md = ?, research_notes = ?,
         generated_at = datetime('now'), generated_by = ?
       WHERE proposal_id = ?`
    ).run(
      p.product_line,
      p.price,
      p.delivery_days,
      p.body_md,
      p.research_notes,
      p.generated_by,
      existing.proposal_id
    );
    return existing.proposal_id;
  }

  const proposal_id = ulid();
  db.prepare(
    `INSERT INTO proposals (proposal_id, job_id, product_line, price, delivery_days, body_md, research_notes, generated_at, generated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`
  ).run(
    proposal_id,
    p.job_id,
    p.product_line,
    p.price,
    p.delivery_days,
    p.body_md,
    p.research_notes,
    p.generated_by
  );

  db.prepare(
    `UPDATE jobs SET status = 'proposing', updated_at = datetime('now') WHERE job_id = ?`
  ).run(p.job_id);

  db.prepare(
    `INSERT INTO status_history (job_id, from_status, to_status, changed_by, note)
     VALUES (?, 'collected', 'proposing', 'auto', 'proposal generated')`
  ).run(p.job_id);

  return proposal_id;
}

export function getProposal(db: Database.Database, job_id: string) {
  return db.prepare('SELECT * FROM proposals WHERE job_id = ?').get(job_id);
}

export function getPendingGenerationRequests(db: Database.Database) {
  return db
    .prepare(
      "SELECT * FROM generation_requests WHERE status = 'pending' ORDER BY created_at ASC"
    )
    .all() as Array<{
    request_id: number;
    job_id: string;
    prompt_hint: string | null;
    status: string;
  }>;
}

export function markGenerationRequest(
  db: Database.Database,
  request_id: number,
  status: 'processing' | 'done' | 'failed',
  error: string | null = null
) {
  db.prepare(
    `UPDATE generation_requests SET status = ?, processed_at = datetime('now'), error_message = ?
     WHERE request_id = ?`
  ).run(status, error, request_id);
}

export function logExaUsage(db: Database.Database, query: string, count: number) {
  db.prepare(
    'INSERT INTO exa_usage (query, result_count) VALUES (?, ?)'
  ).run(query, count);
}

export function getExaMonthlyUsage(db: Database.Database): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) as cnt FROM exa_usage WHERE called_at >= datetime('now', 'start of month')`
    )
    .get() as { cnt: number };
  return row.cnt;
}
