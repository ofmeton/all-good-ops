/**
 * Managed Agents (MA) - Agent + Environment 作成スクリプト
 *
 * 目的: B-3 実コスト測定に必要な以下 3 リソースを一括で作成し、
 *       .env.local 用の環境変数を console.log で出力する。
 *
 *   - MA_ENVIRONMENT_ID  ... 共用 Environment 1 つ
 *   - MA_AGENT_ID        ... Interviewer (Sonnet 4.6)
 *   - MA_AGENT_ID_OPUS   ... Optimizer Phase 2 (Opus 4.7)
 *
 * 注意:
 *   - このスクリプトは Anthropic API call を発生させますが、Agent / Environment
 *     作成自体は (執筆時点で) 無料の想定。session を発行しなければ session-hour 課金は発生しない
 *   - SDK 型定義が beta API に追いついていない可能性があるため @ts-expect-error を付与
 *   - 出力された 3 行を .env.local に追記して、interviewer-sample.ts / optimizer-phase2-sample.ts を実行する流れ
 *
 * 前提:
 *   - node v20+
 *   - npm i @anthropic-ai/sdk dotenv
 *   - .env.local に ANTHROPIC_API_KEY を設定済み
 *   - Anthropic Console で MA beta 有効化済み (`managed-agents-2026-04-01` access)
 *
 * 実行:
 *   cd .../B3-ma-cost-script
 *   npx ts-node create-agents.ts
 */

import Anthropic from "@anthropic-ai/sdk";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env.local") });

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error("[FATAL] .env.local に ANTHROPIC_API_KEY を設定してください");
  process.exit(1);
}

const client = new Anthropic({ apiKey: API_KEY });

const INTERVIEWER_INSTRUCTIONS = `あなたは X 運用の Interviewer です。
ユーザー (個人ブランド ofmeton、葉山フリーランス、ターゲット: 非エンジニア経営者) の週次振り返りを 5 ターンで深掘りし、
最後に「次週仮説リスト」として箇条書きでまとめてください。

ルール:
- 1 ターン 1 質問、短く具体的に
- 抽象論を避け、具体的瞬間 / 数値 / 失敗談を引き出す
- 5 ターン目に必ず仮説リストで締める`;

const OPTIMIZER_INSTRUCTIONS = `あなたは X 運用の Optimizer Phase 2 です。
前週仮説と analytics データから、各仮説を「支持 / 反証 / データ不足」で判定し、
反例 examine と次週案を提示してください。

ルール:
- extended thinking を活用して、反例検索を丁寧に行う
- 仮説確度を A (反例なし) / B (反例少数 or データ薄) / C (反例多数 or 主観) でランク付け
- 次週案は config 変更レベルで具体的に (例: min_faves 閾値 300 → 250)`;

async function main() {
  console.log("=== MA Agent + Environment 作成 ===");
  console.log("");

  // 1. Environment 作成 (両 Agent で共用、最小設定)
  let envId: string;
  try {
    // SDK type OK (beta exported)
    const env = await client.beta.environments.create({
      name: "x-account-v9-test-env",
    });
    envId = env.id;
    console.log(`[OK] Environment 作成: ${envId}`);
  } catch (e: any) {
    console.error("[ERROR] Environment 作成失敗:", e?.message ?? e);
    console.error("  → SDK が environments API に対応していない可能性。Console で手動作成して MA_ENVIRONMENT_ID を取得してください。");
    console.error("  → Console: https://console.anthropic.com/managed-agents/environments");
    process.exit(1);
  }

  // 2. Interviewer agent (Sonnet 4.6)
  let interviewerId: string;
  try {
    // SDK type OK (beta exported)
    const interviewer = await client.beta.agents.create({
      name: "x-account-interviewer-test",
      model: "claude-sonnet-4-6",
      system: INTERVIEWER_INSTRUCTIONS,
    });
    interviewerId = interviewer.id;
    console.log(`[OK] Interviewer agent (Sonnet 4.6): ${interviewerId}`);
  } catch (e: any) {
    console.error("[ERROR] Interviewer agent 作成失敗:", e?.message ?? e);
    process.exit(1);
  }

  // 3. Optimizer agent (Opus 4.7)
  let optimizerId: string;
  try {
    // SDK type OK (beta exported)
    const optimizer = await client.beta.agents.create({
      name: "x-account-optimizer-test",
      model: "claude-opus-4-7",
      system: OPTIMIZER_INSTRUCTIONS,
    });
    optimizerId = optimizer.id;
    console.log(`[OK] Optimizer agent (Opus 4.7): ${optimizerId}`);
  } catch (e: any) {
    console.error("[ERROR] Optimizer agent 作成失敗:", e?.message ?? e);
    process.exit(1);
  }

  // 4. .env.local 用の出力
  console.log("");
  console.log("=== 以下 3 行を .env.local に追記してください ===");
  console.log(`MA_ENVIRONMENT_ID=${envId}`);
  console.log(`MA_AGENT_ID=${interviewerId}`);
  console.log(`MA_AGENT_ID_OPUS=${optimizerId}`);
  console.log("");
  console.log("次のステップ:");
  console.log("  1. 上記 3 行を .env.local に追記");
  console.log("  2. npx ts-node interviewer-sample.ts");
  console.log("  3. SLEEP_BEFORE_LAST=1 npx ts-node interviewer-sample.ts");
  console.log("  4. npx ts-node optimizer-phase2-sample.ts");
}

main().catch((e) => {
  console.error("[FATAL]", e);
  process.exit(1);
});
