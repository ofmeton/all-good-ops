# Managed Agents (GA) セッション駆動

`@anthropic-ai/sdk` の **Managed Agents**（beta header `managed-agents-2026-04-01`）を
Cloudflare Workers の queue consumer から駆動する。本実装 = `run-session.ts`。

## 永続ランタイム（段階1・P1〜P3 で移行済）

本番の agentic 3 工程（**writer / checker / collector**）は **永続 agent** を再利用する。
environment / agent を毎回 create/delete せず、bootstrap で 1 度だけ作って `xad.ma_agents`
に登録し、各 session はそれを参照して起動する。

```
agents/*.agent.yaml (seed: key/name/model/system_builder/tools)
   │  npm run ma:bootstrap            （scripts/bootstrap-ma-agents.ts・SDK・冪等）
   ▼
Anthropic: environment×1(cloud,共有) + agent×N(create once → versioned)
   │  upsert
   ▼
xad.ma_agents (agent_key → agent_id/version/environment_id/model/system_hash)
   │  getAgentRef(sb, key)            （lib/ma/agent-registry.ts・isolate内 cache）
   ▼
runMaSession({ agentRef, environmentId, userMessage, customToolHandler })  ← persistent
```

- **environment は 1 つを全 agent で共有**（org 上限を避ける）。bootstrap が既存を reuse、
  無ければ 1 つ作る（`pickEnvironmentId`）。
- **system / tools は agent 側に焼く**。session 起動時は渡さない（host handler のみ注入）。
  素材ごとに変わる「型/fmat/再生成指示」は userMessage 側（compose は `buildComposeUserBlocks`）。
- **registry miss（未 bootstrap）は throw**。各工程は誤処理防止で draft 化/点検/収集をせず
  明示エラーにする（`agent-registry` の思想）。bootstrap 後に再走で回収。
- **session id を相関キーとして残す**: post_drafts.writer_session_id / run_trace.output の
  maSessionId / materials_store.meta.collector_session_id（後続 1B が遡る）。
- system 変更は `ma:bootstrap -- --update` で **agents.update**（新 version）→ ma_agents の
  system_hash drift で検知。差分は `ma:bootstrap -- --dry-run`。

> **ephemeral 経路（`agent` を渡し environment/agent を毎回 create する元仕様）は現在
> prod から呼ばれない＝テスト専用**（後方互換・stub・SDK 版数ガードの単体テスト資産として
> `run-session.ts` に残置。削除しない）。永続前提が崩れた緊急時のフォールバックも兼ねる。

純ロジック（yaml パース / system materialize / tool 解決 / 差分計算）は `bootstrap-core.ts`
（API/DB 非依存・単体テスト済）。`SYSTEM_BUILDERS` / `MA_TOOL_REGISTRY` に各工程の
builder/tool を登録する（checker/collector も同パターンで追加済）。

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

## 使い方（persistent・本番）

```ts
import { runMaSession } from "./run-session.js";
import { getAgentRef } from "./agent-registry.js";

const ref = await getAgentRef(sb, "x-writer");      // xad schema cast 済 sb を渡す
const r = await runMaSession({
  agentRef: { id: ref.agentId, version: ref.version },
  environmentId: ref.environmentId,
  userMessage: "...",                               // 素材 + 型/fmat/再生成ブロック
  customToolHandler: async (name, input) => {       // 道具実行を host 側に DI（tool 定義は agent 側）
    if (name === "submit_draft") { /* capture */ return "received"; }
    return "unknown tool";
  },
  // system / tools は渡さない（agent に焼かれている）。
});
// r: { ok, transitions, agentText, toolCalls, modelUsage, sessionUsage, wallClockMs, ids:{session}, error? }
```

cost/onTrace は各工程が `cost-of` で costJpy を載せて自前で発火する（queue 集約が cost_ledger の
単一ソース）。queue case は `withTrace(ctx,{runId,stageId},…)` で計装する。

> ephemeral 使い方（`agent:{name,model,system,tools}` を渡す元 API）は **テスト専用**。
> 新規 prod 経路は必ず persistent（agentRef）を使う。

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
