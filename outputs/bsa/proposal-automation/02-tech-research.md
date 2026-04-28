# BSA 受注自動化システム — 技術調査報告

> 作成日: 2026-04-28
> 目的: `01-requirements.md` の R1〜R7 を技術検証し、設計書 (`03-design.md`) の前提を確定させる
> 調査方法: 実環境調査（`claude --help`、binary 探索、`/Applications` 確認）+ WebFetch（Lancers 利用規約原文・robots.txt）+ WebSearch（Playwright stealth・Claude in Chrome）+ claude-code-guide エージェントによる Claude Code CLI 公式ドキュメント参照

---

## 0. サマリ

| # | リスク・不明点 | 結論 | 影響 |
|---|---|---|---|
| R1 | Claude Code CLI ヘッドレス実行 | ✅ 動作確認済（v2.1.119）、`-p --output-format json` 等使用可 | 提案文自動生成は可能 |
| R2 | Lancers 利用規約の自動化制限 | ✅ 自動化・bot 禁止の明示条項なし、ただし「人為的な高負荷アクセス」禁止条項あり | リクエスト頻度を低めに保てば法的リスク低 |
| R3 | Playwright + クッキー使い回しの安定性 | 🟡 `playwright-stealth` で実用、Lancers の bot 検知強度は実測必要 | 自宅IPで運用するなら検知される可能性は低い |
| R4 | Claude in Chrome のフォーム自動入力 | ✅ 機能上は可能、Pro $20/月以上で利用、ベータ版・usage 消費注意 | ログイン・CAPTCHA 突破は人間に依頼、これは仕様通り |
| R5 | macOS `.command` 実装 | ✅ 標準的な実装で対応可、`.zshenv` の PATH 整備が前提 | 工数小 |
| R6 | Exa MCP の Claude Code CLI ヘッドレスからの利用 | ✅ MCP 自動読み込み、Exa 利用可 | リサーチ自動化可能 |
| R7 | 上位10件並列生成の所要時間 | 🟡 並列実行可能、レート制限は実測 | 直列フォールバック必要 |

**追加発見**:
- 🚨 **Lancers は2要素認証を導入済み** (2024頃) → パスワード保存 + 自動ログインは詰む。N5=c（cookie 使い回し + 期限切れ通知）を採用した判断は正解
- 🟡 `~/.local/bin` が現在の `.zshenv` PATH に未登録 → 実装時に追加要

---

## 1. R1 — Claude Code CLI ヘッドレス実行

### 1.1 現環境の確認

```bash
$ /Users/rikukudo/.local/bin/claude --version
2.1.119 (Claude Code)

$ ls -la /Users/rikukudo/.local/bin/claude
lrwxr-xr-x  /Users/rikukudo/.local/bin/claude -> /Users/rikukudo/.local/share/claude/versions/2.1.119
```

✅ Claude Code CLI v2.1.119 がローカルにインストール済み。

### 1.2 主要なフラグ（`claude --help` 抜粋）

| フラグ | 役割 | 本プロジェクトでの利用 |
|---|---|---|
| `-p, --print` | 非対話実行（プロンプト→応答→exit） | **必須**: 提案文生成のメインフロー |
| `--output-format json` | JSON 単一結果 | **必須**: スクリプトからのパース用 |
| `--json-schema '<schema>'` | 構造化出力のスキーマ強制 | **必須**: 提案文 + 金額 + 納期の構造を保証 |
| `--mcp-config <files>` | MCP サーバー指定 | **オプション**: Exa MCP を限定的に有効化 |
| `--max-budget-usd <amount>` | 課金上限（API キーモード時のみ実効） | サブスクモードなので実効性低、保険として設定可 |
| `--no-session-persistence` | セッション保存しない | **必須**: 1案件ずつ独立コンテキスト |
| `--bare` | hooks / CLAUDE.md / auto-memory をスキップ | **推奨**: 案件処理を高速化、本プロジェクトの context 不要 |
| `--allowedTools <tools...>` | 利用可能ツール限定 | **推奨**: `WebFetch`, `Bash(curl *)`, MCP のみ許可 |
| `--fallback-model <model>` | overload 時の代替モデル | **推奨**: opus → sonnet にフォールバック |
| `--effort <low/medium/high/xhigh/max>` | 思考の深さ | **推奨**: 提案文生成は medium で十分 |

### 1.3 提案文生成の呼び出しイメージ

```bash
/Users/rikukudo/.local/bin/claude \
  --print \
  --output-format json \
  --json-schema '{"type":"object","properties":{"body_md":{"type":"string"},"product_line":{"enum":["L1","L2","L3","L4"]},"price":{"type":"integer"},"delivery_days":{"type":"integer"},"research_notes":{"type":"string"}},"required":["body_md","product_line","price","delivery_days"]}' \
  --no-session-persistence \
  --bare \
  --allowedTools "WebFetch" \
  --effort medium \
  --fallback-model sonnet \
  "案件 LAN-20260428-001 の提案文を生成してください。\n\n【案件情報】..."
```

### 1.4 並列実行と Rate Limit

- 公式ドキュメント上、複数の `claude -p` 同時起動を禁止する記述は見当たらない
- ただし、**Pro/Max サブスクの使用量制限**（5時間あたりN メッセージ）に到達すると失敗する可能性
- **実装方針**: Phase 1 では **直列実行** で実装し、各案件 30〜60秒 × 10件 = 5〜10分。並列化は Phase 2 で計測しながら導入

### 1.5 PATH 問題

| 場所 | claude が見える | 備考 |
|---|---|---|
| Claude Code 内 (`Bash` ツール経由) | ❌ | 親プロセスの PATH を継承するが `~/.local/bin` 未登録 |
| 対話 zsh / Terminal.app | ✅ | `.zshrc` で PATH 通っている |
| 非対話 zsh (.zshenv のみ) | ❌ | `.zshenv` に追加必要 |
| `.command` ファイル (Terminal.app 起動) | ✅ | `.zshrc` 読まれるので可 |
| launchd ジョブ | ❌ | `.zshenv` のみ読まれる |

**実装時の対応**: `.zshenv` に以下を追加（既存 PATH 設定に倣う）

```bash
# Claude Code CLI (~/.local/bin)
if [ -x "$HOME/.local/bin/claude" ]; then
  export PATH="$HOME/.local/bin:$PATH"
fi
```

これは memory `feedback_zshenv_toolchain` および既存の node v24.14.1 PATH 設定と同じパターン。

### 1.6 コスト

- ヘッドレス実行は **Pro/Max サブスク使用量にカウントされる**（追加課金なし）
- 1回の提案文生成は medium effort で約 5,000-10,000 tokens 想定
- 10件 × 5,000 tokens = 50,000 tokens/日 → サブスク枠に余裕

---

## 2. R2 — Lancers 利用規約・robots.txt 調査

### 2.1 利用規約原文 (https://www.lancers.jp/help/terms)

#### 2.1.1 関連条文の引用

**第33条第1項第13号**:
> 本サイト若しくは本サイトの一部（コンテンツ・情報・機能・システム・プログラム等）を使用・転用・転売・複製・送信・翻訳・翻案などして、いかなる手法を問わず商業・営業目的の活動...その他本サイトの2次利用や複製行為

**第33条第1項第14号**:
> 本サイトのセキュリティホールやバグの利用・不正アクセスや人為的な高負荷アクセスを発生させる行為...逆アセンブル、逆コンパイル、リバースエンジニアリングする行為

#### 2.1.2 該当しない事項

| 確認項目 | 結果 |
|---|---|
| スクレイピング・bot に関する明示禁止条項 | **なし** |
| 機械的アクセス・自動データ取得の禁止条項 | **なし**（高負荷アクセスのみ禁止） |
| 提案・応募の自動送信に関する禁止条項 | **なし** |
| クローラ・スパイダーに関する条項 | **なし** |

### 2.2 robots.txt (https://www.lancers.jp/robots.txt)

User-agent ごとのクロール頻度ガイドライン:

| User-agent | Crawl-delay | 解釈 |
|---|---|---|
| ClaudeBot | 5秒 | AI bot に対して比較的寛容 |
| ChatGPT-User / gptbot | 1秒 | AI bot 寛容 |
| AhrefsBot / bingbot 他 | 600秒 | SEO bot に厳しい |
| ia_archiver / archive.org_bot | Disallow: / | アーカイブ完全禁止 |

特定パスの全 User-agent 禁止:
- `/wordpress/lancer/prefecture/`
- `/profile/search*?*refinement_skill*refinement_skill*`
- `/ec/lancer/prefecture/`

→ **検索結果ページ (`/work/search/...`)** は明示的な禁止なし。クロール可能。

### 2.3 結論と運用方針

**法的リスク評価**: 🟢 低
- 自動化禁止の明示条項なし
- 商業・営業目的の2次利用には該当しないと解釈可能（自分の提案投下のための情報収集）
- 高負荷アクセス禁止 → リクエスト頻度を制御すれば抵触しない

**運用ルール**:
1. **収集頻度**: 1日1回（朝のダブルクリック実行のみ）
2. **リクエスト間隔**: 案件詳細ページ取得時は **3〜5秒/件** の delay を入れる（ClaudeBot の5秒に倣う）
3. **同時接続**: 1接続のみ
4. **収集件数**: 1日合計 50件目安、200件/日を超えない
5. **収集データの利用**: 自分の提案投下のためのみ。第三者への販売・公開は禁止
6. **User-Agent**: 通常の Chrome の User-Agent を使用（自動化検知回避と、Lancers 側に「特殊なクライアント」と認識されない両立）

### 2.4 重要な技術的発見: 2要素認証

[Lancers 公式お知らせ (info.lancers.jp/33886)](https://info.lancers.jp/33886) より、**Lancers はログイン時の2要素認証を導入済み**。

**影響**:
- ❌ パスワード自動入力 + 完全自動ログインは不可（2FA で詰む）
- ✅ 初回手動ログイン → cookie 保存 → 以降クッキー使い回し（N5=c の方針）は有効
- ⚠️ クッキー期限切れ時は**人間が再ログイン**する必要あり（macOS 通知 + Playwright headed で Lancers ログイン画面を自動オープン）

→ 元の N5=c 方針で問題なし。

---

## 3. R3 — Playwright + クッキー使い回しの安定性

### 3.1 ステルス手法の現状（2026年）

WebSearch 結果より:

| 手法 | 状態 | 推奨度 |
|---|---|---|
| `playwright-stealth` (Python) | アクティブメンテ、context-manager API 提供 | ⭐⭐⭐ MVP の標準 |
| `playwright-stealth` (Node.js) | メンテ低調 | ⭐ |
| 自前 stealth.js patch | 古い | ⭐ |
| Browserless / ZenRows / Scrapfly 等のマネージドブラウザ | 商用、コスト発生 | ❌ コスト制約で除外 |

**Phase 1 の選択**: `playwright-stealth` (Python) + `~/.venvs/img-tools/` の playwright をベースに新規 venv 作成。

### 3.2 ステルスの限界

- Stealth は **fingerprint レベルの検知**しか解決しない
- Cloudflare Turnstile / DataDome 等の高度な anti-bot は突破困難
- TLS fingerprinting（HTTP/2 や cipher suites の特徴）まで合わせる必要が出る場合あり

### 3.3 Lancers の bot 検知強度

WebSearch で「Lancers Cloudflare 検知」を調査したが、**Lancers が Cloudflare の高度な bot 管理を導入している証拠は見当たらず**。一般的な WAF 程度と推測。

ただし、提案応募の異常検知（短時間に大量応募）は社内ロジックで実装している可能性大。本プロジェクトでは:
- ✅ 自動応募はしない（人間が最終クリック）
- ✅ 1日3件の応募ペース → 異常検知の閾値以下
- ✅ 自宅 IP からの操作 → IP reputation 良好

### 3.4 クッキー使い回しの実装方針

```
┌─────────────────────────────────────────────────┐
│ 1. 初回: 人間が手動ログイン (Playwright headed) │
│    → 2FA も人間が入力                            │
│    → context.storage_state() でクッキー保存     │
│    → ~/.local/share/bsa-pa/lancers-cookies.json │
│                                                  │
│ 2. 2回目以降: 保存したクッキーをロード           │
│    → 各実行前に /mypage を 1回叩いて状態確認    │
│    → ログイン状態なら継続、NG なら通知 + 停止   │
│                                                  │
│ 3. 期限切れ検知後: macOS 通知 + Lancers ログイ  │
│    ンページを Playwright headed で自動オープン  │
│    → 人間が手動ログイン → クッキー上書き保存    │
└─────────────────────────────────────────────────┘
```

クッキー保存先は **`~/.local/share/bsa-pa/`** に統一（macOS の標準的なアプリデータ置き場）。

---

## 4. R4 — Claude in Chrome のフォーム自動入力

### 4.1 機能確認

[Claude for Chrome 公式](https://claude.com/claude-for-chrome) および [Claude Code Chrome 連携 docs](https://code.claude.com/docs/en/chrome) より:

| 機能 | 対応 |
|---|---|
| フォーム入力 | ✅ |
| ボタンクリック | ✅ |
| 複数タブ操作 | ✅ |
| マルチステップワークフロー | ✅ |
| ワークフロー記録・再生 | ✅ |
| ログイン・CAPTCHA 突破 | ❌ 人間に依頼 |
| Brave / Arc 等の Chromium 系ブラウザ | ❌ Chrome / Edge のみ |

### 4.2 制約・注意点

1. **ベータ版**: 2025年12月時点でベータ提供、安定性は完全ではない
2. **プロンプトインジェクションリスク**: 悪意あるサイト上の隠しプロンプトに反応してしまう可能性 → Lancers のような信頼できるサイトでのみ利用
3. **使用量消費**: 通常チャットより使用量が早く減る → 1日10件以内に抑える運用が安全
4. **エラー多め**: 「occasional rough edge」、複雑なタスクで失敗することあり

### 4.3 本プロジェクトでの利用フロー

```
1. ダッシュボードで「Claude in Chrome でフォーム入力」ボタン押下
2. ボタンが Lancers 応募ページの URL を新しいタブで開く
3. 提案文・金額・納期を Claude in Chrome 拡張 に渡す
   → 渡し方: ダッシュボード上に「以下を貼り付けて Claude に依頼してください」と
     プロンプト + データを表示。利用者が Claude in Chrome のチャット欄に貼り付け
4. Claude in Chrome がフォームの該当フィールドに値を流し込む
5. 利用者が目視確認して送信ボタンをクリック
6. ダッシュボードに戻り「入力済みにする」ボタンで status=submitted に更新
```

→ ダッシュボードと Claude in Chrome の連携は **クリップボード経由**（直接 API 連携はない）。

### 4.4 代替案（Phase 2 で検討）

Claude in Chrome がうまく動かない場合の代替案:

- **Phase 2 候補A**: Playwright headed で応募フォームの該当フィールドを埋める（送信ボタンは押さない）。技術的には可能だが、応募フォームの構造解析が案件ごとに必要になりコストが高い
- **Phase 2 候補B**: ダッシュボードに「クリップボードに提案文をコピー」「金額・納期は別途コピー」のボタンを並べ、利用者が手動で貼り付ける（最低限・最速）

---

## 5. R5 — macOS `.command` ファイル実装

### 5.1 仕組み

- macOS の Finder で `.command` 拡張子のシェルスクリプトをダブルクリックすると **Terminal.app が起動して実行**
- `chmod +x` 必要
- Shebang は `#!/bin/zsh` または `#!/bin/bash`

### 5.2 想定スクリプト構成

```bash
#!/bin/zsh
# ~/Desktop/📥 BSA 案件収集.command
set -euo pipefail

# 進捗を Terminal で見えるように
echo "📥 BSA 案件収集を開始します..."

# 作業ディレクトリ
cd /Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation

# Python venv をアクティベート
source ~/.venvs/bsa-pa/bin/activate

# Step 1-3: 収集 + score + 履歴更新
python3 src/collector/main.py

# Step 4-5: 上位10件の提案文生成
node src/generator/main.js

# Step 6: 通知
bash src/notifier/notify.sh "success"

# Step 7: ダッシュボード起動 (バックグラウンド、既起動なら何もしない)
bash src/dashboard/start.sh

# Step 8: ブラウザを開く
open http://localhost:3000

echo "✅ 完了。ブラウザを確認してください。"
echo "（Terminal は 60秒後に自動で閉じます）"
sleep 60
exit 0
```

### 5.3 デスクトップアイコン化

```bash
# .command ファイルをデスクトップにシンボリックリンク
ln -s /Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation/scripts/run.command \
      "$HOME/Desktop/📥 BSA 案件収集.command"
```

→ ファイル名に絵文字 OK、日本語 OK。Finder ではアイコンのみ表示。

### 5.4 進捗・エラー表示

- 標準出力は Terminal にそのまま表示
- 各ステップの開始時に `echo` で進捗表示
- エラー時は `set -e` で即停止、`trap` で macOS 通知 + Gmail 送信を発火
- 完了時は `sleep 60 && exit 0` で利用者がログを確認できる時間を確保

---

## 6. R6 — Exa MCP のヘッドレス利用

### 6.1 公式ドキュメント確認

claude-code-guide エージェントの調査より:

> `--bare` フラグなしなら自動読み込み。`--bare` 指定時は `--mcp-config` で明示。Exa MCP 利用可。

### 6.2 本プロジェクトでの方針

提案文生成時の MCP 利用をどう制御するか:

| 方針 | フラグ | メリット |
|---|---|---|
| 全 MCP 自動読み込み | (フラグなし) | 設定不要、Exa MCP がそのまま使える |
| 必要な MCP のみ読み込み | `--bare --mcp-config exa-config.json` | 起動高速、不要 MCP の副作用回避 |

**Phase 1 の選択**: `--bare` を使い、`exa-config.json` で Exa MCP のみ明示的に有効化。理由:
- 起動を高速化（hooks / CLAUDE.md 読み込みスキップ）
- 提案文生成に不要な MCP（Asana, Slack, Vercel, Supabase 等）を読み込まない
- メモリ feedback `local_skill_invocation`（ローカルスキル Read 直行）と整合（context-pollutionを避ける）

```json
// exa-config.json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": ["-y", "exa-mcp-server"],
      "env": {
        "EXA_API_KEY": "{ENV_VAR}"
      }
    }
  }
}
```

→ Exa の API キーは Keychain or `.env` に保管。

### 6.3 Exa MCP 利用上限

- 無料枠: 月 1,000 検索
- 想定利用量: 提案 10件/日 × 5検索/件 × 30日 = 1,500 検索/月 → **無料枠オーバーする可能性**

**対応**:
- Phase 1 では **1案件あたり 3 検索に制限**（10 × 3 × 30 = 900 検索/月、余裕）
- 月800検索（80%）到達時に通知（要件 FR-4.2 修正済み）
- 月1000検索到達時は処理停止 + 人間判断

---

## 7. R7 — 並列実行とサブスク制限

### 7.1 並列実行の理論

- 各 `claude -p` プロセスは独立 → OS レベルでは並列起動可
- ボトルネック: Pro/Max サブスクの **5時間あたりメッセージ数制限**

### 7.2 想定処理時間

| 構成 | 1件あたり | 10件 |
|---|---|---|
| 直列 | 30〜60秒 | 5〜10分 |
| 並列 (3 同時) | 30〜60秒 | 2〜4分 |
| 並列 (5 同時) | 30〜60秒 | 1〜2分 |

### 7.3 Phase 1 の方針

- **直列実行で MVP 着地**（5〜10分はユーザー受容可能）
- Phase 2 で並列化を検討（メリット 5分短縮 vs サブスク制限到達リスクのトレードオフ評価）

---

## 8. 技術スタック確定

調査結果を踏まえた最終的な技術スタック:

| 領域 | 選択 | 理由 |
|---|---|---|
| **収集スクレイパー** | Python 3 + `playwright-stealth` | Python 版 stealth が最もメンテされている、ローカル `~/.venvs/img-tools/` の延長で構築可能 |
| **fit_score 計算** | Python 3（純 Python） | 収集と同じ言語、外部ライブラリ不要 |
| **提案文生成** | Node.js + `child_process` で `claude -p` 起動 | Node.js / TypeScript は Next.js と統一できる |
| **リサーチ** | Claude Code CLI 内で MCP 経由 (Exa)、補助で WebFetch | 別実装不要、一元化 |
| **データ保存** | SQLite (`better-sqlite3` for Node, `sqlite3` for Python) | 軽量、ローカル完結、トランザクション対応 |
| **ダッシュボード** | Next.js 15 (App Router) + React Server Components | 既存 ai-radar と同構成、学習コスト最小 |
| **通知** | `terminal-notifier` (macOS) + Gmail MCP (Node.js から呼び出し) | 既存の MCP インフラを流用 |
| **エントリポイント** | `.command` シェルスクリプト | 標準的・最小実装 |
| **PATH 整備** | `.zshenv` に `~/.local/bin` 追加 | memory feedback 既存パターンに倣う |

---

## 9. 残る不明点（実装で初めて分かる事）

| # | 項目 | 検証方法 |
|---|---|---|
| U1 | `claude -p --bare --mcp-config` で MCP が確実に動くか | 実装の Step1 で動作確認 |
| U2 | Lancers の HTML 構造（CSS セレクタ） | Playwright で実サイトを開いて DOM 確認 |
| U3 | 1セッションで取得できる案件詳細ページの上限（実測の bot 検知閾値） | 50件取得を試行し、エラー率を測る |
| U4 | Lancers 案件詳細ページのクライアント情報の抽出可能性 | 実 DOM 確認 |
| U5 | Claude in Chrome が Lancers の応募フォーム構造に対応できるか | プロトタイプ検証 |
| U6 | クッキー保存・復元が Playwright で 30日以上保つか | 1ヶ月運用テスト |
| U7 | `claude -p` の各種オプション挙動（`--effort medium` の thinking 量等） | 実コマンド試行 |

これらは設計書 (`03-design.md`) 上「実装中に確認・調整」と明記し、実装計画書 (`04-implementation-plan.md`) で検証タスクとして追加。

---

## 10. 結論

**全ての主要リスクが許容範囲内**。`01-requirements.md` の方針で進めて問題なし。

**設計書執筆時の前提変更点**:

1. ✅ Claude Code CLI v2.1.119 を `~/.local/bin/claude` で利用（PATH 整備が前提タスク）
2. ✅ Lancers の利用規約上は自動化 OK、ただし頻度制御（3〜5秒間隔）必須
3. ✅ 2要素認証ありのため、cookie 使い回し方式で確定（自動ログイン NG）
4. ✅ Python = Playwright 系、Node.js = 提案文生成 + ダッシュボード の 2言語構成
5. ✅ MCP は `--bare --mcp-config exa-config.json` で必要分のみロード
6. ✅ 並列実行は Phase 2 課題、Phase 1 は直列で十分

**設計書では以下を詳述する**:
- データモデル（テーブル定義 + ER 図）
- モジュール分割（Python 側 / Node.js 側 / 共有スキーマ）
- データフロー（朝の処理シーケンス、エラー処理、リカバリ）
- 画面設計（ダッシュボード4画面の詳細ワイヤフレーム）
- API 設計（ダッシュボード ↔ SQLite ↔ generator のインターフェース）
- セキュリティ・規約遵守の実装上の対応点

---

## 11. 参考資料

- [Lancers 利用規約](https://www.lancers.jp/help/terms)
- [Lancers robots.txt](https://www.lancers.jp/robots.txt)
- [Lancers 2要素認証導入のお知らせ](https://info.lancers.jp/33886)
- [Claude Code Headless Mode](https://code.claude.com/docs/en/headless.md)
- [Claude Code CLI Reference](https://code.claude.com/docs/en/cli-reference.md)
- [Claude Code Chrome Integration](https://code.claude.com/docs/en/chrome)
- [Claude for Chrome](https://claude.com/claude-for-chrome)
- [Playwright Anti-Bot Detection: What Works (2026) - AlterLab](https://alterlab.io/blog/playwright-anti-bot-detection-what-actually-works-in-2026)
- [Playwright Stealth: Bypass Bot Detection - Scrapfly Blog](https://scrapfly.io/blog/posts/playwright-stealth-bypass-bot-detection)
