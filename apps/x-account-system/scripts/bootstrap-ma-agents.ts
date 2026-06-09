/**
 * scripts/bootstrap-ma-agents.ts — 永続 Managed Agent を bootstrap（SDK 版・冪等）
 *
 * 使い方:
 *   tsx scripts/bootstrap-ma-agents.ts --dry-run   # 差分表示のみ（create/update しない）
 *   tsx scripts/bootstrap-ma-agents.ts             # 未登録 agent を create + ma_agents upsert
 *   tsx scripts/bootstrap-ma-agents.ts --update    # drift した agent を update（新 version 発行）
 *   （package.json: npm run ma:bootstrap -- --dry-run）
 *
 * 前提（人間が事前に用意）:
 *   1. migration 0020_ma_agents.sql を本番 DB に適用済（xad.ma_agents 存在）。
 *   2. ANTHROPIC_API_KEY が有効（Managed Agents beta 利用可）。
 *   3. SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY（+ 任意 SUPABASE_SCHEMA=xad）。
 *
 * ⚠️ このスクリプトは P2 時点では **実行しない**（人間ゲート）。まず --dry-run で差分を確認し、
 *    本番反映の合図が出てから無印（create）/ --update を叩く。Anthropic 側に agent を作る
 *    ＝課金・本番資源生成のため、必ず人間承認後に手動実行する。
 *
 * Managed Agents 仕様: agent は create once → id 参照。model/system/tools は agent に乗り、
 * 更新は agents.update で新 version を切る。environment は cloud を 1 つ作って全 agent で
 * 再利用する（org あたり上限があるため使い回す）。client は client.beta.agents.* /
 * client.beta.environments.*。純ロジックは lib/ma/bootstrap-core.ts（単体テスト済）。
 */
import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import {
  parseManifest,
  resolveTools,
  planBootstrap,
  pickEnvironmentId,
  type AgentManifest,
  type MaAgentRow,
} from "../lib/ma/bootstrap-core.js";

const AGENTS_DIR = join(process.cwd(), "agents");

/** 実行に使う最小の Managed Agents client 型（実 SDK を cast して使う）。 */
interface BootstrapClient {
  beta: {
    environments: { create: (a: unknown) => Promise<{ id: string }> };
    agents: {
      create: (a: unknown) => Promise<{ id: string; version: string }>;
      update: (id: string, a: unknown) => Promise<{ id: string; version: string }>;
    };
  };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[bootstrap] env ${name} is required`);
  return v;
}

/** agents/*.agent.yaml を全 load（決定的順序）。 */
function loadManifests(dir: string): AgentManifest[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".agent.yaml"))
    .sort()
    .map((f) => parseManifest(readFileSync(join(dir, f), "utf8")));
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const update = argv.includes("--update");

  const manifests = loadManifests(AGENTS_DIR);
  if (manifests.length === 0) {
    console.log("[bootstrap] no *.agent.yaml found — nothing to do.");
    return;
  }

  // 1. Supabase（xad schema）から既存 ma_agents を取得（差分計算の基礎）
  const sb = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    db: { schema: (process.env.SUPABASE_SCHEMA || "xad") as "public" },
  });
  const { data: rows, error } = await sb
    .from("ma_agents")
    .select("agent_key, agent_id, version, environment_id, model, system_hash");
  if (error) throw new Error(`[bootstrap] ma_agents read failed: ${error.message}`);
  const existing = (rows ?? []) as MaAgentRow[];
  const byKey = new Map(existing.map((r) => [r.agent_key, r]));

  // 2. プランを計算して表示（dry-run はここで終了）
  const plan = planBootstrap(manifests, existing, { update });
  console.log(`[bootstrap] dir=${AGENTS_DIR} agents=${manifests.length} update=${update} dryRun=${dryRun}`);
  for (const item of plan) {
    console.log(`  - ${item.manifest.key}: ${item.action} (model=${item.manifest.model} hash=${item.systemHash})`);
  }
  if (dryRun) {
    console.log("[bootstrap] --dry-run: no changes applied.");
    return;
  }

  // 3. 実行: Anthropic に agent を create/update し ma_agents を upsert
  const client = new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") }) as unknown as {
    beta?: BootstrapClient["beta"];
  };
  if (typeof client.beta?.environments?.create !== "function") {
    throw new Error(
      "@anthropic-ai/sdk lacks Managed Agents API (beta.environments). run `npm ci` (need >=0.101).",
    );
  }
  const ma = client as unknown as BootstrapClient;

  // environment は既存を reuse、無ければ cloud を 1 つ作って全 agent で共有
  let environmentId = pickEnvironmentId(existing);
  if (!environmentId) {
    const env = await ma.beta.environments.create({
      name: "xad-ma-persistent",
      config: { type: "cloud", networking: { type: "unrestricted" } },
    });
    environmentId = env.id;
    console.log(`[bootstrap] created environment ${environmentId}`);
  }

  for (const { manifest, system, systemHash, action } of plan) {
    if (action === "noop") {
      console.log(`  = ${manifest.key}: noop`);
      continue;
    }
    const tools = resolveTools(manifest);
    let agentId: string;
    let version: string;
    if (action === "create") {
      const created = await ma.beta.agents.create({ name: manifest.name, model: manifest.model, system, tools });
      agentId = created.id;
      version = created.version;
      console.log(`  + ${manifest.key}: created agent ${agentId} v${version}`);
    } else {
      const prev = byKey.get(manifest.key)!; // update は既存ありが前提（plan が保証）
      const updated = await ma.beta.agents.update(prev.agent_id, { model: manifest.model, system, tools });
      agentId = updated.id;
      version = updated.version;
      console.log(`  ~ ${manifest.key}: updated agent ${agentId} → v${version}`);
    }

    const { error: upErr } = await sb.from("ma_agents").upsert(
      {
        agent_key: manifest.key,
        agent_id: agentId,
        version,
        environment_id: environmentId,
        model: manifest.model,
        system_hash: systemHash,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "agent_key" },
    );
    if (upErr) throw new Error(`[bootstrap] ma_agents upsert failed (${manifest.key}): ${upErr.message}`);
  }
  console.log("[bootstrap] done.");
}

// CLI 実行時のみ走らせる（import 時は副作用なし＝テスト可能）
if (process.argv[1] && process.argv[1].endsWith("bootstrap-ma-agents.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
