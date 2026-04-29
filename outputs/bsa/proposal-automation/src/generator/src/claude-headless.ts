/**
 * Claude Code CLI ヘッドレス呼び出しのラッパー。
 *
 * `claude -p "prompt"` を child_process で起動し、stdout の JSON を返す。
 * `--output-format json` の Claude Code の出力は { type, subtype, result, ... } 形式で、
 * `result` フィールドが本体（schema 適用時はここに JSON object が入る）。
 */

import { spawn } from 'node:child_process';

export interface ClaudeHeadlessOptions {
  /** Claude に渡すプロンプト（stdin で送る）。 */
  prompt: string;
  /** JSON Schema for structured output validation. */
  schema?: object;
  /** --bare: hooks / CLAUDE.md / auto-memory をスキップして高速化。 */
  bare?: boolean;
  /** --mcp-config 用 JSON ファイルパス（Exa MCP 等の限定読み込み）。 */
  mcpConfig?: string;
  /** 利用可能ツールを限定（複数）。例: ['WebFetch', 'mcp__exa__web_search_exa']。 */
  allowedTools?: string[];
  /** 思考の深さ。デフォルト: 'medium'。 */
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  /** Overload 時の代替モデル。例: 'sonnet'。 */
  fallbackModel?: string;
  /** タイムアウト（ms）。デフォルト 180,000 = 3分。 */
  timeoutMs?: number;
  /** claude binary のパス（テスト時に上書き可能）。デフォルトは PATH 解決の 'claude'。 */
  claudeBin?: string;
}

export class ClaudeHeadlessError extends Error {
  constructor(
    message: string,
    public readonly stderr: string,
    public readonly exitCode: number | null
  ) {
    super(message);
    this.name = 'ClaudeHeadlessError';
  }
}

export async function callClaudeHeadless<T = unknown>(
  opts: ClaudeHeadlessOptions
): Promise<T> {
  const args: string[] = [
    '--print',
    '--output-format',
    'json',
    '--no-session-persistence',
  ];
  if (opts.schema) {
    args.push('--json-schema', JSON.stringify(opts.schema));
  }
  if (opts.bare) args.push('--bare');
  if (opts.mcpConfig) args.push('--mcp-config', opts.mcpConfig);
  if (opts.allowedTools && opts.allowedTools.length > 0) {
    args.push('--allowedTools', ...opts.allowedTools);
  }
  if (opts.effort) args.push('--effort', opts.effort);
  if (opts.fallbackModel) args.push('--fallback-model', opts.fallbackModel);

  const bin = opts.claudeBin ?? 'claude';

  return new Promise<T>((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d: Buffer) => {
      stderr += d.toString();
    });

    const timeoutMs = opts.timeoutMs ?? 180_000;
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new ClaudeHeadlessError('claude headless timeout', stderr, null));
    }, timeoutMs);

    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(
        new ClaudeHeadlessError(`spawn failed: ${err.message}`, stderr, null)
      );
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        // stderr が空なら stdout にエラーが出ている可能性あり
        const detail = stderr.trim() || stdout.trim() || '(no output)';
        reject(
          new ClaudeHeadlessError(
            `claude exited ${code}: ${detail.slice(0, 800)}`,
            stderr,
            code
          )
        );
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        // claude --output-format json は { type, subtype, result, ... } 形式
        // result フィールドが本体
        const body = (parsed as { result?: unknown }).result ?? parsed;
        if (typeof body === 'string') {
          // schema 指定時でも文字列で返ることがあるので JSON 抽出を試みる
          // 1) markdown fence (```json ... ```) を除去
          // 2) 最初の '{' から最後の '}' を切り出して JSON.parse
          let cleaned = body.trim();
          cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
          const start = cleaned.indexOf('{');
          const end = cleaned.lastIndexOf('}');
          if (start >= 0 && end > start) {
            try {
              resolve(JSON.parse(cleaned.slice(start, end + 1)) as T);
              return;
            } catch {
              /* fall through */
            }
          }
          // それでもダメなら元の string をそのまま返す（呼び出し側で typeof 判定）
          resolve(body as unknown as T);
        } else {
          resolve(body as T);
        }
      } catch (e) {
        reject(
          new ClaudeHeadlessError(
            `JSON parse failed: ${stdout.slice(0, 500)}`,
            stderr,
            code
          )
        );
      }
    });

    child.stdin.write(opts.prompt);
    child.stdin.end();
  });
}
