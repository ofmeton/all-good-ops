# freee 請求書 MCP 連携 — 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** freee 公式 MCP (`freee-mcp@0.26.5`) を Claude Code に登録済みの状態を踏まえ、`invoice-manager` エージェント定義と `CLAUDE.md` MCP セクションへ運用ルールを反映し、次セッション以降から請求書発行運用を開始できる状態にする。

**Architecture:** 実装の大半は MCP 本体側で完結済み (OAuth + ツール提供)。本計画では (a) 既存ドキュメント 2 ファイルへの追記、(b) 新セッションでの動作確認手順、(c) Client Secret rotate の TODO 記録を行う。新規エージェント・新規スキルは作らない。

**Tech Stack:** Markdown ドキュメント編集 / Bash / git / freee-mcp (npm)

**Spec:** `docs/superpowers/specs/2026-05-09-freee-invoice-mcp-design.md`

**前提状態 (2026-05-09 時点で完了済み):**
- `npx -y freee-mcp configure` 完了
- `~/.config/freee-mcp/config.json` の `companies` に `12426988` 登録済み
- `currentCompanyId` / `defaultCompanyId` ともに `12426988`

---

## File Structure

| ファイル | 種別 | 責務 |
|---|---|---|
| `.claude/agents/finance/invoice-manager.md` | Modify | freee MCP 経由の運用ルールを追記 (使ってよいツール / freee連携セクション) |
| `CLAUDE.md` | Modify | MCP連携リストに freee エントリを追加 |
| `docs/superpowers/plans/2026-05-09-freee-invoice-mcp.md` | Create (この計画書自体) | 計画記録 |

検証コマンドのみで完結する Task 3 は新セッションでユーザーが実行する手順を提供。

---

## Task 1: invoice-manager.md に freee MCP 連携セクションを追記

**Files:**
- Modify: `.claude/agents/finance/invoice-manager.md` (3 箇所追記)

- [ ] **Step 1: 「使ってよい / 慎重に使うべきツール」セクションを更新**

`Edit` で以下を変更:

old_string:
```
## 使ってよい / 慎重に使うべきツール
- 使ってよい: Read, Glob, Grep
- 慎重に使うべき: Write（請求書作成）, Gmail MCP（送付）
```

new_string:
```
## 使ってよい / 慎重に使うべきツール
- 使ってよい: Read, Glob, Grep, `mcp__freee__list_*` 等の参照系
- 慎重に使うべき: Write（ローカル請求書記録）, Gmail MCP（送付）, `mcp__freee__create_invoice`（ドラフトはOK・送付確定は人間確認）
- **必ず人間確認**: `mcp__freee__create_partner` / `update_invoice` / `delete_invoice` / メール送付処理
```

- [ ] **Step 2: 「freee API 連携 (freee-mcp 経由)」セクションを新規追加**

「他エージェントとの連携ルール」セクションの直前に挿入する。

old_string:
```
## 他エージェントとの連携ルール
- **bookkeeper**: 売上計上のタイミングを連携
```

new_string:
```
## freee API 連携 (freee-mcp 経由)
- 請求書発行: `mcp__freee__create_invoice` を使用
- 過去請求書テンプレ参照: `mcp__freee__list_invoices` で同顧客の最新 1 件を取得して項目構成を流用
- 取引先解決: `mcp__freee__list_partners` → 該当なしの場合のみ `create_partner`（事前に金額・メールをユーザー確認）
- 事業所スコープ: 全事業統合の単一事業所 (`currentCompanyId=12426988`) を使用
- 価格情報の出所: `knowledge/context/pricing-catalog.md`（BSA は SSOT）
- MCP の認証管理・障害対応は system-engineer に委譲

## 他エージェントとの連携ルール
- **bookkeeper**: 売上計上のタイミングを連携
```

- [ ] **Step 3: 「人間確認が必要な条件」を MCP 操作の文言で補強**

old_string:
```
## 人間確認が必要な条件
- **請求書の送付前**（金額・請求先を必ず確認）
- 催促連絡の送信前
```

new_string:
```
## 人間確認が必要な条件
- **請求書の送付前**（金額・請求先を必ず確認 / freee 上の送付ボタンはユーザー本人がクリック）
- **freee 取引先の新規登録 (`create_partner`)** （誤登録予防）
- **送付済み請求書の修正・削除 (`update_invoice` / `delete_invoice`)**
- 催促連絡の送信前
```

- [ ] **Step 4: 編集結果を grep で検証**

```bash
grep -n "freee API 連携" .claude/agents/finance/invoice-manager.md && \
grep -n "currentCompanyId=12426988" .claude/agents/finance/invoice-manager.md && \
grep -n "create_partner" .claude/agents/finance/invoice-manager.md
```

Expected: 3 行ヒット (それぞれ 1 件以上)。0 件があれば該当 Step を再実行。

- [ ] **Step 5: Commit**

```bash
git add .claude/agents/finance/invoice-manager.md
git commit -m "$(cat <<'EOF'
feat(invoice-manager): integrate freee MCP usage rules

- Add freee API 連携 section (create_invoice / list_invoices / partners)
- Lock currentCompanyId=12426988 as the single business scope
- Strengthen human-confirmation gates for partner / update / delete

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: CLAUDE.md の MCP リストに freee エントリを追加

**Files:**
- Modify: `CLAUDE.md:384-390` (「現在稼働中（基盤）」セクション)

- [ ] **Step 1: freee 行を追記**

`Edit` で以下を変更:

old_string:
```
### 現在稼働中（基盤）
- **Asana**（プラグイン`mcp__plugin_asana_asana__*`）: タスク管理。秘書がプロジェクト・セクション設計まで担当
- **Gmail**: メール取得・下書き作成
- **Google Calendar**: 予定取得・イベント作成
- **Slack**: チャンネル読み取り・メッセージ送信
- **Claude in Chrome**: ブラウザ操作
```

new_string:
```
### 現在稼働中（基盤）
- **Asana**（プラグイン`mcp__plugin_asana_asana__*`）: タスク管理。秘書がプロジェクト・セクション設計まで担当
- **Gmail**: メール取得・下書き作成
- **Google Calendar**: 予定取得・イベント作成
- **Slack**: チャンネル読み取り・メッセージ送信
- **Claude in Chrome**: ブラウザ操作
- **freee**（npm`freee-mcp`, ツール `mcp__freee__*`）: 請求書発行・取引先管理・会計参照。担当: `invoice-manager` / 認証・障害対応は `system-engineer`。**送付処理 / `create_partner` / `update_invoice` / `delete_invoice` は人間確認必須**。事業所は `currentCompanyId=12426988` 単一運用
```

- [ ] **Step 2: 編集結果を grep で検証**

```bash
grep -n "freee.*npm.*freee-mcp" CLAUDE.md && \
grep -n "currentCompanyId=12426988" CLAUDE.md
```

Expected: 各 1 行以上ヒット。

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
docs(claude-md): register freee MCP under 現在稼働中(基盤)

freee-mcp@0.26.5 セットアップ完了に伴い MCP 連携リストへ追加。
人間確認必須操作と単一事業所スコープを明記。

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 新セッションでの動作確認 (ユーザー実行)

**Files:** なし (新セッション内での参照系コール)

このタスクは MCP ツールが本セッションでは露出しないため、**新セッションを起動してから** 実施する手順をユーザーに提示する。

- [ ] **Step 1: 検証手順を README として残す**

`Write` で以下のチェックリストを `outputs/finance/freee-mcp-verification.md` に作成:

```bash
mkdir -p outputs/finance
```

ファイル内容:
```markdown
# freee MCP 動作確認チェックリスト

新セッション (Claude Code 再起動後) で以下を順に確認する。

## A. MCP ツール露出の確認
1. 新セッション開始
2. プロンプトで「freee MCP のツールが見えるか教えて」と質問
3. `mcp__freee__list_invoices` 等が一覧に出ていれば OK

## B. 参照系の最小コール (READ のみ・課金/外部送信なし)
1. 「`mcp__freee__list_invoices` を1件だけ取得して」と依頼
2. レスポンスに `id` / `partner_name` / `total_amount` 相当のフィールドが返ってくれば OK
3. エラー時 (401 等) は `npx -y freee-mcp configure` を再実行

## C. 取引先一覧の確認
1. 「`mcp__freee__list_partners` で先頭 5 件を取得して」と依頼
2. freee 画面で見える取引先と一致すれば OK

## D. Secret rotate (24h 以内)
1. freee アプリ画面 (https://app.secure.freee.co.jp/developers/) で対象アプリの Client Secret を「再発行」
2. ターミナル `Terminal.app` で `npx -y freee-mcp configure` を再実行
3. 新 Secret で OAuth フロー完了後、再度 A〜C を実施

## 完了判定
- A〜D 全て OK で本連携の運用開始
- 失敗時は `docs/superpowers/specs/2026-05-09-freee-invoice-mcp-design.md` の section 8 リスク表を参照
```

- [ ] **Step 2: Commit**

```bash
git add outputs/finance/freee-mcp-verification.md
git commit -m "$(cat <<'EOF'
docs: add freee MCP verification checklist for next session

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: ユーザーへ告知**

「実装完了。次セッション起動後、`outputs/finance/freee-mcp-verification.md` を読んで A〜D を順に試してください。」と最終メッセージで伝える。

---

## Task 4: Client Secret rotate のリマインダー設定 (任意)

**Files:** なし (ScheduleWakeup or memory への記録)

- [ ] **Step 1: Auto memory に rotate 期限を記録**

`Write` で以下を `~/.claude/projects/-Users-rikukudo-Projects-private-agents-all-good-ops/memory/project_freee_mcp_setup.md` に保存:

```markdown
---
name: freee MCP セットアップ完了 (2026-05-09)
description: freee-mcp@0.26.5 を invoice-manager 経由で運用開始。currentCompanyId=12426988 単一運用。Client Secret は 2026-05-10 までに rotate 必須（チャットログ漏洩のため）
type: project
---

freee 公式 MCP を 2026-05-09 にセットアップ完了。

**Why:** BSA / RICE CREAM 副業 / Shopify 副業 / 個人案件の請求書を一元発行するため。自前 OAuth 実装を避けて公式 MCP 採用。

**How to apply:**
- 請求書関連の依頼は invoice-manager 経由で `mcp__freee__*` ツール使用
- 事業所は `currentCompanyId=12426988` 単一
- 設計書: `docs/superpowers/specs/2026-05-09-freee-invoice-mcp-design.md`
- 検証手順: `outputs/finance/freee-mcp-verification.md`
- **2026-05-10 まで**: Client Secret を freee アプリ画面で rotate し `npx -y freee-mcp configure` を再実行する TODO あり (チャットログに旧 Secret が露出済みのため)
```

- [ ] **Step 2: MEMORY.md にエントリを追加**

`Edit` で `~/.claude/projects/-Users-rikukudo-Projects-private-agents-all-good-ops/memory/MEMORY.md` の Project セクション末尾に追記:

old_string:
```
- [RICE CREAM 店舗マネージャー業務](project_rice_cream_shop.md) — 業務委託マネージャー。商品・人・集客の3領域。@BEATICE0923。設備衛生・クレーム対応は範囲外
```

new_string:
```
- [RICE CREAM 店舗マネージャー業務](project_rice_cream_shop.md) — 業務委託マネージャー。商品・人・集客の3領域。@BEATICE0923。設備衛生・クレーム対応は範囲外
- [freee MCP セットアップ完了 (2026-05-09)](project_freee_mcp_setup.md) — invoice-manager 経由運用・currentCompanyId=12426988・2026-05-10 までに Client Secret rotate 必須
```

- [ ] **Step 3: 検証**

```bash
ls ~/.claude/projects/-Users-rikukudo-Projects-private-agents-all-good-ops/memory/project_freee_mcp_setup.md && \
grep -n "freee MCP セットアップ完了" ~/.claude/projects/-Users-rikukudo-Projects-private-agents-all-good-ops/memory/MEMORY.md
```

Expected: 両方 1 行以上ヒット。

メモリ系は git 管理外のため commit 不要。

---

## Self-Review

**1. Spec coverage:**
- spec section 6.1 (invoice-manager.md 追記) → Task 1 ✅
- spec section 6.2 (CLAUDE.md MCP リスト追加) → Task 2 ✅
- spec section 6.3 (ルーティング変更なし) → 既存維持で対応済み ✅
- spec section 9 (検証チェックリスト) → Task 3 ✅
- spec section 8 risk「Client Secret 漏洩 → rotate」 → Task 4 (memory への TODO 記録) ✅
- spec section 10 (スコープ外) → 触れず正解 ✅

**2. Placeholder scan:** TBD/TODO/「適切に」等の曖昧表現なし。各 Step に具体的な old_string / new_string / 検証コマンドを記載済み。

**3. Type consistency:** ファイルパス・MCP ツール名 (`mcp__freee__create_invoice` 等) は全 Task で統一。`currentCompanyId=12426988` も 3 箇所すべて同値。

レビュー結果: 修正なし。

---

## 補足: 既存ファイル編集ガイダンス

各 `Edit` で `old_string` がユニークでない場合は、surrounding context を 1〜2 行追加して再実行してください。
特に Task 1 Step 2 の「他エージェントとの連携ルール」見出しは複数のエージェント定義に存在するためファイル絞り込みが必須。
