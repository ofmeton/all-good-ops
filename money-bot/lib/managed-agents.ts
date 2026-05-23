/**
 * Anthropic Managed Agents helper.
 *
 * spec: docs/superpowers/specs/2026-05-22-money-bot-design.md §6.1 (E 案)
 *
 * 流れ:
 *   1. session 作成 (agent + environment)
 *   2. user.message を events.send
 *   3. events.list を poll、agent.message の content を取得
 *   4. session.status_idle を見たら poll 終了
 */

const API_BASE = "https://api.anthropic.com/v1";
const BETA_HEADER = "managed-agents-2026-04-01";
const ANTHROPIC_VERSION = "2023-06-01";

function getHeaders(): Record<string, string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }
  return {
    "x-api-key": apiKey,
    "anthropic-version": ANTHROPIC_VERSION,
    "anthropic-beta": BETA_HEADER,
    "Content-Type": "application/json",
  };
}

interface SessionCreateResponse {
  id: string;
  status?: string;
}

interface ContentBlock {
  type: string;
  text?: string;
}

interface AgentEvent {
  type: string;
  content?: ContentBlock[] | string;
  id?: string;
  created_at?: string;
}

interface EventsListResponse {
  data: AgentEvent[];
  has_more?: boolean;
}

export interface ManagedAgentResult {
  text: string;
  sessionId: string;
  events: number;
}

export async function runManagedAgent(args: {
  agentId: string;
  environmentId: string;
  userMessage: string;
  maxPollMs?: number;
  pollIntervalMs?: number;
}): Promise<ManagedAgentResult> {
  const maxPollMs = args.maxPollMs ?? 120_000;
  const pollIntervalMs = args.pollIntervalMs ?? 2_000;

  const sessionRes = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      agent: args.agentId,
      environment_id: args.environmentId,
    }),
  });
  if (!sessionRes.ok) {
    throw new Error(
      `managed-agents: session create failed (${sessionRes.status}): ${await sessionRes.text()}`,
    );
  }
  const session = (await sessionRes.json()) as SessionCreateResponse;
  const sessionId = session.id;

  const sendRes = await fetch(`${API_BASE}/sessions/${sessionId}/events`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      events: [
        {
          type: "user.message",
          content: [{ type: "text", text: args.userMessage }],
        },
      ],
    }),
  });
  if (!sendRes.ok) {
    throw new Error(
      `managed-agents: send failed (${sendRes.status}): ${await sendRes.text()}`,
    );
  }

  const startAt = Date.now();
  let lastAgentMessageContent = "";
  let eventCount = 0;
  let done = false;

  while (!done && Date.now() - startAt < maxPollMs) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));
    const listRes = await fetch(
      `${API_BASE}/sessions/${sessionId}/events?limit=50`,
      { headers: getHeaders() },
    );
    if (!listRes.ok) {
      throw new Error(
        `managed-agents: events list failed (${listRes.status}): ${await listRes.text()}`,
      );
    }
    const list = (await listRes.json()) as EventsListResponse;
    eventCount = list.data.length;
    for (const evt of list.data) {
      if (evt.type === "agent.message") {
        if (typeof evt.content === "string") {
          lastAgentMessageContent = evt.content;
        } else if (Array.isArray(evt.content)) {
          const text = evt.content
            .filter((b) => b.type === "text" && typeof b.text === "string")
            .map((b) => b.text as string)
            .join("\n");
          if (text) lastAgentMessageContent = text;
        }
      }
      if (evt.type === "session.status_idle" || evt.type === "session.completed") {
        done = true;
      }
    }
  }

  if (!lastAgentMessageContent) {
    throw new Error(
      `managed-agents: no agent.message received within ${maxPollMs}ms (sessionId=${sessionId}, events=${eventCount})`,
    );
  }

  return { text: lastAgentMessageContent, sessionId, events: eventCount };
}

export function getAgentId(role: "writer" | "visual" | "reviewer" | "sns"): string {
  const env: Record<string, string | undefined> = {
    writer: process.env.MANAGED_AGENT_WRITER_ID,
    visual: process.env.MANAGED_AGENT_VISUAL_ID,
    reviewer: process.env.MANAGED_AGENT_REVIEWER_ID,
    sns: process.env.MANAGED_AGENT_SNS_ID,
  };
  const id = env[role];
  if (!id) throw new Error(`Managed Agent ID not set for role: ${role}`);
  return id;
}

export function getEnvironmentId(): string {
  const id = process.env.MANAGED_ENVIRONMENT_ID;
  if (!id) throw new Error("MANAGED_ENVIRONMENT_ID not set");
  return id;
}

export function hasManagedAgentsConfig(): boolean {
  return Boolean(
    process.env.ANTHROPIC_API_KEY &&
      process.env.MANAGED_AGENT_WRITER_ID &&
      process.env.MANAGED_AGENT_VISUAL_ID &&
      process.env.MANAGED_AGENT_REVIEWER_ID &&
      process.env.MANAGED_AGENT_SNS_ID &&
      process.env.MANAGED_ENVIRONMENT_ID,
  );
}
