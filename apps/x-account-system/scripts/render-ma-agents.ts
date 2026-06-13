/**
 * scripts/render-ma-agents.ts — TS SSOT から ant-native の agent 成果物を生成（純・冪等）
 *
 * 使い方:
 *   npm run ma:render            # agents/<key>.agent.yaml + <key>.system.md + environment.yaml を生成
 *
 * 生成物（VCS コミット対象＝IaC・ant ベストプラクティス）:
 *   agents/<key>.agent.yaml   … ant 用 agent マニフェスト（name/model/system 参照/tools）
 *   agents/<key>.system.md    … materialize した system 本文（プロンプト原文は SYSTEM_BUILDERS が SSOT）
 *   agents/environment.yaml   … 共有 cloud environment 定義
 *
 * プロンプトを変えたら本コマンドを再実行し、差分をコミットする。bootstrap はこの生成物と同じ
 * TS SSOT から ant コマンドを組むため、生成物は「人間レビュー用 + 手動 ant 実行用」の正本。
 * 実 API/ant は叩かない（純粋にローカルファイルを書くだけ）。
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  AGENT_MANIFESTS,
  renderAgentSpec,
  renderAgentYaml,
  renderEnvironmentYaml,
} from "../lib/ma/bootstrap-core.js";

const AGENTS_DIR = join(process.cwd(), "agents");

export interface RenderedFile {
  path: string;
  content: string;
}

/** 生成すべき全ファイル（path 絶対・content）を純粋に算出（テスト可能）。 */
export function planRender(agentsDir: string): RenderedFile[] {
  const files: RenderedFile[] = [
    { path: join(agentsDir, "environment.yaml"), content: renderEnvironmentYaml() },
  ];
  for (const manifest of AGENT_MANIFESTS) {
    const spec = renderAgentSpec(manifest);
    files.push({ path: join(agentsDir, `${spec.key}.agent.yaml`), content: renderAgentYaml(spec) });
    files.push({ path: join(agentsDir, `${spec.key}.system.md`), content: spec.system });
  }
  return files;
}

function main(): void {
  const files = planRender(AGENTS_DIR);
  for (const f of files) {
    writeFileSync(f.path, f.content);
    console.log(`wrote ${f.path} (${f.content.length} bytes)`);
  }
  console.log(`[render] ${files.length} files for ${AGENT_MANIFESTS.length} agents.`);
}

// CLI 実行時のみ走らせる（import 時は副作用なし＝テスト可能）
if (process.argv[1] && process.argv[1].endsWith("render-ma-agents.ts")) {
  main();
}
