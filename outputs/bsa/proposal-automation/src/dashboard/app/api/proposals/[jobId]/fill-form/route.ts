import { NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

export const runtime = 'nodejs';

// 提案画面に値を流し込む Python スクリプトを subprocess で起動する。
// 起動するだけで完了は待たない（Playwright headed が立ち上がるので、ユーザーは
// ブラウザ上で確認・送信する）。stdout/stderr はファイルにリダイレクトする。
//
// パス解決:
// - dashboard サーバーは src/dashboard で起動している前提なので
//   process.cwd() = .../proposal-automation/src/dashboard
//   2階層上が proposal-automation 直下。
// - venv: ~/.venvs/bsa-pa/bin/python
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  if (!/^[A-Z]{2,5}-\d{8}-\d{3}$/.test(jobId)) {
    return NextResponse.json({ error: 'invalid jobId format' }, { status: 400 });
  }

  // dashboard の cwd は src/dashboard。proposal-automation 直下まで2階層上がる。
  // 環境変数 BSA_PA_BASE があればそれを優先（運用上の安全策）。
  const baseDir =
    process.env.BSA_PA_BASE ?? resolve(process.cwd(), '..', '..');

  // prefix で媒体ごとのスクリプトを切替
  const prefix = jobId.split('-')[0];
  const scriptByPrefix: Record<string, string> = {
    LAN: '_lancers_form_fill.py',
    CW: '_crowdworks_form_fill.py',
    CN: '_coconala_form_fill.py',
  };
  const scriptName = scriptByPrefix[prefix];
  if (!scriptName) {
    return NextResponse.json(
      { error: `unsupported platform prefix: ${prefix}` },
      { status: 400 }
    );
  }
  const script = join(baseDir, 'scripts', 'lib', scriptName);
  const python = join(homedir(), '.venvs', 'bsa-pa', 'bin', 'python');

  const logDir = join(homedir(), 'Library', 'Application Support', 'bsa-pa');
  const logPath = join(
    logDir,
    `fill-form-${jobId}-${new Date().toISOString().replace(/[:.]/g, '-')}.log`
  );

  // 起動前にスクリプトの存在を確認（起動失敗を即時にユーザーに返すため）
  const fs = await import('node:fs');
  if (!fs.existsSync(script)) {
    return NextResponse.json(
      {
        error: `script not found: ${script} (cwd=${process.cwd()})`,
      },
      { status: 500 }
    );
  }
  if (!fs.existsSync(python)) {
    return NextResponse.json(
      { error: `python not found: ${python}` },
      { status: 500 }
    );
  }

  // 子プロセス起動 (detached + 標準出力をログファイルへ)
  const out = fs.openSync(logPath, 'a');
  const err = fs.openSync(logPath, 'a');

  const child = spawn(python, [script, '--job-id', jobId], {
    detached: true,
    stdio: ['ignore', out, err],
    cwd: baseDir,
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
  });
  child.unref();

  return NextResponse.json({
    ok: true,
    pid: child.pid,
    log: logPath,
    script,
    python,
    note: 'Playwright headed ブラウザが立ち上がるまで数秒待ってください',
  });
}
