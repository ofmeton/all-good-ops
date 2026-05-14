import { NextResponse } from 'next/server';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';

export const runtime = 'nodejs';

// fill-form の Python スクリプトが書き出すログを tail して、
// - tail: 末尾 30 行
// - error_lines: ❌ を含む行（exit code は無いが失敗を即時検知できる）
// - done: ✅ 提案送信完了 を含むか（DB 反映前でも先んじて検知できる保険）
// を返す簡易エンドポイント。
//
// セキュリティ:
// - file は basename のみ受け付け、`fill-form-<PREFIX>-YYYYMMDD-NNN-<ISO>.log` の
//   形式に厳格マッチさせる（path traversal 完全遮断）
// - 読み出し先は ~/Library/Application Support/bsa-pa 固定

const LOG_DIR = join(homedir(), 'Library', 'Application Support', 'bsa-pa');
const LOG_NAME_RE =
  /^fill-form-[A-Z]{2,5}-\d{8}-\d{3}-\d{4}-\d{2}-\d{2}T[\d-]+Z\.log$/;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const file = url.searchParams.get('file') ?? '';
  if (!LOG_NAME_RE.test(file)) {
    return NextResponse.json({ error: 'invalid file name' }, { status: 400 });
  }

  let content: string;
  try {
    content = await readFile(join(LOG_DIR, file), 'utf8');
  } catch {
    // まだログが作られていない瞬間は空で返す（ポーリング側でリトライ可能）
    return NextResponse.json({ tail: [], error_lines: [], done: false });
  }

  const lines = content.split('\n').filter((l) => l.length > 0);
  const tail = lines.slice(-30);
  const error_lines = lines.filter((l) => l.includes('❌'));
  const done = lines.some((l) => l.includes('✅ 提案送信完了'));
  return NextResponse.json({ tail, error_lines, done });
}
