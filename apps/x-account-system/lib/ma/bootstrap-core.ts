/**
 * lib/ma/bootstrap-core.ts — 永続 Managed Agent bootstrap の純ロジック。
 *
 * yaml パース / system materialize / tool 解決 / system_hash / 差分計算（create/
 * update/noop）を **API/DB 非依存の純関数**で提供する。実際の environments.create /
 * agents.create|update / ma_agents upsert は scripts/bootstrap-ma-agents.ts（impure）が
 * これらを使って行う。分離理由: bootstrap ロジックを実 API を叩かず単体テストするため。
 *
 * プロンプト/tool の SSOT は各工程モジュール（compose-prompts / check-prompts /
 * collector-*）。マニフェストは識別子（system_builder / tool 種別キー）だけを持ち、
 * 本文は重複させない。bootstrap-core はこれらを集約して create/update に渡す。
 */
import { createHash } from "node:crypto";
import yaml from "js-yaml";
import { buildWriterSystemPrompt, COMPOSE_TOOL_REGISTRY } from "../curation/compose-prompts.js";
import { buildCheckSystemPrompt, CHECK_TOOL_REGISTRY } from "../check/check-prompts.js";
import { buildExploreSystemPrompt } from "../ingest/collector-prompts.js";
import { COLLECTOR_TOOL_REGISTRY } from "../ingest/collector-tools.js";

/** *.agent.yaml の seed マニフェスト形（checker/collector/editor でも使い回す汎用形）。 */
export interface AgentManifest {
  /** ma_agents.agent_key（registry 引き当てキー）。 */
  key: string;
  /** Anthropic 側 agent 表示名。 */
  name: string;
  /** モデル id（例 claude-opus-4-8）。 */
  model: string;
  /** system 本文を生成するビルダ関数の識別子（SYSTEM_BUILDERS のキー）。 */
  system_builder: string;
  /** tool 種別キー（COMPOSE_TOOL_REGISTRY のキー）。 */
  tools: string[];
}

/** system_builder 識別子 → ビルダ関数。マニフェストはこのキーだけを持つ。 */
export const SYSTEM_BUILDERS: Record<string, () => string> = {
  buildWriterSystemPrompt,
  buildCheckSystemPrompt,
  buildExploreSystemPrompt,
};

/**
 * 全工程の tool 種別キー → 定義。配列値のキーは複数 tool に展開する
 * （例 collector_tools = 5 つの探索 tool）。web_toolset は compose の SSOT を共有。
 */
const MA_TOOL_REGISTRY: Record<string, unknown> = {
  ...COMPOSE_TOOL_REGISTRY,
  ...CHECK_TOOL_REGISTRY,
  ...COLLECTOR_TOOL_REGISTRY,
};

/** xad.ma_agents の行（差分計算に使う最小列）。 */
export interface MaAgentRow {
  agent_key: string;
  agent_id: string;
  version: string;
  environment_id: string;
  model: string;
  system_hash: string | null;
}

export type BootstrapAction = "create" | "update" | "noop";

export interface BootstrapPlanItem {
  manifest: AgentManifest;
  system: string;
  systemHash: string;
  action: BootstrapAction;
}

/** yaml テキストを AgentManifest にパース・検証（不正は throw）。 */
export function parseManifest(yamlText: string): AgentManifest {
  // js-yaml v4 の load は既定 DEFAULT_SCHEMA で安全（任意型を構築しない。PyYAML の
  // unsafe_load とは別物）。入力は repo 内の自前 seed のみだが、下で string/型を厳格検証する。
  const doc = yaml.load(yamlText) as Partial<AgentManifest> | null | undefined;
  if (!doc || typeof doc !== "object") {
    throw new Error("[bootstrap] manifest is empty or invalid");
  }
  const { key, name, model, system_builder, tools } = doc;
  for (const [field, val] of Object.entries({ key, name, model, system_builder })) {
    if (typeof val !== "string" || val.length === 0) {
      throw new Error(`[bootstrap] manifest missing string field: ${field}`);
    }
  }
  if (!Array.isArray(tools) || tools.some((t) => typeof t !== "string")) {
    throw new Error("[bootstrap] manifest.tools must be a string[]");
  }
  return {
    key: key as string,
    name: name as string,
    model: model as string,
    system_builder: system_builder as string,
    tools: tools as string[],
  };
}

/** system_builder 識別子からビルダを呼び system 本文を materialize（未知は throw）。 */
export function materializeSystem(manifest: AgentManifest): string {
  const builder = SYSTEM_BUILDERS[manifest.system_builder];
  if (!builder) {
    throw new Error(`[bootstrap] unknown system_builder: ${manifest.system_builder}`);
  }
  return builder();
}

/** tool 種別キーを定義に解決（未知キーは throw・配列値は展開）。agent に焼く tools を返す。 */
export function resolveTools(manifest: AgentManifest): unknown[] {
  const out: unknown[] = [];
  for (const toolKey of manifest.tools) {
    const def = MA_TOOL_REGISTRY[toolKey];
    if (def === undefined) {
      throw new Error(`[bootstrap] unknown tool key: ${toolKey}`);
    }
    if (Array.isArray(def)) out.push(...def);
    else out.push(def);
  }
  return out;
}

/** system 本文の安定ハッシュ（drift 検知用・16 hex 桁）。 */
export function computeSystemHash(system: string): string {
  return createHash("sha256").update(system, "utf8").digest("hex").slice(0, 16);
}

/**
 * 1 agent の create/update/noop を判定。
 *   - 既存無し → create
 *   - system_hash か model が drift し --update 指定 → update（新 version を切る）
 *   - それ以外 → noop（--update 無しでは drift しても新 version を切らない）
 */
export function planAgentAction(
  manifest: AgentManifest,
  system: string,
  existing: MaAgentRow | undefined,
  opts: { update: boolean },
): BootstrapAction {
  if (!existing) return "create";
  const drift =
    existing.system_hash !== computeSystemHash(system) || existing.model !== manifest.model;
  if (drift && opts.update) return "update";
  return "noop";
}

/** 既存行から再利用する environment_id を 1 つ選ぶ（無ければ undefined＝新規作成が必要）。 */
export function pickEnvironmentId(existing: MaAgentRow[]): string | undefined {
  return existing.find((r) => !!r.environment_id)?.environment_id;
}

/** 全マニフェスト × 既存行 → bootstrap プラン（dry-run 表示・実行の両方に使う）。 */
export function planBootstrap(
  manifests: AgentManifest[],
  existing: MaAgentRow[],
  opts: { update: boolean },
): BootstrapPlanItem[] {
  const byKey = new Map(existing.map((r) => [r.agent_key, r]));
  return manifests.map((manifest) => {
    const system = materializeSystem(manifest);
    return {
      manifest,
      system,
      systemHash: computeSystemHash(system),
      action: planAgentAction(manifest, system, byKey.get(manifest.key), opts),
    };
  });
}
