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

## ステータス

- [x] Phase 0 / Task 2: DB＋カンバン＋サンプルカード作成（2026-06-16・Claude の Notion MCP で実施）
- [ ] Phase 0 / Task 1: hermes 内部インテグレーション作成＋本 DB を共有（人間アクション）
- [ ] Phase 1: hermes 導入・安モデル・Telegram・Notion MCP 配線・todo-partner SKILL（人間アクション＋ローカル Mac）
