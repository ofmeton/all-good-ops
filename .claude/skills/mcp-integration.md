# MCP連携ガイド（MCP Integration）

## 概要
MCP（Model Context Protocol）の導入・設定・運用ルール。新規MCP追加時の評価・導入フローを定義。

## 対象
- mcp-architect（メイン）
- secretary（MCP利用時の参考）

---

## 現在稼働中のMCP

| MCP | 用途 | 主な利用エージェント | 設定場所 |
|-----|------|---------------------|---------|
| Asana | タスク管理 | secretary, 全部門 | .claude/settings.json |
| Gmail | メール取得・下書き | secretary, message-crafter | .claude/settings.json |
| Google Calendar | 予定取得・作成 | secretary, schedule-coordinator | .claude/settings.json |
| Slack | チャンネル・メッセージ | secretary, message-crafter | .claude/settings.json |
| Claude in Chrome | ブラウザ操作 | researcher, shopify-operator | .claude/settings.json |

## 導入予定のMCP

| MCP | 用途 | 優先度 | ステータス |
|-----|------|--------|-----------|
| LINE | メッセージング | 高 | 未着手 |
| Codex (OpenAI) | ChatGPT/Codex連携 | 中 | 未着手 |

---

## 新規MCP導入フロー

### Step 1: 評価
```
### MCP導入評価: [MCP名]

#### 必要性
- なぜこのMCPが必要か
- どのエージェントが利用するか
- 代替手段はあるか

#### コスト
- 月額費用（あれば）
- 設定・学習コスト
- トークン消費の増加見込み

#### リスク
- セキュリティリスク
- プライバシーリスク
- 依存リスク（MCPが停止した場合の影響）

#### 推奨
- 導入する / 見送る / 保留する
- 理由
```

### Step 2: 人間承認
評価結果をユーザーに提示し、承認を得る。

### Step 3: 導入
1. MCPサーバーの設定
2. .claude/settings.json への追加
3. permissions の設定（最小権限原則）
4. 動作検証

### Step 4: 動作検証
```
### 動作検証: [MCP名]

| テスト項目 | 期待結果 | 実際の結果 | 合否 |
|-----------|---------|-----------|------|
| [操作1] | [期待] | [結果] | ○/× |
| [操作2] | [期待] | [結果] | ○/× |
```

### Step 5: ドキュメント更新
- 本スキルファイルの「現在稼働中のMCP」を更新
- CLAUDE.md の MCP連携セクションを更新
- 関連エージェントの「使ってよいツール」を更新

---

## permissions 設計原則

### 最小権限原則
- **読み取り系**: 自動承認可（allow）
- **作成系**: エージェントの判断で実行可だが、重要な操作は人間確認
- **更新・削除系**: 原則人間確認

### settings.json の構造
```json
{
  "permissions": {
    "allow": [
      "mcp__[server-id]__[read-tool]"
    ]
  }
}
```

---

## トラブルシューティング

| 症状 | 確認事項 | 対処 |
|------|---------|------|
| MCPが応答しない | サーバーの起動状態 | 再起動 |
| 権限エラー | settings.json の permissions | 権限追加（人間確認後） |
| データが取得できない | APIキー・認証情報 | 認証情報の更新 |
| レスポンスが遅い | ネットワーク、API制限 | リトライ / 時間をおく |
