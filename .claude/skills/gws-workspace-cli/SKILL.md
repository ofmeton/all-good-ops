---
name: gws-workspace-cli
description: Google Workspace(Drive/Docs/Sheets/Gmail/Calendar/Slides/Chat/Tasks)をヘッドレスに一括操作する CLI「gws」の運用ガイド。Discovery API 由来で全エンドポイントを動的に網羅し、出力は常に構造化 JSON。Docs/Slides 生成・大量メールのバッチ処理・NDJSON ストリーム・--dry-run 検証など、会話内 MCP では埋まらないヘッドレス/バッチ自動化に使う。ユーザーが「gws で」「ワークスペースを CLI で一括処理」「Docs/Slides を生成して」「Gmail をバッチ処理」「シートを CLI で更新」等と依頼した時に起動する。
---

# gws — Google Workspace CLI

`gws` は Google Workspace（Drive / Docs / Sheets / Gmail / Calendar / Slides / Chat / Tasks / Apps Script ほか）を **1 つの CLI でヘッドレス操作** するツール。Google の Discovery Service を実行時に読み、コマンド面を動的生成するため、全 API エンドポイントを網羅し、新エンドポイント追加にも自動追従する。**出力は常に構造化 JSON**＝エージェントがパースしやすい。

> 非公式ツール（Google 公式サポート対象外）。v1.0 前で破壊的変更あり得る。

## いつ使うか（MCP との使い分け）

| 局面 | 使う手段 |
|---|---|
| 会話内で 1〜数件を即時参照・作成（カレンダー予定・Drive 検索・シート読み書き） | **既存 MCP**（Google Calendar / Drive / Sheets）。即応性が高い |
| ヘッドレス / バッチ / スクリプト連携（大量メール処理・多数行のシート更新・NDJSON でパイプ） | **gws CLI** |
| **Docs / Slides の生成・編集**（MCP コネクタが薄い領域） | **gws CLI** |
| 送信・破壊操作の事前検証 | **gws の `--dry-run`**（リクエストを実行せずプレビュー） |
| 多ページ取得を 1 コマンドで | **gws の `--page-all`**（NDJSON で全ページ） |

要点: **会話内の即時 1 件 = MCP / ヘッドレス・バッチ・Docs/Slides・dry-run 検証 = gws CLI**。

## インストール（手順記載のみ・実インストールは未実施）

推奨は GitHub Releases のビルド済バイナリを `$PATH` に置く方式。npm でも自動取得可。

```bash
# npm（GitHub Releases から OS 別バイナリを取得）
npm install -g @googleworkspace/cli

# Homebrew (macOS / Linux)
brew install googleworkspace-cli

# ソースから（Rust 実装）
cargo install --git https://github.com/googleworkspace/cli --locked
```

要件: Node.js 18+（npm 経由時）/ Google Cloud プロジェクト（OAuth 用）/ Workspace アクセスのある Google アカウント。

## 認証（OAuth）

```bash
gws auth setup     # 初回: GCP プロジェクト設定 + API 有効化 + ログインを対話で（gcloud CLI が必要）
gws auth login     # 以降のスコープ選択 + ログイン
```

- `gws auth setup` は `gcloud` CLI に依存。無い場合は Cloud Console で手動 OAuth クライアント（**Desktop app** 型）を作り `~/.config/gws/client_secret.json` に保存 → `gws auth login`。
- **testing モードのアプリは自分を Test users に追加必須**（未追加だと「Access blocked」）。
- **testing モードはスコープ上限 ~25**。`recommended` プリセット（85+ scopes）は失敗する。**必要サービスだけ指定**: `gws auth login -s drive,gmail,sheets`。
- 認証情報は OS keyring に AES-256-GCM で暗号化保存。
- ヘッドレス/CI: ブラウザのある端末で認証 → `gws auth export --unmasked > credentials.json` → 別端末で `export GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE=/path/to/credentials.json`。
- サービスアカウント: `GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE` に鍵ファイルを指す。既存トークン: `GOOGLE_WORKSPACE_CLI_TOKEN=$(gcloud auth print-access-token)`。

## 基本の形

```bash
gws <service> <resource> <method> --params '{...}' [--json '{...}']
gws schema drive.files.list      # 任意メソッドのリクエスト/レスポンス schema を確認
gws <service> --help             # Discovery メソッド + ヘルパーコマンド一覧
```

- `--params`: クエリ/パスパラメータ（JSON）
- `--json`: リクエストボディ（JSON）
- `--dry-run`: 実行せずリクエストをプレビュー（送信・書込前の検証）
- `--page-all` / `--page-limit N` / `--page-delay MS`: 自動ページング（NDJSON、既定上限 10 ページ）
- **Sheets の range は `!` を含む → bash 履歴展開を避けるため必ずシングルクォート**

ヘルパーコマンド（`+` 接頭辞、Discovery メソッドと衝突しない）: `gmail +send/+reply/+triage`、`sheets +append/+read`、`docs +write`、`calendar +insert/+agenda`、`drive +upload`、`workflow +standup-report/+meeting-prep/+weekly-digest` 等。

## よくあるワークフロー

### 1. メール一括処理（Gmail バッチ）

```bash
# 未読インボックスのサマリ（送信者/件名/日付）
gws gmail +triage

# 全未読を NDJSON でストリーム取得 → jq でフィルタしてバッチ処理
gws gmail users messages list --params '{"q": "is:unread"}' --page-all \
  | jq -r '.messages[].id'

# 送信は人間確認必須（CLAUDE.md）。まず --dry-run で検証してから外す
gws gmail +send --to alice@example.com --subject "Hello" --body "Hi" --dry-run
```

### 2. シート更新（Sheets バッチ）

```bash
# 読み取り（range は単一クォート必須）
gws sheets spreadsheets values get \
  --params '{"spreadsheetId": "SPREADSHEET_ID", "range": "Sheet1!A1:C10"}'

# 行 append
gws sheets spreadsheets values append \
  --params '{"spreadsheetId": "ID", "range": "Sheet1!A1", "valueInputOption": "USER_ENTERED"}' \
  --json '{"values": [["Name", "Score"], ["Alice", 95]]}'
```

### 3. ドキュメント生成（Docs / Slides — MCP が薄い領域）

```bash
# 新規スプレッドシート作成
gws sheets spreadsheets create --json '{"properties": {"title": "Q1 Budget"}}'

# Doc を作って本文 append
gws docs +write --document-id DOC_ID --text "## 議事録\n- 決定事項..."

# Slides は slides.presentations.create / batchUpdate で生成・編集
gws slides presentations create --json '{"title": "Pitch Deck"}'
gws slides presentations batchUpdate \
  --params '{"presentationId": "PRES_ID"}' \
  --json '{"requests": [{"createSlide": {}}]}'
```

## 注意（CLAUDE.md 準拠）

- **書込・送信系は人間確認必須**: Gmail 送信・Calendar 予定作成/更新・Drive/Sheets/Docs/Slides の作成・更新・削除は、実行前に必ず人間確認。**まず `--dry-run` でリクエスト内容を提示 → 承認後に本実行**。
- ファイル削除・上書き（特に共有 Drive の重要ファイル）は特に慎重に。
- testing モードのスコープ上限・Test users 登録・「未確認アプリ」警告は認証節の通り。

## 取り込みメモ（all-good-ops）

- **source**: https://github.com/googleworkspace/cli （default branch `main`、README 由来で本 SKILL.md を新規執筆）
- **取り込み日**: 2026-06-19
- **このリポでの位置づけ / 既存 MCP との補完関係**: 既に **Google Calendar / Drive / Sheets の MCP** が接続済（memory: `reference_google_calendar_mcp`・`project_google_sheets_mcp_setup`）。MCP は「会話内で即時 1 件」に強い一方、**Docs/Slides 生成・大量バッチ・NDJSON パイプ・`--dry-run` 検証・ヘッドレス/CI 実行**は手薄。gws はそこを埋める CLI 補完。日常の単発参照は MCP、まとまった自動化・Docs/Slides は gws、と棲み分ける。
- **改変点**: これは npm CLI ツールでありスキルではないため、README を要約して「運用スキル」として新規執筆（原文の丸写しではない）。実際の `npm i -g` 等インストールは未実施＝手順記載のみ。
- **本家同梱スキル**: gws リポは 100+ の Agent Skill（`SKILL.md`）を同梱（`npx skills add https://github.com/googleworkspace/cli`）。必要に応じてサービス別スキルを個別取得可。
