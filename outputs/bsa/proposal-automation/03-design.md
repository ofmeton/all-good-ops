# BSA 受注自動化システム — アーキ設計書

> 作成日: 2026-04-28
> 前提: `01-requirements.md` (要件) + `02-tech-research.md` (技術調査) を全前提とする
> 目的: 実装に着手するための具体的なモジュール設計・データモデル・インターフェース・画面設計を確定する

---

## 0. 全体像（再掲・確定版）

```
┌────────────────────────────────────────────────────────────────────────┐
│                       Mac ローカル (Darwin 25.3)                        │
│                                                                         │
│  ┌──────────────────┐  ダブル                                          │
│  │ 📥 BSA 案件収集   │  クリック                                       │
│  │   .command       ├────►┐                                            │
│  └──────────────────┘     │                                            │
│                           ▼                                             │
│  ┌──────────────────────────────────────────────────────────┐         │
│  │  scripts/run.sh (zsh)                                     │         │
│  │   ├─ Stage 1: collector (Python)   → SQLite jobs         │         │
│  │   ├─ Stage 2: scorer (Python)      → fit_score 更新     │         │
│  │   ├─ Stage 3: generator (Node)     → SQLite proposals   │         │
│  │   │            └─ claude -p --bare で提案文生成          │         │
│  │   ├─ Stage 4: notifier             → macOS + Gmail      │         │
│  │   └─ Stage 5: dashboard 起動 + open localhost:3000      │         │
│  └────────────────────────┬─────────────────────────────────┘         │
│                           ▼                                             │
│  ┌──────────────────────────────────────────────────────────┐         │
│  │  SQLite (~/Library/Application Support/bsa-pa/data.db)   │         │
│  └──────────────────────────────────────────────────────────┘         │
│                           ▲                                             │
│                           │ HTTP / fs                                   │
│  ┌──────────────────────────────────────────────────────────┐         │
│  │  Next.js dashboard (localhost:3000)                       │         │
│  │   ├─ /             : 当日サマリ                            │         │
│  │   ├─ /proposals/:id : 提案文編集                          │         │
│  │   ├─ /history      : 履歴・受注管理                        │         │
│  │   └─ /settings     : 設定                                 │         │
│  └──────────────────────────────────────────────────────────┘         │
│                           ▲                                             │
│                           │ クリップボード経由でプロンプト連携          │
│  ┌──────────────────────────────────────────────────────────┐         │
│  │  あなたの Chrome + Claude in Chrome 拡張                  │         │
│  │   → Lancers 応募ページのフォームに値を流し込む            │         │
│  │   → 送信ボタンは人間がクリック                             │         │
│  └──────────────────────────────────────────────────────────┘         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 1. ディレクトリ構成

```
outputs/bsa/proposal-automation/
├── 01-requirements.md
├── 02-tech-research.md
├── 03-design.md                     # 本書
├── 04-implementation-plan.md        # 次に書く
│
├── scripts/
│   ├── run.command                  # デスクトップから ln -s で参照される本体
│   ├── setup.sh                     # 初回セットアップ（venv 作成 / DB 初期化 / クッキー初回ログイン）
│   ├── relogin.sh                   # クッキー切れ時の再ログインフロー
│   └── lib/
│       ├── env.sh                   # PATH 整備、共通環境変数
│       └── notify.sh                # macOS 通知ラッパー
│
├── config/
│   ├── platforms.json               # 媒体定義（Phase 1 は Lancers のみ）
│   ├── exa-mcp.json                 # claude -p 用の MCP 設定
│   ├── product-lines.json           # L1/L2/L3/L4 の基準値（pricing-catalog.md と同期）
│   └── proposal-templates/          # T1-T5 のテンプレ Markdown（既存の outputs/bsa/proposal-templates.md からコピー or import）
│       ├── t1-lp-single.md
│       ├── t2-corporate-5p.md
│       ├── t3-lp-with-ads.md
│       ├── t4-express-fix.md
│       └── t5-misc.md
│
├── src/
│   ├── collector/                   # Python: 案件収集
│   │   ├── pyproject.toml
│   │   ├── main.py                  # エントリポイント
│   │   ├── adapters/
│   │   │   ├── base.py              # PlatformAdapter ABC
│   │   │   └── lancers.py           # Lancers 実装
│   │   ├── scorer.py                # fit_score 計算
│   │   ├── stealth.py               # playwright-stealth 設定
│   │   ├── session.py               # クッキー管理（保存・読込・期限検知）
│   │   └── db.py                    # SQLite 操作
│   │
│   ├── generator/                   # Node.js: 提案文生成
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── main.ts              # エントリポイント
│   │   │   ├── claude-headless.ts   # claude -p ラッパー
│   │   │   ├── researcher.ts        # 案件リサーチ（WebFetch + Exa MCP）
│   │   │   ├── prompt-builder.ts    # プロンプトテンプレート組み立て
│   │   │   ├── product-line-mapper.ts  # L1-L4 推定
│   │   │   ├── pricing.ts           # 案件規模 → 金額・納期カスタマイズ
│   │   │   └── db.ts                # SQLite 操作
│   │   └── prompts/
│   │       ├── proposal.txt         # 提案文生成プロンプト
│   │       └── research.txt         # リサーチ用プロンプト
│   │
│   ├── dashboard/                   # Next.js: ダッシュボード
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── next.config.js
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # /
│   │   │   ├── proposals/[jobId]/page.tsx
│   │   │   ├── history/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   └── api/
│   │   │       ├── jobs/route.ts
│   │   │       ├── proposals/route.ts
│   │   │       ├── proposals/[jobId]/route.ts
│   │   │       ├── status/route.ts
│   │   │       └── settings/route.ts
│   │   ├── components/
│   │   │   ├── JobCard.tsx
│   │   │   ├── ProposalEditor.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   └── CookieBanner.tsx
│   │   └── lib/
│   │       └── db.ts                 # better-sqlite3 で読み書き
│   │
│   ├── notifier/                    # 通知共通ロジック
│   │   ├── notify.sh                # macOS 通知 (terminal-notifier)
│   │   └── gmail.ts                 # Gmail MCP 経由でメール送信
│   │
│   └── shared/
│       ├── schema.sql               # 全テーブル定義（SQLite）
│       └── types/
│           ├── job.d.ts
│           ├── proposal.d.ts
│           └── status.d.ts
│
└── data/                            # gitignore（個人情報含む）
    └── README.md                    # 配置先の説明（実体は ~/Library/Application Support/bsa-pa/）
```

**実体の DB / クッキー / ログ**: `~/Library/Application Support/bsa-pa/` に配置（macOS 標準の app data 場所）。プロジェクトディレクトリには置かない（git 誤コミット防止）。

---

## 2. データモデル

### 2.1 ER 図

```
┌─────────────────┐
│   platforms     │
│─────────────────│
│ prefix (PK)     │ "LAN"
│ name            │ "Lancers"
│ search_urls     │ JSON配列
│ enabled         │ BOOL
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────────────────┐
│           jobs              │
│─────────────────────────────│
│ job_id (PK)                 │ "LAN-20260428-001"
│ platform_prefix (FK)        │
│ source_url                  │
│ detail_url (UNIQUE)         │
│ title                       │
│ description                 │
│ budget_text / budget_min/max│
│ deadline                    │
│ proposal_count              │
│ client_name                 │
│ client_verified             │
│ client_history_count        │
│ service_category            │ 'lp' | 'website' | 'ad'
│ posted_at                   │
│ collected_at                │
│ fit_score                   │
│ fit_score_breakdown (JSON)  │
│ estimated_product_line      │ 'L1' | 'L2' | 'L3' | 'L4'
│ status                      │ 'collected' | 'proposing' | 'submitted' | 'replied' | 'won' | 'lost'
└─────┬──────────────┬────────┘
      │ 1:1          │ 1:N
      ▼              ▼
┌──────────────┐  ┌─────────────────────┐
│  proposals   │  │   status_history    │
│──────────────│  │─────────────────────│
│ proposal_id  │  │ id (PK)             │
│ job_id (FK)  │  │ job_id (FK)         │
│ product_line │  │ from_status         │
│ price        │  │ to_status           │
│ delivery_days│  │ changed_at          │
│ body_md      │  │ changed_by          │ 'auto' | 'human'
│ research_notes│ │ note                │
│ generated_at │  └─────────────────────┘
│ generated_by │
│ edited_at    │
│ submitted_at │
└──────┬───────┘
       │ 1:N
       ▼
┌────────────────────────┐
│  proposal_revisions    │
│────────────────────────│
│ revision_id (PK)       │
│ proposal_id (FK)       │
│ body_md                │
│ price                  │
│ delivery_days          │
│ changed_at             │
│ changed_by             │ 'claude' | 'human'
│ note                   │
└────────────────────────┘

┌──────────────────────────┐
│  generation_requests     │
│──────────────────────────│
│ request_id (PK)          │
│ job_id (FK)              │
│ prompt_hint              │
│ status                   │ 'pending' | 'processing' | 'done' | 'failed'
│ created_at               │
│ processed_at             │
│ error_message            │
└──────────────────────────┘

┌──────────────────────────┐
│         runs             │
│──────────────────────────│
│ run_id (PK)              │
│ started_at               │
│ ended_at                 │
│ stage                    │ 'collect' | 'score' | 'generate' | 'notify'
│ collected_count          │
│ generated_count          │
│ status                   │ 'success' | 'error'
│ error_message            │
│ error_stage              │
└──────────────────────────┘

┌──────────────────────────┐
│       sessions           │
│──────────────────────────│
│ platform_prefix (PK,FK)  │
│ cookie_path              │ ~/Library/Application Support/bsa-pa/lancers-cookies.json
│ logged_in_at             │
│ last_validated_at        │
│ valid                    │ BOOL
└──────────────────────────┘

┌──────────────────────────┐
│      exa_usage           │
│──────────────────────────│
│ id (PK)                  │
│ called_at                │
│ query                    │
│ result_count             │
└──────────────────────────┘
```

### 2.2 SQLite スキーマ全文 (`src/shared/schema.sql`)

```sql
-- ============================================================
-- BSA Proposal Automation - SQLite Schema
-- ============================================================
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- 媒体マスタ
CREATE TABLE IF NOT EXISTS platforms (
  prefix      TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  search_urls TEXT NOT NULL,        -- JSON array
  enabled     INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 案件マスタ
CREATE TABLE IF NOT EXISTS jobs (
  job_id                   TEXT PRIMARY KEY,
  platform_prefix          TEXT NOT NULL REFERENCES platforms(prefix),
  source_url               TEXT NOT NULL,
  detail_url               TEXT NOT NULL UNIQUE,
  title                    TEXT NOT NULL,
  description              TEXT,
  budget_text              TEXT,
  budget_min               INTEGER,
  budget_max               INTEGER,
  deadline                 TEXT,
  proposal_count           INTEGER,
  client_name              TEXT,
  client_verified          INTEGER,           -- 0/1
  client_history_count     INTEGER,
  service_category         TEXT,              -- lp/website/ad
  posted_at                TEXT,
  collected_at             TEXT NOT NULL,
  fit_score                INTEGER,
  fit_score_breakdown      TEXT,              -- JSON
  estimated_product_line   TEXT,              -- L1/L2/L3/L4
  status                   TEXT NOT NULL DEFAULT 'collected',
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_collected_at ON jobs(collected_at);
CREATE INDEX IF NOT EXISTS idx_jobs_fit_score ON jobs(fit_score DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_platform ON jobs(platform_prefix);

-- 提案文（最新版）
CREATE TABLE IF NOT EXISTS proposals (
  proposal_id      TEXT PRIMARY KEY,           -- ULID 等
  job_id           TEXT NOT NULL UNIQUE REFERENCES jobs(job_id) ON DELETE CASCADE,
  product_line     TEXT NOT NULL,              -- L1/L2/L3/L4
  price            INTEGER NOT NULL,
  delivery_days    INTEGER NOT NULL,
  body_md          TEXT NOT NULL,
  research_notes   TEXT,                       -- JSON: WebFetch / Exa の結果サマリ
  generated_at     TEXT NOT NULL,
  generated_by     TEXT NOT NULL,              -- claude-code-cli / human
  edited_at        TEXT,
  submitted_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_proposals_generated_at ON proposals(generated_at);

-- 提案文の改版履歴
CREATE TABLE IF NOT EXISTS proposal_revisions (
  revision_id      INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id      TEXT NOT NULL REFERENCES proposals(proposal_id) ON DELETE CASCADE,
  body_md          TEXT NOT NULL,
  product_line     TEXT NOT NULL,
  price            INTEGER NOT NULL,
  delivery_days    INTEGER NOT NULL,
  changed_at       TEXT NOT NULL DEFAULT (datetime('now')),
  changed_by       TEXT NOT NULL,              -- claude / human
  note             TEXT
);
CREATE INDEX IF NOT EXISTS idx_revisions_proposal ON proposal_revisions(proposal_id);

-- ステータス遷移履歴
CREATE TABLE IF NOT EXISTS status_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id      TEXT NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  changed_at  TEXT NOT NULL DEFAULT (datetime('now')),
  changed_by  TEXT NOT NULL,                   -- auto / human
  note        TEXT
);
CREATE INDEX IF NOT EXISTS idx_status_history_job ON status_history(job_id);

-- 追加生成依頼キュー
CREATE TABLE IF NOT EXISTS generation_requests (
  request_id     INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id         TEXT NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
  prompt_hint    TEXT,
  status         TEXT NOT NULL DEFAULT 'pending',     -- pending/processing/done/failed
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at   TEXT,
  error_message  TEXT
);
CREATE INDEX IF NOT EXISTS idx_genreq_status ON generation_requests(status);

-- 実行ログ
CREATE TABLE IF NOT EXISTS runs (
  run_id           INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at       TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at         TEXT,
  stage            TEXT,                       -- collect/score/generate/notify
  collected_count  INTEGER,
  generated_count  INTEGER,
  status           TEXT,                       -- success/error
  error_message    TEXT,
  error_stage      TEXT
);

-- セッション (クッキー管理)
CREATE TABLE IF NOT EXISTS sessions (
  platform_prefix    TEXT PRIMARY KEY REFERENCES platforms(prefix),
  cookie_path        TEXT NOT NULL,
  logged_in_at       TEXT,
  last_validated_at  TEXT,
  valid              INTEGER NOT NULL DEFAULT 0
);

-- Exa API 利用ログ（月次上限管理）
CREATE TABLE IF NOT EXISTS exa_usage (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  called_at     TEXT NOT NULL DEFAULT (datetime('now')),
  query         TEXT,
  result_count  INTEGER
);
CREATE INDEX IF NOT EXISTS idx_exa_called ON exa_usage(called_at);

-- 初期データ
INSERT OR IGNORE INTO platforms(prefix, name, search_urls, enabled)
VALUES (
  'LAN',
  'Lancers',
  '["https://www.lancers.jp/work/search/web/lp","https://www.lancers.jp/work/search/web/website","https://www.lancers.jp/work/search/ad"]',
  1
);
```

### 2.3 ID 生成ルール

- **job_id**: `{PREFIX}-{YYYYMMDD}-{NNN}` (連番は当日の収集順、3桁ゼロ埋め)
  - 例: `LAN-20260428-001`、`LAN-20260428-002`
- **proposal_id**: ULID (`01HXX....`) — Node.js の `ulid` パッケージで生成
- **request_id / revision_id / id**: AUTOINCREMENT INTEGER

---

## 3. モジュール分割と各責務

### 3.1 collector (Python)

**責務**: 媒体から案件情報を収集して SQLite に保存

| ファイル | 責務 |
|---|---|
| `main.py` | エントリポイント、全アダプタを順次実行 |
| `adapters/base.py` | `PlatformAdapter` 抽象クラス（`fetch_listing()`, `fetch_detail()`, `parse_job()` を強制） |
| `adapters/lancers.py` | Lancers 実装。Phase 2 で `crowdworks.py`, `coconala.py` 追加 |
| `scorer.py` | fit_score 計算（純 Python、外部 IO なし） |
| `stealth.py` | `playwright-stealth` の設定一式 |
| `session.py` | クッキー JSON の保存・読込・有効性チェック |
| `db.py` | SQLite 操作（jobs upsert、status_history insert 等） |

**主要メソッド**:

```python
class PlatformAdapter(ABC):
    prefix: str
    name: str

    @abstractmethod
    async def fetch_listings(self, page: Page) -> list[ListingItem]:
        """検索結果ページから一覧を取得"""

    @abstractmethod
    async def fetch_detail(self, page: Page, listing: ListingItem) -> JobDetail:
        """詳細ページを取得して全情報をパース"""

    @abstractmethod
    def is_logged_in(self, page: Page) -> bool:
        """マイページや特定UI要素でログイン状態を判定"""
```

### 3.2 generator (Node.js / TypeScript)

**責務**: SQLite から上位10件を読み出し、リサーチ + 提案文生成 + 保存

| ファイル | 責務 |
|---|---|
| `src/main.ts` | エントリポイント |
| `src/claude-headless.ts` | `claude -p` プロセス起動・JSON 受信・エラー処理 |
| `src/researcher.ts` | WebFetch + Exa MCP でリサーチ（Exa 上限管理含む） |
| `src/prompt-builder.ts` | テンプレ + 案件情報からプロンプト組み立て |
| `src/product-line-mapper.ts` | 案件カテゴリ・予算から商品ライン推定 |
| `src/pricing.ts` | pricing-catalog.md の基準値から案件規模に応じてカスタマイズ |
| `src/db.ts` | better-sqlite3 で読み書き |

**重要なインターフェース**:

```typescript
interface GenerationInput {
  jobId: string;
  job: JobRow;
  template: TemplateContent;       // T1-T5 の選択結果
  research: ResearchResult;        // リサーチ結果サマリ
}

interface GenerationOutput {
  body_md: string;
  product_line: 'L1' | 'L2' | 'L3' | 'L4';
  price: number;
  delivery_days: number;
  research_notes: string;
}

async function generateProposal(
  input: GenerationInput
): Promise<GenerationOutput> {
  const prompt = buildPrompt(input);
  const result = await callClaudeHeadless({
    prompt,
    schema: GENERATION_OUTPUT_SCHEMA,
    bare: true,
    mcpConfig: 'config/exa-mcp.json',
    allowedTools: ['WebFetch', 'mcp__exa__web_search_exa'],
    effort: 'medium',
    fallbackModel: 'sonnet',
  });
  return result;
}
```

### 3.3 dashboard (Next.js)

**責務**: SQLite を直接読み書きする Web UI

- App Router（`app/`）
- React Server Components で初期表示を高速化
- API Route から `better-sqlite3` で直接 SQLite を叩く（マイクロサービス化しない、ファイルベース DB なので可）
- 認証なし（localhost のみ）

### 3.4 notifier (Bash + TypeScript)

**責務**: 完了・エラー・クッキー切れの通知

| ファイル | 責務 |
|---|---|
| `notify.sh` | `terminal-notifier -title <T> -message <M> -sound default` |
| `gmail.ts` | Node.js から Gmail MCP を呼び出して送信（既存インフラ流用） |

### 3.5 scripts (zsh)

| ファイル | 責務 |
|---|---|
| `run.command` | デスクトップから呼ばれる本体。Stage 1-5 を順次実行 |
| `setup.sh` | 初回セットアップ（venv, npm install, DB 初期化, Lancers 初回ログイン誘導） |
| `relogin.sh` | クッキー切れ時に Playwright headed で Lancers ログインページを開く |
| `lib/env.sh` | PATH 整備（`~/.local/bin`, node, python venv）、共通環境変数 |

---

## 4. データフロー（シーケンス図）

### 4.1 メインフロー（朝の収集）

```
利用者          run.command   collector   scorer    generator   notifier   dashboard   SQLite
  │                │             │          │          │           │          │          │
  │ ダブルクリック  │             │          │          │           │          │          │
  ├───────────────►│             │          │          │           │          │          │
  │                │ env 整備      │          │          │           │          │          │
  │                ├──────►       │          │          │           │          │          │
  │                │ Stage1 起動   │          │          │           │          │          │
  │                ├────────────►│           │          │           │          │          │
  │                │             │ クッキー   │          │           │          │          │
  │                │             │ 有効性確認 │          │           │          │          │
  │                │             ├─────────►│           │          │          │          │
  │                │             │          │            ─ NG なら通知 + 停止 ─          │
  │                │             │ Lancers   │          │           │          │          │
  │                │             │ 3URL 巡回 │          │           │          │          │
  │                │             │ 50件取得  │          │           │          │          │
  │                │             ├──────────────────────────────────────────────────────►│
  │                │             │ jobs upsert                                            │
  │                │ Stage2 起動   │          │          │           │          │          │
  │                ├──────────────────────►│            │           │          │          │
  │                │             │          │ fit_score  │           │          │          │
  │                │             │          │ 計算       │           │          │          │
  │                │             │          ├──────────────────────────────────────────►│
  │                │             │          │ jobs.fit_score 更新                        │
  │                │ Stage3 起動   │          │          │           │          │          │
  │                ├─────────────────────────────────►│            │          │          │
  │                │             │          │          │ 上位10件   │          │          │
  │                │             │          │          │ 取得       │          │          │
  │                │             │          │          ├──────────────────────────────►│
  │                │             │          │          │ research + claude -p × 10件  │
  │                │             │          │          │   (各案件 30-60秒、直列実行) │
  │                │             │          │          ├──────────────────────────────►│
  │                │             │          │          │ proposals insert + status='proposing' │
  │                │             │          │          │ generation_requests pending 処理 │
  │                │ Stage4 起動   │          │          │           │          │          │
  │                ├────────────────────────────────────────────►│             │          │
  │                │             │          │          │           │ macOS 通知│          │
  │                │             │          │          │           │ Gmail 送信│          │
  │                │ Stage5 起動   │          │          │           │          │          │
  │                ├───────────────────────────────────────────────────────►│             │
  │                │             │          │          │           │          │ npm run dev│
  │                │             │          │          │           │          │ (既起動なら何もしない) │
  │                │ open localhost:3000     │          │           │          │          │
  │                │ → Chrome で開く                              │          │          │
  │ ✅ ダッシュボードで提案確認                              │          │          │
  │ ↑ 完了通知も受信                              │          │          │          │
```

### 4.2 エラー時のフロー（クッキー切れ）

```
collector が is_logged_in() で False を検知
  ↓
sessions テーブル valid=0 に更新
  ↓
runs テーブルに error 記録
  ↓
notifier が macOS 通知「🔑 Lancers に再ログインしてください」+ Gmail 送信
  ↓
relogin.sh が呼ばれ、Playwright headed で Lancers ログインページを起動
  ↓
利用者が手動でログイン（メール認証 / 2FA 含む）
  ↓
ログイン成功後、context.storage_state() で cookie 上書き保存
  ↓
sessions テーブル valid=1, logged_in_at を更新
  ↓
（再度 run.command を実行すれば収集再開可能）
```

### 4.3 提案文の追加生成依頼フロー（O1=B 採用）

```
利用者が下位40件の案件カードで「提案文生成を依頼」ボタン押下
  ↓
ダッシュボードのクライアント側で、以下をクリップボードにコピー:
  「BSA-PA: 案件 LAN-20260428-042 の提案文を生成してください。
   prompt_hint: <利用者が入力した修正指示があれば>」
  ↓
ダッシュボードに「Claude Code に貼り付けて依頼してください」とトースト表示
  ↓
利用者が別途 Claude Code を起動して上記プロンプトを貼り付け
  ↓
秘書（または system-engineer）が:
  1. SQLite jobs テーブルから該当案件を読む
  2. researcher + generator のロジックを再実行
  3. proposals テーブルに INSERT or UPDATE
  4. proposal_revisions に履歴記録
  ↓
利用者がダッシュボードを再読み込みすると新しい提案文が見える
```

→ ダッシュボードからのプロンプトは「コピペ前提のフォーマット」を統一し、Claude Code 側の秘書 / system-engineer が SQL 実行コマンドを覚えて即対応できる形にする。

### 4.4 既存提案文の再生成依頼

上位10件の提案文編集画面で「Claude に再生成依頼」ボタン押下:
- ボタンが job_id + 修正指示テキストをクリップボードにコピー
- 後の流れは 4.3 と同じ

---

## 5. ダッシュボード画面設計

### 5.1 画面1: 当日サマリ (`/`)

```
┌────────────────────────────────────────────────────────────────┐
│ BSA Proposal Automation               2026-04-28               │
├────────────────────────────────────────────────────────────────┤
│ 📊 サマリ                                                       │
│ 50件収集 / 10件提案準備済み / 🆕 未送信 10件                    │
│ 🔥 最優先 3件 (fit_score 80+)                                   │
│ 🎯 推奨 5件   (fit_score 60-79)                                 │
│ 📋 余裕    2件 (fit_score 40-59)                                │
│                                                                 │
│ クッキー有効期限: 2026-05-22 (24日後)                           │
│ Exa API 利用: 23 / 1000 (今月)                                 │
│                                                                 │
│ [📅 履歴を見る] [⚙️ 設定]                                       │
├────────────────────────────────────────────────────────────────┤
│ 🔥 提案文準備済み (上位10件)                                    │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ 🔥 LAN-20260428-001                                  [📋]  │ │
│ │ 整体院の集客LP制作                                          │ │
│ │ 予算: 10-20万円 / fit: 88点 / L1推奨 (35,000円/3日)        │ │
│ │ 締切: 2026-05-05  提案数: 3件                              │ │
│ │ 状態: 🆕 未送信                                              │ │
│ │ [📝 提案文を見る・編集]  [🔗 案件URL]                        │ │
│ │ [📥 Claude in Chrome でフォーム入力]  [✅ 入力済みにする]   │ │
│ └────────────────────────────────────────────────────────────┘ │
│ ... (× 10件)                                                    │
├────────────────────────────────────────────────────────────────┤
│ 📋 その他の案件 (40件・提案文未生成)                            │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ LAN-20260428-011                                     [📋]  │ │
│ │ 個人事業主のコーポサイト                                     │ │
│ │ 予算: 5-10万円 / fit: 52点                                  │ │
│ │ [➕ 提案文生成を依頼]  [🔗 案件URL]                          │ │
│ └────────────────────────────────────────────────────────────┘ │
│ ... (× 40件)                                                    │
└────────────────────────────────────────────────────────────────┘
```

**主要コンポーネント**:
- `<SummaryHeader />`: 集計値表示
- `<JobCard kind="proposal" />`: 提案文準備済み案件カード（青系）
- `<JobCard kind="candidate" />`: 未生成案件カード（グレー系）
- `<CookieBanner />`: 有効期限7日以下なら警告色

### 5.2 画面2: 提案文編集 (`/proposals/[jobId]`)

```
┌────────────────────────────────────────────────────────────────┐
│ ← 戻る                                          [📋 ID コピー] │
├──────────────────────────────┬─────────────────────────────────┤
│  📌 案件情報                  │  📝 提案文エディタ                │
│  ──────────────              │  ────────────                  │
│  LAN-20260428-001            │  商品ライン: [L1 ▼]              │
│  整体院の集客LP制作            │   ┌─ L1: 30,000円基準          │
│                              │   │ L2: 80,000円基準            │
│  fit_score: 88              │   │ L3: 100,000円基準           │
│   ├ 価格帯: 30/30           │   └ L4: 10-30,000円基準         │
│   ├ サービス種別: 25/25     │                                 │
│   ├ 制約: 15/15             │  金額(円): [35000]              │
│   ├ 速度: 8/10              │  納期(日): [3]                  │
│   └ クライアント: 10/20     │                                 │
│                              │  提案文 (Markdown):              │
│  発注者: 山田一郎            │  ┌────────────────────────┐    │
│  本人確認: ✅ / 実績: 12件   │  │ 〇〇様                 │    │
│  予算: 10-20万円             │  │                        │    │
│  締切: 2026-05-05            │  │ ご依頼拝見しました。  │    │
│  提案数: 3件                 │  │ ...                    │    │
│                              │  │                        │    │
│  📄 案件本文:                │  │ [編集可能なエディタ]   │    │
│  ┌──────────────────────┐  │  │                        │    │
│  │ 整体院の集客LPを   │  │  │                        │    │
│  │ 作成してください  │  │  │                        │    │
│  │ ...                │  │  └────────────────────────┘    │
│  └──────────────────────┘  │                                 │
│                              │  リサーチノート:                  │
│  🔍 リサーチ結果:            │  ┌────────────────────────┐    │
│  - 発注者サイト: ...        │  │ 整体業界の傾向: ...   │    │
│  - 業界トレンド: ...        │  │ 競合LP: ...            │    │
│  - 競合LP: ...              │  └────────────────────────┘    │
│                              │                                 │
│                              │  [💾 保存]                       │
│                              │  [🤖 Claude に再生成依頼]        │
│                              │  [📋 提案文をコピー]              │
│                              │  [📥 Claude in Chrome でフォーム入力] │
│                              │                                 │
│                              │  改版履歴:                        │
│                              │  - 2026-04-28 09:15 (claude)    │
│                              │  - 2026-04-28 09:32 (human)     │
└──────────────────────────────┴─────────────────────────────────┘
```

**主要コンポーネント**:
- `<JobInfoPanel />`: 左側パネル（読み取り専用）
- `<ProposalEditor />`: 右側パネル（編集可能）
- 自動保存（編集後 1秒 debounce で `proposals` 更新 + `proposal_revisions` 履歴）

### 5.3 画面3: 履歴・受注管理 (`/history`)

```
┌────────────────────────────────────────────────────────────────┐
│ 履歴・受注管理                                                  │
├────────────────────────────────────────────────────────────────┤
│ フィルタ:                                                       │
│ [ステータス: 全て ▼] [商品ライン: 全て ▼] [期間: 過去30日 ▼]   │
│ [fit_score: 0-100 ▼] [媒体: 全て ▼]                            │
├────────────────────────────────────────────────────────────────┤
│ 📊 受注率（過去30日）                                           │
│  - 提案投下: 45件                                              │
│  - 返信あり: 8件 (17.8%)                                       │
│  - 受注: 1件 (2.2%) ← 🎯 KPI 1% 達成！                         │
│  - 失注: 36件                                                   │
├────────────────────────────────────────────────────────────────┤
│ 案件リスト (ソート: 収集日 降順)                                │
│                                                                 │
│ │ID                  │ タイトル        │ 投下│ ステータス│ ... │
│ │LAN-20260428-001   │ 整体院LP        │ ✅ │ 🏆 受注  │ ... │
│ │LAN-20260428-002   │ ECサイト改修    │ ✅ │ ❌ 失注  │ ... │
│ │LAN-20260427-005   │ 補助金LP        │ ✅ │ 💬 返信中│ ... │
│ │...                                                           │
└────────────────────────────────────────────────────────────────┘
```

**主要コンポーネント**:
- `<HistoryFilters />`: フィルタ群
- `<KpiSummary />`: 受注率サマリ
- `<JobsTable />`: テーブル（行クリックで `/proposals/[jobId]`）

### 5.4 画面4: 設定 (`/settings`)

```
┌────────────────────────────────────────────────────────────────┐
│ 設定                                                            │
├────────────────────────────────────────────────────────────────┤
│ 通知                                                            │
│  [✅] macOS 通知                                                │
│  [✅] Gmail 通知                                                │
│  Gmail 送信先: [off.me.ton@gmail.com]                          │
├────────────────────────────────────────────────────────────────┤
│ Lancers 接続                                                    │
│  クッキー有効期限: 2026-05-22                                   │
│  最終ログイン: 2026-04-22 10:34                                 │
│  状態: ✅ 有効                                                  │
│  [🔄 再ログイン (Lancers ログインページを開く)]                 │
├────────────────────────────────────────────────────────────────┤
│ 媒体                                                            │
│  [✅] LAN  Lancers (有効)                                       │
│      検索URL一覧:                                               │
│        - /work/search/web/lp                                   │
│        - /work/search/web/website                              │
│        - /work/search/ad                                       │
├────────────────────────────────────────────────────────────────┤
│ fit_score 配点 (Phase 2 で実装)                                 │
│  価格帯:           30 [スライダー]                             │
│  サービス種別:     25 [スライダー]                             │
│  制約条件:         15 [スライダー]                             │
│  速度要求:         10 [スライダー]                             │
│  クライアント評価: 20 [スライダー]                             │
│  [🔒 Phase 2 で実装予定]                                        │
├────────────────────────────────────────────────────────────────┤
│ 上限                                                            │
│  1日の提案投下上限: [10] 件                                    │
│  Exa 月間検索上限: [1000] 検索                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## 6. API / IPC 設計

### 6.1 ダッシュボード API ルート（Next.js Route Handler）

| メソッド | パス | 概要 |
|---|---|---|
| GET | `/api/jobs` | 案件一覧（フィルタ・ソート対応）|
| GET | `/api/jobs/:jobId` | 案件詳細 + 提案文 |
| PATCH | `/api/jobs/:jobId/status` | ステータス更新 (status_history insert) |
| GET | `/api/proposals/:jobId` | 提案文取得 |
| PATCH | `/api/proposals/:jobId` | 提案文更新（revisions 履歴自動追加） |
| POST | `/api/generation-requests` | 追加生成リクエスト登録 |
| GET | `/api/settings` | 設定値取得 (sessions / exa_usage 含む) |
| PATCH | `/api/settings` | 設定値更新 |
| GET | `/api/health` | ヘルスチェック (DB 接続 / cookie 状態) |

### 6.2 Stage 間データ受け渡し

各 Stage は **SQLite を介して通信** する。引数渡しはしない（プロセス境界をまたぐので最も信頼できる）。

| Stage | 入力 | 出力 |
|---|---|---|
| collector | sessions テーブル (cookie path) | jobs テーブル |
| scorer | jobs テーブル | jobs.fit_score / fit_score_breakdown |
| generator | jobs (上位10件) | proposals テーブル + proposal_revisions |
| notifier | runs / jobs / proposals 集計 | macOS 通知 + Gmail |

### 6.3 Claude Code CLI ヘッドレス呼び出し（generator 内）

```typescript
import { spawn } from 'node:child_process';

interface ClaudeHeadlessOptions {
  prompt: string;
  schema: object;
  bare?: boolean;
  mcpConfig?: string;
  allowedTools?: string[];
  effort?: 'low' | 'medium' | 'high';
  fallbackModel?: string;
  timeoutMs?: number;
}

async function callClaudeHeadless(opts: ClaudeHeadlessOptions): Promise<unknown> {
  const args = [
    '--print',
    '--output-format', 'json',
    '--json-schema', JSON.stringify(opts.schema),
    '--no-session-persistence',
  ];
  if (opts.bare) args.push('--bare');
  if (opts.mcpConfig) args.push('--mcp-config', opts.mcpConfig);
  if (opts.allowedTools) args.push('--allowedTools', ...opts.allowedTools);
  if (opts.effort) args.push('--effort', opts.effort);
  if (opts.fallbackModel) args.push('--fallback-model', opts.fallbackModel);

  return new Promise((resolve, reject) => {
    const child = spawn('claude', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('claude headless timeout'));
    }, opts.timeoutMs ?? 180_000);

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`claude exited ${code}: ${stderr}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(new Error(`failed to parse JSON: ${stdout}`));
      }
    });

    child.stdin.write(opts.prompt);
    child.stdin.end();
  });
}
```

---

## 7. fit_score 計算詳細

```python
def calculate_fit_score(job: dict) -> tuple[int, dict]:
    """
    Returns (total_score, breakdown_dict).
    breakdown_dict は fit_score_breakdown に JSON 保存される。
    """
    # 1. 価格帯 (max 30)
    price_score = score_price(job['budget_min'], job['budget_max'])

    # 2. サービス種別 (max 25)
    service_score = score_service(job['service_category'], job['title'], job['description'])

    # 3. 制約条件 (max 15, 認定ランサー限定で -30 → 即除外)
    constraint_score = score_constraints(job['description'])
    if constraint_score <= -30:
        return 0, {'excluded': '認定ランサー限定'}

    # 4. 速度要求 (max 10)
    speed_score = score_speed(job['deadline'])

    # 5. クライアント評価 (max 20)
    client_score = score_client(
        job['client_verified'],
        job['client_history_count'],
    )

    total = max(0, price_score + service_score + constraint_score + speed_score + client_score)

    breakdown = {
        'price': price_score,
        'service': service_score,
        'constraint': constraint_score,
        'speed': speed_score,
        'client': client_score,
        'total': total,
    }
    return total, breakdown
```

各 score 関数の詳細は `01-requirements.md` FR-2.1 の表に従う。

---

## 8. セキュリティ・規約遵守の実装方針

| リスク | 対応 |
|---|---|
| Lancers パスワード流出 | macOS Keychain 保存（K1=a）。コード上には平文保存しない |
| クッキー流出 | `~/Library/Application Support/bsa-pa/` に 600 権限で保存。git ignore |
| SQLite 個人情報 | `~/Library/Application Support/bsa-pa/data.db` (権限 600)。git ignore |
| `.env` の API キー | `~/Library/Application Support/bsa-pa/.env` に 600 権限。プロジェクトに置かない |
| ダッシュボード | `localhost:3000` バインド (`HOST=127.0.0.1`)。外部からのアクセス不可 |
| Claude Code CLI コマンドインジェクション | `child_process.spawn` の引数配列形式（shell=false 相当）。文字列連結しない |
| Lancers リクエスト頻度 | `await asyncio.sleep(random.uniform(3, 5))` を案件詳細取得ごとに挿入 |
| User-Agent | `Mozilla/5.0 (Macintosh; Intel Mac OS X) ... Chrome/120.0.0.0 Safari/537.36` を固定 |
| 同時接続数 | 1 (browser_context は 1つのみ作成) |
| 提案文の自動送信 | ❌ しない。Claude in Chrome 経由で入力までで停止 |

---

## 9. エラー処理戦略

### 9.1 エラー分類

| 分類 | 例 | 対応 |
|---|---|---|
| **致命的** | DB ファイル破損、Python venv 壊れ | 即停止、通知、人間対応 |
| **回復可能** | クッキー期限切れ、Lancers 一時的500 | 通知、次回実行で再試行 |
| **無視可** | 個別案件のパース失敗 | ログに記録、次の案件へ |

### 9.2 トランザクション境界

各 Stage は **トランザクション内で完結**。途中失敗時は ROLLBACK して中途半端なデータを残さない。

```python
# collector の例
with conn:  # autocommit on success / rollback on error
    for job in collected_jobs:
        upsert_job(conn, job)
    insert_status_history(conn, ...)
```

### 9.3 リトライポリシー

- ❌ **自動リトライしない**（要件 E3 = 即停止）
- ✅ 次回ダブルクリック時に再開（jobs テーブルの状態から自然と再開可能）

---

## 10. テスト戦略（最低限）

### 10.1 単体テスト

| モジュール | テストツール | 重点 |
|---|---|---|
| `scorer.py` | `pytest` | fit_score 計算の境界値（1万円ピッタリ、認定ランサー除外、本人確認なし減点等）|
| `pricing.ts` | `vitest` | 商品ライン推定の網羅 |
| `prompt-builder.ts` | `vitest` | プロンプト生成のスナップショット |
| `db.py` / `db.ts` | `pytest` / `vitest` | SQLite テーブル CRUD（in-memory DB）|

### 10.2 統合テスト

- Lancers のモック HTML を fixtures/ に配置 → collector の adapters/lancers.py で正しくパースできるか
- claude -p をスタブ化（同じ JSON を返すモック）→ generator 全体の流れを確認

### 10.3 手動 E2E

- 初回 setup.sh 実行
- Lancers 手動ログイン
- run.command ダブルクリック
- ダッシュボードで提案文を1件編集
- Claude in Chrome でフォーム入力（送信はしない）
- 「入力済みにする」→ status=submitted 確認

---

## 11. 拡張ポイント（Phase 2 以降）

| 項目 | 実装場所 | 必要工数 |
|---|---|---|
| CrowdWorks 対応 | `collector/adapters/crowdworks.py` | 半日〜1日 |
| Coconala 対応 | `collector/adapters/coconala.py` | 半日〜1日 |
| ダッシュボードからの直接プロンプト送信 | `dashboard/api/regenerate/route.ts` + `child_process` | 半日 |
| fit_score 配点調整 UI | `dashboard/app/settings/page.tsx` + `config/scoring.json` | 半日 |
| 30日無応答案件の自動 lost 化 | `scripts/cron/auto-lost.sh` (launchd 登録) | 半日 |
| スマホ対応（Vercel + Supabase 移行） | 全体 | 3-5日 |
| 並列生成 (3-5 同時) | `generator/src/main.ts` | 半日 |

---

## 12. 設計上の重要な決断

| 決断 | 理由 |
|---|---|
| Python (収集) + Node.js (生成・UI) の2言語構成 | playwright-stealth の Python 版が最強、Next.js は Node.js しか動かない。共通の SQLite を介して連携 |
| SQLite を Stage 間通信のメッセージバスに使う | 引数渡しでなく永続化することで、途中失敗時のリカバリが容易 |
| `~/Library/Application Support/bsa-pa/` にデータ実体 | macOS 標準、git 誤コミット防止、複数開発者環境への移植容易 |
| 提案文編集の自動保存 | 利用者の操作ミスで消えるリスク回避、proposal_revisions で履歴も担保 |
| 並列実行を Phase 1 で見送り | サブスク制限到達リスク回避、5-10分の処理時間は許容範囲 |
| ダッシュボードを localhost のみ | 認証実装不要、外部漏洩リスク0 |
| 追加生成依頼は「クリップボード経由」 | お金使わない縛り（C3）でダッシュボードからの直接 Claude 呼び出しを避ける |

---

## 13. 次のステップ

設計書は完成。次は **`04-implementation-plan.md`** で:

- タスク分解（30〜60分粒度の作業単位）
- 依存関係の明示
- Phase 1 完成までの工数見積
- 検証チェックポイント
- 残る不明点 (U1〜U7) の検証タイミング

を `superpowers:writing-plans` スキル経由で書き出す。
