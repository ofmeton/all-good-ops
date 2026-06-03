/**
 * CLI entry point for Daily Digest (npm run digest:cli).
 * Separated from digest.ts so the Worker module is import-side-effect-free.
 *
 *   npm run digest:cli                  当日 KPI を集計し送信
 *   npm run digest:cli -- --dry-run     強制 stdout 代替
 */
import "dotenv/config";
import { runDailyDigest, toJstDateString } from "./digest.ts";

async function cli() {
  const argv = process.argv.slice(2);
  if (argv.includes("--dry-run")) {
    process.env.LINE_DRY_RUN = "true";
  }
  const now = new Date();
  const { payload, sendResult } = await runDailyDigest({ now });
  console.log(
    JSON.stringify(
      {
        date: toJstDateString(now),
        send_status: sendResult.status,
        meta: payload.meta,
      },
      null,
      2,
    ),
  );
}

cli().catch((e) => {
  console.error(e);
  process.exit(1);
});
