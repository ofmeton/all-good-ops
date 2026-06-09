/**
 * lib/ma/run-session.ts — Managed Agents (GA) SSE-drain セッション util
 *
 * Anthropic Managed Agents (beta `managed-agents-2026-04-01`) を
 * Cloudflare Workers (queue consumer) から駆動する共通ユーティリティ。
 *
 * フロー (task1 で workerd 実証済の GA API 形):
 *   environments.create(cloud) → agents.create(custom tool 可) → sessions.create
 *   → events.stream(先に開く) → events.send(user.message)
 *   → drain: agent.message 累積 / agent.custom_tool_use を host 側で実行し
 *     user.custom_tool_result 返却 / span.model_request_end で usage 記録
 *   → session.status_idle(stop_reason!=="requires_action") or terminated で終了
 *   → session.usage 取得 → archive (後始末)
 *
 * 課金は **トークン課金** (session.usage / model_request_end.model_usage)。
 * 旧 teardown.ts の active_seconds / 固定 order / idle 課金リーク前提は GA に
 * 存在しない (削除済)。
 *
 * 道具: web_search/bash/file は agent_toolset_20260401 内蔵 (Exa 不要)。
 *   自前道具 (twitterapi/Supabase 等) は custom tool として渡し、実行は
 *   customToolHandler で host 側に注入する (執筆Ag が DI する)。
 *
 * 堅牢性 (code review 反映):
 *   - 停滞ストリームでも timeoutMs で確実に打ち切る (iterator を timer と race)。
 *   - env/agent/session の後始末は成功/失敗どちらでも finally で実行 (リーク防止)。
 *   - stub は IN_MEMORY_FALLBACK のみで発動。本番でキー欠落は ok:false(error)。
 *   - handler 未注入の custom tool は is_error で返し ok:false (偽成功にしない)。
 *   - ok は stopReason/terminal から判定 (refusal/max_tokens/terminated は失敗)。
 *   - usage/cleanup の握り潰しは warn ログを残す。
 */

import type { TraceMeta } from "../trace/types.js";

/** custom tool 定義。`type` 省略時は "custom" を補完する (GA は type 必須)。 */
export interface MaToolDef {
  type?: "custom";
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

/** custom tool もしくは内蔵ツール (例 `{type:"agent_toolset_20260401"}`)。 */
export type MaTool = MaToolDef | ({ type: string } & Record<string, unknown>);

export interface MaAgentSpec {
  name: string;
  model: string;
  system?: string;
  /** tool 定義。custom tool は MaToolDef、内蔵は {type:"agent_toolset_20260401"} 等。省略時ツール無し。 */
  tools?: MaTool[];
}

/** custom tool の host 側実行。name/input を受けて結果文字列を返す。 */
export type CustomToolHandler = (
  name: string,
  input: unknown,
) => Promise<string> | string;

export interface RunMaSessionDeps {
  /**
   * ephemeral 経路では必須（environment/agent を毎回 create する元仕様）。
   * persistent 経路（agentRef 指定時）では create をスキップするため省略可。
   * persistent でも model は trace/cost のために渡してよい（任意）。
   */
  agent?: MaAgentSpec;
  /**
   * 永続 Managed Agent の参照。指定時は persistent 経路に入り、
   * environments.create / agents.create をスキップして既存 agent を再利用する
   * （agent-registry.getAgentRef の戻りを流用）。version 省略時は session.create
   * の agent から version を外す。
   */
  agentRef?: { id: string; version?: string };
  /** persistent 経路で再利用する environment id（agentRef とセットで指定）。 */
  environmentId?: string;
  userMessage: string;
  apiKey?: string;
  customToolHandler?: CustomToolHandler;
  environment?: { name?: string; networking?: "unrestricted" | "limited" };
  timeoutMs?: number;
  /** テスト用: () => number（既定 Date.now）。 */
  now?: () => number;
  /** trace meta を上流に渡す (queue case 側で withTrace に接続)。 */
  onTrace?: (m: TraceMeta) => void;
  /** drain 中の各イベントを上流に渡す（1B 観測の session_event 永続化に接続）。 */
  onEvent?: (ev: import("../trace/types.js").SessionEventInput) => void;
  /** 終了時に session を archive する (既定 true)。 */
  archiveSession?: boolean;
  /** 終了時に agent を archive / environment を delete する (既定 true、使い捨て時)。 */
  cleanupAgentEnv?: boolean;
  /** テスト用に SDK client を注入。省略時は @anthropic-ai/sdk を遅延 import。 */
  client?: MaClientLike;
  /** ログ出力 (既定 console)。テストで差し替え可。 */
  logger?: { warn: (msg: string) => void };
}

export type MaTerminal = "idle" | "terminated" | "timeout" | "error";

export interface MaSessionResult {
  ok: boolean;
  /** session.status_idle 時の stop_reason.type (end_turn / refusal / max_tokens 等)。 */
  stopReason?: string;
  /** 終了状態。ok は terminal==="idle" && stopReason==="end_turn" で真。 */
  terminal?: MaTerminal;
  /** stub fallback で生成された結果か (本番では false/undefined)。 */
  stub?: boolean;
  /** agent が呼んだが handler 未注入だった custom tool 名。非空なら ok:false。 */
  unhandledTools: string[];
  transitions: string[];
  agentText: string;
  toolCalls: Array<{ name: string; input: unknown }>;
  modelUsage?: unknown;
  sessionUsage?: unknown;
  wallClockMs: number;
  ids: { env?: string; agent?: string; session?: string };
  error?: string;
}

/** 使用する beta MA API の最小型 (実証済の GA 形)。 */
export interface MaClientLike {
  beta: {
    environments: {
      create: (a: unknown) => Promise<{ id: string }>;
      delete: (id: string) => Promise<unknown>;
    };
    agents: {
      create: (a: unknown) => Promise<{ id: string; version: string }>;
      archive: (id: string) => Promise<unknown>;
    };
    sessions: {
      create: (a: unknown) => Promise<{ id: string; status: string }>;
      retrieve: (id: string) => Promise<{ status: string; usage?: unknown }>;
      archive: (id: string) => Promise<unknown>;
      events: {
        stream: (id: string) => Promise<AsyncIterable<Record<string, unknown>>>;
        send: (id: string, body: unknown) => Promise<unknown>;
      };
    };
  };
}

const DEFAULT_TIMEOUT_MS = 120_000;

/** iterator.next() を時間制限付きで待つ。期限超過なら timedOut。 */
async function nextWithTimeout(
  it: AsyncIterator<Record<string, unknown>>,
  ms: number,
): Promise<{ timedOut: true } | { timedOut: false; res: IteratorResult<Record<string, unknown>> }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<{ timedOut: true }>((resolve) => {
    timer = setTimeout(() => resolve({ timedOut: true }), Math.max(0, ms));
  });
  try {
    return await Promise.race([
      it.next().then((res) => ({ timedOut: false as const, res })),
      timeout,
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * MA セッションを1本駆動して結果を返す。例外は throw せず result.error に載せる
 * (queue case 側で withTrace の status 判定に使える)。後始末は finally で実行。
 */
export async function runMaSession(deps: RunMaSessionDeps): Promise<MaSessionResult> {
  const now = deps.now ?? Date.now;
  const t0 = now();
  const apiKey = deps.apiKey ?? process.env.ANTHROPIC_API_KEY;
  const log = deps.logger ?? console;
  const transitions: string[] = [];
  const toolCalls: Array<{ name: string; input: unknown }> = [];
  const unhandledTools: string[] = [];
  const ids: MaSessionResult["ids"] = {};
  let agentText = "";
  let modelUsage: unknown;
  let sessionUsage: unknown;
  let stopReason: string | undefined;
  let terminal: MaTerminal | undefined;

  // ---- stub fallback: IN_MEMORY_FALLBACK のみで発動 (本番でキー欠落は stub しない) ----
  if (!deps.client && process.env.IN_MEMORY_FALLBACK === "true") {
    transitions.push("stub:env", "stub:agent", "stub:session", "stub:running");
    // persistent 経路では agent 省略可。tools 不在でも安全に動く（?. でガード）。
    const customTool = deps.agent?.tools?.find(
      (t): t is MaToolDef => "name" in t && typeof (t as { name?: unknown }).name === "string",
    );
    if (deps.customToolHandler && customTool) {
      const out = await deps.customToolHandler(customTool.name, {});
      toolCalls.push({ name: customTool.name, input: {} });
      transitions.push(`stub:custom_tool(${customTool.name})`, "stub:tool_result");
      agentText = `(stub) ${customTool.name}=${out}`;
    } else {
      agentText = "(stub) ok";
    }
    transitions.push("stub:idle(end_turn)");
    deps.onTrace?.({ model: deps.agent?.model, tokensIn: 0, tokensOut: 0 });
    return {
      ok: true, stub: true, stopReason: "end_turn", terminal: "idle",
      unhandledTools, transitions, agentText, toolCalls,
      modelUsage: { input_tokens: 0, output_tokens: 0 },
      sessionUsage: { input_tokens: 0, output_tokens: 0 },
      wallClockMs: now() - t0, ids: { env: "stub", agent: "stub", session: "stub" },
    };
  }

  // 本番経路: client 未注入かつキー無は stub せず明示エラー (誤 stub 投稿を防ぐ)。
  if (!deps.client && !apiKey) {
    return {
      ok: false, terminal: "error", unhandledTools, transitions, agentText, toolCalls,
      wallClockMs: now() - t0, ids,
      error: "ANTHROPIC_API_KEY unset — refusing to stub outside IN_MEMORY_FALLBACK.",
    };
  }

  // persistent 経路: agentRef があれば既存 env/agent を再利用し create/cleanup しない。
  const persistent = !!deps.agentRef;
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const archiveSession = deps.archiveSession ?? true;
  // persistent では env/agent は使い回すので既定で archive/delete しない（session は据置）。
  const cleanupAgentEnv = deps.cleanupAgentEnv ?? !persistent;
  let client: MaClientLike | undefined;

  // ephemeral 経路は agent 必須（create に使う）。persistent は agentRef を使うので不要。
  if (!persistent && !deps.agent) {
    return {
      ok: false, terminal: "error", unhandledTools, transitions, agentText, toolCalls,
      wallClockMs: now() - t0, ids,
      error: "runMaSession: deps.agent required for ephemeral path (no agentRef given).",
    };
  }

  try {
    client =
      deps.client ??
      (new ((await import("@anthropic-ai/sdk")).default)({ apiKey }) as unknown as MaClientLike);

    // SDK 版数ガード: Managed Agents API (beta.environments) 欠落を cryptic な
    // "reading 'create'" でなく明示エラーにする。古い @anthropic-ai/sdk が
    // node_modules に残ると本番 compose が全滅する（deploy 前 npm ci 必須）。
    if (typeof client.beta?.environments?.create !== "function") {
      throw new Error(
        "@anthropic-ai/sdk lacks Managed Agents API (beta.environments). " +
          "SDK too old — run `npm ci` (need >=0.101) and redeploy.",
      );
    }

    // 1–2. Environment / Agent
    //   persistent: 既存 env/agent を再利用（create スキップ）。本番 3 工程（writer/
    //               checker/collector）は全て agentRef を渡すこの経路（P2/P3 で移行済）。
    //   ephemeral:  毎回 create する（元仕様）。**現在 prod から呼ばれない＝テスト専用**
    //               （後方互換・stub・SDK 版数ガード等の単体テスト資産として残置。削除しない）。
    //               永続前提が崩れた緊急時のフォールバックとしても機能する。
    let agentSessionRef: { type: "agent"; id: string; version?: string };
    if (persistent) {
      ids.env = deps.environmentId;
      ids.agent = deps.agentRef!.id;
      agentSessionRef = {
        type: "agent",
        id: deps.agentRef!.id,
        ...(deps.agentRef!.version ? { version: deps.agentRef!.version } : {}),
      };
      transitions.push("env.reused", "agent.reused");
    } else {
      const agentSpec = deps.agent!; // ephemeral は上で必須チェック済
      const env = await client.beta.environments.create({
        name: deps.environment?.name ?? `xad-ma-${Math.floor(t0 / 1000)}`,
        config: { type: "cloud", networking: { type: deps.environment?.networking ?? "unrestricted" } },
      });
      ids.env = env.id;
      transitions.push("env.created");

      // custom tool は type:"custom" を補完。内蔵 toolset は type そのまま。
      const agent = await client.beta.agents.create({
        name: agentSpec.name,
        model: agentSpec.model,
        ...(agentSpec.system ? { system: agentSpec.system } : {}),
        ...(agentSpec.tools?.length
          ? { tools: agentSpec.tools.map((t) => ("type" in t && t.type ? t : { type: "custom", ...t })) }
          : {}),
      });
      ids.agent = agent.id;
      transitions.push("agent.created");
      agentSessionRef = { type: "agent", id: agent.id, version: agent.version };
    }

    // 3. Session（両経路で共有。agent 参照のみ経路で差し替え）
    const session = await client.beta.sessions.create({
      agent: agentSessionRef,
      environment_id: ids.env,
    });
    ids.session = session.id;
    transitions.push(`session.created(${session.status})`);

    // 4. stream-first → send
    const stream = await client.beta.sessions.events.stream(session.id);
    await client.beta.sessions.events.send(session.id, {
      events: [{ type: "user.message", content: [{ type: "text", text: deps.userMessage }] }],
    });

    // 5. drain (停滞しても timeoutMs で打ち切る)
    const deadline = t0 + timeoutMs;
    const it = stream[Symbol.asyncIterator]();
    let evSeq = 0;
    const emit = (type: import("../trace/types.js").SessionEventType, payload: unknown) => {
      deps.onEvent?.({ seq: evSeq++, type, payload });
    };
    for (;;) {
      const step = await nextWithTimeout(it, deadline - now());
      if (step.timedOut || now() > deadline) {
        transitions.push("TIMEOUT");
        terminal = "timeout";
        try { await it.return?.(); } catch { /* close best-effort */ }
        break;
      }
      if (step.res.done) break;
      const ev = step.res.value;
      const t = ev.type as string;
      if (t === "agent.message") {
        for (const b of (ev.content as Array<Record<string, unknown>>) ?? []) {
          if (b.type === "text" && typeof b.text === "string") {
            agentText += b.text;
            emit("text", { text: b.text });
          } else if (b.type === "thinking") {
            const tx = (typeof b.thinking === "string" ? b.thinking : typeof b.text === "string" ? b.text : "");
            emit("thinking", { text: tx });
          }
        }
        transitions.push("agent.message");
      } else if (t === "agent.custom_tool_use") {
        const name = ev.name as string;
        toolCalls.push({ name, input: ev.input });
        emit("custom_tool_use", { tool_use_id: ev.id, name, input: ev.input });
        transitions.push(`custom_tool_use(${name})`);
        let result: string;
        let isError = false;
        if (deps.customToolHandler) {
          result = await deps.customToolHandler(name, ev.input);
        } else {
          unhandledTools.push(name);
          result = `No handler registered for tool "${name}".`;
          isError = true;
          log.warn(`[ma] no customToolHandler for "${name}" (session ${ids.session})`);
        }
        await client.beta.sessions.events.send(session.id, {
          events: [{
            type: "user.custom_tool_result",
            custom_tool_use_id: ev.id,
            content: [{ type: "text", text: result }],
            ...(isError ? { is_error: true } : {}),
          }],
        });
        emit("custom_tool_result", { tool_use_id: ev.id, result, is_error: isError });
        transitions.push("custom_tool_result.sent");
      } else if (t === "span.model_request_end") {
        modelUsage = ev.model_usage;
        emit("model_request_end", { model_usage: ev.model_usage });
        transitions.push("model_request_end");
      } else if (t === "session.status_running") {
        transitions.push("running");
      } else if (t === "session.status_idle") {
        stopReason = (ev.stop_reason as { type?: string } | undefined)?.type;
        transitions.push(`idle(${stopReason})`);
        if (stopReason !== "requires_action") { terminal = "idle"; break; }
      } else if (t === "session.status_terminated") {
        transitions.push("terminated");
        terminal = "terminated";
        break;
      } else if (t === "session.error") {
        throw new Error(`session.error: ${JSON.stringify(ev)}`);
      }
    }

    // 6. session.usage (トークン課金)。失敗は warn して modelUsage を fallback に。
    try {
      const s = await client.beta.sessions.retrieve(session.id);
      sessionUsage = s.usage;
    } catch (e) {
      log.warn(`[ma] session.usage retrieve failed (session ${ids.session}): ${String(e)}`);
    }

    const usage = (sessionUsage ?? modelUsage ?? {}) as { input_tokens?: number; output_tokens?: number };
    deps.onTrace?.({ model: deps.agent?.model, tokensIn: usage.input_tokens, tokensOut: usage.output_tokens });

    const ok =
      terminal === "idle" &&
      stopReason === "end_turn" &&
      agentText.length > 0 &&
      unhandledTools.length === 0;

    return {
      ok, stopReason, terminal, unhandledTools, transitions, agentText, toolCalls,
      modelUsage, sessionUsage, wallClockMs: now() - t0, ids,
    };
  } catch (e) {
    terminal = terminal ?? "error";
    return {
      ok: false, stopReason, terminal, unhandledTools, transitions, agentText, toolCalls,
      modelUsage, sessionUsage, wallClockMs: now() - t0, ids,
      error: (e as { message?: string })?.message ?? String(e),
    };
  } finally {
    // 後始末は成功/失敗どちらでも実行 (cloud env は 5/org 上限。リーク防止)。
    // 作成済みリソースのみ対象。各失敗は warn して継続。
    if (client && ids.session && archiveSession) {
      try {
        for (let i = 0; i < 8; i++) {
          const s = await client.beta.sessions.retrieve(ids.session);
          if (s.status !== "running") break;
          await new Promise((r) => setTimeout(r, 250));
        }
        await client.beta.sessions.archive(ids.session);
        transitions.push("session.archived");
      } catch (e) {
        log.warn(`[ma] session.archive failed (${ids.session}): ${String(e)}`);
      }
    }
    if (client && cleanupAgentEnv) {
      if (ids.agent) {
        try { await client.beta.agents.archive(ids.agent); transitions.push("agent.archived"); }
        catch (e) { log.warn(`[ma] agent.archive failed (${ids.agent}): ${String(e)}`); }
      }
      if (ids.env) {
        try { await client.beta.environments.delete(ids.env); transitions.push("env.deleted"); }
        catch (e) { log.warn(`[ma] environment.delete failed (${ids.env}): ${String(e)}`); }
      }
    }
  }
}
