/**
 * optimizer-apply-nightly.ts — 夜間 optimizer 自動適用 CLI
 *
 * 使い方:
 *   npm run apply-nightly              # 実適用（NIGHTLY_DRY_RUN=1 で dry-run 化）
 *   npm run apply-nightly -- --dry-run # dry-run（提案分類プランのみ出力）
 *   npm run apply-nightly -- --force   # brownout バイパスして実適用
 *
 * 前提: main repo の apps/x-account-system/.env.local に prod creds。
 * 実適用しない: deploy / push / code-tier 提案への書込はしない。
 */

import { readFileSync, existsSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { runNightlyApply } from "../lib/optimizer-apply/nightly.ts";
import { defaultApplyDeps } from "../lib/optimizer-apply/apply-engine.ts";
import { classifyTier } from "../lib/optimizer-apply/validation.ts";
import { pushLine } from "../lib/line/line-client.ts";
import type { NightlyApplyDeps } from "../lib/optimizer-apply/nightly.ts";
import type { ProposalRow } from "../lib/optimizer-apply/types.ts";

const MAIN_REPO = "/Users/rikukudo/Projects/private-agents/all-good-ops";
const APP_DIR = "apps/x-account-system";
const LOCK = path.join(tmpdir(), "optimizer-apply-nightly.lock");

const PROPOSAL_COLS =
  "id, proposal_type, scope, hypothesis, evidence, rank, accepted, implemented, reviewer_reason, meta";

// ---- .env.local 読込（optimizer-apply-code.ts と同方式）----
for (const l of readFileSync(path.join(MAIN_REPO, APP_DIR, ".env.local"), "utf8").split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && process.env[m[1]] === undefined) {
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

// ---- env ハードアサート ----
// tier-T state-store が SUPABASE_SCHEMA env を参照するため xad に固定
delete process.env.IN_MEMORY_FALLBACK;
process.env.SUPABASE_SCHEMA = "xad";

const REQUIRED_ENVS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "LINE_CHANNEL_ACCESS_TOKEN",
  "LINE_USER_ID_OFMETON",
] as const;

for (const key of REQUIRED_ENVS) {
  if (!process.env[key]) {
    console.error(`[nightly] FATAL: env ${key} が未設定。.env.local を確認してください。`);
    process.exit(1);
  }
}

// ---- 多重起動防止 lock ----
if (existsSync(LOCK)) {
  console.error(
    `[nightly] 多重起動防止 lock が存在: ${LOCK}\n` +
    `異常終了の残骸なら手動削除してください。`,
  );
  process.exit(2);
}
writeFileSync(LOCK, String(process.pid));

// ---- Supabase client (xad schema) ----
function buildSb() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "xad" }, auth: { persistSession: false } },
  );
}

// ---- defaultApplyDeps ベースに getMonthlyCostJpy / countCodeTierRemaining を注入 ----
function buildNightlyDeps(): NightlyApplyDeps {
  const sb = buildSb();
  const base = defaultApplyDeps();

  return {
    ...base,

    async getMonthlyCostJpy() {
      const now = new Date();
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      const { data, error } = await sb
        .from("cost_ledger")
        .select("cost_jpy")
        .gte("created_at", monthStart.toISOString())
        .lt("created_at", monthEnd.toISOString());
      if (error || !data) {
        console.warn("[nightly] getMonthlyCostJpy failed:", error?.message ?? "no data");
        return 0;
      }
      return (data as Array<{ cost_jpy: number }>).reduce(
        (s, r) => s + (r.cost_jpy ?? 0),
        0,
      );
    },

    async countCodeTierRemaining() {
      const { data, error } = await sb
        .from("optimizer_proposal")
        .select(PROPOSAL_COLS)
        .eq("accepted", true)
        .or("implemented.is.null,implemented.eq.false");
      if (error || !data) {
        console.warn("[nightly] countCodeTierRemaining failed:", error?.message ?? "no data");
        return 0;
      }
      return (data as ProposalRow[]).filter((r) => {
        const st = (r.meta as { apply_status?: string } | null)?.apply_status;
        // apply_status=null または skipped_manual（apply-code runner が処理できる状態）
        if (st != null && st !== "skipped_manual") return false;
        const tier = classifyTier(r);
        return tier === "config" || tier === "prompt";
      }).length;
    },

    // base の notify を拡張（stdout にも出力）
    async notify(summary) {
      console.log(`[notify] ${summary}`);
      const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
      const userId = process.env.LINE_USER_ID_OFMETON;
      if (token && userId) {
        await pushLine(userId, summary, token).catch((e) =>
          console.warn("[nightly] LINE push failed (fail-open):", String(e)),
        );
      }
    },
  };
}

// ---- main ----
(async () => {
  const args = process.argv.slice(2);
  const flag = (n: string) => args.includes(n);

  const dryRun = flag("--dry-run") || process.env.NIGHTLY_DRY_RUN === "1";
  const force = flag("--force");

  console.log(
    `[nightly] 起動 dryRun=${dryRun} force=${force} pid=${process.pid}`,
  );

  try {
    const deps = buildNightlyDeps();
    const result = await runNightlyApply(deps, { dryRun, force });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.errors > 0 ? 1 : 0;
  } finally {
    if (existsSync(LOCK)) unlinkSync(LOCK);
  }
})();
