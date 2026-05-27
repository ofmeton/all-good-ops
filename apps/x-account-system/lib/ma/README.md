# MA Session Teardown (PR-D)

Managed Agents (Anthropic beta) session の teardown を **固定 order** で実行。
race condition と「retrieve できないまま archive して stats を失う」課金リーク
を防ぐ。

SSoT: feedback `feedback_ma_session_teardown.md` + main-design-all-versions.md §2.12

## 固定 order

```
send  →  running  →  idle  →  retrieve  →  archive
```

| Step | 関数 | 目的 |
|---|---|---|
| send       | `waitForSendCompletion`  | 最終 send が flush 済か確認 |
| running    | `waitForRunningToIdle`   | active 処理が完了するまで wait |
| idle       | (同上の結果)             | session が idle 落ちした状態 |
| retrieve   | `retrieveFinalArtifacts` | stats / messages を確保 (**archive 前に必須**) |
| archive    | `archiveSession`         | session 終了マーク |

### なぜ順序が必要か

- `archive` を `retrieve` 前に呼ぶと session が finalize されて stats
  (`active_seconds` / `duration_seconds` / `input_tokens` / `output_tokens`)
  が取れなくなる → 課金検証不能
- `running` 状態のまま `archive` を呼ぶと 400 エラー
- 各 step の guard:
  - `retrieve` は phase=`idle` でないと throw
  - `archive` は phase=`retrieved` でないと throw

## 使い方

```ts
import { teardownMaSession, initSessionState } from "./teardown.ts";

const sessionId = "ma_xxx";
initSessionState(sessionId); // 実環境では SDK の sessions.create 結果

// 仕事の本体 (SDK 経由) 完了後...
const { artifacts, transitions } = await teardownMaSession(sessionId);
console.log(transitions);
// → ['init', 'sending', 'running', 'idle', 'retrieved', 'archived']
```

## Phase 0.5 fallback

- `IN_MEMORY_FALLBACK=true` で in-memory state machine 動作
- `__advancePhase(session_id, phase)` で手動遷移 (テスト用)
- 実環境では `@anthropic-ai/sdk` の `client.beta.agents.sessions.*` で各 step
  を SDK 経由に差し替える

## Phase 1+ TODO

- `@anthropic-ai/sdk` の `sessions.retrieve(id)` を呼び `active_seconds`
  `duration_seconds` `input_tokens` `output_tokens` を回収
- 回収値を `usage_events` テーブルに書く (PR-A 既設 schema)
- `sessions.archive(id)` を呼ぶ
- teardown 失敗時の retry / DLQ (一度だけ retry 後 alert)
