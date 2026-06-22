# 「あとでやる」自走パートナー Phase 0–1 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Telegram にメモを投げると hermes が逆質問してタスクを成形し、Notion タスク DB に Ready カードが立ち、そのやりとりがカードに記録される——最初に動く増分を作る。

**Architecture:** hermes-agent（Mac・OpenRouter 安モデル）を Telegram 窓口として常駐させ、Notion MCP 経由で単一ソースの Notion タスク DB を読み書きする。捕捉→分類→逆質問→カード化→Autonomy 提案→Ready 化と、Telegram 会話のカード集約は hermes の SKILL.md（手順記憶）で規定する。自走実行（launchd）と Apple Notes / カレンダー捕捉は後続 Phase。

**Tech Stack:** hermes-agent（CLI / gateway）, OpenRouter（GLM/Kimi 等安モデル）, Telegram Bot API, Notion（API + 公式 MCP `@notionhq/notion-mcp-server`）, YAML 設定（`~/.hermes/config.yaml` / `~/.hermes/.env`）

設計 SSOT: `docs/superpowers/specs/2026-06-16-hermes-todo-partner-design.md`

---

## スコープ

- **対象（Phase 0–1）**: Notion タスク DB 構築 / hermes 導入 / 安モデル設定 / Telegram 窓口 / Notion MCP 配線 / 捕捉・トリアージ・逆質問・カード集約の SKILL.md / E2E スモーク
- **対象外（後続 Phase で別計画）**: Apple Notes 捕捉（Phase 2）/ カレンダー準備タスク（Phase 2）/ Notion カードコメント双方向会話（Phase 2）/ launchd 自走実行（Phase 3）/ 催促ループ・Priority/Project チューニング（Phase 4）

## 人間アクション（事前準備・AI では代行不可）

以下は実行中に**人間が手で行い、得た値を渡す**必要がある。各タスク内で明示する。
- OpenRouter の API キー取得（`sk-or-...`）
- Telegram の BotFather でボット作成（トークン取得）と自分の numeric user ID 取得
- Notion の内部インテグレーション作成（トークン取得）と DB 共有

## ファイル構成

| パス | 責務 |
|---|---|
| `~/.hermes/.env` | 秘密情報（OpenRouter / Telegram / Notion トークン）。git 管理外 |
| `~/.hermes/config.yaml` | 非秘密設定（model / telegram / mcp_servers / tools 許可リスト） |
| `~/.hermes/skills/todo-partner/SKILL.md` | 捕捉→トリアージ→逆質問→カード化→Autonomy 提案→Ready 化＋会話カード集約の手順記憶 |
| Notion「あとでやるタスク」DB | 単一ソースの場（スキーマ＋カンバンビュー） |
| `all-good-ops/data/hermes/notion-task-db.md` | DB ID・プロパティ ID・運用メモの記録（リポ側 SSOT・秘密は書かない） |

---

## Phase 0: Notion タスク DB

### Task 1: Notion 内部インテグレーション作成と DB 共有準備

**人間アクション中心。**

- [ ] **Step 1: 内部インテグレーションを作成**

ブラウザで https://www.notion.so/profile/integrations を開き「New integration」→ 名前 `hermes-todo-partner`、種別 Internal、ワークスペースを選択して作成。`Internal Integration Secret`（`ntn_...` または `secret_...`）をコピーして安全に保持する。

権限は Content Capabilities = Read / Update / Insert content、Comment Capabilities = Read / Insert comments を有効にする（会話のカード集約に必要）。

- [ ] **Step 2: トークンを `~/.hermes/.env` に保存**

```bash
mkdir -p ~/.hermes
printf 'NOTION_TOKEN=%s\n' 'ここに ntn_... を貼る' >> ~/.hermes/.env
chmod 600 ~/.hermes/.env
```

- [ ] **Step 3: 保存確認（値は伏せる）**

Run: `grep -q '^NOTION_TOKEN=ntn' ~/.hermes/.env && echo OK || echo MISSING`
Expected: `OK`

（DB への共有は Task 2 で DB 作成後に行う）

---

### Task 2: タスク DB をスキーマ付きで作成し、カンバンビューと共有を設定

**Files:**
- Create: `all-good-ops/data/hermes/notion-task-db.md`（DB ID・プロパティ控え）

- [ ] **Step 1: DB を作成（Notion MCP 経由）**

この Claude セッションの Notion MCP（`notion-create-database`）で、親ページ配下に「あとでやるタスク」DB を作る。プロパティは spec §4 のとおり厳密に：

| プロパティ名 | 型 | 選択肢 |
|---|---|---|
| `Title` | title | — |
| `Source` | select | `Telegram` / `AppleNotes` / `Calendar` / `manual` |
| `Status` | select | `Inbox` / `NeedInfo` / `Ready` / `InProgress` / `Blocked` / `Review` / `Done` |
| `Autonomy` | select | `light-auto` / `cc-auto` / `draft-only` / `ask-first` / `reminder` |
| `Priority` | select | `High` / `Mid` / `Low` |
| `Project` | select | （当面は select。値は既存案件名を運用で追加） |
| `Details` | rich text | — |
| `NextAction` | rich text | — |
| `Due` | date | — |
| `Owner` | select | `AI` / `human` |
| `Links` | url | — |
| `LastNudge` | date | — |
| `RawSourceId` | rich text | — |
| `ThreadKey` | rich text | — |
| `ConversationLog` | rich text | — |

- [ ] **Step 2: Status グループのカンバンビューを追加**

`notion-create-view`（または手動）で Board ビューを作り、Group by = `Status`、列順を `Inbox → NeedInfo → Ready → InProgress → Blocked → Review → Done` に並べる。

- [ ] **Step 3: DB を hermes インテグレーションに共有**

ブラウザで作成した DB を開き、右上「…」→「Connections」→ `hermes-todo-partner` を追加（これをしないと hermes 側トークンから見えない）。

- [ ] **Step 4: DB ID とプロパティを控える**

`all-good-ops/data/hermes/notion-task-db.md` に DB ID・各プロパティ名・カンバン列順・運用メモを記録（**トークンは書かない**）。

- [ ] **Step 5: 動作確認（手動カード）**

DB に手でカードを 1 枚作り、`Status=Inbox` で Board の Inbox 列に出ることを確認。

Run（リポ記録のコミット）:
```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/.claude/worktrees/hermes-todo-partner-spec
git add data/hermes/notion-task-db.md
git commit -m "feat(hermes): Notion タスクDB スキーマ控えを追加"
```
Expected: コミット成功。Board に手動カードが Inbox 列で見える。

---

## Phase 1: hermes 捕捉→トリアージ→カード化

### Task 3: hermes をインストールして起動確認

- [ ] **Step 1: インストール**

Run:
```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
source ~/.zshrc
```
Expected: `hermes` コマンドが PATH に入る。

- [ ] **Step 2: バージョン確認**

Run: `hermes --version`
Expected: バージョン文字列が出る（エラーなし）。

- [ ] **Step 3: ヘルスチェック**

Run: `hermes doctor`
Expected: 依存（python/node/uv 等）が OK 表示。未設定の provider 警告は想定内。

---

### Task 4: 常駐ループ用の安モデル（OpenRouter）を設定

**人間アクション**: OpenRouter で API キー（`sk-or-...`）を取得。

- [ ] **Step 1: API キーを `.env` に保存**

```bash
printf 'OPENROUTER_API_KEY=%s\n' 'ここに sk-or-... を貼る' >> ~/.hermes/.env
chmod 600 ~/.hermes/.env
```

- [ ] **Step 2: provider と既定モデルを設定**

`~/.hermes/config.yaml` に追記（安モデル固定。GLM 例。利用可能 ID は OpenRouter に合わせる）:
```yaml
model:
  provider: openrouter
  default: z-ai/glm-4.6
```

- [ ] **Step 3: 設定確認**

Run: `hermes config`
Expected: `model.provider=openrouter` / `model.default=z-ai/glm-4.6` が表示。

- [ ] **Step 4: 疎通スモーク（最小トークン）**

Run: `hermes -p "reply with the single word: pong"`
Expected: `pong` が返る（モデル疎通＝課金経路 OK）。

> 補足: モデル ID が無効なら `hermes model` で対話ピッカーから安モデル（GLM / Kimi 等）を選び直す。

---

### Task 5: Telegram 窓口をセットアップ

**人間アクション**: BotFather でボット作成、@userinfobot で自分の numeric user ID 取得。

- [ ] **Step 1: BotFather でボット作成**

Telegram で @BotFather に `/newbot` → 表示名（例 `Hermes Todo Partner`）→ `bot` で終わる一意ユーザー名 → トークン `123456789:ABC...` を取得。

- [ ] **Step 2: 自分の user ID を取得**

Telegram で @userinfobot にメッセージ → numeric ID（例 `123456789`）をメモ。

- [ ] **Step 3: トークンと許可ユーザーを `.env` に保存**

```bash
printf 'TELEGRAM_BOT_TOKEN=%s\n' 'ここに 123456789:ABC... を貼る' >> ~/.hermes/.env
printf 'TELEGRAM_ALLOWED_USERS=%s\n' 'ここに自分の numeric ID' >> ~/.hermes/.env
```

- [ ] **Step 4: config.yaml に許可ユーザーを明示**

`~/.hermes/config.yaml` に追記:
```yaml
telegram:
  allowed_users:
    - 123456789
```

- [ ] **Step 5: ゲートウェイ起動**

Run: `hermes gateway`
Expected: 数秒で「online」表示。Telegram でボットに「test」と送ると応答が返る（この時点では汎用応答で可）。

- [ ] **Step 6: 起動状態の確認**

別ターミナルで Run: `hermes gateway status`
Expected: Telegram コネクタが running。

---

### Task 6: Notion MCP を hermes に配線（許可リスト付き）

- [ ] **Step 1: config.yaml に Notion MCP を追加**

`~/.hermes/config.yaml` の `mcp_servers` に追記（トークンは `.env` の `NOTION_TOKEN` を参照）:
```yaml
mcp_servers:
  notion:
    command: "npx"
    args: ["-y", "@notionhq/notion-mcp-server"]
    env:
      NOTION_TOKEN: "${NOTION_TOKEN}"
```

- [ ] **Step 2: 危険操作を絞る許可リスト**

同 config.yaml に、Notion ツールを最小集合へ絞る（読み書き＋コメントのみ。削除系は除外）:
```yaml
tools:
  include:
    - notion-search
    - notion-fetch
    - notion-create-pages
    - notion-update-page
    - notion-create-comment
    - notion-get-comments
  resources: false
  prompts: false
```

> 注: 公式 Notion MCP のツール名は版により異なる。Step 4 のリストで実名を確認し、`include` を実名へ合わせる。

- [ ] **Step 3: MCP 疎通テスト**

Run: `hermes mcp test notion`
Expected: 接続成功・ツール一覧が出る。失敗時は `hermes doctor` と `NOTION_TOKEN` を確認。

- [ ] **Step 4: ツール実名を控える**

出たツール名を `data/hermes/notion-task-db.md` に追記し、Step 2 の `include` を実名に修正してから `gateway` を `/reload-mcp` または再起動で反映。

---

### Task 7: 捕捉→トリアージ→カード化 SKILL.md を作成

**Files:**
- Create: `~/.hermes/skills/todo-partner/SKILL.md`
- Create（リポ控え）: `all-good-ops/data/hermes/skills/todo-partner.SKILL.md`（同内容を git 追跡）

- [ ] **Step 1: SKILL.md を作成**

`~/.hermes/skills/todo-partner/SKILL.md` を以下の内容で作成（DB ID は Task 2 の実値に置換）:

```markdown
---
name: todo-partner
description: Telegram で受けたメモ・依頼を逆質問で成形し Notion タスクDBにカード化する。あとでやる系を後回しにしない捕捉/トリアージの中核。
version: 1.0.0
platforms: [macos]
metadata:
  hermes:
    tags: [tasks, notion, telegram]
    category: productivity
---

## When to Use
ユーザーから Telegram で届いた発言が「あとでやる/依頼/メモ/予定の種」に見えるとき。雑談・私的な内省（ジャーナル/感情吐露）には使わない。

## 対象 Notion DB
- DB ID: `<TASK_DB_ID>`（あとでやるタスク）
- 列(Status): Inbox→NeedInfo→Ready→InProgress→Blocked→Review→Done
- Autonomy: light-auto / cc-auto / draft-only / ask-first / reminder

## Procedure
1. 受信メッセージを分類する: 「タスク候補」か「雑談/私的」か。私的・感情的な内省はカード化しない（ユーザーに確認し、本人が private と言えば破棄。記録もしない）。
2. タスク候補なら `notion-create-pages` で DB にカードを作る:
   - Title=要約, Source=`Telegram`, Status=`Inbox`, Owner=`AI`,
   - RawSourceId=元メッセージの識別子, ThreadKey=この Telegram 会話を一意に表すキー。
3. 着手に足りない情報（目的/期日/成果物/制約）があれば、Telegram で**一度に1〜2問**だけ具体的に逆質問する。回答が来たら `notion-update-page` で Details / Due / NextAction を埋める。
4. Autonomy を**提案**する: コード/案件=`cc-auto`、調べもの=`cc-auto`、文面/返信=`draft-only`、生活雑用=`reminder`、判断が要る=`ask-first`、即終わる雑用=`light-auto`。「これは cc-auto でいい？」と Telegram で確認し、ユーザーが承認したラベルを `notion-update-page` で設定。
5. Details が揃い Autonomy が確定したら Status を `Ready` にする。情報待ちなら `NeedInfo`。
6. **会話のカード集約**: 上記やりとり（捕捉元メッセージ・逆質問・回答・確定ラベル）を `notion-create-comment` でそのカードのコメントに転記する。ThreadKey で同一カードを特定する。コメントが使えない場合は `ConversationLog` プロパティに追記。
7. 静時間帯 22:00–8:00 はこちらからの能動通知/逆質問を抑制し、翌朝にまとめる（緊急を除く）。

## Pitfalls
- 私的/感情的内容をカード化しない（ジャーナルは別領域）。
- 逆質問は質問攻めにしない。1〜2問ずつ。
- Autonomy はユーザー確認なしに確定しない（提案→承認）。
- 同一メッセージで重複カードを作らない（RawSourceId で照合）。

## Verification
- Telegram にメモ→Notion DB の `Ready`（または `NeedInfo`）にカードが立つ。
- そのカードのコメントに会話経緯が残る。
- 私的発言はカード化されない。
```

- [ ] **Step 2: リポに同内容を控える**

```bash
mkdir -p /Users/rikukudo/Projects/private-agents/all-good-ops/.claude/worktrees/hermes-todo-partner-spec/data/hermes/skills
cp ~/.hermes/skills/todo-partner/SKILL.md \
   /Users/rikukudo/Projects/private-agents/all-good-ops/.claude/worktrees/hermes-todo-partner-spec/data/hermes/skills/todo-partner.SKILL.md
```

- [ ] **Step 3: スキル認識確認**

Run: `hermes skills list`（無ければ `hermes --tui` でスラッシュ補完に `/todo-partner` が出るか確認）
Expected: `todo-partner` が一覧に出る。

- [ ] **Step 4: 控えをコミット**

```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/.claude/worktrees/hermes-todo-partner-spec
git add data/hermes/skills/todo-partner.SKILL.md data/hermes/notion-task-db.md
git commit -m "feat(hermes): todo-partner SKILL とNotion DB控えを追加"
```
Expected: コミット成功。

---

### Task 8: E2E スモークテスト

- [ ] **Step 1: ゲートウェイ稼働を確認**

Run: `hermes gateway status`
Expected: Telegram running。停止していれば `hermes gateway` で起動。

- [ ] **Step 2: タスク系メモを送る**

Telegram のボットに送信: `テラ縁側のLPのファーストビュー、後で考えたい`
Expected: hermes が 1〜2 問逆質問（例「期日の目安は？」「成果物はLP案？方向性メモ？」）。

- [ ] **Step 3: 回答して成形させる**

逆質問に返信。
Expected: Notion DB にカードが立つ（Title 要約 / Source=Telegram / Autonomy 提案）。確認に答えると `Ready` または `NeedInfo` に乗る。

- [ ] **Step 4: 会話集約を確認**

Notion でそのカードのコメントを開く。
Expected: 捕捉元メッセージ→逆質問→回答→確定ラベルの経緯がコメントに残っている。

- [ ] **Step 5: 私的発言を弾く確認**

ボットに送信: `今日はなんか気分が沈む`
Expected: カード化されない（雑談/私的として扱う）。誤ってカード化したら SKILL.md の分類規則を patch。

- [ ] **Step 6: 重複防止の確認**

Step 2 と同じメモをもう一度送る。
Expected: 同一 RawSourceId で重複カードを作らない（既存カードに紐づくか、重複と判断）。

- [ ] **Step 7: スモーク結果を記録**

`data/hermes/notion-task-db.md` に「Phase 0–1 スモーク: OK / 気づき」を追記してコミット。

---

## Self-Review（計画→spec 突合）

- spec §3 構成 → Task 3–6（hermes/Telegram/Notion MCP）でカバー
- spec §4 スキーマ → Task 2 で全プロパティ作成
- spec §5-A 捕捉 / §5-B トリアージ・逆質問・privacy → Task 7 SKILL.md・Task 8 スモーク
- spec §5-E 会話のカード集約（Telegram→カードコメント, ThreadKey） → Task 7 手順6・Task 8 Step4
- spec §6 ガードレール（安モデル・許可リスト） → Task 4・Task 6 Step2
- spec §8 Phase 0/1 完了条件 → Task 8 が充足
- 後続 Phase（Apple Notes / カレンダー / カードコメント双方向 / launchd 自走 / 催促）は明示的にスコープ外として別計画

> 注: 静時間帯の能動通知抑制（spec §5-D）は SKILL.md に方針を入れたが、確実な抑制は launchd/cron 実装（Phase 3–4）で担保する。Phase 1 では hermes の振る舞い規則止まり。
