/**
 * Managed Agents (MA) - Interviewer 最小サンプル
 *
 * 目的: v9 設計の Interviewer ユースケース (5 ターン会話) を MA で simulate し、
 *       実コスト (token + session-hour) を測定する。
 *
 * 注意: このスクリプトは API call を発生させます。実行前にユーザー承認必須。
 *       README: ./run-and-measure.md を参照。
 *
 * 前提:
 *   - node v20+
 *   - npm i @anthropic-ai/sdk dotenv
 *   - .env.local に ANTHROPIC_API_KEY, MA_AGENT_ID, MA_ENVIRONMENT_ID
 *   - MA agent は事前に Console or `ant beta:agents create` で作成済み
 *     (model: claude-sonnet-4-6 推奨、system_prompt: 「あなたは X 運用 Interviewer です」程度)
 *   - MA environment も事前作成済み (default 環境で OK)
 *
 * 想定 token (5 ターン):
 *   input  ~500 tok/turn × 5 = 2,500 tok
 *   output ~200 tok/turn × 5 = 1,000 tok
 * 想定 wall-clock: 5-10 分
 *
 * 出力: 標準出力に session_id / 各ターンの token usage / 総 wall-clock / 推定 cost
 */

import Anthropic from "@anthropic-ai/sdk";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env.local") });

const API_KEY = process.env.ANTHROPIC_API_KEY;
const AGENT_ID = process.env.MA_AGENT_ID;
const ENVIRONMENT_ID = process.env.MA_ENVIRONMENT_ID;

if (!API_KEY || !AGENT_ID || !ENVIRONMENT_ID) {
  console.error(
    "[FATAL] .env.local に ANTHROPIC_API_KEY / MA_AGENT_ID / MA_ENVIRONMENT_ID を設定してください"
  );
  process.exit(1);
}

// SDK は beta header を自動付与 (docs より)
const client = new Anthropic({ apiKey: API_KEY });

// Interviewer 5 ターン分のスクリプト (ユーザー発話を simulate)
const TURNS: string[] = [
  "今週の X 運用で気になったこと: フォロワー増加が鈍化したのと、エンゲージメント率が前週比 -15%。",
  "鈍化の原因は、AI 系投稿が多すぎてターゲット (非エンジニア中小事業者) からズレた可能性。",
  "次週の仮説: 業務効率化の具体事例 (Excel→Claude で時短) を 3 投稿に増やすと反応戻る、で合ってる?",
  "投稿時間帯は朝 7 時と夜 21 時のどっちが効いていた?",
  "じゃあ次週は朝 7 時に Excel 事例 3 本 + 夜 21 時に AI tips 1 本でいこう。記録お願い。",
];

// ---------- 30 秒 sleep を 5 ターン目で挟む版に切り替える場合は true ----------
const SLEEP_BEFORE_LAST = process.env.SLEEP_BEFORE_LAST === "1";

interface TurnLog {
  turn: number;
  request_at: string;
  response_at: string;
  duration_sec: number;
  input_tokens?: number;
  output_tokens?: number;
  status: string;
}

async function sendAndWaitIdle(
  sessionId: string,
  text: string,
  timeoutMs = 5 * 60 * 1000,
): Promise<{
  status: string;
  usage?: { input_tokens?: number; output_tokens?: number };
  stats?: { active_seconds?: number; duration_seconds?: number };
}> {
  // 1. user.message を送信
  // SDK type OK (beta exported)
  await client.beta.sessions.events.send(sessionId, {
    events: [{ type: "user.message", content: [{ type: "text", text }] }],
  });

  // 2. running に切り替わるのを最大 30 秒待つ (race 回避)
  const runStart = Date.now();
  while (Date.now() - runStart < 30_000) {
    // SDK type OK (beta exported)
    const s = await client.beta.sessions.retrieve(sessionId);
    if (s.status === "running" || s.status === "rescheduling") break;
    await new Promise((r) => setTimeout(r, 500));
  }

  // 3. idle / terminated に戻るのを待つ
  const idleStart = Date.now();
  while (Date.now() - idleStart < timeoutMs) {
    // SDK type OK (beta exported)
    const s = await client.beta.sessions.retrieve(sessionId);
    if (s.status === "idle" || s.status === "terminated") {
      return {
        status: s.status,
        usage: (s as any).usage,
        stats: (s as any).stats,
      };
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("timeout: session did not become idle");
}

async function main() {
  const overallStart = Date.now();
  const startedAt = new Date().toISOString();

  console.log("=== MA Interviewer Sample ===");
  console.log(`started_at: ${startedAt}`);
  console.log(`agent_id:       ${AGENT_ID}`);
  console.log(`environment_id: ${ENVIRONMENT_ID}`);
  console.log("");

  // 1. Session 作成 (container provision)
  // SDK type OK (beta exported) (SDK 型が beta 公開前の場合)
  const session = await client.beta.sessions.create({
    agent: AGENT_ID,
    environment_id: ENVIRONMENT_ID,
  });
  console.log(`session_id: ${session.id}`);
  console.log(`initial_status: ${session.status}`);

  const turnLogs: TurnLog[] = [];

  // 2. 5 ターン送信 → 都度 idle 待ち
  for (let i = 0; i < TURNS.length; i++) {
    if (SLEEP_BEFORE_LAST && i === TURNS.length - 1) {
      console.log("[sleep 30s before last turn — wall-clock 課金挙動の確認用]");
      await new Promise((r) => setTimeout(r, 30 * 1000));
    }

    const reqAt = new Date().toISOString();
    const turnStart = Date.now();

    const result = await sendAndWaitIdle(session.id, TURNS[i]);
    const turnEnd = Date.now();

    turnLogs.push({
      turn: i + 1,
      request_at: reqAt,
      response_at: new Date(turnEnd).toISOString(),
      duration_sec: (turnEnd - turnStart) / 1000,
      input_tokens: result.usage?.input_tokens,
      output_tokens: result.usage?.output_tokens,
      status: result.status,
    });

    console.log(
      `turn ${i + 1}: ${((turnEnd - turnStart) / 1000).toFixed(1)}s, ` +
        `in=${result.usage?.input_tokens ?? "?"} out=${result.usage?.output_tokens ?? "?"} ` +
        `status=${result.status}`
    );

    if (result.status === "terminated") break;
  }

  // 3. archive 前に最終 retrieve (active_seconds / duration_seconds を取る)
  // SDK type OK (beta exported)
  const finalSession = await client.beta.sessions.retrieve(session.id);
  const finalStats = (finalSession as any).stats;
  const finalUsage = (finalSession as any).usage;
  console.log("");
  console.log(`final_status: ${finalSession.status}`);
  console.log(`final_active_seconds: ${finalStats?.active_seconds}`);
  console.log(`final_duration_seconds: ${finalStats?.duration_seconds}`);
  console.log(`final_input_tokens: ${finalUsage?.input_tokens}`);
  console.log(`final_output_tokens: ${finalUsage?.output_tokens}`);

  // 4. archive (session-hour 課金停止)
  // SDK type OK (beta exported)
  await client.beta.sessions.archive(session.id);

  const overallEnd = Date.now();
  const wallClockSec = (overallEnd - overallStart) / 1000;
  const wallClockHour = wallClockSec / 3600;

  // 4. cost 試算 (実値は Console で要 cross-check)
  // sonnet 4.6: input $3 / 1M, output $15 / 1M (要確認)
  const totalIn = turnLogs.reduce((a, t) => a + (t.input_tokens ?? 0), 0);
  const totalOut = turnLogs.reduce((a, t) => a + (t.output_tokens ?? 0), 0);
  const tokenCost = (totalIn / 1_000_000) * 3 + (totalOut / 1_000_000) * 15;
  const sessionCost = wallClockHour * 0.08;
  const totalCost = tokenCost + sessionCost;

  console.log("");
  console.log("=== Summary ===");
  console.log(`wall_clock_sec: ${wallClockSec.toFixed(1)}`);
  console.log(`wall_clock_hour: ${wallClockHour.toFixed(4)}`);
  console.log(`total_input_tokens: ${totalIn}`);
  console.log(`total_output_tokens: ${totalOut}`);
  console.log(`token_cost_usd:   $${tokenCost.toFixed(4)}`);
  console.log(`session_cost_usd: $${sessionCost.toFixed(4)} (= ${wallClockHour.toFixed(4)}h × $0.08)`);
  console.log(`TOTAL_USD:        $${totalCost.toFixed(4)}`);
  console.log(`TOTAL_JPY (155):  ¥${(totalCost * 155).toFixed(1)}`);
  console.log("");
  console.log(JSON.stringify({ session_id: session.id, turns: turnLogs, wall_clock_sec: wallClockSec }, null, 2));
}

main().catch((e) => {
  console.error("[ERROR]", e);
  process.exit(1);
});
