# MF ME 生CSV取得手順

## 前提

- 個人 Chrome に MF ME ログイン済みセッションが必要
- chrome-devtools MCP が Chrome の remote debugging port に接続済みであること
- 参照: memory `reference-chrome-devtools-mcp`

---

## 手順

### ① 個人 Chrome を remote debugging 付きで起動（初回のみ）

```bash
# Mac の場合（Chromeが既に起動していれば一度終了してから）
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 --user-data-dir=~/.chrome-debug-profile
```

MF ME（https://moneyforward.com）にログインしておく。

### ② chrome-devtools MCP で入出金CSV を月次ループ取得

chrome-devtools MCP の `fetch()` 経由で以下 URL を月ごとにループ（2020-01〜当月）。

```
https://moneyforward.com/cf/csv?from={YYYY}/{MM}/01&month={M}&year={YYYY}
```

- レスポンスは **Shift-JIS** 形式（Content-Type は utf-8 と詐称することあり）
- 取得後 UTF-8 に再エンコードして各月ファイルを保存、ID で重複排除して結合
- 保存先: `raw/finance/moneyforward/cashflow-{from}_{to}.csv`

### ③ 資産推移CSV を取得

```
https://moneyforward.com/bs/history/csv
```

- 期間パラメータなし（表示中の範囲が返る）
- 事前に MF ME の「全期間」表示に切り替えてから fetch
- 保存先: `raw/finance/moneyforward/asset-history-{from}_{to}.csv`

### ④ 連携口座状態を取得（account_status 更新用）

```
https://moneyforward.com/accounts
```

- 各口座の「最終更新」日時と連携エラー状態を確認
- JSON/スクリーンショットで保存し `mf_finance.account_status` にインサート

### ⑤ 後処理

```bash
cd apps/mf-finance && npm run normalize && npm run detect
```

連携エラーがある口座は再連携してから再取得（2026-04 以降データ激減の原因）。

### ⑥ 作業後

Chrome の remote debugging セッションを終了（セキュリティ）。
通常の Chrome を起動して作業再開。

---

## cron 自動化（現在全停止中）

Playwright 永続認証プロファイルを使ったヘッドレス定期実行は後続 Plan で対応。
現状（2026-06-06）は cron 全停止中につき手動実行。
参照: memory `project_cron_automation_disabled.md`
