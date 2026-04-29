import { callClaudeHeadless, ClaudeHeadlessError } from './claude-headless.js';
import type Database from 'better-sqlite3';
import { logExaUsage, getExaMonthlyUsage } from './db.js';

const EXA_MONTHLY_LIMIT = 1000;
const EXA_WARNING_THRESHOLD = 800;

export class ExaQuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExaQuotaExceededError';
  }
}

export interface JobForResearch {
  title: string;
  description: string | null;
  client_name: string | null;
}

/**
 * 案件のリサーチ。
 * Exa MCP の月間上限（1000）を超えると ExaQuotaExceededError を throw する（自動スキップしない）。
 * 個別の研究失敗（Claude タイムアウト等）は warn ログ出してから空文字列を返す。
 */
export async function researchJob(
  db: Database.Database,
  job: JobForResearch
): Promise<string> {
  // Exa 使用量チェック
  const usage = getExaMonthlyUsage(db);
  if (usage >= EXA_MONTHLY_LIMIT) {
    throw new ExaQuotaExceededError(
      `Exa MCP 月間上限 (${EXA_MONTHLY_LIMIT}) に到達。処理を停止します。`
    );
  }
  if (usage >= EXA_WARNING_THRESHOLD) {
    console.warn(
      `⚠️ Exa MCP 使用量が ${usage}/${EXA_MONTHLY_LIMIT} に達しています`
    );
  }

  const prompt = `
あなたは BSA 受注のためのリサーチを行います。
以下の案件について、3 検索（最大）で発注者の業界・競合 LP・トレンドを調べ、
提案文に活かせる要点を Markdown でまとめてください。

【案件情報】
タイトル: ${job.title}
発注者: ${job.client_name ?? '不明'}
本文: ${job.description ?? '(本文なし)'}

【ルール】
- WebFetch を優先して使う（無料）
- Exa は本当に必要な時だけ。3検索を超えない
- 結果は Markdown 200-400字で、提案文に直接使える形に整える

【出力】
リサーチ結果サマリの Markdown 文字列のみ。
`;

  try {
    const result = await callClaudeHeadless<string | { result?: string }>({
      prompt,
      bare: true,
      // mcpConfig は本番では省略して user-scope の MCP に任せる選択肢もあるが
      // ここでは限定読み込みで起動高速化
      mcpConfig: 'config/exa-mcp.json',
      allowedTools: ['WebFetch', 'mcp__exa__web_search_exa'],
      effort: 'low',
      fallbackModel: 'sonnet',
      timeoutMs: 120_000,
    });

    // Exa 利用ログ（実際に Exa を叩いたかは不明だが、このリサーチ呼び出し1回として記録）
    logExaUsage(db, `research:${job.title.slice(0, 50)}`, 1);

    return typeof result === 'string' ? result : JSON.stringify(result);
  } catch (e) {
    if (e instanceof ExaQuotaExceededError) throw e;
    console.error(
      `[research] failed for "${job.title}":`,
      e instanceof ClaudeHeadlessError ? e.message : e
    );
    return ''; // リサーチ失敗時は空文字列で proceed（提案文は本文のみで生成）
  }
}
