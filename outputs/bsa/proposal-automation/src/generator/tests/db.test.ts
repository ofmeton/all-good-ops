import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  getJobsAboveFitScore,
  upsertProposal,
  getProposal,
  getPendingGenerationRequests,
  markGenerationRequest,
  logExaUsage,
  getExaMonthlyUsage,
} from '../src/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db: Database.Database;

beforeEach(() => {
  db = new Database(':memory:');
  const schema = readFileSync(
    join(__dirname, '..', '..', 'shared', 'schema.sql'),
    'utf8'
  );
  db.exec(schema);
});

describe('getJobsAboveFitScore', () => {
  it('returns all jobs >= threshold, sorted by fit_score desc, status=collected only', () => {
    db.prepare(
      `INSERT INTO jobs (job_id, platform_prefix, source_url, detail_url, title, collected_at, fit_score, status)
       VALUES (?, 'LAN', 'x', 'y1', 't1', datetime('now'), 88, 'collected')`
    ).run('LAN-20260428-001');
    db.prepare(
      `INSERT INTO jobs (job_id, platform_prefix, source_url, detail_url, title, collected_at, fit_score, status)
       VALUES (?, 'LAN', 'x', 'y2', 't2', datetime('now'), 95, 'submitted')`
    ).run('LAN-20260428-002');
    db.prepare(
      `INSERT INTO jobs (job_id, platform_prefix, source_url, detail_url, title, collected_at, fit_score, status)
       VALUES (?, 'LAN', 'x', 'y3', 't3', datetime('now'), 70, 'collected')`
    ).run('LAN-20260428-003');
    db.prepare(
      `INSERT INTO jobs (job_id, platform_prefix, source_url, detail_url, title, collected_at, fit_score, status)
       VALUES (?, 'LAN', 'x', 'y4', 't4', datetime('now'), 92, 'collected')`
    ).run('LAN-20260428-004');

    const jobs = getJobsAboveFitScore(db, 80);
    expect(jobs.length).toBe(2);  // submitted は除外、70 はしきい値未満
    expect(jobs[0].job_id).toBe('LAN-20260428-004');  // 高スコア順
    expect(jobs[1].job_id).toBe('LAN-20260428-001');
  });

  it('returns empty when no job meets threshold', () => {
    db.prepare(
      `INSERT INTO jobs (job_id, platform_prefix, source_url, detail_url, title, collected_at, fit_score, status)
       VALUES (?, 'LAN', 'x', 'y1', 't1', datetime('now'), 75, 'collected')`
    ).run('LAN-20260428-001');
    expect(getJobsAboveFitScore(db, 80)).toHaveLength(0);
  });
});

describe('upsertProposal', () => {
  beforeEach(() => {
    db.prepare(
      `INSERT INTO jobs (job_id, platform_prefix, source_url, detail_url, title, collected_at, status)
       VALUES (?, 'LAN', 'x', 'y1', 't1', datetime('now'), 'collected')`
    ).run('LAN-20260428-001');
  });

  it('inserts new proposal and updates job status', () => {
    const id = upsertProposal(db, {
      job_id: 'LAN-20260428-001',
      product_line: 'L1',
      price: 30000,
      delivery_days: 3,
      body_md: 'proposal text',
      research_notes: 'notes',
      generated_by: 'claude-code-cli',
    });
    expect(id).toBeTruthy();

    const job = db.prepare("SELECT status FROM jobs WHERE job_id='LAN-20260428-001'").get() as { status: string };
    expect(job.status).toBe('proposing');

    const proposal = getProposal(db, 'LAN-20260428-001') as any;
    expect(proposal.body_md).toBe('proposal text');
  });

  it('updates existing proposal and creates revision', () => {
    upsertProposal(db, {
      job_id: 'LAN-20260428-001',
      product_line: 'L1', price: 30000, delivery_days: 3,
      body_md: 'first version', research_notes: null,
      generated_by: 'claude-code-cli',
    });
    upsertProposal(db, {
      job_id: 'LAN-20260428-001',
      product_line: 'L1', price: 35000, delivery_days: 4,
      body_md: 'second version', research_notes: null,
      generated_by: 'claude-code-cli',
    });
    const proposal = getProposal(db, 'LAN-20260428-001') as any;
    expect(proposal.body_md).toBe('second version');
    expect(proposal.price).toBe(35000);
    // revision に1つは記録されている
    const revs = db.prepare("SELECT * FROM proposal_revisions").all() as any[];
    expect(revs.length).toBe(1);
    expect(revs[0].body_md).toBe('first version');
  });
});

describe('getPendingGenerationRequests', () => {
  it('returns only pending requests', () => {
    db.prepare(
      `INSERT INTO jobs (job_id, platform_prefix, source_url, detail_url, title, collected_at)
       VALUES ('LAN-20260428-001', 'LAN', 'x', 'y1', 't1', datetime('now'))`
    ).run();
    db.prepare(
      `INSERT INTO generation_requests (job_id, status) VALUES ('LAN-20260428-001', 'pending')`
    ).run();
    db.prepare(
      `INSERT INTO generation_requests (job_id, status) VALUES ('LAN-20260428-001', 'done')`
    ).run();

    const reqs = getPendingGenerationRequests(db);
    expect(reqs.length).toBe(1);
    expect(reqs[0].status === undefined || reqs[0].status === 'pending').toBeTruthy();
  });
});

describe('markGenerationRequest', () => {
  beforeEach(() => {
    db.prepare(
      `INSERT INTO jobs (job_id, platform_prefix, source_url, detail_url, title, collected_at)
       VALUES ('LAN-20260428-001', 'LAN', 'x', 'y1', 't1', datetime('now'))`
    ).run();
    db.prepare(
      `INSERT INTO generation_requests (request_id, job_id, status) VALUES (1, 'LAN-20260428-001', 'pending')`
    ).run();
  });

  it('marks as done', () => {
    markGenerationRequest(db, 1, 'done');
    const row = db.prepare(`SELECT status FROM generation_requests WHERE request_id=1`).get() as { status: string };
    expect(row.status).toBe('done');
  });

  it('marks as failed with error_message', () => {
    markGenerationRequest(db, 1, 'failed', 'something broke');
    const row = db.prepare(`SELECT status, error_message FROM generation_requests WHERE request_id=1`).get() as { status: string; error_message: string };
    expect(row.status).toBe('failed');
    expect(row.error_message).toBe('something broke');
  });
});

describe('exa_usage', () => {
  it('logs and counts monthly usage', () => {
    logExaUsage(db, 'query1', 5);
    logExaUsage(db, 'query2', 3);
    expect(getExaMonthlyUsage(db)).toBe(2);
  });
});
