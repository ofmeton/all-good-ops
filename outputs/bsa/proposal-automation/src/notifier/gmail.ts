/**
 * BSA Proposal Automation - Gmail summary email sender
 *
 * SQLite から当日の jobs / proposals を読んで、サマリーメールを Gmail MCP 経由で送信する。
 * Claude Code CLI ヘッドレスモード (--bare --allowedTools mcp__gmail__send_message) を使い、
 * Gmail MCP に send_message を依頼する形で動作する。
 */

import { spawn } from 'node:child_process';
import Database from 'better-sqlite3';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DB_PATH = join(
  homedir(),
  'Library/Application Support/bsa-pa/data.db'
);

interface ProposalRow {
  job_id: string;
  title: string;
  fit_score: number | null;
  estimated_product_line: string | null;
  budget_text: string | null;
  detail_url: string;
}

interface DailySummary {
  date: string;
  collected: number;
  proposals: ProposalRow[];
}

function buildSummary(db: Database.Database): DailySummary {
  const today = new Date().toISOString().slice(0, 10);

  // 直近24時間で集計（JST/UTC 日付境界のズレ回避）
  const collected = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM jobs WHERE collected_at >= datetime('now', '-24 hours')`
      )
      .get() as { c: number }
  ).c;

  const proposals = db
    .prepare(
      `SELECT j.job_id, j.title, j.fit_score, j.estimated_product_line, j.budget_text, j.detail_url
       FROM jobs j JOIN proposals p ON p.job_id = j.job_id
       WHERE p.generated_at >= datetime('now', '-24 hours')
       ORDER BY j.fit_score DESC LIMIT 10`
    )
    .all() as ProposalRow[];

  return { date: today, collected, proposals };
}

function buildBody(summary: DailySummary): string {
  const lines = [
    `BSA Proposal Automation 朝の収集レポート (${summary.date})`,
    '',
    `総収集数: ${summary.collected} 件`,
    `提案文準備: ${summary.proposals.length} 件`,
    '',
    'ダッシュボード: http://localhost:3000',
    '',
    '## 提案文準備済み案件 (上位10件)',
    '',
  ];
  summary.proposals.forEach((p, i) => {
    lines.push(`### ${i + 1}. ${p.title}`);
    lines.push(`- ID: ${p.job_id}`);
    lines.push(
      `- fit_score: ${p.fit_score ?? '-'} / 推奨ライン: ${p.estimated_product_line ?? '-'}`
    );
    lines.push(`- 予算: ${p.budget_text ?? '-'}`);
    lines.push(`- URL: ${p.detail_url}`);
    lines.push('');
  });
  return lines.join('\n');
}

async function sendViaClaudeMcp(
  subject: string,
  body: string,
  to: string
): Promise<void> {
  // claude -p に Gmail MCP 経由でメール送信を依頼
  const prompt = `Gmail MCP の send_message ツールを使って以下の内容でメールを送信してください。

To: ${to}
Subject: ${subject}

Body:
${body}

成功したら "ok" のみ返してください。失敗したらエラー内容を返してください。
`;

  return new Promise((resolve, reject) => {
    // --bare を外して user-scope の Gmail MCP を使う。
    const child = spawn(
      'claude',
      [
        '--print',
        '--output-format', 'text',
        '--allowedTools', 'mcp__gmail__send_message',
        '--effort', 'low',
        '--no-session-persistence',
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] }
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d: Buffer) => {
      stderr += d.toString();
    });
    child.on('error', (err) => {
      reject(new Error(`spawn failed: ${err.message}`));
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        const detail = stderr.trim() || stdout.trim() || '(no output)';
        reject(new Error(`claude exited ${code}: ${detail.slice(0, 800)}`));
      }
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

async function main(): Promise<number> {
  const db = new Database(DB_PATH, { readonly: true });
  try {
    const summary = buildSummary(db);
    const subject = `[BSA] ${summary.date} 朝の収集レポート (${summary.proposals.length}件提案準備完了)`;
    const body = buildBody(summary);
    const to = process.env.BSA_GMAIL_TO ?? 'off.me.ton@gmail.com';
    await sendViaClaudeMcp(subject, body, to);
    console.log(`✅ Gmail 送信完了 → ${to}`);
    return 0;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Gmail 送信失敗: ${msg}`);
    return 1;
  } finally {
    db.close();
  }
}

main().then((code) => process.exit(code));
