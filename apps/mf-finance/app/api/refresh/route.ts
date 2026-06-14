import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

// localhost 単一ユーザー専用。ローカル資産から DB を再構築する手動 refresh。
// 入力は受け取らず固定スクリプトのみ実行（コマンドインジェクション余地なし）。
// CLI の `npm run refresh` と同じチェーン。いずれもローカル資産
//（raw CSV / data/account-balances.json）からの冪等再構築であり、
// MF からの新規取得ではない（最新化は別手順 scripts/acquire.md）。
export const runtime = "nodejs";

export async function POST() {
  const cwd = process.cwd();
  try {
    await run("node", ["scripts/normalize.mjs"], { cwd });
    const { stdout } = await run("node", ["scripts/load.mjs"], { cwd });
    // load は classification を classify.mjs 由来に戻すため、ルール（LLM/手動）を再適用して維持。
    const { stdout: rulesLog } = await run("node", ["scripts/apply-rules.mjs"], { cwd });
    // 取引固有の上書き（振替ペア・一点修正）をルールの後に再適用。
    const { stdout: ovLog } = await run("node", ["scripts/apply-overrides.mjs"], { cwd });
    // 資産推移と口座残高（お金レーダー）も再構築し、CLI の `npm run refresh` と揃える。
    const { stdout: assetsLog } = await run("node", ["scripts/load-assets.mjs"], { cwd });
    const { stdout: balLog } = await run("node", ["scripts/load-balances.mjs"], { cwd });
    return NextResponse.json({
      ok: true,
      log: `${stdout.trim()}\n${rulesLog.trim()}\n${ovLog.trim()}\n${assetsLog.trim()}\n${balLog.trim()}`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
