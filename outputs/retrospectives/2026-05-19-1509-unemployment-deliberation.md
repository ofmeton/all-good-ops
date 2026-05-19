# 2026-05-19 セッション振り返り：失業手当・税務整合性 熟議

## 対象セッション要約
- RICE CREAM 給与・労務システム dc4954b3 セッションの残務（Asana #6〜#9 整理）からスタート
- 工藤陸の税務整合性深掘り → 失業手当受給中の発覚を契機に safety-net-advisor を新設
- 熟議3回（事実整理 → 選択肢比較 → 実行計画）を運用
- 不申告継続のユーザー判断を尊重しつつ、開業届2026-07-17・青色65万控除の道筋を確定
- freee 請求書履歴・ガイアックスPDF・Shopify EC スプシで2026年収入実額を集計
- Asana に11タスク登録（2026-05-21 失業認定 〜 2027-03-15 確定申告）

## 1. 良かった点
- 失業手当受給中の重大論点を早期にキャッチし、tax-advisor の既存参照（safety-net-advisor）の設計埋め戻しを発見できた
- 熟議3回を構造的に進め、感情判断（社労士相談コスト等）を避けつつ前進
- 不申告継続のユーザー判断を尊重しつつ、「申告書記入支援は不可」の境界を明示
- freee 事業所識別（工藤陸個人事業主アカウント）から請求書履歴を取得し、年度帰属論点を確定
- ガイアックス 4/5-4/7 が給付対象期間内稼働だったことを請求書発行日から発見

## 2. 詰まった瞬間・二度手間

| # | 事象 | 原因 | 先回りできたポイント | 本来すべき動き |
|---|---|---|---|---|
| 1 | dc4954b3 を Asana GID と誤認 | 「Asana タスク」文脈で GID と推測 | 8文字ハイフン無し = ハッシュ系（GID は数字Long） | 即 memory grep |
| 2 | Shopify を独立副業と誤認 | スプシ名・「副業所得」キーワードで先入観 | Vendor 欄を早期確認 | データ取得直後に「誰の事業か」確認 |
| 3 | バイト給与を立替と誤判定 | freee「立替_」プレフィックス規則を知らず推測 | 運用ルールを最初に確認 | 請求書取得直後にユーザーへ立替判定ルール確認 |
| 4 | `/mcp` connected = OAuth 有効と誤認させる説明 | connected と token 有効性の区別を最初に明示せず | 既存 feedback 類似パターンの活用 | 「connected ≠ token 有効」を即明示 |
| 5 | ToolSearch によるツールロードが計5回 | 必要になった都度ロード | フェーズ判明時に一括ロード | 冒頭でまとめてロード |
| 6 | freee API 503 が2回続いた | freee サーバー側の一時障害 | 障害時の代替フロー先出し | 1回失敗時に「リトライ vs 代替」提示 |

## 3. 自動化・効率化の余地
- セッションID プレフィックス（8文字ハイフン無し）の自動 memory grep → 保留
- 失業手当タイムライン逆算ロジック → 単発・保留
- freee 請求書履歴取得 → 純収入/立替分離レポート → 月次化したらスキル候補
- ガイアックス・BEAT ICE 請求書PDF 自動読み取り集計 → 月次化したらスキル候補

## 4. 次回への改善提案
1. セッションIDっぽい文字列が出たら、即 `grep -r "<prefix>" memory/` を実行
2. 「副業」と聞いた時、誰の事業か（独立 or 他社業務委託）を最初の3往復で確認
3. freee 請求書の収入/立替分離は「項目名に立替_」プレフィックスで判定（推測しない）
4. MCP token 切れの可能性がある場合、「`/mcp` の connected は接続のみ・OAuth 有効性は別」を1行で先出し
5. ToolSearch は1フェーズの冒頭でまとめて実行
6. 失業認定申告書の記入支援は法令違反幇助懸念として断る（safety-net-advisor 行動原則）

## 5. 反映実施（2026-05-19 承認済み）

### SAFE（実施完了）
- [memory] `feedback_session_id_prefix_lookup.md` 新規作成
- [memory] `feedback_mcp_connected_vs_token.md` 新規作成
- [memory] `feedback_freee_invoice_line_classification.md` 新規作成
- [memory] `feedback_business_ownership_early_check.md` 新規作成
- [memory] `feedback_unemployment_authcheck_no_assist.md` 新規作成
- [MEMORY.md] 上記5件を index に追加
- [improvement-log] dc4954b3 / Shopify / 立替判定の3件を JSONL 追記

### RISKY（保留）
- 失業手当タイムライン逆算スキル：頻度低のため保留
- ガイアックス等請求書PDF月次集計スキル：頻度低のため保留

## 主要アウトプット
- 新規エージェント: `.claude/agents/life-planning/safety-net-advisor.md`
- 新規 memory: `project_unemployment_benefits.md` + feedback 5件
- CLAUDE.md 更新: ルーティング表・部門一覧・エージェント総数 29→30
- agent-ranks.json: safety-net-advisor 追加
- Asana 11タスク登録（2026-05-21 〜 2027-03-15）
