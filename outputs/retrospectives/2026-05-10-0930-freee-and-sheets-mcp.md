# 2026-05-10 09:30 セッション振り返り — freee MCP請求書発行 & Google Sheets MCP導入

## 対象セッション要約

freee MCP の動作確認 → BEAT ICE 4月分業務委託費請求書（INV-0000000004 / ¥7,322 税込）の発行 → Google Drive MCP の write 制約発覚 → xing5/mcp-google-sheets を OAuth 2.0 / user scope で導入完了。所要 約2時間。

## 1. 良かった点

- 過去請求書3件（INV-001/002/003）を最初に取得して命名規則・税率パターンの辞書を作ってから新規ドラフトに進めた。INV-001 と INV-003 の税率差分から「INV-003 の全項目0%は便宜運用で本来は誤り」と指摘でき、軌道修正に繋がった
- ユーザーの「税抜計算が面倒だから税率0%にしてる」発言に対し、即座に「freee 内税モードなら税込のまま入れて自動分離される」と誤解を解いた（INV-001 が実例として残っていた）
- Google Drive MCP の write 不可問題を「権限問題ではなくコネクタ仕様」と特定 → リサーチ → 代替MCP（xing5/mcp-google-sheets）→ セットアップ実行までを1ターン内で完了させた

## 2. 詰まった瞬間・二度手間

| # | 事象 | 原因 | 先回りできたポイント | 本来すべき動き |
|---|---|---|---|---|
| 1 | freee POST /invoices で 400 エラー2回 | GET レスポンス構造から POST body を推測したが、freee API は GET/POST でフィールド名が違う（`invoice_contents` vs `lines`、`unit_price` の数値型 vs string） | GET INV-001 のレスポンス時点で `unit_price: "21970.0"` が string と気付けた | freee 請求書 POST の最小成功ペイロード型を事前に memory 化 |
| 2 | uv インストール後 `claude mcp add` が `command not found` | フックの非対話 shell から `~/.local/bin` が見えない（既知の `feedback_nvm_path_for_hooks.md` と同型）| 既存 memory にあったパターンと一致 | 新規ツール直後の Bash 呼び出しは最初からフルパス |
| 3 | `mv ~/Downloads/client_secret_*.json ~/.config/.../credentials.json` がユーザー貼り付けで改行分割 | 長コマンドをユーザー実行に委ねた | クレデンシャル系移動は Claude 代行 default のはず | 提示時点で「私が代行しますか？」を併記 |
| 4 | スプシの領収書シート / ゆうパック立替シートが読めずユーザーに数字を口頭で聞いた | Claude 純正 Google Drive MCP は fileId 単位・gid 別取得不可。複数シートが mix されて返ってきていた | スプシ URL 受領時点で「現MCPの制約」を先出し | スプシ初読時に「シート別取得不可・write不可」をテンプレで明示 |

## 3. 自動化・効率化の余地

- freee 請求書 POST の最小成功型 を memory に固定化（次回は1発成功）
- Google Drive MCP の制約 3点（read-only / fileId 単位 / 全シート mix）を初回スプシ受領時に出すテンプレ化
- 領収書集計→請求書発行→振込先確認 の流れは月次定型なので、将来的に「月初定型ジョブ」化候補

## 4. 次回への改善提案

- 次回 freee 請求書 POST 時は **`lines` キー名 / `partner_title` 必須 / `unit_price` は string** を最初から組み込む
- 次回 ユーザーがスプシ URL を渡した時点で **「現MCPは write 不可・シート別取得不可」を最初の応答で明示**（読み込み試行前）
- 次回 クレデンシャル系ファイル移動を案内する時は **「コマンド提示」ではなく「Claude 代行で OK ですか？」を先出し**

## 5. 反映実装

### memory（feedback / project）
- `feedback_freee_invoice_post_payload.md` 新規（freee 請求書 POST 最小成功型）
- `feedback_google_drive_mcp_limits.md` 新規（純正Drive MCPの制約3点を先出しテンプレ化）
- `feedback_credential_file_move_proxy.md` 新規（credentials.json 移動は Claude 代行 default）
- `project_google_sheets_mcp_setup.md` 新規（xing5/mcp-google-sheets 導入記録）
- `MEMORY.md` Index に4本追記

### improvement-log
`data/improvement-log.jsonl` に4件追記（topic: freee_invoice_post_payload / google_drive_mcp_limits_preempt / credential_file_move_claude_proxy / google_sheets_mcp_setup_complete）

### 該当なし
- 新規スキル化候補なし
- permissions 変更なし
- エージェント新設・統合なし
- CLAUDE.md ルーティング表変更なし

## 参考: 今回の freee 請求書発行ペイロード（最終成功型）

```json
{
  "company_id": 12426988,
  "subject": "2026年4月_業務委託費",
  "partner_id": 110586749,
  "partner_title": "御中",
  "billing_date": "2026-05-10",
  "payment_date": "2026-05-31",
  "payment_type": "transfer",
  "tax_entry_method": "in",
  "tax_fraction": "omit",
  "line_amount_fraction": "omit",
  "withholding_tax_entry_method": "in",
  "invoice_note": "誠に恐れ入りますが、振込手数料のご負担をお願いいたします。",
  "template_id": 4220562,
  "lines": [
    {"type": "item", "description": "EC業務委託費", "unit": "件", "quantity": 1, "unit_price": "3000.0", "tax_rate": 10, "reduced_tax_rate": false, "withholding": false},
    {"type": "item", "description": "立替_ゆうパック送料", "unit": "件", "quantity": 1, "unit_price": "700.0", "tax_rate": 10, "reduced_tax_rate": false, "withholding": false},
    {"type": "item", "description": "立替_RICE CREAM備品代", "unit": "件", "quantity": 1, "unit_price": "3622.0", "tax_rate": 10, "reduced_tax_rate": false, "withholding": false}
  ]
}
```

結果: INV-0000000004 / ¥7,322 税込 / 内消費税 ¥665 / sending_status: unsent（下書き保存）
