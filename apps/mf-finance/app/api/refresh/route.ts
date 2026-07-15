import { NextResponse } from "next/server";
import { refreshData } from "@/lib/data-refresh";

// localhost 単一ユーザー専用。ローカル資産から DB を再構築する手動 refresh。
// 入力は受け取らず固定スクリプトのみ実行（コマンドインジェクション余地なし）。
// CLI の `npm run refresh` と同じチェーン。いずれもローカル資産
//（raw CSV / data/account-balances.json）からの冪等再構築であり、
// MF からの新規取得ではない（最新化は別手順 scripts/acquire.md）。
export const runtime = "nodejs";

export async function POST() {
  const cwd = process.cwd();
  try {
    const log = await refreshData(cwd);
    return NextResponse.json({ ok: true, log });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
