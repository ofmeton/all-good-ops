# Managed Agents (GA) セッション駆動

`@anthropic-ai/sdk` の **Managed Agents**（beta header `managed-agents-2026-04-01`）を
Cloudflare Workers の queue consumer から駆動する。本実装 = `run-session.ts`。

> 旧 `teardown.ts`（`send→running→idle→retrieve→archive` 固定 order / `active_seconds`
> 課金 / archive 前 retrieve しないと idle 課金リーク）は **現行 GA API に存在しない
> 前提**だったため削除した。GA は **トークン課金**（`session.usage` /
> `span.model_request_end.model_usage`）で、archive は単なる後始末。

## アーキテクチャ（GA・task1 で workerd 実証済）

```
Agent (永続/versioned: model+system+tools)  ← 1回作る
  └─ Session (毎回)  ── Environment (cloud コンテナ雛形)
        ↑ events.stream (SSE) / events.send (user.message, custom_tool_result)
```

- Anthropic 側が agent ループを実行。worker は **session を作って SSE で駆動**するだけ。
- tool: `web_search` / `bash` / file 系は `agent_toolset_20260401` 内蔵（**Exa 不要**）。
- 自前道具（twitterapi / Supabase 等）は **custom tool**: agent が `agent.custom_tool_use`
  を出す → **host 側（worker）で実行** → `user.custom_tool_result` を返す。

## フロー（run-session.ts）

```
environments.create({config:{type:"cloud", networking:{type:"unrestricted"}}})
→ agents.create({name, model, system, tools:[custom...]})
→ sessions.create({agent:{type:"agent",id,version}, environment_id})
→ stream = sessions.events.stream(id)        # 先に開く (stream-first)
→ sessions.events.send(id, {events:[{type:"user.message", content:[{type:"text",text}]}]})
→ for await (ev of stream):
     agent.message            → content[].text を累積
     agent.custom_tool_use    → customToolHandler(name,input) 実行 →
                                 events.send(user.custom_tool_result, custom_tool_use_id=ev.id)
     span.model_request_end   → model_usage 記録
     session.status_idle      → stop_reason.type!=="requires_action" で終了
     session.status_terminated→ 終了
→ sessions.retrieve(id).usage   # トークン課金
→ sessions.archive(id)          # 後始末（固定 order 不要）
```

## 使い方

```ts
import { runMaSession } from "./run-session.js";

const r = await runMaSession({
  agent: {
    name: "x-writer",
    model: "claude-haiku-4-5",        // or sonnet/opus
    system: "...",
    tools: [{ name: "get_material", description: "...", input_schema: { type: "object", properties: {} } }],
  },
  userMessage: "...",
  customToolHandler: async (name, input) => {   // 道具実行を host 側に DI
    if (name === "get_material") return await fetchMaterial(input);
    return "unknown tool";
  },
  onTrace: (m) => { /* withTrace に接続。tokensIn/out/model */ },
});
// r: { ok, transitions, agentText, toolCalls, modelUsage, sessionUsage, wallClockMs, ids, error? }
```

queue case からは collector と同じく `(await import("@anthropic-ai/sdk")).default` を遅延
import し、`withTrace(ctx,{runId,stageId},…)` で計装する（`onTrace` で meta を返す）。

## テスト

- `IN_MEMORY_FALLBACK=true` or APIキー無 → 実 API を叩かない **stub fallback**
  （`writer-x.ts` の `useStub` と同型）。
- 実経路の単体テストは `deps.client` に mock SDK を注入（`run-session.test.ts` 参照）。

## bundle 注意

SDK 0.101 の self-hosted agent-toolset（`tools/agent-toolset/*` → `node:fs`/
`node:child_process`）が静的 import graph に含まれるが **cloud MA + SSE では未実行**。
`wrangler.toml [alias]` で `node:*` を `src/stubs/node-empty.js` に置換して bundle から
除外している（`scripts/bundle-check.sh` は実 `*.js` のみ検査）。

## 参照

- API 詳細: `/claude-api` skill（Managed Agents セクション）/ `.claude/skills/anthropic-beta-sdk-setup.md`
- 実証記録: memory `project_x_agentic_rearchitecture`（task1 verdict）
