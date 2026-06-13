# Anthropic Managed Agents (GA) Setup Skill

## 概要

`@anthropic-ai/sdk`(0.101+) の **Managed Agents**（beta header `managed-agents-2026-04-01`）を
使う時の安全 default。Agent→Session→Environment フロー・custom tool 往復・SSE-drain・
Cloudflare Workers bundle 対処を型化する。**API の一次情報は `/claude-api` skill
（Managed Agents セクション）** を参照（モデル ID・パラメータ・SDK 形はそこが SSOT）。

> **【2026-06-07 全面改訂】** 旧版は pre-GA/憶測の API 形（`session.status` 旧フロー /
> `active_seconds` 課金 / `send→running→idle→retrieve→archive` 固定 order / archive 前
> retrieve しないと idle 課金リーク）に基づき **stale** だった。GA は **トークン課金**で、
> その前提はすべて存在しない。下記が GA の実体（task1 で workerd 実証済）。

- **誰が**: MA を使うコードを書くエージェント / 実装者
- **いつ**: MA セッションを駆動するコードの新規/改修時
- **何のために**: 誤った旧 API 形・課金モデルの再混入を防ぐ

## トリガー

- ユーザー指示: 「Managed Agents 使う」「beta SDK で agent 作って」「MA session 動かして」
- コード: `client.beta.agents` / `client.beta.sessions` / `client.beta.environments` の登場

## GA フロー（実証済・これが正）

```ts
const Anthropic = (await import("@anthropic-ai/sdk")).default; // 遅延 import
const client = new Anthropic({ apiKey });

// Agent は永続/versioned（本来は1回作って ID 再利用。使い捨て検証時は都度作成可）
const env = await client.beta.environments.create({
  name, config: { type: "cloud", networking: { type: "unrestricted" } },
});
const agent = await client.beta.agents.create({
  name, model: "claude-haiku-4-5",          // モデル ID は /claude-api 参照
  system,
  tools: [{ type: "custom", name, description, input_schema: { type:"object", properties:{}, additionalProperties:false } }],
  // web_search/bash/file 内蔵が要るなら tools に { type:"agent_toolset_20260401" } を追加
});
const session = await client.beta.sessions.create({
  agent: { type: "agent", id: agent.id, version: agent.version },
  environment_id: env.id,
});

// stream-first → send
const stream = await client.beta.sessions.events.stream(session.id);
await client.beta.sessions.events.send(session.id, {
  events: [{ type: "user.message", content: [{ type: "text", text }] }],
});

// drain
for await (const ev of stream) {
  switch (ev.type) {
    case "agent.message": /* ev.content[].text を累積 */ break;
    case "agent.custom_tool_use": {            // 自前道具を host 側で実行
      const result = await handler(ev.name, ev.input);
      await client.beta.sessions.events.send(session.id, {
        events: [{ type: "user.custom_tool_result", custom_tool_use_id: ev.id, content: [{ type: "text", text: result }] }],
      });
      break;
    }
    case "span.model_request_end": /* ev.model_usage = トークン使用量 */ break;
    case "session.status_idle":   /* ev.stop_reason.type!=="requires_action" で終了 */ break;
    case "session.status_terminated": /* 終了 */ break;
    case "session.error": /* throw */ break;
  }
}

const usage = (await client.beta.sessions.retrieve(session.id)).usage; // トークン課金
await client.beta.sessions.archive(session.id);  // 後始末のみ。固定 order/idle リーク防止は不要
```

## 課金

**トークン課金**（`session.usage` / `span.model_request_end.model_usage`）。
`active_seconds`/`duration_seconds`/session-hour 課金は **存在しない**。コストは
input/output tokens × モデル単価（`/claude-api` のモデル表）で算出。

## 受け方: SSE-drain vs webhook

- **境界の明確なセッション**（例: 1ドラフト生成）→ **SSE-drain**（`events.stream` を
  consumer 内で drain）。Cloudflare Workers queue consumer に収まる（task1: 12s 実証）。
- **無境界/長時間**セッション → **webhook**（Anthropic が状態遷移を POST）+ `events.list`
  ポーリング。SSE を保持し続けない。

## Cloudflare Workers bundle 対処

SDK の self-hosted agent-toolset（`tools/agent-toolset/*` → `node:fs`/`node:child_process`）が
静的 import graph に含まれるが cloud MA + SSE では未実行。`wrangler.toml [alias]` で
`node:child_process`/`node:fs`/`node:fs/promises` を空 stub に置換して bundle から除外する
（例: `apps/x-account-system/src/stubs/node-empty.js` + `scripts/bundle-check.sh` は実 `*.js` のみ検査）。

## 実装/テスト規約

- 遅延 import（`(await import("@anthropic-ai/sdk")).default`）。
- テストは `deps.client` 注入で mock 化、または `IN_MEMORY_FALLBACK=true`/APIキー無で
  stub fallback（実 API を叩かない）。例: `apps/x-account-system/lib/ma/run-session.ts`（+ test）。
- 環境ランタイム適合は **実デプロイ/`wrangler dev` で必ず検証**（local 動く≠workerd 動く）。

## 関連

- `/claude-api` skill（Managed Agents セクション = API 一次情報）
- 実装: `apps/x-account-system/lib/ma/run-session.ts` / `lib/ma/README.md`
- 実証記録: memory `project_x_agentic_rearchitecture`（task1 verdict）
