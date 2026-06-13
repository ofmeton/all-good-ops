---
type: concept
created: 2026-06-07
updated: 2026-06-07
related: [[self/streams]], [[business/icecream/overview]], [[dev/external-api-ops]]
tags: [freee, invoice, accounting, mcp, business]
status: active
---

# freee 請求書 運用 playbook

freee-mcp 経由で請求書（invoice / iv API）を扱う時の正本。
工藤陸（個人）事業所の運用ルールと API の落とし穴を束ねる。

- 事業所 ID（工藤陸・個人）: **`12426988`**
- 標準テンプレート ID: **`4220562`**（過去請求書から流用可）
- セットアップ詳細: `mem:project_freee_mcp_setup`

## 1. invoice service は company_id を自動付与しない（既知バグ）

`service: "invoice"`（freee 請求書 / iv API）を叩くときは、**query に `company_id` を必ず明示**する。会計（accounting）サービスは company_id 自動付与されるが、**iv は自動付与されず `401 company_not_found`** になる（[freee/freee-mcp Issue #169](https://github.com/freee/freee-mcp/issues/169) の既知バグ）。

- エラー文に「現在の事業所ID: 12426988」と出ても表示用で、実リクエストには載っていない（OAuth スコープ / アプリ再作成の問題と誤診しやすい）
- iv 呼び出し例: `freee_api_get { service:"invoice", path:"/invoices/templates", query:{ company_id: 12426988 } }`
- POST /invoices などボディ系も `company_id` を含める

教訓: 2026-06-05、5 月分請求書作成で company_not_found 連発。スコープ追加・完全再認可しても変わらず、原因は iv の company_id 未付与だった。

## 2. line items の分類は項目名の文字列のみで判定（推測禁止）

工藤陸 → 株式会社 BEAT ICE 宛て請求書の line items 分類ルール: **項目名に「立替_」がプレフィックスとして付いているもののみ立替金、それ以外はすべて工藤陸の業務委託収入**。

- 立替金例: 「立替_ゆうパック送料」「立替_梱包資材」「立替_RICE CREAM材料費」「立替_RICE CREAM備品代」
- 業務委託収入例: 「EC業務委託費」「店舗業務(時給)」「MGR業務(定額)」「RICE_CREAM_バイト給与」「RICE_CREAM_営業終了特別支給」「棚田アイス_集計作業費」
- 確定申告の収入集計時の重要な区分ルール。**項目名で機械的に判定し、用途を推測しない**

教訓: 2026-05-19 #003 で「RICE_CREAM_バイト給与」等をバイトへの立替と推測判定 → 「立替と項目名に付いていないものは俺の収入」と訂正。収入合計が大きく変わる。

## 3. POST /invoices の最小成功ペイロード（GET と非対称）

`POST /invoices` する際、GET レスポンスから推測した body は通らない。GET と POST でフィールド名・型が非対称。

POST body 必須キー:
- `company_id` (number) / `partner_id` (number)
- `partner_title`（"御中" 等・**必須**）
- `subject`, `billing_date`, `payment_date`, `payment_type`
- `tax_entry_method: "in"`（内税推奨。税込金額をそのまま入れて自動分離させる）
- `tax_fraction: "omit"`, `line_amount_fraction: "omit"`, `withholding_tax_entry_method: "in"`
- `template_id`（過去請求書から流用 = 4220562）
- `invoice_note`（振込手数料負担文言）
- `lines: [...]`（**`invoice_contents` ではない**）

`lines` 内の各 line 必須キー:
- `type: "item"`, `description`, `unit`, `quantity` (number)
- `unit_price`（**string**。`"3000.0"` のような小数点付き文字列。GET でも文字列で返る）
- `tax_rate` (number: 0/8/10), `reduced_tax_rate` (bool), `withholding` (bool)

ポイント: 内税モード（`tax_entry_method: "in"`）なら税込金額を unit_price にそのまま入れれば freee が税抜・税額に自動分離（電卓不要）。

教訓: 2026-05-10 BEAT ICE 4 月分発行で 400 を 2 回（1 回目: `partner_title` 必須・`invoice_contents` でなく `lines` / 2 回目: `unit_price` は number でなく string）。実例 body: `outputs/retrospectives/2026-05-10-0930-freee-and-sheets-mcp.md`。
