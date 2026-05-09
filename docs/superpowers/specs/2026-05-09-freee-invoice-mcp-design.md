# freee 請求書 API 連携設計（freee-mcp 採用）

- **作成日**: 2026-05-09
- **採用方式**: 公式 freee MCP (`freee-mcp@0.26.5`, npm)
- **対象事業**: BSA (工藤陸名義 HP制作) / RICE CREAM 副業 / Shopify 副業 / 個人案件 (テラ一色 等)
- **担当エージェント**: invoice-manager (finance) / 認証・障害対応は system-engineer
- **ステータス**: 設計確定 → セットアップ実施中

## 1. 採用方針

freee 公式 MCP サーバー (`freee-mcp`) を Claude Code に登録し、自然言語または `mcp__freee__*` ツール直接呼び出しで請求書発行・取引先管理・参照系を完結させる。自前 OAuth 実装はしない。

採用理由:
- 公式提供で会計・人事労務・**請求書**・工数・販売・サインの約270 API をカバー
- OAuth2+PKCE と refresh token の自動更新を MCP 側が内蔵
- 実装ゼロで運用開始可能
- 将来 BSA ダッシュボードからの自動化が必要になった時点で別 spec を起こして拡張

不採用案:
- Approach B (Remote MCP `https://mcp.freee.co.jp/mcp`): Claude Desktop 中心で Claude Code 側の動作未確認のため
- Approach C (自前 Python/TS スクリプト): 公式 MCP に対する車輪の再発明

## 2. アーキテクチャ

```
Claude Code セッション
  │
  ├─ メインセッション or invoice-manager サブエージェント
  │     │
  │     └─ mcp__freee__* ツール呼び出し
  │           │
  │           ▼
  │     freee-mcp (npm: freee-mcp@0.26.5, stdio transport)
  │           │  - OAuth2+PKCE
  │           │  - access_token / refresh_token 自動更新
  │           │  - 設定: ~/.config/freee-mcp/config.json
  │           ▼
  │     freee API (https://api.freee.co.jp/api/1/...)
  │
  └─ 価格情報の参照
        knowledge/context/pricing-catalog.md (BSA L1〜L4 の SSOT)
```

依存:
- 単一事業所運用 (currentCompanyId は 1 つに固定)
- 取引先 master はローカルに持たず freee 側を SSOT とする

## 3. セットアップ手順

### ユーザー本人の作業

1. freee アプリストア (https://app.secure.freee.co.jp/developers/) で「プライベートアプリ」を作成
   - コールバックURL: `http://127.0.0.1:54321/callback`
   - 必要スコープ: 会計 (read/write) / 請求書 (read/write) / 必要に応じて販売・人事
2. Client ID と Client Secret を控える (チャットには貼らない)
3. freee 上で対象事業所が 1 つに絞られていることを確認

### Claude Code 側

4. パッケージ確認: `npm view freee-mcp` で最新版を確認
5. 対話セットアップ: ターミナル (Terminal.app 推奨, Claude Code の `!` 経由は TTY 制御の都合で不安定) で `npx -y freee-mcp configure`
   - Client ID / Secret を対話入力
   - ブラウザで OAuth 認可
6. 認証情報は `~/.config/freee-mcp/config.json` に自動保存 (companies / currentCompanyId / defaultCompanyId)
7. **新セッション起動** で `mcp__freee__*` ツールが露出 (本セッション内では露出しない: feedback_mcp_postadd_session.md)

### セットアップ完了後 24h 以内

8. freee アプリ画面で Client Secret を rotate
9. `npx -y freee-mcp configure` を再実行して新 Secret を反映
10. 動作確認 (例: `mcp__freee__list_invoices` の参照系を 1 回実行)

## 4. 利用フロー

典型的な請求書発行シナリオ:

```
ユーザー: 「BSA の ◯◯さん向け、L1 案件 30,000円の請求書を作って」
  ↓
invoice-manager / メインセッションが受領
  ↓
1. mcp__freee__list_invoices で過去同顧客の請求書 1 件を取得 (テンプレ参照)
2. mcp__freee__list_partners で取引先 ◯◯ の partner_id を解決
   - 該当なし → ユーザーに新規登録の確認 → mcp__freee__create_partner
3. pricing-catalog.md から L1 の金額・税区分・摘要文を取得
4. mcp__freee__create_invoice でドラフト作成
  ↓
ユーザーに「下書き作成済み (URL: https://secure.freee.co.jp/...)」を提示
  ↓
ユーザーが freee 画面で内容確認 → 送付ボタンを本人がクリック
```

## 5. 人間確認ゲート

| 操作 | 確認 | 理由 |
|---|---|---|
| `list_invoices` / `list_partners` 等の参照系 | 不要 | 読み取り専用 |
| `create_invoice` でドラフト作成 | 不要 | freee 上は未送付状態 |
| **送付処理 (メール送信・PDF発行URL作成)** | **必須** | 外部送信に該当 |
| **`create_partner` (取引先新規登録)** | **必須** | 誤登録の事故予防 |
| **`update_invoice` (送付済みの修正)** | **必須** | 取引先側にも影響 |
| **`delete_invoice`** | **必須** | 帳簿整合性に影響 |

CLAUDE.md「人間確認ルール」と既存 invoice-manager.md の「請求書の送付前確認」と整合。

## 6. CLAUDE.md / エージェント定義への反映

新規エージェント・新規スキルは作らない。既存ファイルへの最小追記のみ。

### 6-1. `.claude/agents/finance/invoice-manager.md`

「freee API 連携 (freee-mcp 経由)」セクションを追記:

```markdown
## freee API 連携 (freee-mcp 経由)
- 請求書発行: `mcp__freee__create_invoice` を使用
- 過去請求書テンプレ参照: `mcp__freee__list_invoices` で同顧客の最新 1 件を取得して項目構成を流用
- 取引先解決: `mcp__freee__list_partners` → なければ `create_partner` (事前に金額・メール確認)
- 事業所スコープ: 全事業統合の単一事業所を currentCompanyId として運用
- 価格情報の出所: `knowledge/context/pricing-catalog.md` (BSA は SSOT)
- MCP の認証管理・障害対応は system-engineer に委譲
```

### 6-2. `CLAUDE.md` MCP セクション

「現在稼働中 (基盤)」のリストに freee-mcp を追加:

```markdown
- **freee** (npm: `freee-mcp`): 請求書発行・取引先管理・会計参照を MCP 経由で操作。担当: `invoice-manager` / 認証・障害対応は `system-engineer`。**送付処理 / `create_partner` / `update_invoice` / `delete_invoice` は人間確認必須**
```

### 6-3. ルーティングテーブル

既存行で十分なので変更なし:
```
| 請求書、インボイス、入金 | finance | invoice-manager |
```

## 7. コスト

- freee API 自体は freee 利用料の中 (プランによっては従量課金あり、要確認)
- MCP 経由の Claude トークン消費: 1 請求書あたり概算 5,000〜15,000 tokens (数円程度)
- 運用上限管理は不要 (1 日数件想定)

## 8. リスクと対応

| リスク | 影響度 | 対応 |
|---|---|---|
| Client Secret がチャットログに残った (2026-05-09 に発生) | 中 | セットアップ完了後 24h 以内に rotate |
| 複数事業所が freee 側に作られている | 中 | currentCompanyId 一致チェックで詰まる。事業所統合 or プロファイル切替で対応 |
| MCP 追加直後の本セッションでツール未露出 | 低 | feedback_mcp_postadd_session.md 通り新セッション必須を周知済み |
| freee API スコープ不足で操作失敗 | 低 | アプリ設定で必要スコープを追加 → 再 configure |

## 9. 検証チェックリスト (セットアップ完了後)

- [ ] `~/.config/freee-mcp/config.json` の `companies` に 1 エントリ以上あり
- [ ] 新セッションで `mcp__freee__list_invoices` がエラーなしで応答
- [ ] BSA 過去請求書 (あれば) を 1 件参照取得できる
- [ ] Client Secret rotate 実施済み
- [ ] `.claude/agents/finance/invoice-manager.md` に MCP セクション追記済み
- [ ] `CLAUDE.md` に freee MCP 記載追加済み

## 10. スコープ外 (将来の別 spec)

- BSA ダッシュボードからの請求書一括自動発行
- 入金消込の自動化
- 月次売上レポート自動生成
- 4 事業の損益分離 (freee 側のタグ付け運用設計)
