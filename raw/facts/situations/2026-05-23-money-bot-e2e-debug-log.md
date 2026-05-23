---
date: 2026-05-23
category: situations
source: session
---

# money-bot E 案実装 E2E デバッグログ

## 経緯 (2026-05-23 セッション内)

E 案 (Managed Agents + WDK) 実装後、cron 手動 trigger で発生した連続バグの修正履歴。

### バグ 1: Managed Agents API payload 形式エラー

- 症状: `managed-agents: send failed (400): content: Extra inputs are not permitted`
- 原因: `POST /v1/sessions/{id}/events` の payload は `{events: [{type, content: [block]}]}` 形式が正解
- 修正: `lib/managed-agents.ts` で payload を `{events: [{type: "user.message", content: [{type: "text", text: msg}]}]}` に変更
- 検証: 実 API curl で HTTP 200 + sevt_ 取得確認

### バグ 2: rubric reject による early return で LINE 通知ゼロ

- 症状: workflow が publish_queue に書き込んで status=rejected で終了。LINE 通知ゼロ
- 原因: content-reviewer が approved=false を返した時 `if (!reviewed.approved) return skipped` で notifyApprovalReady を呼ばず early return していた
- 検証: Supabase publish_queue 直接確認で `status=rejected, title="SQLクエリが不要に？Datasette Agentで始める対話的データ探索"` 発見
- 修正: Phase 1 dogfooding 中は rubric reject でも承認 UI へ送り、人間が rubricNotes を見て最終判断する設計に変更 (`MONEY_BOT_RUBRIC_STRICT=1` で strict 化可能)

## Managed Agents API 仕様メモ (公式 docs に明記なし)

`POST /v1/sessions/{id}/events`:
```json
{
  "events": [
    {
      "type": "user.message",
      "content": [{"type": "text", "text": "..."}]
    }
  ]
}
```

`GET /v1/sessions/{id}/events` レスポンス:
- `data[].content` は `ContentBlock[]` (string ではない)
- `agent.message` event は content blocks の text を join して使う
- `session.status_idle` / `session.completed` 受信で polling 終了

## 動作確認

- 19:21 trigger → 19:24 step 連続完了 → workflow durable wait (approval hook)
- ただし rubric reject で notifyApprovalReady 未呼び出し → ユーザーに LINE 来ず
- 10:39 修正後 trigger で再検証中

## 教訓 (memory feedback 候補)

1. **承認ゲート前の early return は LINE 通知の有無を考慮**: ユーザーがエラー/skip を知れる経路を断つと運用不能
2. **Phase 1 dogfooding は判定厳しすぎ → 即 reject** になりがち。strict 切替 flag を最初から仕込む
3. **Managed Agents API 仕様は公式 docs に payload 詳細無し**。実 API curl で payload 探りが必要
