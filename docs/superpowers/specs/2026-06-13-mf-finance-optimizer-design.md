# mf-finance Optimizer 設計（データ・スチュワード）

最終更新: 2026-06-13 / 対象: `apps/mf-finance/`（ローカル SQLite + Next.js 16 App Router、localhost 単一ユーザー、¥0・外部API不使用）

## 0. これは何 / なぜ
家計ダッシュボード全体から**網羅的にシグナルを拾い**、LLMで思考して、ユーザー（陸さん）に「これ固定費ですか？」「このルール違うかも」「この分け方の方が役立ちません？」と**問い・提案を投げ**、承認された判断を**永続ルールに落とす**データ・スチュワード。

設計思想は X optimizer と同じ二層: **agent=判断 / code=道具+配管 / 人間=最終ゲート**。常時稼働の有料LLMは置かない（プロジェクト原則 ¥0・ローカル・外部API不使用）。よって:
- **下層＝コード（常時・無料）**: 決定的シグナルを自動でキューに投入し続ける。
- **上層＝LLM思考（Claude・オンデマンド・¥0）**: 「オプティマイザー回して」で Claude がシグナル＋既存ルール＋作業ログを読み、判断の要る提案を生成する。

## 1. データモデル（新規4テーブル / `db/schema.sql` に追記）

### `optimizer_proposals`（提案キュー）
```
id            INTEGER PK AUTOINCREMENT
created_at    TEXT (ISO8601 UTC default)
kind          TEXT CHECK in (
                'classify_unknown','fixed_vs_variable','relabel',
                'transfer_pair','rule_suggest','rule_conflict',
                'label_add','category_regroup')
source        TEXT CHECK in ('signal','llm')   -- 下層 or 上層
status        TEXT CHECK in ('pending','accepted','rejected','dismissed','superseded') default 'pending'
title         TEXT NOT NULL                     -- 問い（例: 「ザバス」は変動費・食費でいい？）
rationale     TEXT                              -- 理由（思考）
confidence    TEXT CHECK in ('high','med','low') default 'med'
target_ref    TEXT                              -- 対象 JSON（description / txn_ids / rule_id / category_major 等）
proposed_action TEXT                            -- 承認時の変更 JSON（後述のアクション型）
dedup_key     TEXT                              -- 同一提案の再生成防止（UNIQUE は張らず status で抑制）
decided_at    TEXT
decided_note  TEXT                              -- 却下理由・修正内容（学習用）
```
インデックス: `(status, kind)`, `(dedup_key)`。

### `txn_overrides`（取引単位の上書き・再取込で消えない）
```
txn_id          TEXT PRIMARY KEY                -- transactions.id（MF ID は安定なので reload 後も一致）
is_transfer     INTEGER CHECK in (0,1)          -- NULL=上書きなし
is_internal_move INTEGER CHECK in (0,1)
classification  TEXT                            -- NULL=上書きなし
category_major  TEXT
category_middle TEXT
note            TEXT
created_at      TEXT default now
```
振替ペア・一点ものの修正（パターン化に向かないもの）を永続化する。`category_rules`（パターン的判断）と役割分担。

### `category_groups`（集計の括り直し）
```
category_major  TEXT PRIMARY KEY                -- MF 大項目
group_name      TEXT NOT NULL                   -- 集約先グループ名
sort_order      INTEGER default 0
created_at      TEXT default now
```
設定がある大項目は、/categories・/budget・/tax で「グループ集計」表示にロールアップできる。未設定の大項目は素のまま。

### `optimizer_runs`（作業ログ）
```
id          INTEGER PK AUTOINCREMENT
ran_at      TEXT default now
ran_by      TEXT CHECK in ('signal','llm')      -- 自動シグナル更新 or LLMパス
signals     INTEGER                             -- 検出シグナル数
proposed    INTEGER                             -- 新規提案数
decided     INTEGER                             -- このrun起点で決定された数
note        TEXT
```

## 2. 永続化の原則（核心）
承認した判断は **必ずルール/マッピングに落ちる** → 再取込後も `apply` で再現（直接の取引編集はしない＝reload で消えるため）:
- パターン的判断（description でくくれる） → **`category_rules`**（既存・source='optimizer' を足す）
- 取引固有（振替ペア・一点修正） → **`txn_overrides`**
- 集計の括り直し → **`category_groups`**

### パイプライン更新
現行: `normalize → load → apply-rules → load:assets`
新: `normalize → load → apply-rules → **apply-overrides** → load:assets`
- `scripts/apply-overrides.mjs`（新規・冪等）: `txn_overrides` を transactions へ再適用（apply-rules の後に走り、ルールより取引固有上書きを優先）。
- `npm run refresh` と `/api/refresh` の連鎖に組み込む。`category_groups` は表示時ロールアップなので apply 不要（読取クエリ側で集約）。

## 3. 下層＝決定的シグナル（コード・常時無料）
`lib/optimizer/signals.ts`（server-only・読取）に検出器を実装。`/optimizer` を開くと最新シグナルがキューに反映される（pending 提案として upsert・dedup_key で重複防止）。検出器:

1. **unknowns**: `classification='unknown'` を description で集約 → `classify_unknown`（高優先・件数/金額レンジ付き）
2. **transfer_pairs**: 同日（±1日）・反対符号・同額・別 account・未 transfer の2件 → `transfer_pair`
3. **rule_conflict**: 各 `category_rules` について、パターン一致する取引の分類が**ルールと多数決で食い違う** → `rule_conflict`
4. **label_inconsistency**: 同一 description が複数 classification にまたがる → `relabel`（一貫化提案）
5. **unconfirmed_recurring**: `recurring_items.confirmed='auto'` 未レビュー → `rule_suggest`（「定期として確定?」。/settings と重複するが横断で surface）

これらは `source='signal'`、`proposed_action` を可能な限り事前充填（例: unknown の明確なものは add_rule を提案）。判断が曖昧なものは LLM パスに委ねる（title に「要判断」）。

## 4. 上層＝LLM思考（Claude・オンデマンド・¥0）
トリガー: ユーザーが「オプティマイザー回して」「提案見せて」等。

1. `scripts/optimizer-export.mjs` → `data/optimizer-input.json` に出力:
   - pending シグナル / unknown descriptions（例・金額レンジ・口座）/ 既存 `category_rules` / classification 分布 / `category_groups` / **直近の決定ログ（accepted/rejected + note）** / 大項目一覧
2. Claude が読んで判断の要る提案を生成 → `scripts/optimizer-propose.mjs <proposals.json>` で `optimizer_proposals` に INSERT（`source='llm'`）。生成対象:
   - `fixed_vs_variable`（ニュアンス判断）/ `relabel` / `category_regroup`（「交際費と食費を分けた方が…」）/ `label_add` / **`rule_conflict`（作業ログを見て「既存ルールR は新データと矛盾」）**
3. **学習**: 決定ログを読み、却下済みアイデアは `dedup_key` で再提案せず、承認ルールの**ドリフト**（「ルールR承認済だが新N件はYっぽい→見直す?」）を能動的に提案。

LLM の出力は JSON 配列（kind/title/rationale/confidence/target_ref/proposed_action/dedup_key）。propose スクリプトが検証して投入。

## 5. アクション型（`proposed_action` JSON / 承認時に server action が実行）
```
{ type:'add_rule', pattern, match_type, classification, category_major?, category_middle? }      // → category_rules INSERT + apply-rules
{ type:'edit_rule', rule_id, patch:{...} }                                                        // → category_rules UPDATE + 再適用
{ type:'delete_rule', rule_id }                                                                    // → category_rules DELETE + 再適用
{ type:'set_override', txn_ids:[...], fields:{is_transfer?, classification?, category_major?...} } // → txn_overrides UPSERT + apply-overrides
{ type:'mark_transfer', txn_ids:[id1,id2] }                                                        // → txn_overrides で両者 is_transfer=1, classification='transfer'
{ type:'regroup', mappings:[{category_major, group_name, sort_order}] }                            // → category_groups UPSERT
{ type:'add_recurring', kind, name, amount, day }                                                  // → recurring_items INSERT(confirmed='user')
```
全アクションは prepared statement・短トランザクション。適用後 `revalidatePath('/optimizer')` ＋影響ページ。

## 6. 承認サーフェス（両方）
### `/optimizer` UI
- ヘッダ: kind別件数・「未処理 N件」・最終run時刻・［シグナル更新］ボタン（下層検出器を再実行＝決定的シグナルのみ更新。深い提案は会話で）。
- キュー: confidence/優先度順、kind別グルーピング。各カード = title（問い）+ rationale + 対象詳細（取引/ルール/カテゴリ）+ ［承認 / 却下 / 修正して承認 / スキップ］。
- 承認 → `proposed_action` 適用 → パイプライン再適用 → 決定ログ記録 → status=accepted。却下 → 理由入力（任意）→ 学習へ。
- 「決定ログ」タブ（= 作業ログ。run と決定履歴）。
- home に「未処理 N件」バッジ（/optimizer へ誘導）。

### 会話モード（Claude）
「回して」で Claude が同じキューを口頭で一問一答（「これ固定費だと思う、理由は…承認する?」）→ ユーザーの返事で `optimizer-propose` / 承認スクリプト経由で適用・記録。**UIとキューは共有**（会話で承認したものも /optimizer に反映、その逆も）。

## 7. category_groups のロールアップ（v1）
- `lib/optimizer/grouping.ts`: `getGroupOf(category_major)` 解決。/categories・/budget・/tax の集計クエリに「グループ表示」トグル（URL `?by=group`）。設定があれば大項目をグループに畳んで集計、無ければ従来表示。
- regroup 提案の承認で `category_groups` が埋まり、トグルで体感できる。

## 8. ビルド順（v1 全部入り・段階検証）
- **Phase 1（基盤+下層+UI）**: 4テーブル＋`apply-overrides`＋`signals.ts`検出器＋`/optimizer`キューUI＋承認 server actions（add_rule/edit_rule/delete_rule/set_override/mark_transfer/add_recurring）＋home バッジ＋決定ログ。
- **Phase 2（上層+学習）**: `optimizer-export.mjs` / `optimizer-propose.mjs`＋Claude会話フロー＋ドリフト検知＋dedup抑制。
- **Phase 3（regroup）**: `category_groups` ロールアップ＋ダッシュボード `?by=group` トグル。

## 9. 検証
- `npm test`: 既存緑維持 ＋ 新規ユニット（signals 検出器の純関数部・apply-overrides 冪等・grouping 解決）。
- `npm run build`: `/optimizer` 含む全ルート緑。
- 機能: シグナルが正しく検出される（2026-03/06 で実データ確認）/ 承認→ルール化→reload→`apply`で再現（冪等）/ 却下→再提案されない / category_regroup トグルで集計が畳まれる。
- LLMパス: export→Claude提案→propose で投入→UIに出る、を一周。

## 10. スコープ外（後続）
複数ユーザー / 自動承認（autonomy levels。v1は全件人間ゲート）/ freee 連携の高度化 / 通知（LINE等）。
