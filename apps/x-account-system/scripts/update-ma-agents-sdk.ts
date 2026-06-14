/**
 * scripts/update-ma-agents-sdk.ts — SDK 直 update（--update 400 バグ回避・one-shot）
 *
 * 背景:
 *   `ant beta:agents update --tool '{json}' --tool '{json}'` の繰り返し --tool フラグが
 *   Anthropic API に `tools: value must be an array` 400 を起こす。
 *   SDK の `client.beta.agents.update()` は tools を配列で渡すので 400 が出ない。
 *
 * 対象: x-optimizer-analyst / x-collector（drift 検知済・writer/checker は触らない）
 *
 * 認証:
 *   apiKey: null を明示 → SDK は env var を読まず profile 認証に fallback
 *   (~/.config/anthropic/credentials/default.json の OAuth token = ant と同じ workspace)
 *   ⚠️ ANTHROPIC_API_KEY を export/環境変数にセットしないこと（別 workspace を叩く）
 *
 * 実行方法:
 *   npx tsx scripts/update-ma-agents-sdk.ts --dry-run   # 差分確認のみ
 *   npx tsx scripts/update-ma-agents-sdk.ts              # 本番 MA agent を更新 + DB 反映
 *
 * env: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SCHEMA は main repo .env.local から。
 */
import { config } from "dotenv";
// SUPABASE 認証情報は main repo の .env.local から（worktree には .env.local がない）
config({ path: "/Users/rikukudo/Projects/private-agents/all-good-ops/apps/x-account-system/.env.local" });

// dotenv でロードされた ANTHROPIC_API_KEY を削除して profile auth を強制する
// （.env.local の sk-ant-api03-... は別 workspace を指す可能性があるため）
delete process.env.ANTHROPIC_API_KEY;

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import {
  AGENT_MANIFESTS,
  renderAgentSpec,
  computeSystemHash,
  type MaAgentRow,
} from "../lib/ma/bootstrap-core.ts";

/** drift あり・更新対象の agent key 一覧（writer/checker は触らない）。 */
const TARGET_KEYS = ["x-collector", "x-optimizer-analyst"] as const;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[update-sdk] env ${name} is required`);
  return v;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  console.log(`[update-sdk] targets=${TARGET_KEYS.join(",")} dryRun=${dryRun}`);

  // 1. Supabase から既存 ma_agents を取得（before state の記録・バージョン確認）
  const sb = createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { db: { schema: (process.env.SUPABASE_SCHEMA || "xad") as "public" } },
  );
  const { data: rows, error } = await sb
    .from("ma_agents")
    .select("agent_key, agent_id, version, environment_id, model, system_hash");
  if (error) throw new Error(`[update-sdk] ma_agents read failed: ${error.message}`);
  const byKey = new Map((rows as MaAgentRow[]).map((r) => [r.agent_key, r]));

  // 2. Anthropic client — apiKey: null 明示で profile auth（env var を読まない）
  //    profile は ~/.config/anthropic/credentials/default.json の OAuth token を使う
  const ant = new Anthropic({ apiKey: null });

  let updatedCount = 0;

  for (const key of TARGET_KEYS) {
    const manifest = AGENT_MANIFESTS.find((m) => m.key === key)!;
    const existing = byKey.get(key);

    if (!existing) {
      console.log(`  SKIP ${key}: ma_agents に存在しない（create 済みか確認）`);
      continue;
    }

    const spec = renderAgentSpec(manifest);
    const newHash = computeSystemHash(spec.system);
    const before = { version: existing.version, hash: existing.system_hash };

    if (existing.system_hash === newHash && existing.model === manifest.model) {
      console.log(`  noop ${key}: drift なし (hash=${newHash})`);
      continue;
    }

    console.log(`  update ${key}:`);
    console.log(`    agent_id: ${existing.agent_id}`);
    console.log(`    version:  ${before.version} → (new)`);
    console.log(`    hash:     ${before.hash} → ${newHash}`);
    console.log(`    model:    ${existing.model} → ${manifest.model}`);

    if (dryRun) {
      console.log(`    [dry-run] 実行しない`);
      continue;
    }

    // 3. SDK で update — tools は配列なので 400 が出ない
    //    version は DB ではなく live の最新を fetch して渡す。DB(ma_agents) と API の version が
    //    skew していると "Concurrent modification detected. fetch the latest version and retry" 409 に
    //    なるため、API の指示どおり毎回 live 版を取得して楽観ロックに合わせる（再焼成の再発防止）。
    const live = await ant.beta.agents.retrieve(existing.agent_id);
    const liveVersion = Number((live as { version: number | string }).version);
    if (liveVersion !== Number(existing.version)) {
      console.log(`    ⚠️ version skew: DB=${existing.version} live=${liveVersion} → live を採用`);
    }
    const result = await ant.beta.agents.update(existing.agent_id, {
      version: liveVersion,
      name: spec.name,
      model: spec.model,
      system: spec.system,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: spec.tools as any,
    });
    console.log(`    → updated: v${existing.version} → v${result.version}`);

    // 4. xad.ma_agents の version / system_hash を更新
    const { error: upErr } = await sb.from("ma_agents").upsert(
      {
        agent_key: key,
        agent_id: result.id,
        version: String(result.version),
        environment_id: existing.environment_id,
        model: manifest.model,
        system_hash: newHash,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "agent_key" },
    );
    if (upErr) throw new Error(`[update-sdk] ma_agents upsert failed (${key}): ${upErr.message}`);
    console.log(`    DB: version=${result.version} hash=${newHash}`);
    updatedCount++;
  }

  console.log(`[update-sdk] done. updated=${updatedCount}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
