/**
 * scripts/bootstrap-ma-agents.ts — 永続 Managed Agent を bootstrap（ant CLI 版・冪等）
 *
 * 使い方:
 *   npm run ma:bootstrap -- --dry-run   # render 差分 + 実行予定の ant コマンドを表示（ant を叩かない）
 *   npm run ma:bootstrap                # 未登録 agent を `ant beta:agents create` + ma_agents upsert
 *   npm run ma:bootstrap -- --update    # drift した agent を `ant beta:agents update`（新 version）
 *
 * 設計（control plane = ant CLI / data plane = DB）:
 *   - Anthropic 側の environment / agent の create・update は **`ant` CLI をシェルアウト**して行う
 *     （SDK の beta agents create/update 直叩きは廃止）。
 *   - worker は `ant` を使えないので、agent_id/version/environment_id の worker 向け lookup は
 *     `xad.ma_agents`(DB) に残す（version up は DB 更新で反映＝redeploy 不要）。ここだけ supabase-js。
 *   - プロンプト/tools の SSOT は TS（lib/ma/bootstrap-core.ts AGENT_MANIFESTS + SYSTEM_BUILDERS）。
 *     ant に渡す形は renderAgentSpec が materialize。VCS 成果物は `npm run ma:render` が生成。
 *
 * 前提（人間が事前に用意）:
 *   1. `ant` CLI 導入 + ログイン: `brew install anthropics/tap/ant` → `ant auth login`
 *      （Linux は GitHub releases の binary）。Managed Agents は beta 自動付与。
 *   2. migration 0020_ma_agents.sql を本番 DB に適用済（xad.ma_agents 存在）。
 *   3. SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY（+ 任意 SUPABASE_SCHEMA=xad）。
 *   4. (推奨) `npm run ma:render` 実行済（agents/*.agent.yaml を最新化・差分コミット）。
 *
 * ⚠️ このスクリプトは **実行しない**（人間ゲート）。まず --dry-run でコマンドを確認し、
 *    本番反映の合図が出てから無印（create）/ --update を手動実行する。
 *
 * ⚠️ 要・実行前検証: ant の **出力抽出フラグ**（`--format json` 等）と placement は公式 docs 未確定。
 *    本実装は `--format json` を付与し stdout を JSON.parse で {id,version}/{id} を取る前提。
 *    初回実行前に `ant beta:agents create --help` で出力指定を確認し、必要なら ANT_FORMAT_FLAGS を直す。
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import {
  AGENT_MANIFESTS,
  renderAgentSpec,
  planBootstrap,
  pickEnvironmentId,
  buildAntEnvCreateArgs,
  buildAntAgentCreateArgs,
  buildAntAgentUpdateArgs,
  formatAntCommand,
  type AntAgentSpec,
  type MaAgentRow,
} from "../lib/ma/bootstrap-core.js";

/** ant の出力を JSON で受ける指定（**要・実行前検証**: `ant --help` で正しい指定を確認）。 */
const ANT_FORMAT_FLAGS = ["--format", "json"];

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[bootstrap] env ${name} is required`);
  return v;
}

/** ant 導入チェック（未導入は導入手順を出して中断）。 */
function preflightAnt(): void {
  try {
    execFileSync("ant", ["--version"], { stdio: "ignore" });
  } catch {
    throw new Error(
      "[bootstrap] `ant` CLI not found. install: `brew install anthropics/tap/ant` then `ant auth login`.",
    );
  }
}

/** ant をシェルアウト実行し stdout(JSON) を parse して返す（impure・実行時のみ）。 */
function runAntJson(args: string[]): Record<string, unknown> {
  const out = execFileSync("ant", [...args, ...ANT_FORMAT_FLAGS], { encoding: "utf8" });
  try {
    return JSON.parse(out) as Record<string, unknown>;
  } catch {
    throw new Error(
      `[bootstrap] failed to parse ant output as JSON (ANT_FORMAT_FLAGS 要確認). raw:\n${out.slice(0, 500)}`,
    );
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const update = argv.includes("--update");

  // 1. Supabase（xad schema）から既存 ma_agents を取得（差分計算 + worker lookup の正本）
  const sb = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    db: { schema: (process.env.SUPABASE_SCHEMA || "xad") as "public" },
  });
  const { data: rows, error } = await sb
    .from("ma_agents")
    .select("agent_key, agent_id, version, environment_id, model, system_hash");
  if (error) throw new Error(`[bootstrap] ma_agents read failed: ${error.message}`);
  const existing = (rows ?? []) as MaAgentRow[];
  const byKey = new Map(existing.map((r) => [r.agent_key, r]));

  // 2. プラン計算（TS SSOT から。render と同じ入力）
  const plan = planBootstrap(AGENT_MANIFESTS, existing, { update });
  const specByKey = new Map<string, AntAgentSpec>(AGENT_MANIFESTS.map((m) => [m.key, renderAgentSpec(m)]));
  const needEnv = !pickEnvironmentId(existing);

  console.log(`[bootstrap] agents=${AGENT_MANIFESTS.length} update=${update} dryRun=${dryRun} needEnvCreate=${needEnv}`);
  for (const item of plan) {
    console.log(`  - ${item.manifest.key}: ${item.action} (model=${item.manifest.model} hash=${item.systemHash})`);
  }

  // 3. dry-run: 実行予定の ant コマンドを表示して終了（ant を叩かない）
  if (dryRun) {
    console.log("\n[bootstrap] planned `ant` commands (--dry-run, not executed):");
    if (needEnv) console.log(`  $ ${formatAntCommand(buildAntEnvCreateArgs())}`);
    for (const item of plan) {
      if (item.action === "noop") continue;
      const spec = specByKey.get(item.manifest.key)!;
      const prev = byKey.get(item.manifest.key);
      const args =
        item.action === "create"
          ? buildAntAgentCreateArgs(spec)
          : buildAntAgentUpdateArgs(spec, prev!.agent_id, prev!.version);
      console.log(`  $ ${formatAntCommand(args)}`);
    }
    console.log("\n[bootstrap] --dry-run: no ant/DB writes. run `npm run ma:render` first if prompts changed.");
    return;
  }

  // 4. 実行: ant 前提チェック → environment（無ければ作成・共有）→ 各 agent create/update → DB upsert
  preflightAnt();

  let environmentId = pickEnvironmentId(existing);
  if (!environmentId) {
    const env = runAntJson(buildAntEnvCreateArgs());
    environmentId = String(env.id);
    console.log(`[bootstrap] created environment ${environmentId}`);
  }

  for (const item of plan) {
    if (item.action === "noop") {
      console.log(`  = ${item.manifest.key}: noop`);
      continue;
    }
    const spec = specByKey.get(item.manifest.key)!;
    let agentId: string;
    let version: string;
    if (item.action === "create") {
      const created = runAntJson(buildAntAgentCreateArgs(spec));
      agentId = String(created.id);
      version = String(created.version);
      console.log(`  + ${item.manifest.key}: created agent ${agentId} v${version}`);
    } else {
      const prev = byKey.get(item.manifest.key)!; // update は既存ありが前提（plan が保証）
      const updated = runAntJson(buildAntAgentUpdateArgs(spec, prev.agent_id, prev.version));
      agentId = String(updated.id);
      version = String(updated.version);
      console.log(`  ~ ${item.manifest.key}: updated agent ${agentId} → v${version}`);
    }

    const { error: upErr } = await sb.from("ma_agents").upsert(
      {
        agent_key: item.manifest.key,
        agent_id: agentId,
        version,
        environment_id: environmentId,
        model: item.manifest.model,
        system_hash: item.systemHash,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "agent_key" },
    );
    if (upErr) throw new Error(`[bootstrap] ma_agents upsert failed (${item.manifest.key}): ${upErr.message}`);
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
