# Anthropic beta SDK Setup Skill

## 概要

Anthropic beta SDK (`@anthropic-ai/sdk` の Managed Agents 等) を Node v24+ TypeScript プロジェクトで使う時の安全 default 手順。ts-node 罠 / param 命名 / session race / 課金リーク を構造的に防ぐ。

- **誰が**: system-engineer / 他エージェントが MA / beta API を使うコード書く時
- **いつ**: 新規 MA プロジェクト setup or 既存に beta API 追加時
- **何のために**: ts-node v24 silent exit、`instructions` vs `system` 命名違反、session pollUntilIdle race、archive 順序 400 を防ぐ

## トリガー

- ユーザー指示: 「Managed Agents 使う」「beta SDK で agent 作って」「MA session 動かして」
- コード読み: `client.beta.agents` / `client.beta.sessions` / `client.beta.environments` の登場

## 手順

### Step 1: 依存セットアップ (固定)

```bash
npm i @anthropic-ai/sdk dotenv
npm i -D typescript tsx @types/node
# ts-node は install しない (Node v24+ で silent exit 事故が起きる)
```

### Step 2: SDK 型定義を先 read

beta API の param 名は Messages API と微妙に違う。必ず `.d.ts` を確認:

```bash
cat node_modules/@anthropic-ai/sdk/resources/beta/agents/agents.d.ts | head -100
cat node_modules/@anthropic-ai/sdk/resources/beta/sessions/sessions.d.ts | head -100
cat node_modules/@anthropic-ai/sdk/resources/beta/environments/environments.d.ts | head -50
```

**確定したい点**:
- Agent create: param は `system:` (Messages API と同じ)、`instructions:` ではない
- Session create: `agent: string | { id, version }` + `environment_id: string` 必須
- Environment create: `name: string` 必須、`config: BetaCloudConfigParams | BetaSelfHostedConfigParams | null` optional

### Step 3: Session 操作の固定 order

```typescript
async function sendAndWaitIdle(
  client: Anthropic,
  sessionId: string,
  text: string,
  timeoutMs = 5 * 60 * 1000,
) {
  // 1. send
  await client.beta.sessions.events.send(sessionId, {
    events: [{ type: "user.message", content: [{ type: "text", text }] }],
  });

  // 2. running 切替待ち (最大 30 秒、race 回避)
  const runStart = Date.now();
  while (Date.now() - runStart < 30_000) {
    const s = await client.beta.sessions.retrieve(sessionId);
    if (s.status === "running" || s.status === "rescheduling") break;
    await new Promise((r) => setTimeout(r, 500));
  }

  // 3. idle / terminated 待ち
  const idleStart = Date.now();
  while (Date.now() - idleStart < timeoutMs) {
    const s = await client.beta.sessions.retrieve(sessionId);
    if (s.status === "idle" || s.status === "terminated") {
      return { status: s.status, usage: (s as any).usage, stats: (s as any).stats };
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("timeout");
}
```

### Step 4: Teardown 強制

```typescript
async function withMaSession<T>(
  client: Anthropic,
  sessionConfig: { agent: string; environment_id: string },
  fn: (sessionId: string) => Promise<T>,
): Promise<T> {
  const session = await client.beta.sessions.create(sessionConfig);
  try {
    return await fn(session.id);
  } finally {
    // archive 前に必ず retrieve(stats) — 課金監視
    try {
      const final = await client.beta.sessions.retrieve(session.id);
      console.log(`stats: active=${(final as any).stats?.active_seconds}s duration=${(final as any).stats?.duration_seconds}s`);
    } catch {}
    await client.beta.sessions.archive(session.id);
  }
}
```

### Step 5: 中断 session のリカバリ

セッション内で例外が出ても archive されないケースを防ぐため、起動時に **古い session の cleanup script** を 1 つ持つ:

```typescript
// cleanup-stale-sessions.ts
const stale = await client.beta.sessions.list({ statuses: ["idle"] });
for (const s of stale.data) {
  if (Date.now() - new Date(s.created_at).getTime() > 24 * 60 * 60 * 1000) {
    await client.beta.sessions.archive(s.id);
  }
}
```

## コスト試算 (B-3 実測 2026-05-24)

| 用途 | 1 ラン cost | 月想定 |
|---|---|---|
| Interviewer (Sonnet 4.6, 5 turn) | $0.015 ≒ ¥2.3 | 月 60 回 → ¥140 |
| Optimizer Phase 2 (Opus 4.7) | $0.35 ≒ ¥55 | 月 4 回 → ¥220 |
| session-hour 課金 (全合計) | — | ¥3-15 (誤差レベル) |

→ MA 全部入りは月予算 ¥10,000 の 3-4% で済む。

## トラブル時

- `ts-node` で実行して output 空: tsx に切替 (`npm i -D tsx && npx tsx script.ts`)
- `instructions does not exist in type`: `system:` に直す
- `400 cannot be archived while running`: retrieve → idle 待ち → archive の順序
- セッション 6 倍 active/duration 乖離: 中断 session の archive 忘れ
- silent EXIT=0: ts-node を疑う、tsx で再実行

## 関連リソース

- B-3 検証成果: `outputs/improvements/x-account-design-v9-verification/B3-ma-cost-script/`
- memory: [[feedback_anthropic_beta_sdk_setup]] [[feedback_ma_session_teardown]]
