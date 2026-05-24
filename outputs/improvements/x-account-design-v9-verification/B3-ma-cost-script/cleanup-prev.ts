/**
 * 前 session (sesn_01Eo4gUGMQYLPvJbSrJ5DwBi) が running のまま放置されると
 * session-hour 課金が続く。idle 待ち → archive で止める。
 */
import Anthropic from "@anthropic-ai/sdk";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env.local") });

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const PREV_SESSION_ID = "sesn_01Eo4gUGMQYLPvJbSrJ5DwBi";

async function main() {
  console.log(`=== cleanup ${PREV_SESSION_ID} ===`);
  const start = Date.now();
  while (Date.now() - start < 5 * 60 * 1000) {
    const s = await client.beta.sessions.retrieve(PREV_SESSION_ID);
    const stats = (s as any).stats;
    const usage = (s as any).usage;
    console.log(
      `status=${s.status} active=${stats?.active_seconds}s duration=${stats?.duration_seconds}s in=${usage?.input_tokens} out=${usage?.output_tokens}`,
    );
    if (s.status === "idle") {
      await client.beta.sessions.archive(PREV_SESSION_ID);
      console.log("[OK] archived");
      return;
    }
    if (s.status === "terminated") {
      console.log("[OK] already terminated");
      return;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  console.log("[WARN] timeout — still not idle, leaving as is");
}

main().catch((e) => {
  console.error("[ERROR]", e?.message ?? e);
  process.exit(1);
});
