import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { runMaSession } from "../ma/run-session.js";
import { getAgentRef as getAgentRefDefault } from "../ma/agent-registry.js";
import { buildSnapshot, defaultSnapshotDeps, renderSnapshotText } from "./snapshot.ts";
import { defaultToolDeps, makeToolHandler, type ToolDeps } from "./tools.ts";
import { costJpyFor } from "../cost/cost-of.js";
import { recordCostLedger } from "../cost/cost-ledger.js";
import { pushLine } from "../line/line-client.js";
import { insertSessionEvents, recordRunSession } from "../trace/session-event-store.js";
import type { SessionEventInput } from "../trace/types.js";

export interface AnalystDeps {
  buildSnapshotText: () => Promise<string>;
  getAgentRef: () => Promise<{ id: string; version?: string; environmentId?: string } | null>;
  runSession: (args: {
    userMessage: string;
    agentRef: { id: string; version?: string };
    environmentId?: string;
    customToolHandler: (n: string, i: unknown) => Promise<string>;
    /** run→session ブリッジ用 run id（無ければ session_event は session 単位でのみ残る）。 */
    runId?: string;
  }) => Promise<{ ok: boolean }>;
  toolDeps?: ToolDeps;
  countProposalsSince: (sinceMs: number) => Promise<number>;
  notify: (summary: string) => Promise<void>;
  recordCost: () => Promise<void>;
  now?: () => number;
}

export interface AnalystResult { ok: boolean; proposals: number }

// ---------------------------------------------------------------------------
// Production deps
// ---------------------------------------------------------------------------

const ANALYST_AGENT_KEY = "x-optimizer-analyst";
const ANALYST_MODEL = "claude-opus-4-8";

let _analystSb: SupabaseClient | null = null;
function getAnalystSb(): SupabaseClient | null {
  if (process.env.IN_MEMORY_FALLBACK === "true") return null;
  if (!_analystSb && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    _analystSb = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { db: { schema: (process.env.SUPABASE_SCHEMA || "public") as "public" } },
    );
  }
  return _analystSb;
}

export function defaultAnalystDeps(): AnalystDeps {
  const sb = getAnalystSb();
  // Capture session usage across runSession→recordCost
  let capturedUsage: { input_tokens: number; output_tokens: number } | undefined;

  return {
    async buildSnapshotText() {
      // 週次化に合わせ窓を 14 日に短縮。30 日窓を週次で回すと窓が大幅重複し提案が
      // 毎週ほぼ同一になるため。14 日 ≈ 4.4本/日×14 ≈ 62 投稿でエンゲージ信号を確保しつつ
      // 直近3日の未成熟分も許容する。
      const snapshot = await buildSnapshot(defaultSnapshotDeps(14));
      return renderSnapshotText(snapshot);
    },

    async getAgentRef() {
      if (!sb) return null;
      try {
        const ref = await getAgentRefDefault(sb, ANALYST_AGENT_KEY);
        return { id: ref.agentId, version: ref.version, environmentId: ref.environmentId };
      } catch (e) {
        console.warn("[optimizer-analyst] getAgentRef failed (fail-open):", String(e));
        return null;
      }
    },

    async runSession(args) {
      // メタ観測: agent 自身の思考も session_event に永続化（run-compose と同じ配線）。
      const sessionEvents: SessionEventInput[] = [];
      const res = await runMaSession({
        apiKey: process.env.ANTHROPIC_API_KEY,
        agentRef: { id: args.agentRef.id, version: args.agentRef.version },
        environmentId: args.environmentId,
        userMessage: args.userMessage,
        customToolHandler: args.customToolHandler,
        // 週次の重い opus job（read5ツール＋submit_proposal5回で ~164s）。既定 120s では
        // timeout し ok:false・提案0件になるため 5 分に拡張（240s 実行で ok/5提案を実証済）。
        timeoutMs: 300_000,
        onEvent: (e) => sessionEvents.push(e),
      });
      // 1B 観測: agent session のイベントと run→session ブリッジを永続化（fail-open）。
      if (res.ids?.session) {
        await insertSessionEvents(res.ids.session, ANALYST_AGENT_KEY, sessionEvents);
        await recordRunSession({
          runId: args.runId ?? "",
          stageId: "optimizer-analyst",
          sessionId: res.ids.session,
          agentKey: ANALYST_AGENT_KEY,
        });
      }
      // Capture usage for cost recording
      const usage = res.sessionUsage as { input_tokens?: number; output_tokens?: number } | undefined;
      if (usage) {
        capturedUsage = { input_tokens: usage.input_tokens ?? 0, output_tokens: usage.output_tokens ?? 0 };
      }
      return { ok: res.ok };
    },

    toolDeps: defaultToolDeps(),

    async countProposalsSince(sinceMs) {
      if (!sb) return 0;
      try {
        const { count, error } = await sb
          .from("optimizer_proposal")
          .select("id", { count: "exact", head: true })
          .gte("created_at", new Date(sinceMs).toISOString());
        if (error) return 0;
        return count ?? 0;
      } catch {
        return 0;
      }
    },

    async notify(summary) {
      const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
      const userId = process.env.LINE_USER_ID_OFMETON;
      if (!token || !userId) {
        console.warn("[optimizer-analyst] notify skipped: LINE env vars missing");
        return;
      }
      try {
        await pushLine(userId, summary, token);
      } catch (e) {
        console.warn("[optimizer-analyst] notify failed (fail-open):", String(e));
      }
    },

    async recordCost() {
      if (!sb || !capturedUsage) return;
      const inTok = capturedUsage.input_tokens;
      const outTok = capturedUsage.output_tokens;
      const costJpy = costJpyFor(ANALYST_MODEL, inTok, outTok);
      await recordCostLedger(sb, {
        category: "optimizer_analyst",
        costJpy,
        unitCount: inTok + outTok,
        meta: { model: ANALYST_MODEL },
      });
    },
  };
}

export async function runOptimizerAnalyst(
  deps: AnalystDeps = defaultAnalystDeps(),
  runId?: string,
): Promise<AnalystResult> {
  const now = deps.now ?? Date.now;
  const startedMs = now();
  const ref = await deps.getAgentRef();
  if (!ref) {
    try { await deps.notify("optimizer-analyst: agent未bootstrap のためスキップしました"); } catch { /* notify fail-open */ }
    return { ok: false, proposals: 0 };
  }

  const snapshotText = await deps.buildSnapshotText();
  const userMessage = `${snapshotText}\n\n---\n上記の観測を分析し、改善提案を submit_proposal で記録してください（最大5件）。新しい観測がない領域では提案しないでください（0件でも可）。直近約4週間の既出提案（上記スナップショットの recent proposals）と重複・実質同一の提案はしないでください。\n\n収集 ROI の目的関数は「コスト最小化でなく ¥当たり品質最大化」です（主=approved_yield_per_jpy / 従=published_engagement_per_jpy / guard=exploration_high_score_rate）。収集レバーに改善余地があれば scope=collector_lever で提案してください。`;

  const handler = deps.toolDeps ? makeToolHandler(deps.toolDeps) : async () => "ok";

  const res = await deps.runSession({
    userMessage,
    agentRef: { id: ref.id, version: ref.version },
    environmentId: ref.environmentId,
    customToolHandler: handler,
    runId,
  });
  await deps.recordCost();

  const proposals = await deps.countProposalsSince(startedMs);
  await deps.notify(`optimizer-analyst: ${proposals} 件の提案を記録（session ok=${res.ok}）`);
  return { ok: res.ok, proposals };
}
