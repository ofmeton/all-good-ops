/**
 * lib/ma/bootstrap-core.ts — 永続 Managed Agent bootstrap の純ロジック。
 *
 * system materialize / tool 解決 / system_hash / 差分計算 / **ant CLI 用 render・コマンド
 * 生成**を API/DB/ant 非依存の純関数で提供する。実際の `ant beta:…`（control plane）実行と
 * ma_agents upsert（data plane）は scripts/bootstrap-ma-agents.ts（impure）が行う。
 * 分離理由: bootstrap/render ロジックを実 ant/API を叩かず単体テストするため。
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
import { buildOptimizerAnalystSystemPrompt } from "../optimizer-analyst/prompts.js";
import { OPTIMIZER_ANALYST_TOOL_REGISTRY } from "../optimizer-analyst/tools.js";

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
  buildOptimizerAnalystSystemPrompt,
};

/**
 * 全工程の tool 種別キー → 定義。配列値のキーは複数 tool に展開する
 * （例 collector_tools = 5 つの探索 tool）。web_toolset は compose の SSOT を共有。
 */
const MA_TOOL_REGISTRY: Record<string, unknown> = {
  ...COMPOSE_TOOL_REGISTRY,
  ...CHECK_TOOL_REGISTRY,
  ...COLLECTOR_TOOL_REGISTRY,
  ...OPTIMIZER_ANALYST_TOOL_REGISTRY,
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

// ---------------------------------------------------------------------------
// 永続 agent のソース SSOT（TS）+ ant CLI 用 render / コマンド生成
//
// control plane（Anthropic 側 environment/agent の create・update）は `ant` CLI で行う。
// プロンプト原文は TS ビルダ（SYSTEM_BUILDERS）が SSOT。ここでは ant が食える形へ render し、
// `ant beta:agents …` の **検証済 flag 形**コマンド引数を組む（純関数＝単体テスト可能）。
// ---------------------------------------------------------------------------

/**
 * 永続 agent のソース定義（旧・手書き agents/*.agent.yaml の独自形式を TS へ移設）。
 * これが render（agents/*.agent.yaml + *.system.md 生成）と bootstrap（ant コマンド生成）の
 * 唯一の入力。model は各工程の config と整合させる（writer=opus / checker=haiku / collector=sonnet）。
 */
export const AGENT_MANIFESTS: AgentManifest[] = [
  { key: "x-writer", name: "x-writer", model: "claude-opus-4-8", system_builder: "buildWriterSystemPrompt", tools: ["web_toolset", "submit_draft"] },
  { key: "x-checker", name: "x-checker", model: "claude-haiku-4-5", system_builder: "buildCheckSystemPrompt", tools: ["web_toolset", "submit_check"] },
  { key: "x-collector", name: "x-collector", model: "claude-sonnet-4-5", system_builder: "buildExploreSystemPrompt", tools: ["collector_tools", "web_toolset"] },
  { key: "x-optimizer-analyst", name: "x-optimizer-analyst", model: "claude-opus-4-8", system_builder: "buildOptimizerAnalystSystemPrompt", tools: ["optimizer_analyst_tools", "web_toolset", "submit_proposal"] },
];

/** 共有 cloud environment（org 上限回避のため全 agent で 1 つ使い回す）。 */
export const MA_ENVIRONMENT_NAME = "xad-ma-persistent";
export const MA_ENVIRONMENT_CONFIG = { type: "cloud", networking: { type: "unrestricted" } } as const;

/** ant に渡す agent 1 体の確定スペック（render の中間表現）。 */
export interface AntAgentSpec {
  key: string;
  name: string;
  model: string;
  system: string;
  tools: Record<string, unknown>[];
}

/**
 * custom tool は ant 用に type:"custom" を補完する（内蔵 toolset は type を維持）。
 * run-session の ephemeral 経路と同じ正規化（collector_tools は type 無しの素の def）。
 */
export function normalizeToolForAnt(tool: unknown): Record<string, unknown> {
  const t = (tool ?? {}) as Record<string, unknown>;
  if (typeof t.type === "string" && t.type.length > 0) return t;
  return { type: "custom", ...t };
}

/** manifest → ant 用 agent スペック（system を materialize・tools を解決/正規化）。 */
export function renderAgentSpec(manifest: AgentManifest): AntAgentSpec {
  return {
    key: manifest.key,
    name: manifest.name,
    model: manifest.model,
    system: materializeSystem(manifest),
    tools: resolveTools(manifest).map(normalizeToolForAnt),
  };
}

const GENERATED_HEADER =
  "# GENERATED by `npm run ma:render` from TS SSOT (lib/ma/bootstrap-core.ts AGENT_MANIFESTS).\n" +
  "# 手で編集しない。プロンプト原文は SYSTEM_BUILDERS（compose/check/collector-prompts）。\n";

/**
 * VCS 用の ant-native agent マニフェスト yaml を生成（IaC 成果物）。
 * system 本文は同名 <key>.system.md に分離し、yaml は相対パス参照を持つ（長文を yaml に焼かない）。
 * bootstrap は本 yaml を round-trip parse せず renderAgentSpec を直接使う（フラグ生成は下記）。
 */
export function renderAgentYaml(spec: AntAgentSpec): string {
  const doc = {
    name: spec.name,
    model: { id: spec.model },
    system: `./${spec.key}.system.md`,
    tools: spec.tools,
  };
  return GENERATED_HEADER + yaml.dump(doc, { lineWidth: 120, noRefs: true });
}

/** environment.yaml（ant beta:environments create 用）を生成。 */
export function renderEnvironmentYaml(): string {
  return GENERATED_HEADER + yaml.dump({ name: MA_ENVIRONMENT_NAME, config: MA_ENVIRONMENT_CONFIG }, { lineWidth: 120 });
}

// ---- ant CLI コマンド引数の組み立て（execFile 用 argv・shell 非経由＝エスケープ不要） ----
// 出力抽出フラグ（--format json 等）は公式 docs 未確定なので呼び出し側で付与する。

/** `ant beta:environments create …`（共有 cloud env）。 */
export function buildAntEnvCreateArgs(): string[] {
  return [
    "beta:environments", "create",
    "--name", MA_ENVIRONMENT_NAME,
    "--config", `{type: ${MA_ENVIRONMENT_CONFIG.type}, networking: {type: ${MA_ENVIRONMENT_CONFIG.networking.type}}}`,
  ];
}

/** spec → `--name/--model/--system/--tool…` の共通フラグ列。 */
function antAgentBodyFlags(spec: AntAgentSpec): string[] {
  const args = ["--name", spec.name, "--model", `{id: ${spec.model}}`, "--system", spec.system];
  // tools は配列全置換（update 含む）。各 tool は 1 つの --tool（公式: 反復可）。JSON は valid YAML。
  for (const t of spec.tools) args.push("--tool", JSON.stringify(t));
  return args;
}

/** `ant beta:agents create …`。 */
export function buildAntAgentCreateArgs(spec: AntAgentSpec): string[] {
  return ["beta:agents", "create", ...antAgentBodyFlags(spec)];
}

/**
 * `ant beta:agents update --agent-id <id> --version <v> …`。
 * 公式 update セマンティクス: 省略フィールドは保持・配列(tools)は全置換のため、name/model/system/tools を毎回渡す。
 */
export function buildAntAgentUpdateArgs(spec: AntAgentSpec, agentId: string, version: string | number): string[] {
  return ["beta:agents", "update", "--agent-id", agentId, "--version", String(version), ...antAgentBodyFlags(spec)];
}

/** argv を人間可読な 1 行コマンドに整形（dry-run 表示用。system 等の長値は省略表示）。 */
export function formatAntCommand(argv: string[]): string {
  const shown = argv.map((a) => {
    const oneLine = a.replace(/\s+/g, " ").trim();
    const v = oneLine.length > 60 ? `${oneLine.slice(0, 57)}…` : oneLine;
    return /[\s{}]/.test(v) ? `'${v}'` : v;
  });
  return `ant ${shown.join(" ")}`;
}
