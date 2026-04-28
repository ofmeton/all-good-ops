import { describe, it, expect } from 'vitest';
import {
  callClaudeHeadless,
  ClaudeHeadlessError,
} from '../src/claude-headless.js';

describe('callClaudeHeadless', () => {
  // モック: 'true' を実行する fake claude（exit 0、空 stdout）
  it('rejects on JSON parse failure', async () => {
    await expect(
      callClaudeHeadless({
        prompt: 'x',
        claudeBin: 'true',  // 何もしないコマンド、stdout 空
        timeoutMs: 5_000,
      })
    ).rejects.toBeInstanceOf(ClaudeHeadlessError);
  });

  it('rejects when binary not found', async () => {
    await expect(
      callClaudeHeadless({
        prompt: 'x',
        claudeBin: '/nonexistent/binary',
        timeoutMs: 5_000,
      })
    ).rejects.toBeInstanceOf(ClaudeHeadlessError);
  });

  it('rejects on non-zero exit code', async () => {
    await expect(
      callClaudeHeadless({
        prompt: 'x',
        claudeBin: 'false',  // exit 1
        timeoutMs: 5_000,
      })
    ).rejects.toBeInstanceOf(ClaudeHeadlessError);
  });

  // 実 claude を叩く統合テスト（CI ではスキップ）
  it.skipIf(!process.env.CLAUDE_E2E)(
    'returns parsed JSON from real claude with schema',
    async () => {
      const result = await callClaudeHeadless<{ message: string }>({
        prompt: 'Reply with JSON: {"message": "hello"}',
        schema: {
          type: 'object',
          properties: { message: { type: 'string' } },
          required: ['message'],
        },
        bare: true,
        effort: 'low',
        timeoutMs: 60_000,
      });
      expect(typeof result.message).toBe('string');
    },
    65_000
  );
});
