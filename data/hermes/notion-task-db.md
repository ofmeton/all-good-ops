# Notion「あとでやるタスク」DB 控え（hermes 自走パートナー）

> 単一ソースの場。秘密情報（トークン）はここに書かない。設計=`docs/superpowers/specs/2026-06-16-hermes-todo-partner-design.md` / 計画=`docs/superpowers/plans/2026-06-16-hermes-todo-partner-phase0-1.md`

## 識別子

- Database URL: https://app.notion.com/p/2159405e11a84e7f90a8b6252bb43d38
- Database ID: `2159405e11a84e7f90a8b6252bb43d38`
- Data Source ID（collection）: `782773d8-4cc4-445e-978d-42e48d892717`
- カンバンビュー: 「カンバン」（Board・Group by `Status`・Sort `Priority` ASC）

## プロパティ（spec §4 準拠）

| プロパティ | 型 | 選択肢 / 備考 |
|---|---|---|
| Title | title | タスク名 |
| Source | select | Telegram / AppleNotes / Calendar / manual |
| Status | select | Inbox → NeedInfo → Ready → InProgress → Blocked → Review → Done |
| Autonomy | select | light-auto / cc-auto / draft-only / ask-first / reminder（hermes 提案→人間確認） |
| Priority | select | High / Mid / Low |
| Project | select | all-good-ops（運用で追加） |
| Details | text | 逆質問で充填 |
| NextAction | text | 次の一手 |
| Due | date | 期日 |
| Owner | select | AI / human |
| Links | url | PR・成果物 |
| LastNudge | date | 最終催促日 |
| RawSourceId | text | 取り込み元の一意 ID（dedup 用） |
| ThreadKey | text | Telegram 会話 ↔ カード対応キー |
| ConversationLog | text | Telegram 会話の転記先（コメント不可時のフォールバック） |

## 運用メモ

- 会話の経緯は原則 Notion コメントスレッドに集約（`notion-create-comment`）。`ConversationLog` は補助。
- DB は工藤陸の claude.ai Notion 接続で作成済み。**hermes 側から読むには Task 1 の内部インテグレーション `hermes-todo-partner` に本 DB を Connections 追加で共有が必要**。
- サンプルカード（RawSourceId=`sample-0001`）は動作確認用。検収後に削除可。

## hermes 稼働設定の要点（`~/.hermes/config.yaml`・2026-06-17 検証済み）

捕捉が動くまでに踏んだハマりどころと、効いた設定：

1. **database_id ≠ data_source_id**（最大の罠）: Notion MCP `mcp_notion_API_post_page` の `parent` には **database_id=`2159405e11a84e7f90a8b6252bb43d38`** を渡す。data_source_id(`782773d8…`)を渡すと `404 object_not_found`。
2. **Status は select 型**: `{"Status":{"select":{"name":"Inbox"}}}`。`{"status":{...}}` は不可（プロパティ名が Status でも型は select）。
3. **ツール激減で notion を露出**: `tools.exclude` で notion ツールを 22→6 に絞り（残す: post_search/query_data_source/post_page/patch_page/create_a_comment/retrieve_a_data_source）、`agent.disabled_toolsets` で browser/terminal/code_execution/computer_use/image_gen/moa/delegation/cronjob/context_engine/todo を無効化。これで `tool_search` 閾値を下回り、agent が notion を直接呼べる（絞らないと tool_search の裏に隠れて curl を書く）。
4. **enforcement = `agent.environment_hint`**（YAML リテラルブロック `|`）に、post_page の**正確な引数 JSON**（database_id＋完全プロパティ形式）を明示。これが無いと Haiku は会話に流れてカードを作らない。headless `-z` には hint が載らない/ MCP が不安定 → **検証は必ず Telegram(gateway)経路で**。
5. **古いセッションに旧 hint が焼き付く**: 設定変更後は Telegram で **`/new`** を送って新セッションにしないと反映されない（`hermes sessions delete` ＋ gateway 再起動でも在席セッションは復活する）。
6. モデル = `anthropic/claude-haiku-4.5`（OpenRouter・要残高チャージ。無料枠は実質不可）。常駐ループ用。
7. キル/再起動: `hermes gateway restart` / 停止は launchd。バックアップは `config.yaml.bak*`。

> 注: §5-E（会話のカードコメント集約）は未達。capture は安定したが、create_a_comment での経緯転記は別途強化が要る。

## ステータス

- [x] Phase 0 / Task 2: DB＋カンバン＋サンプルカード作成（2026-06-16・Claude の Notion MCP で実施）
- [x] Phase 0 / Task 1: hermes 内部インテグレーション作成＋本 DB を共有（2026-06-17）
- [x] Phase 1 核: hermes 導入・Haiku・Telegram・Notion MCP 配線・**Telegram メモ→Notion Inbox カード自動作成を実証**（2026-06-17）
- [ ] Phase 1 残: 逆質問→Details 充填→Autonomy 確定→Ready 化の一連、会話のカードコメント集約（§5-E）の安定化
- [ ] Phase 2 以降: Apple Notes / カレンダー捕捉、launchd 自走実行、催促ループ
