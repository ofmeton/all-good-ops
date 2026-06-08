/**
 * lib/ma/run-session.test.ts
 * - stub fallback (IN_MEMORY_FALLBACK) 経路
 * - deps.client 注入による real 経路 (custom-tool 往復 / idle / archive)
 * - error 経路
 * 実 API は叩かない (deps.client 注入 or stub)。ts-jest CJS 準拠。
 */
import { runMaSession, type MaClientLike } from "./run-session";

function asyncIterableOf(events: Array<Record<string, unknown>>): AsyncIterable<Record<string, unknown>> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const e of events) yield e;
    },
  };
}

/** custom_tool_use → idle(end_turn) を流す mock client。send 呼び出しを記録。 */
function makeMockClient(events: Array<Record<string, unknown>>) {
  const sends: unknown[] = [];
  const calls = { envCreate: 0, agentCreate: 0, sessionCreate: 0, archive: 0, envDelete: 0, agentArchive: 0 };
  const client: MaClientLike = {
    beta: {
      environments: {
        create: async () => { calls.envCreate++; return { id: "env_x" }; },
        delete: async () => { calls.envDelete++; return {}; },
      },
      agents: {
        create: async () => { calls.agentCreate++; return { id: "agent_x", version: "1" }; },
        archive: async () => { calls.agentArchive++; return {}; },
      },
      sessions: {
        create: async () => { calls.sessionCreate++; return { id: "sesn_x", status: "idle" }; },
        retrieve: async () => ({ status: "idle", usage: { input_tokens: 100, output_tokens: 20 } }),
        archive: async () => { calls.archive++; return {}; },
        events: {
          stream: async () => asyncIterableOf(events),
          send: async (_id: string, body: unknown) => { sends.push(body); return {}; },
        },
      },
    },
  };
  return { client, sends, calls };
}

describe("runMaSession", () => {
  describe("stub fallback (IN_MEMORY_FALLBACK)", () => {
    const prev = process.env.IN_MEMORY_FALLBACK;
    beforeAll(() => { process.env.IN_MEMORY_FALLBACK = "true"; });
    afterAll(() => { process.env.IN_MEMORY_FALLBACK = prev; });

    test("ツール無し: 実APIを叩かず ok を返す", async () => {
      const r = await runMaSession({
        agent: { name: "a", model: "claude-haiku-4-5" },
        userMessage: "hi",
      });
      expect(r.ok).toBe(true);
      expect(r.agentText).toContain("stub");
      expect(r.transitions).toContain("stub:idle(end_turn)");
      expect(r.ids.session).toBe("stub");
    });

    test("customToolHandler が stub 経路でも呼ばれる", async () => {
      const handler = jest.fn(async () => "FACT");
      const r = await runMaSession({
        agent: { name: "a", model: "claude-haiku-4-5", tools: [{ name: "get_x", description: "d", input_schema: { type: "object", properties: {} } }] },
        userMessage: "hi",
        customToolHandler: handler,
      });
      expect(handler).toHaveBeenCalledTimes(1);
      expect(r.toolCalls).toEqual([{ name: "get_x", input: {} }]);
      expect(r.agentText).toContain("get_x=FACT");
    });
  });

  describe("real 経路 (mock client 注入)", () => {
    test("custom-tool 往復 → idle(end_turn) → archive", async () => {
      const events = [
        { type: "session.status_running" },
        { type: "agent.custom_tool_use", id: "sevt_1", name: "get_brand_fact", input: { q: 1 } },
        { type: "span.model_request_end", model_usage: { input_tokens: 50, output_tokens: 10 } },
        { type: "agent.message", content: [{ type: "text", text: "投稿本文" }] },
        { type: "session.status_idle", stop_reason: { type: "end_turn" } },
      ];
      const { client, sends, calls } = makeMockClient(events);
      const handler = jest.fn(async () => "BRAND_FACT");
      const r = await runMaSession({
        agent: { name: "writer", model: "claude-haiku-4-5", tools: [{ name: "get_brand_fact", description: "d", input_schema: { type: "object", properties: {} } }] },
        userMessage: "書いて",
        apiKey: "sk-test",
        customToolHandler: handler,
        client,
      });
      expect(r.ok).toBe(true);
      expect(r.agentText).toBe("投稿本文");
      expect(r.toolCalls).toEqual([{ name: "get_brand_fact", input: { q: 1 } }]);
      expect(handler).toHaveBeenCalledWith("get_brand_fact", { q: 1 });
      // custom_tool_result が正しい id で送られたか
      const toolResultSend = sends.find((s) =>
        (s as { events?: Array<{ type?: string }> }).events?.[0]?.type === "user.custom_tool_result",
      ) as { events: Array<{ custom_tool_use_id?: string }> } | undefined;
      expect(toolResultSend?.events[0].custom_tool_use_id).toBe("sevt_1");
      expect(calls.archive).toBe(1);
      expect(calls.agentArchive).toBe(1);
      expect(calls.envDelete).toBe(1);
      expect(r.terminal).toBe("idle");
      expect(r.stopReason).toBe("end_turn");
      expect(r.unhandledTools).toEqual([]);
      expect((r.sessionUsage as { input_tokens?: number }).input_tokens).toBe(100);
    });

    test("handler 未指定の custom tool は is_error + ok:false (偽成功にしない)", async () => {
      const events = [
        { type: "agent.custom_tool_use", id: "sevt_2", name: "x", input: {} },
        { type: "agent.message", content: [{ type: "text", text: "ok" }] },
        { type: "session.status_idle", stop_reason: { type: "end_turn" } },
      ];
      const { client, sends } = makeMockClient(events);
      const warn = jest.fn();
      const r = await runMaSession({
        agent: { name: "a", model: "claude-haiku-4-5" },
        userMessage: "hi",
        apiKey: "sk-test",
        client,
        logger: { warn },
      });
      expect(r.ok).toBe(false);
      expect(r.unhandledTools).toEqual(["x"]);
      expect(warn).toHaveBeenCalled();
      const send = sends.find((s) =>
        (s as { events?: Array<{ type?: string }> }).events?.[0]?.type === "user.custom_tool_result",
      ) as { events: Array<{ is_error?: boolean; content: Array<{ text: string }> }> };
      expect(send.events[0].is_error).toBe(true);
      expect(send.events[0].content[0].text).toMatch(/No handler/);
    });

    test("refusal/max_tokens は ok:false (terminal=idle, stopReason 露出)", async () => {
      const events = [
        { type: "agent.message", content: [{ type: "text", text: "部分" }] },
        { type: "session.status_idle", stop_reason: { type: "refusal" } },
      ];
      const { client } = makeMockClient(events);
      const r = await runMaSession({
        agent: { name: "a", model: "claude-haiku-4-5" }, userMessage: "hi", apiKey: "sk-test", client,
      });
      expect(r.ok).toBe(false);
      expect(r.terminal).toBe("idle");
      expect(r.stopReason).toBe("refusal");
    });

    test("error 経路でも作成済み env/agent を後始末する (リーク防止)", async () => {
      const { client, calls } = makeMockClient([]);
      client.beta.sessions.create = async () => { throw new Error("boom"); };
      const r = await runMaSession({
        agent: { name: "a", model: "claude-haiku-4-5" }, userMessage: "hi", apiKey: "sk-test", client,
      });
      expect(r.ok).toBe(false);
      expect(r.terminal).toBe("error");
      // env/agent は作成済 → finally で削除/archive される (session は未作成=skip)
      expect(calls.agentArchive).toBe(1);
      expect(calls.envDelete).toBe(1);
    });

    test("SDK が古く Managed Agents API 欠落時は明示エラー (cryptic な reading 'create' を防ぐ)", async () => {
      // 旧 @anthropic-ai/sdk 模倣: beta はあるが environments が無い（0.36 等）。
      const client = { beta: {} } as unknown as MaClientLike;
      const r = await runMaSession({
        agent: { name: "a", model: "claude-haiku-4-5" }, userMessage: "hi", apiKey: "sk-test", client,
      });
      expect(r.ok).toBe(false);
      expect(r.terminal).toBe("error");
      expect(r.error).toMatch(/Managed Agents|npm ci/i);
    });

    test("停滞ストリームでも timeoutMs で打ち切る (TIMEOUT)", async () => {
      // 永遠に next() が解決しない iterator
      const stallStream: AsyncIterable<Record<string, unknown>> = {
        [Symbol.asyncIterator]() {
          return { next: () => new Promise<never>(() => { /* never */ }) };
        },
      };
      const { client } = makeMockClient([]);
      client.beta.sessions.events.stream = async () => stallStream;
      const r = await runMaSession({
        agent: { name: "a", model: "claude-haiku-4-5" }, userMessage: "hi", apiKey: "sk-test", client,
        timeoutMs: 50,
      });
      expect(r.transitions).toContain("TIMEOUT");
      expect(r.terminal).toBe("timeout");
      expect(r.ok).toBe(false);
    });

    test("idle(requires_action) では break せず継続", async () => {
      const events = [
        { type: "session.status_idle", stop_reason: { type: "requires_action" } },
        { type: "agent.message", content: [{ type: "text", text: "続き" }] },
        { type: "session.status_idle", stop_reason: { type: "end_turn" } },
      ];
      const { client } = makeMockClient(events);
      const r = await runMaSession({
        agent: { name: "a", model: "claude-haiku-4-5" }, userMessage: "hi", apiKey: "sk-test", client,
      });
      expect(r.agentText).toBe("続き");
      expect(r.ok).toBe(true);
    });

    test("session.create が throw → ok:false に error を載せる", async () => {
      const { client } = makeMockClient([]);
      client.beta.sessions.create = async () => { throw new Error("boom"); };
      const r = await runMaSession({
        agent: { name: "a", model: "claude-haiku-4-5" }, userMessage: "hi", apiKey: "sk-test", client,
      });
      expect(r.ok).toBe(false);
      expect(r.error).toContain("boom");
    });

    test("onTrace に model/tokens を渡す", async () => {
      const events = [
        { type: "agent.message", content: [{ type: "text", text: "x" }] },
        { type: "session.status_idle", stop_reason: { type: "end_turn" } },
      ];
      const { client } = makeMockClient(events);
      const onTrace = jest.fn();
      await runMaSession({
        agent: { name: "a", model: "claude-haiku-4-5" }, userMessage: "hi", apiKey: "sk-test", client, onTrace,
      });
      expect(onTrace).toHaveBeenCalledWith(expect.objectContaining({ model: "claude-haiku-4-5", tokensIn: 100, tokensOut: 20 }));
    });
  });

  describe("本番ガード (IN_MEMORY_FALLBACK 無効)", () => {
    const prev = process.env.IN_MEMORY_FALLBACK;
    beforeAll(() => { process.env.IN_MEMORY_FALLBACK = ""; });
    afterAll(() => { process.env.IN_MEMORY_FALLBACK = prev; });

    test("client 無 + キー無は stub せず ok:false(error) を返す (誤 stub 投稿防止)", async () => {
      const r = await runMaSession({
        agent: { name: "a", model: "claude-haiku-4-5" },
        userMessage: "hi",
        apiKey: undefined,
      });
      expect(r.ok).toBe(false);
      expect(r.stub).toBeUndefined();
      expect(r.error).toMatch(/ANTHROPIC_API_KEY/);
    });
  });
});
