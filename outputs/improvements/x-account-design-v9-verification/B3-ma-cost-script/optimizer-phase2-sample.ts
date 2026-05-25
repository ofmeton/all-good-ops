/**
 * Managed Agents (MA) - Optimizer Phase 2 最小サンプル
 *
 * 目的: v9 設計の Optimizer Phase 2 (週次仮説検証、Opus 4.7 想定) を MA で simulate し、
 *       長時間バッチ (30 分連続) の実コストを測定する。
 *
 * 注意: このスクリプトは API call を発生させます。実行前にユーザー承認必須。
 *
 * 前提:
 *   - .env.local に ANTHROPIC_API_KEY, MA_AGENT_ID_OPUS, MA_ENVIRONMENT_ID
 *   - MA agent は Opus 4.7 で別途作成 (model: claude-opus-4-7,
 *     system_prompt: 「あなたは X 運用 Optimizer。analytics データから仮説検証 + 反例検索」)
 *   - tool 呼び出し simulate のため、ダミー analytics データを user.message で feed
 *
 * 想定:
 *   input  ~3,000 tok (analytics + 仮説リスト)
 *   thinking + output ~5,000 tok (Opus extended thinking 想定)
 *   tool 呼び出し 5-10 回 (web search 含めない、内部 reasoning 中心)
 *   wall-clock 約 30 分
 *
 * 出力: token usage / wall-clock / 推定 cost
 */

import Anthropic from "@anthropic-ai/sdk";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env.local") });

const API_KEY = process.env.ANTHROPIC_API_KEY;
const AGENT_ID = process.env.MA_AGENT_ID_OPUS;
const ENVIRONMENT_ID = process.env.MA_ENVIRONMENT_ID;

if (!API_KEY || !AGENT_ID || !ENVIRONMENT_ID) {
  console.error(
    "[FATAL] .env.local に ANTHROPIC_API_KEY / MA_AGENT_ID_OPUS / MA_ENVIRONMENT_ID を設定してください"
  );
  process.exit(1);
}

const client = new Anthropic({ apiKey: API_KEY });

// ダミー analytics データ (v9 で想定する週次集計の最小形)
const DUMMY_ANALYTICS = `
週次 X analytics (2026-W21):
- フォロワー: 312 (前週 285, +9.5%)
- impression: 18,420 (前週 22,100, -16.6%)
- engagement rate: 2.1% (前週 2.8%, -25%)

投稿別 (top5):
1. "Claude で Excel 集計 5h→15min" : imp 4,200, like 80, rt 12
2. "AI tips: prompt の前提条件分離" : imp 3,800, like 45, rt 5
3. "freee 自動化の落とし穴 3 つ"     : imp 3,100, like 60, rt 8
4. "Cursor vs Claude Code 比較"      : imp 2,900, like 30, rt 3
5. "MCP server 自作してみた"         : imp 2,500, like 25, rt 2

前週の仮説 (Interviewer ログより):
H1: 朝 7 時投稿のほうが夜 21 時より impression 1.5 倍
H2: 「具体時短数値」入り投稿のほうが engagement 2 倍
H3: AI tool 比較系は中小事業者層に刺さらない
`;

const TASK_PROMPT = `
以下の analytics データと前週仮説を検証し、次週の運用方針を提案してください。
- 各仮説 (H1-H3) について「支持/部分支持/反証/データ不足」を判定
- 仮説に対する反例 (counter-example) を最低 1 つ examine
- 次週の投稿配分案を 3 つ提示し、それぞれの予想 KPI を numeric に
- 思考プロセスは extended thinking で開示

analytics:
${DUMMY_ANALYTICS}
`;

interface PollResult {
  status: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

async function sendAndWaitIdle(sessionId: string, text: string, timeoutMs: number): Promise<PollResult & { stats?: { active_seconds?: number; duration_seconds?: number } }> {
  // 1. send user message
  // SDK type OK (beta exported)
  await client.beta.sessions.events.send(sessionId, {
    events: [{ type: "user.message", content: [{ type: "text", text }] }],
  });

  // 2. running に切り替わるまで最大 30 秒待つ (race 回避)
  const runStart = Date.now();
  while (Date.now() - runStart < 30_000) {
    // SDK type OK (beta exported)
    const s = await client.beta.sessions.retrieve(sessionId);
    if (s.status === "running" || s.status === "rescheduling") break;
    await new Promise((r) => setTimeout(r, 500));
  }

  // 3. idle / terminated を待つ
  const idleStart = Date.now();
  while (Date.now() - idleStart < timeoutMs) {
    // SDK type OK (beta exported)
    const s = await client.beta.sessions.retrieve(sessionId);
    if (s.status === "idle" || s.status === "terminated") {
      return { status: s.status, usage: (s as any).usage, stats: (s as any).stats };
    }
    await new Promise((r) => setTimeout(r, 10_000));
  }
  throw new Error("timeout: session did not become idle within budget");
}

async function main() {
  const overallStart = Date.now();
  const startedAt = new Date().toISOString();

  console.log("=== MA Optimizer Phase 2 Sample (Opus 4.7) ===");
  console.log(`started_at: ${startedAt}`);
  console.log(`agent_id (opus): ${AGENT_ID}`);
  console.log("");

  // SDK type OK (beta exported)
  const session = await client.beta.sessions.create({
    agent: AGENT_ID,
    environment_id: ENVIRONMENT_ID,
  });
  console.log(`session_id: ${session.id}`);

  // 最大 45 分待機 (想定 30 分 + バッファ)
  const result = await sendAndWaitIdle(session.id, TASK_PROMPT, 45 * 60 * 1000);

  // archive 前に stats を取る
  // SDK type OK (beta exported)
  const finalSession = await client.beta.sessions.retrieve(session.id);
  const finalStats = (finalSession as any).stats;
  console.log("");
  console.log(`final_active_seconds: ${finalStats?.active_seconds}`);
  console.log(`final_duration_seconds: ${finalStats?.duration_seconds}`);

  // SDK type OK (beta exported)
  await client.beta.sessions.archive(session.id);

  const overallEnd = Date.now();
  const wallClockSec = (overallEnd - overallStart) / 1000;
  const wallClockHour = wallClockSec / 3600;

  // Opus 4.7: input $15 / 1M, output $75 / 1M (要確認 — pricing は変動)
  const totalIn = result.usage?.input_tokens ?? 0;
  const totalOut = result.usage?.output_tokens ?? 0;
  const tokenCost = (totalIn / 1_000_000) * 15 + (totalOut / 1_000_000) * 75;
  const sessionCost = wallClockHour * 0.08;
  const totalCost = tokenCost + sessionCost;

  console.log("");
  console.log("=== Summary ===");
  console.log(`wall_clock_sec:  ${wallClockSec.toFixed(1)}`);
  console.log(`wall_clock_hour: ${wallClockHour.toFixed(4)}`);
  console.log(`input_tokens:    ${totalIn}`);
  console.log(`output_tokens:   ${totalOut}`);
  console.log(`status:          ${result.status}`);
  console.log(`token_cost_usd:   $${tokenCost.toFixed(4)}`);
  console.log(`session_cost_usd: $${sessionCost.toFixed(4)}`);
  console.log(`TOTAL_USD:        $${totalCost.toFixed(4)}`);
  console.log(`TOTAL_JPY (155):  ¥${(totalCost * 155).toFixed(1)}`);
  console.log("");
  console.log(JSON.stringify({ session_id: session.id, wall_clock_sec: wallClockSec, usage: result.usage }, null, 2));
}

main().catch((e) => {
  console.error("[ERROR]", e);
  process.exit(1);
});
