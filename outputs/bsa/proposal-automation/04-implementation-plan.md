# BSA Proposal Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lancers から案件を1日50件自動収集し、上位10件の提案文を Claude Code CLI ヘッドレスで自動生成、ダッシュボードで確認・編集して Claude in Chrome 経由でフォーム入力する半自動受注システムを Phase 1 として完成させる。

**Architecture:** Python (collector + scorer) + Node.js (generator + dashboard) + SQLite を Stage 間バスとして活用。デスクトップアイコンの `.command` ファイル1発で全フローが走り、ダッシュボードを自動オープンする。Mac ローカル完結、追加課金なし（Claude Code Pro/Max サブスク + Exa MCP 無料枠で運用）。

**Tech Stack:**
- Python 3.11+ / `playwright` / `playwright-stealth` / `pytest`
- Node.js 24 / TypeScript / `better-sqlite3` / `vitest` / `ulid`
- Next.js 15 (App Router) / React 19 / Tailwind CSS / shadcn/ui
- SQLite 3
- Claude Code CLI v2.1.119 (ヘッドレス `claude -p`)
- macOS `terminal-notifier` / Gmail MCP / Exa MCP
- zsh (.command スクリプト)

**Prerequisites:**
- 既存ドキュメント: `01-requirements.md` / `02-tech-research.md` / `03-design.md` を全部読了済み前提
- Lancers アカウント保有（手動ログイン用）
- Claude Code Pro/Max サブスク有効
- Exa MCP 認証済み
- Gmail MCP 認証済み
- macOS Darwin 25.3+

**Total estimated effort:** 約 25-35 時間（3-5日相当）。1日6-8時間ペースで完走想定。

---

## Milestones Overview

| # | Milestone | Tasks | 工数目安 | 完了時点で動くもの |
|---|---|---|---|---|
| M1 | Foundation | T1-T3 | 1-2h | DB スキーマ完成、PATH 整備、ディレクトリ構成 |
| M2 | Collector (Python) | T4-T10 | 5-7h | Lancers から50件取得 + fit_score 計算 |
| M3 | Generator (Node) | T11-T17 | 6-8h | 上位10件の提案文を `claude -p` で生成 |
| M4 | Notifier | T18-T19 | 1-2h | macOS 通知 + Gmail 送信 |
| M5 | Dashboard (Next.js) | T20-T26 | 8-10h | 4画面 + API + Claude in Chrome 連携 |
| M6 | Scripts & Integration | T27-T30 | 2-3h | デスクトップアイコンから1発実行可能 |
| M7 | E2E Verification | T31-T33 | 2-3h | 実際の Lancers で1ループ完走 |

---

## Coding Conventions

- **Commit message形式**: `feat: <module>: <概要>` / `fix:` / `chore:` / `test:`
- **テスト**: 各モジュールで TDD（失敗テスト → 実装 → グリーン → コミット）
- **DB データ実体**: `~/Library/Application Support/bsa-pa/data.db`（git ignore）
- **作業ディレクトリ**: `/Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation/`
- **絶対パス前提**: スクリプト内 `cd` を使わず、絶対パスで全部書く（メモリ feedback `local_static_serve` 準拠）

---

# Milestone 1: Foundation

## Task 1: ディレクトリ構成・PATH 整備・データ実体配置

**Files:**
- Create: `outputs/bsa/proposal-automation/.gitignore`
- Create: `outputs/bsa/proposal-automation/data/README.md`
- Modify: `~/.zshenv` (claude PATH 追加)

- [ ] **Step 1: ディレクトリ構成を作成**

```bash
BASE=/Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation
mkdir -p $BASE/{scripts/lib,config/proposal-templates,src/{collector/{adapters,tests},generator/{src,prompts,tests},dashboard,notifier,shared/types},data}
```

- [ ] **Step 2: データ実体ディレクトリを作成（macOS 標準）**

```bash
APPDATA="$HOME/Library/Application Support/bsa-pa"
mkdir -p "$APPDATA"
chmod 700 "$APPDATA"
```

- [ ] **Step 3: .zshenv に Claude Code CLI PATH 追加**

`~/.zshenv` の既存 node 設定の下に追記:

```bash
# Claude Code CLI (~/.local/bin)
if [ -x "$HOME/.local/bin/claude" ]; then
  export PATH="$HOME/.local/bin:$PATH"
fi
```

- [ ] **Step 4: 動作確認（新規シェルで）**

```bash
zsh -c 'which claude && claude --version'
```

Expected: `/Users/rikukudo/.local/bin/claude` と `2.1.119 (Claude Code)` が出力される

- [ ] **Step 5: .gitignore 作成**

`outputs/bsa/proposal-automation/.gitignore`:
```gitignore
# Data realfiles live in ~/Library/Application Support/bsa-pa/
data/*.db
data/*.db-journal
data/*.db-wal
data/*.db-shm

# Python
src/collector/__pycache__/
src/collector/.pytest_cache/
src/collector/.venv/
src/collector/**/__pycache__/
*.pyc

# Node
src/generator/node_modules/
src/dashboard/node_modules/
src/generator/dist/
src/dashboard/.next/
src/dashboard/out/

# OS
.DS_Store
```

- [ ] **Step 6: data/README.md 作成**

```markdown
# Data Directory

実際のデータ実体は `~/Library/Application Support/bsa-pa/` に配置されます。
このディレクトリは空のままで OK です。
```

- [ ] **Step 7: コミット**

```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops
git add outputs/bsa/proposal-automation/.gitignore outputs/bsa/proposal-automation/data/README.md
git commit -m "feat: bsa-pa: project skeleton + data dir conventions"
```

---

## Task 2: SQLite スキーマと初期化スクリプト

**Files:**
- Create: `src/shared/schema.sql`
- Create: `scripts/init-db.sh`

- [ ] **Step 1: schema.sql を作成**

`src/shared/schema.sql`（設計書 §2.2 の全文を貼る、全テーブル + インデックス + 初期データ）

```sql
-- 03-design.md §2.2 の全文（platforms, jobs, proposals, proposal_revisions,
-- status_history, generation_requests, runs, sessions, exa_usage の9テーブル
-- + INSERT OR IGNORE INTO platforms 初期データ）
```

実際の SQL は `03-design.md §2.2` から完全コピペ。

- [ ] **Step 2: init-db.sh を作成**

`scripts/init-db.sh`:
```bash
#!/bin/zsh
set -euo pipefail

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APPDATA="$HOME/Library/Application Support/bsa-pa"
DB_PATH="$APPDATA/data.db"
SCHEMA="$BASE_DIR/src/shared/schema.sql"

mkdir -p "$APPDATA"
chmod 700 "$APPDATA"

if [ -f "$DB_PATH" ]; then
  echo "DB already exists at $DB_PATH"
  echo "Run with --force to recreate"
  if [ "${1:-}" = "--force" ]; then
    rm -f "$DB_PATH"
    echo "Removed existing DB"
  else
    exit 0
  fi
fi

sqlite3 "$DB_PATH" < "$SCHEMA"
chmod 600 "$DB_PATH"
echo "✅ DB initialized at $DB_PATH"
sqlite3 "$DB_PATH" ".tables"
```

- [ ] **Step 3: 実行して DB 作成**

```bash
chmod +x scripts/init-db.sh
./scripts/init-db.sh
```

Expected: 9テーブル（platforms, jobs, proposals, proposal_revisions, status_history, generation_requests, runs, sessions, exa_usage）が作成される

- [ ] **Step 4: 初期データ確認**

```bash
sqlite3 "$HOME/Library/Application Support/bsa-pa/data.db" "SELECT * FROM platforms;"
```

Expected: `LAN|Lancers|...3つのURL...|1|...` が1行表示される

- [ ] **Step 5: コミット**

```bash
git add src/shared/schema.sql scripts/init-db.sh
git commit -m "feat: bsa-pa: SQLite schema and init script"
```

---

## Task 3: 共通型定義 (TypeScript)

**Files:**
- Create: `src/shared/types/job.ts`
- Create: `src/shared/types/proposal.ts`
- Create: `src/shared/types/index.ts`

- [ ] **Step 1: job.ts を作成**

```typescript
// src/shared/types/job.ts
export type JobStatus =
  | 'collected'
  | 'proposing'
  | 'submitted'
  | 'replied'
  | 'won'
  | 'lost';

export type ServiceCategory = 'lp' | 'website' | 'ad';
export type ProductLine = 'L1' | 'L2' | 'L3' | 'L4';

export interface Job {
  job_id: string;
  platform_prefix: string;
  source_url: string;
  detail_url: string;
  title: string;
  description: string | null;
  budget_text: string | null;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  proposal_count: number | null;
  client_name: string | null;
  client_verified: boolean | null;
  client_history_count: number | null;
  service_category: ServiceCategory | null;
  posted_at: string | null;
  collected_at: string;
  fit_score: number | null;
  fit_score_breakdown: FitScoreBreakdown | null;
  estimated_product_line: ProductLine | null;
  status: JobStatus;
}

export interface FitScoreBreakdown {
  price: number;
  service: number;
  constraint: number;
  speed: number;
  client: number;
  total: number;
  excluded?: string;
}
```

- [ ] **Step 2: proposal.ts を作成**

```typescript
// src/shared/types/proposal.ts
import type { ProductLine } from './job';

export interface Proposal {
  proposal_id: string;
  job_id: string;
  product_line: ProductLine;
  price: number;
  delivery_days: number;
  body_md: string;
  research_notes: string | null;
  generated_at: string;
  generated_by: 'claude-code-cli' | 'human';
  edited_at: string | null;
  submitted_at: string | null;
}

export interface ProposalRevision {
  revision_id: number;
  proposal_id: string;
  body_md: string;
  product_line: ProductLine;
  price: number;
  delivery_days: number;
  changed_at: string;
  changed_by: 'claude' | 'human';
  note: string | null;
}

export interface ResearchResult {
  client_site_summary?: string;
  industry_trends?: string[];
  competitor_lps?: Array<{ url: string; summary: string }>;
}
```

- [ ] **Step 3: index.ts を作成**

```typescript
// src/shared/types/index.ts
export * from './job';
export * from './proposal';
```

- [ ] **Step 4: コミット**

```bash
git add src/shared/types/
git commit -m "feat: bsa-pa: shared TypeScript types"
```

---

# Milestone 2: Collector (Python)

## Task 4: Python venv とプロジェクト初期化

**Files:**
- Create: `src/collector/pyproject.toml`
- Create: `src/collector/.python-version`

- [ ] **Step 1: 専用 venv を作成（既存の img-tools とは分離）**

```bash
python3 -m venv ~/.venvs/bsa-pa
source ~/.venvs/bsa-pa/bin/activate
python --version  # 3.11+ を確認
```

- [ ] **Step 2: pyproject.toml を作成**

`src/collector/pyproject.toml`:
```toml
[project]
name = "bsa-pa-collector"
version = "0.1.0"
description = "BSA Proposal Automation - Collector"
requires-python = ">=3.11"
dependencies = [
  "playwright>=1.45.0",
  "playwright-stealth>=2.0.0",
  "beautifulsoup4>=4.12.0",
  "python-dotenv>=1.0.0",
]

[project.optional-dependencies]
dev = [
  "pytest>=8.0.0",
  "pytest-asyncio>=0.23.0",
]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

- [ ] **Step 3: 依存をインストール**

```bash
cd src/collector
pip install -e ".[dev]"
playwright install chromium
```

Expected: chromium がインストールされる（数分かかる）

- [ ] **Step 4: 動作確認**

```bash
python -c "from playwright.async_api import async_playwright; print('OK')"
python -c "from playwright_stealth import Stealth; print('OK')"
```

- [ ] **Step 5: コミット**

```bash
git add src/collector/pyproject.toml
git commit -m "feat: collector: Python project init with playwright-stealth"
```

---

## Task 5: PlatformAdapter ABC（抽象基底クラス）

**Files:**
- Create: `src/collector/adapters/__init__.py`
- Create: `src/collector/adapters/base.py`
- Create: `src/collector/tests/test_adapters_base.py`

- [ ] **Step 1: 失敗テストを書く**

`src/collector/tests/test_adapters_base.py`:
```python
import pytest
from src.collector.adapters.base import PlatformAdapter, ListingItem, JobDetail


def test_listing_item_dataclass():
    item = ListingItem(
        platform_prefix="LAN",
        title="Test LP",
        detail_url="https://example.com/job/1",
        source_url="https://example.com/search",
    )
    assert item.platform_prefix == "LAN"
    assert item.title == "Test LP"


def test_platform_adapter_is_abstract():
    with pytest.raises(TypeError):
        PlatformAdapter()


def test_subclass_must_implement_methods():
    class IncompleteAdapter(PlatformAdapter):
        prefix = "TST"
        name = "Test"
    with pytest.raises(TypeError):
        IncompleteAdapter()
```

- [ ] **Step 2: テスト実行 → 失敗確認**

```bash
cd src/collector && pytest tests/test_adapters_base.py -v
```

Expected: FAIL with "No module named 'src.collector.adapters.base'"

- [ ] **Step 3: __init__.py を作成（空ファイル × 3）**

```bash
touch src/collector/__init__.py
touch src/collector/adapters/__init__.py
touch src/collector/tests/__init__.py
```

- [ ] **Step 4: base.py を実装**

```python
# src/collector/adapters/base.py
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional
from playwright.async_api import Page


@dataclass
class ListingItem:
    platform_prefix: str
    title: str
    detail_url: str
    source_url: str
    budget_text: Optional[str] = None
    posted_at: Optional[str] = None


@dataclass
class JobDetail:
    listing: ListingItem
    description: str
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    deadline: Optional[str] = None
    proposal_count: Optional[int] = None
    client_name: Optional[str] = None
    client_verified: Optional[bool] = None
    client_history_count: Optional[int] = None
    service_category: Optional[str] = None  # lp / website / ad


class PlatformAdapter(ABC):
    prefix: str = ""
    name: str = ""
    search_urls: list[str] = []

    @abstractmethod
    async def is_logged_in(self, page: Page) -> bool: ...

    @abstractmethod
    async def fetch_listings(self, page: Page, source_url: str) -> list[ListingItem]: ...

    @abstractmethod
    async def fetch_detail(self, page: Page, listing: ListingItem) -> JobDetail: ...
```

- [ ] **Step 5: テスト実行 → 成功確認**

```bash
pytest tests/test_adapters_base.py -v
```

Expected: 3 passed

- [ ] **Step 6: コミット**

```bash
git add src/collector/adapters/ src/collector/__init__.py src/collector/tests/
git commit -m "feat: collector: PlatformAdapter ABC"
```

---

## Task 6: Lancers Adapter — Listings 取得

**Files:**
- Create: `src/collector/adapters/lancers.py`
- Create: `src/collector/tests/fixtures/lancers_listing.html`
- Create: `src/collector/tests/test_lancers_listings.py`

- [ ] **Step 1: 実 Lancers を Playwright で開いて HTML を取得（fixture 用）**

```bash
# tmp スクリプトでログイン後の listing HTML を保存
cat > /tmp/fetch-lancers-fixture.py << 'EOF'
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        ctx = await browser.new_context()
        page = await ctx.new_page()
        # 手動ログインを促す
        await page.goto("https://www.lancers.jp/")
        print("ブラウザでログインしてから Enter を押してください")
        input()
        await page.goto("https://www.lancers.jp/work/search/web/lp")
        await page.wait_for_selector(".c-media", timeout=10000)
        html = await page.content()
        with open("src/collector/tests/fixtures/lancers_listing.html", "w") as f:
            f.write(html)
        print("Saved fixture")
        await browser.close()

asyncio.run(main())
EOF
mkdir -p src/collector/tests/fixtures
python /tmp/fetch-lancers-fixture.py
```

- [ ] **Step 2: 失敗テストを書く**

```python
# src/collector/tests/test_lancers_listings.py
import pytest
from pathlib import Path
from src.collector.adapters.lancers import LancersAdapter

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.mark.asyncio
async def test_parse_listings_from_html():
    """fixture HTML から ListingItem 配列が抽出できる"""
    adapter = LancersAdapter()
    html = (FIXTURES / "lancers_listing.html").read_text()
    items = adapter.parse_listings_from_html(html, source_url="https://www.lancers.jp/work/search/web/lp")
    assert len(items) > 0
    assert items[0].platform_prefix == "LAN"
    assert items[0].title  # not empty
    assert items[0].detail_url.startswith("https://www.lancers.jp/")
```

- [ ] **Step 3: テスト実行 → 失敗確認**

```bash
pytest tests/test_lancers_listings.py -v
```

Expected: FAIL with "ImportError"

- [ ] **Step 4: lancers.py を実装**

```python
# src/collector/adapters/lancers.py
from typing import Optional
from urllib.parse import urljoin
from bs4 import BeautifulSoup
from playwright.async_api import Page
from .base import PlatformAdapter, ListingItem, JobDetail


class LancersAdapter(PlatformAdapter):
    prefix = "LAN"
    name = "Lancers"
    search_urls = [
        "https://www.lancers.jp/work/search/web/lp",
        "https://www.lancers.jp/work/search/web/website",
        "https://www.lancers.jp/work/search/ad",
    ]

    async def is_logged_in(self, page: Page) -> bool:
        await page.goto("https://www.lancers.jp/mypage", wait_until="domcontentloaded")
        try:
            await page.wait_for_selector(".header__user-icon, .nav-globalHeader__userIcon, [data-name='userMenu']", timeout=5000)
            return "/login" not in page.url
        except Exception:
            return False

    def parse_listings_from_html(self, html: str, source_url: str) -> list[ListingItem]:
        soup = BeautifulSoup(html, "html.parser")
        items: list[ListingItem] = []

        # Lancers の検索結果は .c-media で囲まれた構造（実際のセレクタは fixture で確認・調整）
        for card in soup.select(".c-media, .p-search-job-list__item"):
            title_el = card.select_one("a.c-media__title, .p-search-job-list__title a")
            if not title_el:
                continue
            href = title_el.get("href", "")
            title = title_el.get_text(strip=True)
            if not title or not href:
                continue
            budget_el = card.select_one(".c-media__budget, .p-search-job-list__budget")
            posted_el = card.select_one(".c-media__date, .p-search-job-list__date")

            items.append(ListingItem(
                platform_prefix=self.prefix,
                title=title,
                detail_url=urljoin("https://www.lancers.jp/", href),
                source_url=source_url,
                budget_text=budget_el.get_text(strip=True) if budget_el else None,
                posted_at=posted_el.get_text(strip=True) if posted_el else None,
            ))
        return items

    async def fetch_listings(self, page: Page, source_url: str) -> list[ListingItem]:
        await page.goto(source_url, wait_until="domcontentloaded")
        await page.wait_for_selector(".c-media, .p-search-job-list__item", timeout=10000)
        html = await page.content()
        return self.parse_listings_from_html(html, source_url)

    async def fetch_detail(self, page: Page, listing: ListingItem) -> JobDetail:
        # Task 7 で実装
        raise NotImplementedError
```

- [ ] **Step 5: テスト実行 → 成功確認**

```bash
pytest tests/test_lancers_listings.py -v
```

Expected: PASS（fixture HTML 内に最低1件パースできること）

> 注: 実際のセレクタは fixture を見て調整必要。テストが fail したら HTML を確認してセレクタを修正。

- [ ] **Step 6: コミット**

```bash
git add src/collector/adapters/lancers.py src/collector/tests/test_lancers_listings.py src/collector/tests/fixtures/
git commit -m "feat: collector: Lancers listings parser"
```

---

## Task 7: Lancers Adapter — Detail パース

**Files:**
- Modify: `src/collector/adapters/lancers.py`
- Create: `src/collector/tests/fixtures/lancers_detail.html`
- Create: `src/collector/tests/test_lancers_detail.py`

- [ ] **Step 1: detail fixture を取得**

```bash
# 上記のスクリプトを改造して、案件詳細ページの HTML を取得
# 例: https://www.lancers.jp/work/detail/<id> を開いて保存
cat > /tmp/fetch-lancers-detail.py << 'EOF'
import asyncio, sys
from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else None
assert URL, "Usage: python fetch-lancers-detail.py <detail_url>"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        ctx = await browser.new_context()
        page = await ctx.new_page()
        await page.goto("https://www.lancers.jp/")
        print("ログインしてから Enter")
        input()
        await page.goto(URL)
        await page.wait_for_load_state("domcontentloaded")
        html = await page.content()
        with open("src/collector/tests/fixtures/lancers_detail.html", "w") as f:
            f.write(html)
        await browser.close()

asyncio.run(main())
EOF
python /tmp/fetch-lancers-detail.py https://www.lancers.jp/work/detail/<実在ID>
```

- [ ] **Step 2: 失敗テストを書く**

```python
# src/collector/tests/test_lancers_detail.py
import pytest
from pathlib import Path
from src.collector.adapters.lancers import LancersAdapter
from src.collector.adapters.base import ListingItem

FIXTURES = Path(__file__).parent / "fixtures"


def test_parse_detail_from_html():
    adapter = LancersAdapter()
    html = (FIXTURES / "lancers_detail.html").read_text()
    listing = ListingItem(
        platform_prefix="LAN",
        title="dummy",
        detail_url="https://www.lancers.jp/work/detail/12345",
        source_url="https://www.lancers.jp/work/search/web/lp",
    )
    detail = adapter.parse_detail_from_html(html, listing)
    assert detail.description  # not empty
    assert detail.budget_min is not None or detail.budget_max is not None
    assert detail.client_name  # not empty
```

- [ ] **Step 3: テスト実行 → 失敗確認**

```bash
pytest tests/test_lancers_detail.py -v
```

Expected: FAIL

- [ ] **Step 4: lancers.py に detail パースを追加**

`src/collector/adapters/lancers.py` に以下を追加:

```python
import re

def parse_budget(text: str) -> tuple[Optional[int], Optional[int]]:
    """例: "10万円 〜 20万円" → (100000, 200000)"""
    if not text:
        return None, None
    nums = re.findall(r'(\d+(?:,\d+)*)', text.replace(',', ''))
    if not nums:
        return None, None
    nums = [int(n) for n in nums]
    if "万" in text:
        nums = [n * 10000 for n in nums]
    if len(nums) == 1:
        return nums[0], nums[0]
    return min(nums), max(nums)


# LancersAdapter クラス内に追加
def parse_detail_from_html(self, html: str, listing: ListingItem) -> JobDetail:
    soup = BeautifulSoup(html, "html.parser")

    description_el = soup.select_one(
        ".work-detail__description, .c-work-detail__description, [data-detail-text]"
    )
    description = description_el.get_text("\n", strip=True) if description_el else ""

    budget_el = soup.select_one(".work-detail__budget, .p-work-budget")
    budget_text = budget_el.get_text(strip=True) if budget_el else listing.budget_text
    budget_min, budget_max = parse_budget(budget_text or "")

    deadline_el = soup.select_one(".work-detail__deadline, .p-work-deadline")
    deadline = deadline_el.get_text(strip=True) if deadline_el else None

    proposal_el = soup.select_one(".work-detail__proposal-count")
    proposal_count = int(proposal_el.get_text(strip=True).replace("件", "")) if proposal_el else None

    client_el = soup.select_one(".client-info__name, .p-client-name a")
    client_name = client_el.get_text(strip=True) if client_el else None

    verified_el = soup.select_one(".client-info__verified, .badge--verified")
    client_verified = bool(verified_el)

    history_el = soup.select_one(".client-info__history")
    history_count = None
    if history_el:
        m = re.search(r'(\d+)', history_el.get_text())
        history_count = int(m.group(1)) if m else None

    # サービスカテゴリ判定（source_url からマッピング）
    if "search/web/lp" in listing.source_url:
        category = "lp"
    elif "search/web/website" in listing.source_url:
        category = "website"
    elif "search/ad" in listing.source_url:
        category = "ad"
    else:
        category = None

    return JobDetail(
        listing=listing,
        description=description,
        budget_min=budget_min,
        budget_max=budget_max,
        deadline=deadline,
        proposal_count=proposal_count,
        client_name=client_name,
        client_verified=client_verified,
        client_history_count=history_count,
        service_category=category,
    )


async def fetch_detail(self, page: Page, listing: ListingItem) -> JobDetail:
    await page.goto(listing.detail_url, wait_until="domcontentloaded")
    html = await page.content()
    return self.parse_detail_from_html(html, listing)
```

- [ ] **Step 5: テスト実行 → 成功確認**

```bash
pytest tests/test_lancers_detail.py -v
```

Expected: PASS（セレクタは fixture を見て調整）

- [ ] **Step 6: コミット**

```bash
git add src/collector/adapters/lancers.py src/collector/tests/test_lancers_detail.py src/collector/tests/fixtures/lancers_detail.html
git commit -m "feat: collector: Lancers detail page parser"
```

---

## Task 8: Session / Cookie 管理

**Files:**
- Create: `src/collector/session.py`
- Create: `src/collector/tests/test_session.py`

- [ ] **Step 1: 失敗テストを書く**

```python
# src/collector/tests/test_session.py
import pytest
import json
from pathlib import Path
from src.collector.session import CookieManager


def test_save_and_load_cookies(tmp_path):
    cookie_path = tmp_path / "cookies.json"
    mgr = CookieManager(cookie_path)
    sample_state = {"cookies": [{"name": "x", "value": "1"}], "origins": []}
    mgr.save(sample_state)
    loaded = mgr.load()
    assert loaded == sample_state


def test_load_returns_none_when_missing(tmp_path):
    cookie_path = tmp_path / "missing.json"
    mgr = CookieManager(cookie_path)
    assert mgr.load() is None


def test_save_uses_600_perm(tmp_path):
    cookie_path = tmp_path / "cookies.json"
    mgr = CookieManager(cookie_path)
    mgr.save({"cookies": []})
    perm = oct(cookie_path.stat().st_mode)[-3:]
    assert perm == "600"
```

- [ ] **Step 2: テスト実行 → 失敗確認**

```bash
pytest tests/test_session.py -v
```

- [ ] **Step 3: session.py を実装**

```python
# src/collector/session.py
import json
import os
from pathlib import Path
from typing import Optional


class CookieManager:
    def __init__(self, cookie_path: Path):
        self.cookie_path = Path(cookie_path)

    def save(self, storage_state: dict) -> None:
        self.cookie_path.parent.mkdir(parents=True, exist_ok=True)
        # 一時ファイルに書いてから rename（部分書き込み防止）
        tmp = self.cookie_path.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(storage_state))
        os.chmod(tmp, 0o600)
        tmp.rename(self.cookie_path)

    def load(self) -> Optional[dict]:
        if not self.cookie_path.exists():
            return None
        return json.loads(self.cookie_path.read_text())

    @staticmethod
    def default_path(platform_prefix: str) -> Path:
        appdata = Path.home() / "Library" / "Application Support" / "bsa-pa"
        return appdata / f"{platform_prefix.lower()}-cookies.json"
```

- [ ] **Step 4: テスト実行 → 成功確認**

```bash
pytest tests/test_session.py -v
```

Expected: 3 passed

- [ ] **Step 5: コミット**

```bash
git add src/collector/session.py src/collector/tests/test_session.py
git commit -m "feat: collector: cookie manager with secure file perms"
```

---

## Task 9: Stealth 設定

**Files:**
- Create: `src/collector/stealth.py`

- [ ] **Step 1: stealth.py を実装**

```python
# src/collector/stealth.py
from playwright.async_api import BrowserContext
from playwright_stealth import Stealth


USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)


async def create_stealth_context(playwright, storage_state: dict | None = None) -> BrowserContext:
    """Stealth + UA 偽装 + 日本語ロケール の Browser Context を作成"""
    browser = await playwright.chromium.launch(
        headless=False,  # headed で動かす（規約遵守 + 検知回避）
        args=[
            "--disable-blink-features=AutomationControlled",
            "--lang=ja-JP",
        ],
    )
    context = await browser.new_context(
        user_agent=USER_AGENT,
        locale="ja-JP",
        timezone_id="Asia/Tokyo",
        viewport={"width": 1280, "height": 800},
        storage_state=storage_state,
    )
    # playwright-stealth 適用
    await Stealth().apply_stealth_async(context)
    return context, browser
```

- [ ] **Step 2: 動作確認（インタラクティブ）**

```bash
python -c "
import asyncio
from playwright.async_api import async_playwright
from src.collector.stealth import create_stealth_context

async def main():
    async with async_playwright() as p:
        ctx, browser = await create_stealth_context(p)
        page = await ctx.new_page()
        await page.goto('https://bot.sannysoft.com')
        input('Enter to close')
        await browser.close()

asyncio.run(main())
"
```

Expected: bot.sannysoft.com で大半のチェックがパスする（緑表示）

- [ ] **Step 3: コミット**

```bash
git add src/collector/stealth.py
git commit -m "feat: collector: stealth browser context with playwright-stealth"
```

---

## Task 10: Scorer (fit_score 計算)

**Files:**
- Create: `src/collector/scorer.py`
- Create: `src/collector/tests/test_scorer.py`

- [ ] **Step 1: 失敗テストを書く**

```python
# src/collector/tests/test_scorer.py
import pytest
from src.collector.scorer import (
    score_price, score_service, score_constraints,
    score_speed, score_client, calculate_fit_score
)


def test_price_3man_to_30man_max():
    assert score_price(30000, 300000) == 30


def test_price_under_1man_zero():
    assert score_price(5000, 9000) == 0


def test_price_1man_to_3man():
    assert score_price(10000, 30000) == 25


def test_price_unknown_default():
    assert score_price(None, None) == 10


def test_service_lp_max():
    assert score_service("lp", "整体院LP制作", "...") == 25


def test_service_ad_max():
    assert score_service("ad", "Google広告運用", "...") == 25


def test_constraint_excludes_certified_lancer():
    assert score_constraints("認定ランサー限定の案件です") == -30


def test_constraint_individual_ok():
    assert score_constraints("個人の方歓迎") == 25  # 15 + 10


def test_speed_one_week():
    assert score_speed("2026-05-05") == 10  # 1週間以内（仮定）


def test_client_verified_with_history():
    assert score_client(verified=True, history=15) == 20


def test_client_no_verification():
    assert score_client(verified=False, history=0) == -10


def test_calculate_fit_total_max():
    job = {
        "budget_min": 100000, "budget_max": 200000,
        "service_category": "lp",
        "title": "LP制作", "description": "個人の方歓迎",
        "deadline": "2026-05-05",
        "client_verified": True, "client_history_count": 20,
    }
    total, breakdown = calculate_fit_score(job)
    assert total == 100  # 全部マックス
    assert breakdown["price"] == 30
```

- [ ] **Step 2: テスト実行 → 失敗確認**

```bash
pytest tests/test_scorer.py -v
```

- [ ] **Step 3: scorer.py を実装**

```python
# src/collector/scorer.py
from datetime import datetime, date
from typing import Optional


def score_price(budget_min: Optional[int], budget_max: Optional[int]) -> int:
    if budget_min is None and budget_max is None:
        return 10
    upper = budget_max or budget_min or 0
    lower = budget_min or budget_max or 0
    if upper < 10000:
        return 0
    if lower >= 10000 and upper < 30000:
        return 25
    if lower >= 30000 and upper <= 300000:
        return 30
    if lower >= 30000 and upper <= 500000:
        return 20
    if lower >= 500000:
        return 15
    # ボーダー（例: 1-3万 + 3-30万 にまたがる）は最大値で
    if upper <= 300000:
        return 30
    return 20


def score_service(category: Optional[str], title: str, description: str) -> int:
    text = f"{title}\n{description}".lower()
    if category == "lp" or "ランディング" in text or "ランディングページ" in text:
        return 25
    if category == "ad" or "広告運用" in text or "google広告" in text or "リスティング" in text:
        return 25
    if category == "website" or "コーポレート" in text or "ホームページ制作" in text:
        return 15
    if "修正" in text or "改修" in text:
        return 10
    return 5


def score_constraints(description: str) -> int:
    if "認定ランサー" in description and "限定" in description:
        return -30
    score = 10  # 基準
    if "個人" in description and ("可" in description or "歓迎" in description or "ok" in description.lower()):
        score += 15
    if "実績10件" in description or "経験豊富" in description:
        score -= 10
    return score


def score_speed(deadline: Optional[str]) -> int:
    if not deadline:
        return 5
    try:
        d = datetime.strptime(deadline, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return 5
    today = date.today()
    days = (d - today).days
    if days <= 7:
        return 10
    if days <= 21:
        return 7
    return 3


def score_client(verified: Optional[bool], history: Optional[int]) -> int:
    if verified and history and history >= 10:
        return 20
    if verified:
        return 10
    if history is None:
        return 5
    if history == 0:
        return -10
    return -10  # 本人確認なしは減点


def calculate_fit_score(job: dict) -> tuple[int, dict]:
    price_score = score_price(job.get("budget_min"), job.get("budget_max"))
    service_score = score_service(job.get("service_category"), job.get("title", ""), job.get("description", ""))
    constraint_score = score_constraints(job.get("description", ""))
    if constraint_score <= -30:
        return 0, {"excluded": "認定ランサー限定", "total": 0,
                   "price": price_score, "service": service_score, "constraint": -30,
                   "speed": 0, "client": 0}
    speed_score = score_speed(job.get("deadline"))
    client_score = score_client(job.get("client_verified"), job.get("client_history_count"))

    total = max(0, price_score + service_score + constraint_score + speed_score + client_score)

    breakdown = {
        "price": price_score,
        "service": service_score,
        "constraint": constraint_score,
        "speed": speed_score,
        "client": client_score,
        "total": total,
    }
    return total, breakdown
```

- [ ] **Step 4: テスト実行 → 成功確認**

```bash
pytest tests/test_scorer.py -v
```

Expected: 12 passed

- [ ] **Step 5: コミット**

```bash
git add src/collector/scorer.py src/collector/tests/test_scorer.py
git commit -m "feat: collector: fit_score calculation with breakdown"
```

---

## Task 11: Collector main.py — 統合フロー

**Files:**
- Create: `src/collector/db.py`
- Create: `src/collector/main.py`

- [ ] **Step 1: db.py を実装**

```python
# src/collector/db.py
import sqlite3
from datetime import datetime, date
from pathlib import Path
import json
from typing import Optional


DB_PATH = Path.home() / "Library" / "Application Support" / "bsa-pa" / "data.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def generate_job_id(conn: sqlite3.Connection, prefix: str) -> str:
    today = date.today().strftime("%Y%m%d")
    cur = conn.execute(
        "SELECT COUNT(*) FROM jobs WHERE job_id LIKE ?",
        (f"{prefix}-{today}-%",),
    )
    count = cur.fetchone()[0]
    return f"{prefix}-{today}-{count + 1:03d}"


def upsert_job(conn: sqlite3.Connection, job: dict, prefix: str) -> str:
    """detail_url で UNIQUE 制約。既存なら UPDATE、新規なら INSERT して job_id 発行"""
    existing = conn.execute(
        "SELECT job_id FROM jobs WHERE detail_url = ?",
        (job["detail_url"],),
    ).fetchone()
    if existing:
        conn.execute(
            """UPDATE jobs SET
               title=?, description=?, budget_text=?, budget_min=?, budget_max=?,
               deadline=?, proposal_count=?, client_name=?, client_verified=?,
               client_history_count=?, service_category=?,
               updated_at=datetime('now')
               WHERE job_id=?""",
            (
                job.get("title"), job.get("description"), job.get("budget_text"),
                job.get("budget_min"), job.get("budget_max"),
                job.get("deadline"), job.get("proposal_count"),
                job.get("client_name"), job.get("client_verified"),
                job.get("client_history_count"), job.get("service_category"),
                existing["job_id"],
            ),
        )
        return existing["job_id"]
    job_id = generate_job_id(conn, prefix)
    conn.execute(
        """INSERT INTO jobs (
            job_id, platform_prefix, source_url, detail_url, title, description,
            budget_text, budget_min, budget_max, deadline, proposal_count,
            client_name, client_verified, client_history_count, service_category,
            posted_at, collected_at, status
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'collected')""",
        (
            job_id, prefix, job["source_url"], job["detail_url"],
            job.get("title"), job.get("description"),
            job.get("budget_text"), job.get("budget_min"), job.get("budget_max"),
            job.get("deadline"), job.get("proposal_count"),
            job.get("client_name"), job.get("client_verified"),
            job.get("client_history_count"), job.get("service_category"),
            job.get("posted_at"),
        ),
    )
    conn.execute(
        "INSERT INTO status_history (job_id, from_status, to_status, changed_by) VALUES (?, NULL, 'collected', 'auto')",
        (job_id,),
    )
    return job_id


def update_fit_score(conn: sqlite3.Connection, job_id: str, total: int, breakdown: dict, product_line: str | None) -> None:
    conn.execute(
        "UPDATE jobs SET fit_score=?, fit_score_breakdown=?, estimated_product_line=?, updated_at=datetime('now') WHERE job_id=?",
        (total, json.dumps(breakdown, ensure_ascii=False), product_line, job_id),
    )


def insert_run(conn: sqlite3.Connection, stage: str, status: str, collected_count: int = 0,
               error_message: str | None = None, error_stage: str | None = None) -> int:
    cur = conn.execute(
        """INSERT INTO runs (started_at, ended_at, stage, collected_count, status, error_message, error_stage)
           VALUES (datetime('now'), datetime('now'), ?, ?, ?, ?, ?)""",
        (stage, collected_count, status, error_message, error_stage),
    )
    return cur.lastrowid


def get_session(conn: sqlite3.Connection, prefix: str) -> Optional[sqlite3.Row]:
    return conn.execute("SELECT * FROM sessions WHERE platform_prefix = ?", (prefix,)).fetchone()


def update_session(conn: sqlite3.Connection, prefix: str, cookie_path: str, valid: bool) -> None:
    conn.execute(
        """INSERT INTO sessions (platform_prefix, cookie_path, logged_in_at, last_validated_at, valid)
           VALUES (?, ?, datetime('now'), datetime('now'), ?)
           ON CONFLICT(platform_prefix) DO UPDATE SET
             cookie_path=excluded.cookie_path,
             last_validated_at=datetime('now'),
             valid=excluded.valid""",
        (prefix, cookie_path, 1 if valid else 0),
    )
```

- [ ] **Step 2: main.py を実装**

```python
# src/collector/main.py
import asyncio
import random
import sys
from pathlib import Path
from playwright.async_api import async_playwright

from src.collector.adapters.lancers import LancersAdapter
from src.collector.session import CookieManager
from src.collector.stealth import create_stealth_context
from src.collector.scorer import calculate_fit_score
from src.collector.db import get_connection, upsert_job, update_fit_score, insert_run, update_session


async def collect_for_adapter(adapter, max_per_url: int = 17) -> tuple[int, str | None]:
    """1 adapter（=1 platform）の収集処理。(success_count, error_message) を返す"""
    cookie_path = CookieManager.default_path(adapter.prefix)
    cookies = CookieManager(cookie_path)
    state = cookies.load()
    if state is None:
        return 0, "cookie not found - 初回 setup.sh を実行してください"

    async with async_playwright() as p:
        context, browser = await create_stealth_context(p, storage_state=state)
        try:
            page = await context.new_page()
            if not await adapter.is_logged_in(page):
                conn = get_connection()
                update_session(conn, adapter.prefix, str(cookie_path), valid=False)
                conn.commit()
                conn.close()
                return 0, "ログインセッション切れ - relogin.sh を実行してください"

            collected = 0
            conn = get_connection()
            for source_url in adapter.search_urls:
                listings = await adapter.fetch_listings(page, source_url)
                listings = listings[:max_per_url]

                for listing in listings:
                    try:
                        detail = await adapter.fetch_detail(page, listing)
                        job_data = {
                            "source_url": listing.source_url,
                            "detail_url": listing.detail_url,
                            "title": listing.title,
                            "description": detail.description,
                            "budget_text": listing.budget_text,
                            "budget_min": detail.budget_min,
                            "budget_max": detail.budget_max,
                            "deadline": detail.deadline,
                            "proposal_count": detail.proposal_count,
                            "client_name": detail.client_name,
                            "client_verified": detail.client_verified,
                            "client_history_count": detail.client_history_count,
                            "service_category": detail.service_category,
                            "posted_at": listing.posted_at,
                        }
                        with conn:
                            job_id = upsert_job(conn, job_data, adapter.prefix)
                            total, breakdown = calculate_fit_score(job_data)
                            update_fit_score(conn, job_id, total, breakdown, None)
                        collected += 1
                    except Exception as e:
                        print(f"❌ Failed listing {listing.detail_url}: {e}", file=sys.stderr)
                    # リクエスト間隔: 3-5秒のランダム
                    await asyncio.sleep(random.uniform(3, 5))

            update_session(conn, adapter.prefix, str(cookie_path), valid=True)
            conn.commit()
            conn.close()
            return collected, None
        finally:
            # cookie 上書き保存
            new_state = await context.storage_state()
            cookies.save(new_state)
            await browser.close()


async def main() -> int:
    adapters = [LancersAdapter()]
    total = 0
    error = None
    for adapter in adapters:
        n, err = await collect_for_adapter(adapter)
        total += n
        if err:
            error = err
            break
    conn = get_connection()
    insert_run(
        conn, stage="collect",
        status="success" if error is None else "error",
        collected_count=total,
        error_message=error,
        error_stage="collect" if error else None,
    )
    conn.commit()
    conn.close()
    print(f"✅ 収集完了: {total} 件")
    if error:
        print(f"❌ エラー: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
```

- [ ] **Step 3: 動作確認（手動セットアップ後）**

Task 28 の `setup.sh` を実行して初回ログインを済ませた後:

```bash
cd src/collector
python -m src.collector.main
```

Expected: 50件前後収集される、`runs` テーブルに success が記録される

- [ ] **Step 4: コミット**

```bash
git add src/collector/db.py src/collector/main.py
git commit -m "feat: collector: integration main with stealth + scoring"
```

---

# Milestone 3: Generator (Node.js)

## Task 12: Generator プロジェクト初期化

**Files:**
- Create: `src/generator/package.json`
- Create: `src/generator/tsconfig.json`
- Create: `src/generator/.gitignore`

- [ ] **Step 1: package.json を作成**

```json
{
  "name": "bsa-pa-generator",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/main.js",
    "dev": "tsx src/main.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "better-sqlite3": "^11.5.0",
    "ulid": "^2.4.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/node": "^22.10.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: tsconfig.json を作成**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: 依存をインストール**

```bash
cd src/generator
npm install
```

- [ ] **Step 4: コミット**

```bash
git add src/generator/package.json src/generator/tsconfig.json
git commit -m "feat: generator: Node.js project init"
```

---

## Task 13: db.ts (better-sqlite3 ラッパー)

**Files:**
- Create: `src/generator/src/db.ts`
- Create: `src/generator/tests/db.test.ts`

- [ ] **Step 1: 失敗テストを書く**

```typescript
// src/generator/tests/db.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, getTopJobs, upsertProposal, getProposal } from '../src/db.js';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';

let db: Database.Database;

beforeEach(() => {
  db = new Database(':memory:');
  const schema = readFileSync(
    new URL('../../shared/schema.sql', import.meta.url),
    'utf8'
  );
  db.exec(schema);
});

describe('getTopJobs', () => {
  it('returns top N jobs by fit_score desc, status=collected only', () => {
    db.prepare(`INSERT INTO jobs (job_id, platform_prefix, source_url, detail_url, title, collected_at, fit_score, status)
                VALUES (?, 'LAN', 'x', 'y1', 't1', datetime('now'), 88, 'collected')`).run('LAN-20260428-001');
    db.prepare(`INSERT INTO jobs (job_id, platform_prefix, source_url, detail_url, title, collected_at, fit_score, status)
                VALUES (?, 'LAN', 'x', 'y2', 't2', datetime('now'), 95, 'submitted')`).run('LAN-20260428-002');
    db.prepare(`INSERT INTO jobs (job_id, platform_prefix, source_url, detail_url, title, collected_at, fit_score, status)
                VALUES (?, 'LAN', 'x', 'y3', 't3', datetime('now'), 70, 'collected')`).run('LAN-20260428-003');

    const jobs = getTopJobs(db, 10);
    expect(jobs.length).toBe(2);  // submitted は除外
    expect(jobs[0].job_id).toBe('LAN-20260428-001');  // 高スコア順
  });
});
```

- [ ] **Step 2: テスト実行 → 失敗**

```bash
npm test
```

- [ ] **Step 3: db.ts を実装**

```typescript
// src/generator/src/db.ts
import Database from 'better-sqlite3';
import { ulid } from 'ulid';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const DEFAULT_DB_PATH = join(
  homedir(),
  'Library/Application Support/bsa-pa/data.db'
);

export function openDb(path = DEFAULT_DB_PATH): Database.Database {
  const db = new Database(path);
  db.pragma('foreign_keys = ON');
  return db;
}

export interface JobRow {
  job_id: string;
  title: string;
  description: string | null;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  client_name: string | null;
  client_verified: number | null;
  client_history_count: number | null;
  service_category: string | null;
  fit_score: number | null;
  fit_score_breakdown: string | null;
  estimated_product_line: string | null;
  detail_url: string;
  status: string;
}

export function getTopJobs(db: Database.Database, limit: number): JobRow[] {
  return db
    .prepare(
      `SELECT * FROM jobs
       WHERE status = 'collected'
       ORDER BY fit_score DESC, collected_at DESC
       LIMIT ?`
    )
    .all(limit) as JobRow[];
}

export interface ProposalInsert {
  job_id: string;
  product_line: string;
  price: number;
  delivery_days: number;
  body_md: string;
  research_notes: string | null;
  generated_by: string;
}

export function upsertProposal(
  db: Database.Database,
  p: ProposalInsert
): string {
  const existing = db
    .prepare('SELECT proposal_id FROM proposals WHERE job_id = ?')
    .get(p.job_id) as { proposal_id: string } | undefined;

  if (existing) {
    db.prepare(
      `INSERT INTO proposal_revisions (proposal_id, body_md, product_line, price, delivery_days, changed_by, note)
       SELECT proposal_id, body_md, product_line, price, delivery_days, 'claude', 're-generated'
       FROM proposals WHERE proposal_id = ?`
    ).run(existing.proposal_id);

    db.prepare(
      `UPDATE proposals SET
         product_line = ?, price = ?, delivery_days = ?,
         body_md = ?, research_notes = ?,
         generated_at = datetime('now'), generated_by = ?
       WHERE proposal_id = ?`
    ).run(
      p.product_line, p.price, p.delivery_days, p.body_md, p.research_notes,
      p.generated_by, existing.proposal_id
    );
    return existing.proposal_id;
  }

  const proposal_id = ulid();
  db.prepare(
    `INSERT INTO proposals (proposal_id, job_id, product_line, price, delivery_days, body_md, research_notes, generated_at, generated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`
  ).run(
    proposal_id, p.job_id, p.product_line, p.price, p.delivery_days,
    p.body_md, p.research_notes, p.generated_by
  );

  db.prepare(
    `UPDATE jobs SET status = 'proposing', updated_at = datetime('now') WHERE job_id = ?`
  ).run(p.job_id);

  db.prepare(
    `INSERT INTO status_history (job_id, from_status, to_status, changed_by, note)
     VALUES (?, 'collected', 'proposing', 'auto', 'proposal generated')`
  ).run(p.job_id);

  return proposal_id;
}

export function getProposal(db: Database.Database, job_id: string) {
  return db
    .prepare('SELECT * FROM proposals WHERE job_id = ?')
    .get(job_id);
}

export function getPendingGenerationRequests(db: Database.Database) {
  return db
    .prepare("SELECT * FROM generation_requests WHERE status = 'pending' ORDER BY created_at ASC")
    .all() as Array<{ request_id: number; job_id: string; prompt_hint: string | null }>;
}

export function markGenerationRequest(
  db: Database.Database,
  request_id: number,
  status: 'processing' | 'done' | 'failed',
  error: string | null = null
) {
  db.prepare(
    `UPDATE generation_requests SET status = ?, processed_at = datetime('now'), error_message = ? WHERE request_id = ?`
  ).run(status, error, request_id);
}

export function logExaUsage(db: Database.Database, query: string, count: number) {
  db.prepare(
    "INSERT INTO exa_usage (query, result_count) VALUES (?, ?)"
  ).run(query, count);
}

export function getExaMonthlyUsage(db: Database.Database): number {
  const row = db.prepare(
    `SELECT COUNT(*) as cnt FROM exa_usage WHERE called_at >= datetime('now', 'start of month')`
  ).get() as { cnt: number };
  return row.cnt;
}
```

- [ ] **Step 4: テスト実行 → 成功**

```bash
npm test
```

- [ ] **Step 5: コミット**

```bash
git add src/generator/src/db.ts src/generator/tests/db.test.ts
git commit -m "feat: generator: better-sqlite3 db wrapper with proposal upsert"
```

---

## Task 14: Claude Headless ラッパー

**Files:**
- Create: `src/generator/src/claude-headless.ts`
- Create: `src/generator/tests/claude-headless.test.ts`

- [ ] **Step 1: 設計どおりに実装**

```typescript
// src/generator/src/claude-headless.ts
import { spawn } from 'node:child_process';

export interface ClaudeHeadlessOptions {
  prompt: string;
  schema?: object;
  bare?: boolean;
  mcpConfig?: string;
  allowedTools?: string[];
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  fallbackModel?: string;
  timeoutMs?: number;
  claudeBin?: string;  // 通常は省略（PATH 解決）。テスト時に上書き
}

export class ClaudeHeadlessError extends Error {
  constructor(
    message: string,
    public readonly stderr: string,
    public readonly exitCode: number | null
  ) {
    super(message);
    this.name = 'ClaudeHeadlessError';
  }
}

export async function callClaudeHeadless<T = unknown>(
  opts: ClaudeHeadlessOptions
): Promise<T> {
  const args = [
    '--print',
    '--output-format', 'json',
    '--no-session-persistence',
  ];
  if (opts.schema) {
    args.push('--json-schema', JSON.stringify(opts.schema));
  }
  if (opts.bare) args.push('--bare');
  if (opts.mcpConfig) args.push('--mcp-config', opts.mcpConfig);
  if (opts.allowedTools && opts.allowedTools.length > 0) {
    args.push('--allowedTools', ...opts.allowedTools);
  }
  if (opts.effort) args.push('--effort', opts.effort);
  if (opts.fallbackModel) args.push('--fallback-model', opts.fallbackModel);

  const bin = opts.claudeBin ?? 'claude';

  return new Promise<T>((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new ClaudeHeadlessError('claude headless timeout', stderr, null));
    }, opts.timeoutMs ?? 180_000);

    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(new ClaudeHeadlessError(`spawn failed: ${err.message}`, stderr, null));
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new ClaudeHeadlessError(`claude exited ${code}`, stderr, code));
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        // claude --output-format json は { type, subtype, result, ... } 形式で返る
        // result フィールドが本体（schema 適用時はここに JSON object が入る）
        const body = parsed.result ?? parsed;
        if (typeof body === 'string') {
          // schema 指定時でも文字列で返ることがある → さらにパース
          try {
            resolve(JSON.parse(body) as T);
          } catch {
            resolve(body as unknown as T);
          }
        } else {
          resolve(body as T);
        }
      } catch (e) {
        reject(new ClaudeHeadlessError(`JSON parse failed: ${stdout.slice(0, 500)}`, stderr, code));
      }
    });

    child.stdin.write(opts.prompt);
    child.stdin.end();
  });
}
```

- [ ] **Step 2: 簡易テスト（実 claude を叩く統合テスト）**

```typescript
// src/generator/tests/claude-headless.test.ts
import { describe, it, expect } from 'vitest';
import { callClaudeHeadless } from '../src/claude-headless.js';

describe('callClaudeHeadless', () => {
  // この test は実 claude を叩くので、CI ではスキップ推奨
  it.skipIf(!process.env.CLAUDE_E2E)('returns JSON for hello prompt', async () => {
    const result = await callClaudeHeadless<{ message: string }>({
      prompt: 'Reply with JSON: {"message": "hello"}',
      schema: {
        type: 'object',
        properties: { message: { type: 'string' } },
        required: ['message'],
      },
      bare: true,
      effort: 'low',
      timeoutMs: 60_000,
    });
    expect(result.message).toBe('hello');
  });
});
```

- [ ] **Step 3: 実 claude で1回検証**

```bash
CLAUDE_E2E=1 npm test -- claude-headless
```

Expected: `result.message === 'hello'` で PASS。失敗時は claude のバージョンや stderr を確認。

- [ ] **Step 4: コミット**

```bash
git add src/generator/src/claude-headless.ts src/generator/tests/claude-headless.test.ts
git commit -m "feat: generator: claude headless wrapper with JSON schema validation"
```

---

## Task 15: Pricing カスタマイズロジック

**Files:**
- Create: `src/generator/src/pricing.ts`
- Create: `src/generator/tests/pricing.test.ts`

- [ ] **Step 1: 失敗テストを書く**

```typescript
// src/generator/tests/pricing.test.ts
import { describe, it, expect } from 'vitest';
import { customizePricing, BASE_LINES } from '../src/pricing.js';

describe('customizePricing', () => {
  it('L1 base: 30,000円 / 3日', () => {
    const result = customizePricing('L1', { budget_min: 30000, budget_max: 50000 });
    expect(result.price).toBeGreaterThanOrEqual(28000);
    expect(result.price).toBeLessThanOrEqual(50000);
    expect(result.delivery_days).toBe(3);
  });

  it('L1 with high budget: 値段を予算内に寄せる', () => {
    const result = customizePricing('L1', { budget_min: 80000, budget_max: 150000 });
    expect(result.price).toBeGreaterThanOrEqual(50000);
    expect(result.price).toBeLessThanOrEqual(80000);
  });

  it('L2 base: 80,000円 / 7日', () => {
    const result = customizePricing('L2', { budget_min: 80000, budget_max: 150000 });
    expect(result.price).toBeGreaterThanOrEqual(75000);
    expect(result.delivery_days).toBe(7);
  });
});
```

- [ ] **Step 2: テスト実行 → 失敗**

```bash
npm test -- pricing
```

- [ ] **Step 3: pricing.ts を実装**

```typescript
// src/generator/src/pricing.ts
import type { ProductLine } from '../../shared/types/index.js';

export interface ProductLineDef {
  line: ProductLine;
  base_price: number;
  base_delivery_days: number;
  min_price: number;
  max_price: number;
  description: string;
}

export const BASE_LINES: Record<ProductLine, ProductLineDef> = {
  L1: { line: 'L1', base_price: 30_000, base_delivery_days: 3, min_price: 25_000, max_price: 80_000, description: 'Rapid Single LP' },
  L2: { line: 'L2', base_price: 80_000, base_delivery_days: 7, min_price: 70_000, max_price: 150_000, description: 'Rapid Corporate 5P' },
  L3: { line: 'L3', base_price: 100_000, base_delivery_days: 4, min_price: 90_000, max_price: 200_000, description: 'Rapid LP + 広告運用初月' },
  L4: { line: 'L4', base_price: 20_000, base_delivery_days: 1, min_price: 10_000, max_price: 40_000, description: 'Express 修正・改修' },
};

export function customizePricing(
  line: ProductLine,
  job: { budget_min: number | null; budget_max: number | null }
): { price: number; delivery_days: number } {
  const def = BASE_LINES[line];
  let price = def.base_price;

  if (job.budget_max != null && job.budget_min != null) {
    // 予算範囲のミドル付近を狙うが、line の範囲内に収める
    const target = Math.floor((job.budget_min + job.budget_max) / 2);
    price = Math.min(def.max_price, Math.max(def.min_price, target));
  } else if (job.budget_max != null) {
    price = Math.min(def.max_price, Math.max(def.min_price, Math.floor(job.budget_max * 0.85)));
  }

  return { price, delivery_days: def.base_delivery_days };
}
```

- [ ] **Step 4: テスト実行 → 成功**

```bash
npm test -- pricing
```

- [ ] **Step 5: コミット**

```bash
git add src/generator/src/pricing.ts src/generator/tests/pricing.test.ts
git commit -m "feat: generator: pricing customizer with product line bounds"
```

---

## Task 16: Product Line Mapper

**Files:**
- Create: `src/generator/src/product-line-mapper.ts`
- Create: `src/generator/tests/product-line-mapper.test.ts`

- [ ] **Step 1: 失敗テストを書く**

```typescript
// src/generator/tests/product-line-mapper.test.ts
import { describe, it, expect } from 'vitest';
import { estimateProductLine } from '../src/product-line-mapper.js';

describe('estimateProductLine', () => {
  it('LP単発で予算 1-5万 → L1', () => {
    expect(estimateProductLine({
      service_category: 'lp', title: '整体院LP', description: 'LP1ページ作成',
      budget_min: 30000, budget_max: 50000,
    })).toBe('L1');
  });

  it('コーポ5P以上 + 5-15万 → L2', () => {
    expect(estimateProductLine({
      service_category: 'website', title: 'コーポレートサイト', description: '5ページのHP',
      budget_min: 80000, budget_max: 120000,
    })).toBe('L2');
  });

  it('LP + 広告運用 → L3', () => {
    expect(estimateProductLine({
      service_category: 'ad', title: 'LP制作 + Google広告運用', description: '...',
      budget_min: 80000, budget_max: 150000,
    })).toBe('L3');
  });

  it('修正・改修 → L4', () => {
    expect(estimateProductLine({
      service_category: 'lp', title: 'LPの一部修正', description: 'CTA を修正したい',
      budget_min: 10000, budget_max: 20000,
    })).toBe('L4');
  });
});
```

- [ ] **Step 2: テスト実行 → 失敗**

```bash
npm test -- product-line
```

- [ ] **Step 3: product-line-mapper.ts を実装**

```typescript
// src/generator/src/product-line-mapper.ts
import type { ProductLine } from '../../shared/types/index.js';

interface JobInput {
  service_category: string | null;
  title: string;
  description: string | null;
  budget_min: number | null;
  budget_max: number | null;
}

export function estimateProductLine(job: JobInput): ProductLine {
  const text = `${job.title}\n${job.description ?? ''}`.toLowerCase();
  const upperBudget = job.budget_max ?? job.budget_min ?? 0;

  // L4: 修正・改修案件
  if (
    text.includes('修正') || text.includes('改修') ||
    text.includes('リニューアル') || text.includes('既存')
  ) {
    if (upperBudget < 50000) return 'L4';
  }

  // L3: LP + 広告運用
  if (
    job.service_category === 'ad' ||
    (text.includes('lp') && (text.includes('広告') || text.includes('運用'))) ||
    text.includes('広告運用')
  ) {
    return 'L3';
  }

  // L2: コーポレート / 5ページ以上
  if (
    job.service_category === 'website' ||
    text.includes('コーポレート') || text.includes('ホームページ') ||
    text.includes('5ページ') || text.includes('複数ページ')
  ) {
    return 'L2';
  }

  // L1: LP単発（デフォルト）
  return 'L1';
}
```

- [ ] **Step 4: テスト実行 → 成功**

```bash
npm test -- product-line
```

- [ ] **Step 5: コミット**

```bash
git add src/generator/src/product-line-mapper.ts src/generator/tests/product-line-mapper.test.ts
git commit -m "feat: generator: product line estimator from category + keywords"
```

---

## Task 17: Prompt Builder

**Files:**
- Create: `src/generator/prompts/proposal.txt`
- Create: `src/generator/src/prompt-builder.ts`

- [ ] **Step 1: 提案文プロンプトテンプレを作成**

`src/generator/prompts/proposal.txt`:

```
あなたは BSA 戦略のもとで Lancers / CrowdWorks / Coconala で
LP・HP 制作の提案文を書く工藤陸（本名）です。

【ルール - 厳守】
- 名義は「工藤陸」のみ。匿名や別名は使わない
- 外部に出る表記は「AI活用」のみ。「Claude」「Anthropic」「Opus」等の固有名詞は一切書かない
- SLA: 納期超過時は料金20%返金 または 翌日以内に無料修正
- 料金は税込
- 「初心者ですが」「頑張ります」「精一杯」「ご縁があれば」は使わない（信頼失墜・抽象表現）
- CPA84%削減等の「数字を含む実績」を必ず1つ盛る
- 「72時間以内」「SLA保証」など具体的な納期コミットを明示

【商品ライン基準】
- L1: Rapid Single LP / 30,000円基準 / 72時間
- L2: Rapid Corporate 5P / 80,000円基準 / 7日
- L3: Rapid LP + 広告運用初月 / 100,000円基準 / 96時間
- L4: Express 修正・改修 / 10,000-30,000円基準 / 24時間
※ 上記は基準。案件規模に応じてカスタマイズ可

【提案文の構造】
1. 冒頭挨拶 + 案件固有の一文（差別化）
2. 要件の理解を1-2文で示す
3. アプローチ3点
4. 納期・料金・保証
5. 実績ハイライト（案件ドメインに近いもの）
6. クロージング（質問 or ミーティング提案）

【今回の案件情報】
{JOB_INFO}

【リサーチ結果】
{RESEARCH_NOTES}

【出力】
以下の JSON 形式で返答してください:
- body_md: 提案文 Markdown（上記6構造に従う）
- product_line: "L1" / "L2" / "L3" / "L4"
- price: 整数（円）
- delivery_days: 整数（日）
- research_notes: リサーチ結果のサマリ Markdown（後で参照用）
```

- [ ] **Step 2: prompt-builder.ts を実装**

```typescript
// src/generator/src/prompt-builder.ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

let cachedTemplate: string | null = null;

function loadTemplate(): string {
  if (cachedTemplate) return cachedTemplate;
  const path = join(__dirname, '..', 'prompts', 'proposal.txt');
  cachedTemplate = readFileSync(path, 'utf8');
  return cachedTemplate;
}

interface JobInfo {
  job_id: string;
  title: string;
  description: string | null;
  budget_text?: string | null;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  client_name: string | null;
  service_category: string | null;
}

export function buildProposalPrompt(
  job: JobInfo,
  estimatedLine: string,
  researchNotes: string
): string {
  const template = loadTemplate();
  const jobInfo = [
    `案件ID: ${job.job_id}`,
    `タイトル: ${job.title}`,
    `カテゴリ: ${job.service_category ?? '不明'}`,
    `予算: ${job.budget_text ?? `${job.budget_min ?? '?'} 〜 ${job.budget_max ?? '?'}円`}`,
    `締切: ${job.deadline ?? '不明'}`,
    `発注者: ${job.client_name ?? '不明'}`,
    `推奨ライン: ${estimatedLine}`,
    ``,
    `案件本文:`,
    job.description ?? '(本文なし)',
  ].join('\n');

  return template
    .replace('{JOB_INFO}', jobInfo)
    .replace('{RESEARCH_NOTES}', researchNotes || '(リサーチなし)');
}
```

- [ ] **Step 3: 動作確認（インライン）**

```bash
cd src/generator
npx tsx -e "
import { buildProposalPrompt } from './src/prompt-builder.js';
const p = buildProposalPrompt({
  job_id: 'LAN-20260428-001',
  title: '整体院LP',
  description: 'LPを作って欲しい',
  budget_text: '10-20万円',
  budget_min: 100000,
  budget_max: 200000,
  deadline: '2026-05-05',
  client_name: '山田',
  service_category: 'lp',
}, 'L1', 'リサーチ結果なし');
console.log(p);
"
```

Expected: テンプレに案件情報が埋め込まれた完全なプロンプトが出力される

- [ ] **Step 4: コミット**

```bash
git add src/generator/src/prompt-builder.ts src/generator/prompts/proposal.txt
git commit -m "feat: generator: prompt builder with BSA rules and structure"
```

---

## Task 18: Researcher (WebFetch + Exa MCP via Claude)

**Files:**
- Create: `src/generator/config/exa-mcp.json`
- Create: `src/generator/src/researcher.ts`

- [ ] **Step 1: Exa MCP 設定ファイルを作成**

`src/generator/config/exa-mcp.json`:
```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": ["-y", "exa-mcp-server"],
      "env": {
        "EXA_API_KEY": "${EXA_API_KEY}"
      }
    }
  }
}
```

> 注: 既存 Exa MCP がプラグインで導入済の場合は、そちらを使う設定に書き換える可能性あり。実際のフォーマットは `~/.claude/.../exa` 設定を確認。

- [ ] **Step 2: researcher.ts を実装**

```typescript
// src/generator/src/researcher.ts
import { callClaudeHeadless } from './claude-headless.js';
import type Database from 'better-sqlite3';
import { logExaUsage, getExaMonthlyUsage } from './db.js';

const EXA_MONTHLY_LIMIT = 1000;
const EXA_WARNING_THRESHOLD = 800;

export class ExaQuotaExceededError extends Error {}

interface JobForResearch {
  title: string;
  description: string | null;
  client_name: string | null;
}

export async function researchJob(
  db: Database.Database,
  job: JobForResearch
): Promise<string> {
  // Exa 使用量チェック
  const usage = getExaMonthlyUsage(db);
  if (usage >= EXA_MONTHLY_LIMIT) {
    throw new ExaQuotaExceededError(
      `Exa MCP 月間上限 (${EXA_MONTHLY_LIMIT}) に到達。処理を停止します。`
    );
  }
  if (usage >= EXA_WARNING_THRESHOLD) {
    console.warn(`⚠️ Exa MCP 使用量が ${usage}/${EXA_MONTHLY_LIMIT} に達しています`);
  }

  const prompt = `
あなたは BSA 受注のためのリサーチを行います。
以下の案件について、3 検索（最大）で発注者の業界・競合 LP・トレンドを調べ、
提案文に活かせる要点を Markdown でまとめてください。

【案件情報】
タイトル: ${job.title}
発注者: ${job.client_name ?? '不明'}
本文: ${job.description ?? '(本文なし)'}

【ルール】
- WebFetch を優先して使う（無料）
- Exa は本当に必要な時だけ。3検索を超えない
- 結果は Markdown 200-400字で、提案文に直接使える形に整える

【出力】
リサーチ結果サマリの Markdown 文字列のみ。
`;

  try {
    const result = await callClaudeHeadless<string>({
      prompt,
      bare: true,
      mcpConfig: 'config/exa-mcp.json',
      allowedTools: ['WebFetch', 'mcp__exa__web_search_exa'],
      effort: 'low',
      fallbackModel: 'sonnet',
      timeoutMs: 120_000,
    });

    // Exa 利用ログ（プロンプト本文を簡略化して記録）
    logExaUsage(db, `research:${job.title.slice(0, 50)}`, 1);

    return typeof result === 'string' ? result : JSON.stringify(result);
  } catch (e) {
    console.error(`Research failed for "${job.title}":`, e);
    return ''; // リサーチ失敗時は空文字列で proceed（提案文は本文のみで生成）
  }
}
```

- [ ] **Step 3: コミット**

```bash
git add src/generator/src/researcher.ts src/generator/config/
git commit -m "feat: generator: researcher with WebFetch + Exa MCP and quota guard"
```

---

## Task 19: Generator main.ts — 統合フロー

**Files:**
- Create: `src/generator/src/main.ts`

- [ ] **Step 1: main.ts を実装**

```typescript
// src/generator/src/main.ts
import { openDb, getTopJobs, upsertProposal, getPendingGenerationRequests, markGenerationRequest } from './db.js';
import { researchJob, ExaQuotaExceededError } from './researcher.js';
import { buildProposalPrompt } from './prompt-builder.js';
import { estimateProductLine } from './product-line-mapper.js';
import { customizePricing } from './pricing.js';
import { callClaudeHeadless, ClaudeHeadlessError } from './claude-headless.js';
import type { JobRow } from './db.js';

const PROPOSAL_SCHEMA = {
  type: 'object',
  properties: {
    body_md: { type: 'string' },
    product_line: { type: 'string', enum: ['L1', 'L2', 'L3', 'L4'] },
    price: { type: 'integer' },
    delivery_days: { type: 'integer' },
    research_notes: { type: 'string' },
  },
  required: ['body_md', 'product_line', 'price', 'delivery_days'],
} as const;

interface GenerationOutput {
  body_md: string;
  product_line: 'L1' | 'L2' | 'L3' | 'L4';
  price: number;
  delivery_days: number;
  research_notes?: string;
}

async function generateForJob(db: ReturnType<typeof openDb>, job: JobRow): Promise<void> {
  console.log(`📝 [${job.job_id}] ${job.title} を処理中...`);

  // 1. リサーチ
  const researchNotes = await researchJob(db, {
    title: job.title,
    description: job.description,
    client_name: job.client_name,
  });

  // 2. 商品ライン推定
  const estimated = estimateProductLine({
    service_category: job.service_category,
    title: job.title,
    description: job.description,
    budget_min: job.budget_min,
    budget_max: job.budget_max,
  });

  // 3. 金額・納期カスタマイズ
  const { price, delivery_days } = customizePricing(estimated, {
    budget_min: job.budget_min,
    budget_max: job.budget_max,
  });

  // 4. プロンプト組み立て
  const prompt = buildProposalPrompt(
    {
      job_id: job.job_id,
      title: job.title,
      description: job.description,
      budget_min: job.budget_min,
      budget_max: job.budget_max,
      deadline: job.deadline,
      client_name: job.client_name,
      service_category: job.service_category,
    },
    estimated,
    researchNotes
  );

  // 5. Claude 呼び出し
  const result = await callClaudeHeadless<GenerationOutput>({
    prompt: prompt + `\n\n推奨初期値: 商品ライン=${estimated} / 金額=${price}円 / 納期=${delivery_days}日`,
    schema: PROPOSAL_SCHEMA,
    bare: true,
    mcpConfig: 'config/exa-mcp.json',
    allowedTools: ['WebFetch'],
    effort: 'medium',
    fallbackModel: 'sonnet',
    timeoutMs: 180_000,
  });

  // 6. SQLite に保存
  upsertProposal(db, {
    job_id: job.job_id,
    product_line: result.product_line,
    price: result.price,
    delivery_days: result.delivery_days,
    body_md: result.body_md,
    research_notes: result.research_notes ?? researchNotes,
    generated_by: 'claude-code-cli',
  });

  console.log(`✅ [${job.job_id}] 完了 (${result.product_line}, ${result.price}円, ${result.delivery_days}日)`);
}

async function main(): Promise<number> {
  const db = openDb();

  try {
    // 上位10件
    const topJobs = getTopJobs(db, 10);
    console.log(`📊 上位 ${topJobs.length} 件の提案文を生成します`);

    for (const job of topJobs) {
      try {
        await generateForJob(db, job);
      } catch (e) {
        if (e instanceof ExaQuotaExceededError) {
          console.error(`❌ ${e.message}`);
          throw e;
        }
        console.error(`❌ [${job.job_id}] 失敗:`, e);
        // 個別失敗は無視して次へ
      }
    }

    // 追加生成依頼キューを処理
    const pending = getPendingGenerationRequests(db);
    if (pending.length > 0) {
      console.log(`📥 追加依頼 ${pending.length} 件を処理`);
      for (const req of pending) {
        markGenerationRequest(db, req.request_id, 'processing');
        const job = db.prepare('SELECT * FROM jobs WHERE job_id = ?').get(req.job_id) as JobRow | undefined;
        if (!job) {
          markGenerationRequest(db, req.request_id, 'failed', 'job not found');
          continue;
        }
        try {
          await generateForJob(db, job);
          markGenerationRequest(db, req.request_id, 'done');
        } catch (e: any) {
          markGenerationRequest(db, req.request_id, 'failed', e?.message ?? String(e));
        }
      }
    }

    db.prepare(
      `INSERT INTO runs (started_at, ended_at, stage, generated_count, status)
       VALUES (datetime('now'), datetime('now'), 'generate', ?, 'success')`
    ).run(topJobs.length);

    return 0;
  } catch (e: any) {
    console.error('❌ 致命的エラー:', e);
    db.prepare(
      `INSERT INTO runs (started_at, ended_at, stage, status, error_message, error_stage)
       VALUES (datetime('now'), datetime('now'), 'generate', 'error', ?, 'generate')`
    ).run(e?.message ?? String(e));
    return 1;
  } finally {
    db.close();
  }
}

main().then((code) => process.exit(code));
```

- [ ] **Step 2: 動作確認（DB に collected 案件がある状態で）**

```bash
cd src/generator
npx tsx src/main.ts
```

Expected: 上位10件の提案文が `proposals` テーブルに INSERT され、jobs.status が 'proposing' に更新される

- [ ] **Step 3: コミット**

```bash
git add src/generator/src/main.ts
git commit -m "feat: generator: integration main with research + claude headless"
```

---

# Milestone 4: Notifier

## Task 18bis (renumber): macOS Notifier (terminal-notifier)

**Files:**
- Create: `src/notifier/notify.sh`

- [ ] **Step 1: terminal-notifier をインストール**

```bash
which terminal-notifier || brew install terminal-notifier
```

- [ ] **Step 2: notify.sh を実装**

```bash
#!/bin/zsh
# src/notifier/notify.sh
# Usage: notify.sh <title> <message> [sound]
set -euo pipefail

TITLE="${1:-BSA-PA}"
MESSAGE="${2:-No message}"
SOUND="${3:-default}"

if ! command -v terminal-notifier >/dev/null; then
  echo "terminal-notifier not installed. brew install terminal-notifier" >&2
  exit 1
fi

terminal-notifier \
  -title "$TITLE" \
  -message "$MESSAGE" \
  -sound "$SOUND" \
  -group "bsa-pa" \
  -sender "com.apple.Terminal" \
  >/dev/null
```

- [ ] **Step 3: 動作確認**

```bash
chmod +x src/notifier/notify.sh
./src/notifier/notify.sh "📥 BSA テスト" "通知が表示されたら成功"
```

Expected: macOS 右上に通知が出る

- [ ] **Step 4: コミット**

```bash
git add src/notifier/notify.sh
git commit -m "feat: notifier: macOS terminal-notifier wrapper"
```

---

## Task 19bis: Gmail Notifier

**Files:**
- Create: `src/notifier/gmail.ts`
- Create: `src/notifier/package.json`

- [ ] **Step 1: notifier プロジェクト初期化**

```bash
cd src/notifier
cat > package.json << 'EOF'
{
  "name": "bsa-pa-notifier",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": { "send-summary": "tsx gmail.ts" },
  "dependencies": { "better-sqlite3": "^11.5.0" },
  "devDependencies": { "@types/better-sqlite3": "^7.6.0", "tsx": "^4.19.0" }
}
EOF
npm install
```

- [ ] **Step 2: gmail.ts を実装**

```typescript
// src/notifier/gmail.ts
import { spawn } from 'node:child_process';
import Database from 'better-sqlite3';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DB_PATH = join(homedir(), 'Library/Application Support/bsa-pa/data.db');

interface DailySummary {
  date: string;
  collected: number;
  proposals: Array<{
    job_id: string;
    title: string;
    fit_score: number;
    estimated_product_line: string | null;
    budget_text: string | null;
    detail_url: string;
  }>;
}

function buildSummary(db: Database.Database): DailySummary {
  const today = new Date().toISOString().slice(0, 10);
  const collected = (db.prepare(
    `SELECT COUNT(*) as c FROM jobs WHERE date(collected_at) = date('now', 'localtime')`
  ).get() as { c: number }).c;

  const proposals = db.prepare(
    `SELECT j.job_id, j.title, j.fit_score, j.estimated_product_line, j.budget_text, j.detail_url
     FROM jobs j JOIN proposals p ON p.job_id = j.job_id
     WHERE date(p.generated_at) = date('now', 'localtime')
     ORDER BY j.fit_score DESC LIMIT 10`
  ).all() as DailySummary['proposals'];

  return { date: today, collected, proposals };
}

function buildBody(summary: DailySummary): string {
  const lines = [
    `BSA Proposal Automation 朝の収集レポート (${summary.date})`,
    '',
    `総収集数: ${summary.collected} 件`,
    `提案文準備: ${summary.proposals.length} 件`,
    '',
    'ダッシュボード: http://localhost:3000',
    '',
    '## 提案文準備済み案件 (上位10件)',
    '',
  ];
  summary.proposals.forEach((p, i) => {
    lines.push(`### ${i + 1}. ${p.title}`);
    lines.push(`- ID: ${p.job_id}`);
    lines.push(`- fit_score: ${p.fit_score} / 推奨ライン: ${p.estimated_product_line ?? '-'}`);
    lines.push(`- 予算: ${p.budget_text ?? '-'}`);
    lines.push(`- URL: ${p.detail_url}`);
    lines.push('');
  });
  return lines.join('\n');
}

async function sendViaClaudeMcp(subject: string, body: string, to: string): Promise<void> {
  // claude -p に Gmail MCP 経由でメール送信を依頼
  const prompt = `
Gmail MCP を使って以下の内容でメールを送信してください。
to: ${to}
subject: ${subject}
body:
${body}

成功時は "ok" のみ返してください。
`;
  return new Promise((resolve, reject) => {
    const child = spawn('claude', [
      '--print',
      '--output-format', 'text',
      '--bare',
      '--allowedTools', 'mcp__gmail__send_message',
      '--effort', 'low',
      '--no-session-persistence',
    ], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`claude exited ${code}: ${stderr}`));
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

async function main() {
  const db = new Database(DB_PATH, { readonly: true });
  try {
    const summary = buildSummary(db);
    const subject = `[BSA] ${summary.date} 朝の収集レポート (${summary.proposals.length}件提案準備完了)`;
    const body = buildBody(summary);
    const to = process.env.BSA_GMAIL_TO ?? 'off.me.ton@gmail.com';
    await sendViaClaudeMcp(subject, body, to);
    console.log(`✅ Gmail 送信完了 → ${to}`);
  } finally {
    db.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: 動作確認**

```bash
cd src/notifier && BSA_GMAIL_TO=off.me.ton@gmail.com npx tsx gmail.ts
```

Expected: Gmail に送信される

- [ ] **Step 4: コミット**

```bash
git add src/notifier/gmail.ts src/notifier/package.json
git commit -m "feat: notifier: gmail summary email via claude MCP"
```

---

# Milestone 5: Dashboard (Next.js)

## Task 20: Next.js プロジェクト初期化

**Files:**
- Create: `src/dashboard/*`

- [ ] **Step 1: Next.js を作成**

```bash
cd src
npx create-next-app@latest dashboard --typescript --tailwind --app --no-src-dir --no-eslint --no-import-alias
cd dashboard
npm install better-sqlite3 ulid date-fns
npm install --save-dev @types/better-sqlite3
```

- [ ] **Step 2: localhost のみバインド設定**

`src/dashboard/package.json` の `scripts.dev` を:
```json
"dev": "next dev -p 3000 -H 127.0.0.1"
```

- [ ] **Step 3: 動作確認**

```bash
npm run dev
```

Expected: http://127.0.0.1:3000 で Next.js 初期画面が表示される

- [ ] **Step 4: コミット**

```bash
git add src/dashboard/
git commit -m "feat: dashboard: Next.js project init"
```

---

## Task 21: db.ts (better-sqlite3 接続)

**Files:**
- Create: `src/dashboard/lib/db.ts`

- [ ] **Step 1: db.ts を実装**

```typescript
// src/dashboard/lib/db.ts
import Database from 'better-sqlite3';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DB_PATH = join(homedir(), 'Library/Application Support/bsa-pa/data.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('foreign_keys = ON');
    _db.pragma('journal_mode = WAL');
  }
  return _db;
}

export interface JobWithProposal {
  job_id: string;
  title: string;
  description: string | null;
  budget_text: string | null;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  proposal_count: number | null;
  client_name: string | null;
  client_verified: number | null;
  client_history_count: number | null;
  service_category: string | null;
  fit_score: number | null;
  fit_score_breakdown: string | null;
  estimated_product_line: string | null;
  detail_url: string;
  status: string;
  // proposal fields (joined)
  proposal_id: string | null;
  product_line: string | null;
  price: number | null;
  delivery_days: number | null;
  body_md: string | null;
  research_notes: string | null;
  generated_at: string | null;
}

export function getTodaysSummary() {
  const db = getDb();
  const today = db.prepare(
    `SELECT * FROM jobs
     WHERE date(collected_at) = date('now', 'localtime')
     ORDER BY fit_score DESC NULLS LAST, collected_at DESC`
  ).all();
  return today as JobWithProposal[];
}

export function getJobWithProposal(job_id: string): JobWithProposal | null {
  const db = getDb();
  return db.prepare(
    `SELECT j.*, p.proposal_id, p.product_line, p.price, p.delivery_days,
            p.body_md, p.research_notes, p.generated_at
     FROM jobs j
     LEFT JOIN proposals p ON p.job_id = j.job_id
     WHERE j.job_id = ?`
  ).get(job_id) as JobWithProposal | null;
}

export function updateProposal(
  job_id: string,
  body_md: string,
  product_line: string,
  price: number,
  delivery_days: number,
  changed_by: 'human' | 'claude' = 'human'
) {
  const db = getDb();
  const proposal = db.prepare('SELECT * FROM proposals WHERE job_id = ?').get(job_id) as
    { proposal_id: string; body_md: string; product_line: string; price: number; delivery_days: number } | undefined;
  if (!proposal) throw new Error(`No proposal for ${job_id}`);

  // 履歴に旧版を保存
  db.prepare(
    `INSERT INTO proposal_revisions (proposal_id, body_md, product_line, price, delivery_days, changed_by, note)
     VALUES (?, ?, ?, ?, ?, ?, 'manual edit')`
  ).run(proposal.proposal_id, proposal.body_md, proposal.product_line, proposal.price, proposal.delivery_days, changed_by);

  // 最新版更新
  db.prepare(
    `UPDATE proposals SET
       body_md = ?, product_line = ?, price = ?, delivery_days = ?,
       edited_at = datetime('now')
     WHERE proposal_id = ?`
  ).run(body_md, product_line, price, delivery_days, proposal.proposal_id);
}

export function updateJobStatus(job_id: string, to_status: string, note?: string) {
  const db = getDb();
  const job = db.prepare('SELECT status FROM jobs WHERE job_id = ?').get(job_id) as { status: string } | undefined;
  if (!job) throw new Error(`No job ${job_id}`);
  const from_status = job.status;
  db.prepare(`UPDATE jobs SET status = ?, updated_at = datetime('now') WHERE job_id = ?`).run(to_status, job_id);
  db.prepare(
    `INSERT INTO status_history (job_id, from_status, to_status, changed_by, note) VALUES (?, ?, ?, 'human', ?)`
  ).run(job_id, from_status, to_status, note ?? null);
  if (to_status === 'submitted') {
    db.prepare(`UPDATE proposals SET submitted_at = datetime('now') WHERE job_id = ?`).run(job_id);
  }
}

export function createGenerationRequest(job_id: string, prompt_hint: string | null) {
  const db = getDb();
  db.prepare(
    `INSERT INTO generation_requests (job_id, prompt_hint, status) VALUES (?, ?, 'pending')`
  ).run(job_id, prompt_hint);
}

export function getRevisions(proposal_id: string) {
  const db = getDb();
  return db.prepare(
    `SELECT * FROM proposal_revisions WHERE proposal_id = ? ORDER BY changed_at DESC LIMIT 20`
  ).all(proposal_id);
}

export function getKpiStats() {
  const db = getDb();
  const submitted = (db.prepare(
    `SELECT COUNT(*) as c FROM jobs WHERE status IN ('submitted','replied','won','lost') AND collected_at >= datetime('now', '-30 days')`
  ).get() as { c: number }).c;
  const replied = (db.prepare(
    `SELECT COUNT(*) as c FROM jobs WHERE status IN ('replied','won','lost') AND collected_at >= datetime('now', '-30 days')`
  ).get() as { c: number }).c;
  const won = (db.prepare(
    `SELECT COUNT(*) as c FROM jobs WHERE status = 'won' AND collected_at >= datetime('now', '-30 days')`
  ).get() as { c: number }).c;
  return { submitted, replied, won, conversionRate: submitted > 0 ? won / submitted : 0 };
}
```

- [ ] **Step 2: コミット**

```bash
git add src/dashboard/lib/db.ts
git commit -m "feat: dashboard: SQLite db wrapper with proposal CRUD"
```

---

## Task 22: API Routes

**Files:**
- Create: `src/dashboard/app/api/jobs/route.ts`
- Create: `src/dashboard/app/api/proposals/[jobId]/route.ts`
- Create: `src/dashboard/app/api/jobs/[jobId]/status/route.ts`
- Create: `src/dashboard/app/api/generation-requests/route.ts`

- [ ] **Step 1: GET /api/jobs**

```typescript
// src/dashboard/app/api/jobs/route.ts
import { NextResponse } from 'next/server';
import { getTodaysSummary } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const jobs = getTodaysSummary();
  return NextResponse.json({ jobs });
}
```

- [ ] **Step 2: GET / PATCH /api/proposals/[jobId]**

```typescript
// src/dashboard/app/api/proposals/[jobId]/route.ts
import { NextResponse } from 'next/server';
import { getJobWithProposal, updateProposal } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await ctx.params;
  const data = getJobWithProposal(jobId);
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await ctx.params;
  const body = await req.json();
  updateProposal(jobId, body.body_md, body.product_line, body.price, body.delivery_days);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: PATCH /api/jobs/[jobId]/status**

```typescript
// src/dashboard/app/api/jobs/[jobId]/status/route.ts
import { NextResponse } from 'next/server';
import { updateJobStatus } from '@/lib/db';

export const runtime = 'nodejs';

export async function PATCH(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await ctx.params;
  const body = await req.json();
  updateJobStatus(jobId, body.status, body.note);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: POST /api/generation-requests**

```typescript
// src/dashboard/app/api/generation-requests/route.ts
import { NextResponse } from 'next/server';
import { createGenerationRequest } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.json();
  createGenerationRequest(body.job_id, body.prompt_hint ?? null);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: 動作確認**

```bash
curl http://127.0.0.1:3000/api/jobs
```

Expected: 当日の jobs 配列が返る

- [ ] **Step 6: コミット**

```bash
git add src/dashboard/app/api/
git commit -m "feat: dashboard: API routes for jobs / proposals / status / regenerate"
```

---

## Task 23: トップ画面 / (当日サマリ)

**Files:**
- Create: `src/dashboard/app/page.tsx`
- Create: `src/dashboard/components/JobCard.tsx`

- [ ] **Step 1: page.tsx を実装**

```tsx
// src/dashboard/app/page.tsx
import { getTodaysSummary } from '@/lib/db';
import { JobCard } from '@/components/JobCard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const jobs = getTodaysSummary();
  const withProposal = jobs.filter((j) => j.proposal_id != null);
  const withoutProposal = jobs.filter((j) => j.proposal_id == null);
  const today = new Date().toISOString().slice(0, 10);

  const buckets = {
    high: withProposal.filter((j) => (j.fit_score ?? 0) >= 80),
    mid: withProposal.filter((j) => (j.fit_score ?? 0) >= 60 && (j.fit_score ?? 0) < 80),
    low: withProposal.filter((j) => (j.fit_score ?? 0) < 60),
  };

  return (
    <main className="container mx-auto px-4 py-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">BSA Proposal Automation</h1>
        <p className="text-sm text-gray-500">{today}</p>
      </header>

      <section className="mb-8 rounded-lg border bg-white p-4">
        <div className="flex gap-6 text-sm">
          <div><span className="font-semibold">{jobs.length}</span> 件収集</div>
          <div><span className="font-semibold">{withProposal.length}</span> 件提案準備済み</div>
          <div className="text-orange-600">🔥 最優先 <span className="font-semibold">{buckets.high.length}</span> 件</div>
          <div className="text-blue-600">🎯 推奨 <span className="font-semibold">{buckets.mid.length}</span> 件</div>
          <div className="text-gray-600">📋 余裕 <span className="font-semibold">{buckets.low.length}</span> 件</div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold">提案文準備済み (上位{withProposal.length}件)</h2>
        <div className="space-y-3">
          {withProposal.map((j) => (
            <JobCard key={j.job_id} job={j} kind="proposal" />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">その他の案件 ({withoutProposal.length}件・未生成)</h2>
        <div className="space-y-2">
          {withoutProposal.map((j) => (
            <JobCard key={j.job_id} job={j} kind="candidate" />
          ))}
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: JobCard.tsx を実装**

```tsx
// src/dashboard/components/JobCard.tsx
'use client';
import Link from 'next/link';
import { useState } from 'react';
import type { JobWithProposal } from '@/lib/db';

export function JobCard({ job, kind }: { job: JobWithProposal; kind: 'proposal' | 'candidate' }) {
  const [copied, setCopied] = useState(false);
  const fitClass =
    (job.fit_score ?? 0) >= 80 ? 'text-orange-600' :
    (job.fit_score ?? 0) >= 60 ? 'text-blue-600' : 'text-gray-600';

  async function copyId() {
    await navigator.clipboard.writeText(job.job_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function copyRegenerationPrompt() {
    const prompt = `BSA-PA: 案件 ${job.job_id} の提案文を生成してください。\n\n案件タイトル: ${job.title}\n\n（必要があれば指示を追記）`;
    await navigator.clipboard.writeText(prompt);
    fetch('/api/generation-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: job.job_id }),
    });
    alert('プロンプトをクリップボードにコピー & キューに追加しました。Claude Code に貼って依頼してください。');
  }

  async function copyProposal() {
    if (!job.body_md) return;
    await navigator.clipboard.writeText(job.body_md);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function markSubmitted() {
    if (!confirm('「入力済み」にしますか？')) return;
    await fetch(`/api/jobs/${job.job_id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'submitted' }),
    });
    location.reload();
  }

  if (kind === 'candidate') {
    return (
      <div className="rounded-lg border bg-gray-50 p-3 text-sm">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-gray-500">{job.job_id}</span>
          <span className={fitClass}>fit: {job.fit_score ?? '-'}</span>
          <span className="ml-auto"></span>
          <a href={job.detail_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">案件URL ↗</a>
          <button onClick={copyRegenerationPrompt} className="rounded bg-blue-50 px-2 py-1 text-xs hover:bg-blue-100">➕ 提案文生成を依頼</button>
          <button onClick={copyId} className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200">{copied ? '✓' : '📋 ID'}</button>
        </div>
        <div className="mt-1 truncate">{job.title}</div>
        <div className="mt-1 text-xs text-gray-500">予算: {job.budget_text ?? '-'}</div>
      </div>
    );
  }

  // proposal kind
  const submitted = job.status === 'submitted' || job.status === 'replied' || job.status === 'won' || job.status === 'lost';
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-3 text-xs">
        <span className="font-mono text-gray-500">{job.job_id}</span>
        <span className={`${fitClass} font-semibold`}>fit: {job.fit_score ?? '-'}</span>
        <span className="rounded bg-gray-100 px-2 py-0.5">{job.estimated_product_line ?? '-'}</span>
        {submitted ? (
          <span className="rounded bg-green-100 px-2 py-0.5 text-green-700">{job.status}</span>
        ) : (
          <span className="rounded bg-orange-100 px-2 py-0.5 text-orange-700">🆕 未送信</span>
        )}
      </div>
      <h3 className="mb-1 font-semibold">{job.title}</h3>
      <div className="mb-3 text-sm text-gray-600">
        予算: {job.budget_text ?? '-'} / 提案: {job.product_line} {job.price?.toLocaleString()}円 / {job.delivery_days}日
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <Link href={`/proposals/${job.job_id}`} className="rounded bg-blue-100 px-3 py-1 hover:bg-blue-200">📝 提案文を見る・編集</Link>
        <a href={job.detail_url} target="_blank" rel="noreferrer" className="rounded bg-gray-100 px-3 py-1 hover:bg-gray-200">🔗 案件URL</a>
        <button onClick={copyProposal} className="rounded bg-gray-100 px-3 py-1 hover:bg-gray-200">📋 提案文コピー</button>
        <button onClick={copyId} className="rounded bg-gray-100 px-3 py-1 hover:bg-gray-200">{copied ? '✓' : '📋 ID'}</button>
        {!submitted && (
          <button onClick={markSubmitted} className="rounded bg-green-100 px-3 py-1 text-green-700 hover:bg-green-200">✅ 入力済みにする</button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 動作確認**

```bash
npm run dev
# http://127.0.0.1:3000 を開く
```

Expected: 当日の案件カードが2セクションで表示される

- [ ] **Step 4: コミット**

```bash
git add src/dashboard/app/page.tsx src/dashboard/components/JobCard.tsx
git commit -m "feat: dashboard: home page with JobCard"
```

---

## Task 24: 提案文編集画面 /proposals/[jobId]

**Files:**
- Create: `src/dashboard/app/proposals/[jobId]/page.tsx`
- Create: `src/dashboard/components/ProposalEditor.tsx`

- [ ] **Step 1: page.tsx を実装**

```tsx
// src/dashboard/app/proposals/[jobId]/page.tsx
import { notFound } from 'next/navigation';
import { getJobWithProposal } from '@/lib/db';
import { ProposalEditor } from '@/components/ProposalEditor';

export const dynamic = 'force-dynamic';

export default async function ProposalEditPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const data = getJobWithProposal(jobId);
  if (!data) notFound();
  if (!data.proposal_id) {
    return (
      <main className="container mx-auto p-6">
        <h1 className="text-xl font-bold">提案文未生成</h1>
        <p className="mt-2 text-sm text-gray-600">この案件の提案文はまだ生成されていません。</p>
        <a href="/" className="mt-4 inline-block text-blue-600 underline">← トップに戻る</a>
      </main>
    );
  }
  return <ProposalEditor data={data} />;
}
```

- [ ] **Step 2: ProposalEditor.tsx を実装**

```tsx
// src/dashboard/components/ProposalEditor.tsx
'use client';
import { useState } from 'react';
import type { JobWithProposal } from '@/lib/db';

export function ProposalEditor({ data }: { data: JobWithProposal }) {
  const [bodyMd, setBodyMd] = useState(data.body_md ?? '');
  const [productLine, setProductLine] = useState(data.product_line ?? 'L1');
  const [price, setPrice] = useState(data.price ?? 30000);
  const [days, setDays] = useState(data.delivery_days ?? 3);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/proposals/${data.job_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body_md: bodyMd, product_line: productLine, price, delivery_days: days }),
      });
      setSavedAt(new Date().toLocaleTimeString());
    } finally {
      setSaving(false);
    }
  }

  async function copyForChromeFill() {
    const prompt = `Lancers の応募ページ ( ${data.detail_url} ) を開き、以下の内容でフォームに入力してください。送信ボタンは押さないでください。\n\n金額: ${price.toLocaleString()} 円\n納期: ${days} 日\n\n提案文:\n\n${bodyMd}`;
    await navigator.clipboard.writeText(prompt);
    alert('Claude in Chrome 用プロンプトをコピーしました。Chrome で Claude 拡張に貼り付けてください。');
  }

  async function copyRegenerationPrompt() {
    const hint = prompt('修正の指示を入力してください（例: もっとカジュアルに）') ?? '';
    const text = `BSA-PA: 案件 ${data.job_id} の提案文を生成し直してください。\n\n指示: ${hint}\n\n（提案文は SQLite proposals テーブル job_id=${data.job_id} を upsert で更新）`;
    await navigator.clipboard.writeText(text);
    await fetch('/api/generation-requests', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: data.job_id, prompt_hint: hint }),
    });
    alert('Claude Code 用プロンプトをコピー & キューに追加しました。');
  }

  const breakdown = data.fit_score_breakdown ? JSON.parse(data.fit_score_breakdown) : null;

  return (
    <main className="container mx-auto grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
      <section>
        <a href="/" className="text-sm text-blue-600">← 戻る</a>
        <h1 className="mt-2 text-xl font-bold">{data.title}</h1>
        <div className="mt-1 font-mono text-xs text-gray-500">{data.job_id}</div>

        <div className="mt-4 rounded-lg border bg-white p-4 text-sm">
          <h2 className="mb-2 font-semibold">案件情報</h2>
          <dl className="grid grid-cols-2 gap-y-1">
            <dt className="text-gray-500">予算</dt><dd>{data.budget_text ?? '-'}</dd>
            <dt className="text-gray-500">締切</dt><dd>{data.deadline ?? '-'}</dd>
            <dt className="text-gray-500">提案数</dt><dd>{data.proposal_count ?? '-'}</dd>
            <dt className="text-gray-500">発注者</dt><dd>{data.client_name ?? '-'}</dd>
            <dt className="text-gray-500">本人確認</dt><dd>{data.client_verified ? '✅' : '❌'}</dd>
            <dt className="text-gray-500">実績</dt><dd>{data.client_history_count ?? '-'} 件</dd>
            <dt className="text-gray-500">fit_score</dt><dd className="font-semibold">{data.fit_score}</dd>
          </dl>
          {breakdown && (
            <div className="mt-3 text-xs text-gray-600">
              内訳: 価格 {breakdown.price} / サービス {breakdown.service} / 制約 {breakdown.constraint} / 速度 {breakdown.speed} / クライアント {breakdown.client}
            </div>
          )}
        </div>

        <div className="mt-4 rounded-lg border bg-white p-4 text-sm">
          <h2 className="mb-2 font-semibold">案件本文</h2>
          <div className="whitespace-pre-wrap text-gray-700">{data.description}</div>
        </div>

        {data.research_notes && (
          <div className="mt-4 rounded-lg border bg-white p-4 text-sm">
            <h2 className="mb-2 font-semibold">リサーチノート</h2>
            <div className="whitespace-pre-wrap text-gray-700">{data.research_notes}</div>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 font-semibold">提案内容</h2>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <label>商品ライン
              <select value={productLine} onChange={(e) => setProductLine(e.target.value)} className="mt-1 w-full rounded border px-2 py-1">
                <option value="L1">L1</option><option value="L2">L2</option><option value="L3">L3</option><option value="L4">L4</option>
              </select>
            </label>
            <label>金額(円)
              <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="mt-1 w-full rounded border px-2 py-1" />
            </label>
            <label>納期(日)
              <input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} className="mt-1 w-full rounded border px-2 py-1" />
            </label>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 font-semibold">提案文 (Markdown)</h2>
          <textarea
            value={bodyMd}
            onChange={(e) => setBodyMd(e.target.value)}
            className="h-96 w-full rounded border p-3 font-mono text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={save} disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? '保存中...' : '💾 保存'}
          </button>
          <button onClick={copyRegenerationPrompt} className="rounded border px-4 py-2 hover:bg-gray-50">🤖 Claude に再生成依頼</button>
          <button onClick={copyForChromeFill} className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700">📥 Claude in Chrome でフォーム入力</button>
          {savedAt && <span className="ml-auto self-center text-xs text-gray-500">保存済 {savedAt}</span>}
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: 動作確認**

提案文がある案件の `/proposals/<job_id>` に遷移して、編集して保存できる、Claude in Chrome 用プロンプトコピーが動く

- [ ] **Step 4: コミット**

```bash
git add src/dashboard/app/proposals/ src/dashboard/components/ProposalEditor.tsx
git commit -m "feat: dashboard: proposal editor with chrome fill prompt"
```

---

## Task 25: 履歴画面 /history

**Files:**
- Create: `src/dashboard/app/history/page.tsx`

- [ ] **Step 1: page.tsx を実装**

```tsx
// src/dashboard/app/history/page.tsx
import { getDb, getKpiStats } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function History() {
  const db = getDb();
  const jobs = db.prepare(
    `SELECT j.job_id, j.title, j.status, j.fit_score, j.budget_text, j.collected_at,
            p.submitted_at, p.product_line, p.price
     FROM jobs j LEFT JOIN proposals p ON p.job_id = j.job_id
     ORDER BY j.collected_at DESC LIMIT 200`
  ).all() as any[];
  const kpi = getKpiStats();

  const statusLabel: Record<string, string> = {
    collected: '🔵 収集済', proposing: '🟡 準備中',
    submitted: '✅ 投下済', replied: '💬 返信中',
    won: '🏆 受注', lost: '❌ 失注',
  };

  return (
    <main className="container mx-auto p-6">
      <a href="/" className="text-sm text-blue-600">← 戻る</a>
      <h1 className="mt-2 text-xl font-bold">履歴・受注管理</h1>

      <section className="my-6 rounded-lg border bg-white p-4">
        <h2 className="font-semibold">📊 受注率（過去30日）</h2>
        <div className="mt-2 grid grid-cols-4 gap-3 text-sm">
          <div>提案投下: <span className="text-lg font-bold">{kpi.submitted}</span></div>
          <div>返信あり: <span className="text-lg font-bold">{kpi.replied}</span></div>
          <div>受注: <span className="text-lg font-bold">{kpi.won}</span></div>
          <div className={kpi.conversionRate >= 0.01 ? 'text-green-600' : 'text-gray-600'}>
            受注率: <span className="text-lg font-bold">{(kpi.conversionRate * 100).toFixed(1)}%</span>
            {kpi.conversionRate >= 0.01 ? ' 🎯 KPI達成' : ' (KPI 1%目標)'}
          </div>
        </div>
      </section>

      <section className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr><th className="p-2 text-left">ID</th><th className="p-2 text-left">タイトル</th>
                <th className="p-2 text-left">予算</th><th className="p-2 text-left">fit</th>
                <th className="p-2 text-left">商品ライン</th><th className="p-2 text-left">投下</th>
                <th className="p-2 text-left">ステータス</th></tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.job_id} className="border-t hover:bg-gray-50">
                <td className="p-2 font-mono text-xs"><a href={`/proposals/${j.job_id}`} className="text-blue-600 hover:underline">{j.job_id}</a></td>
                <td className="p-2 max-w-xs truncate">{j.title}</td>
                <td className="p-2">{j.budget_text ?? '-'}</td>
                <td className="p-2">{j.fit_score ?? '-'}</td>
                <td className="p-2">{j.product_line ?? '-'}</td>
                <td className="p-2">{j.submitted_at ? '✅' : '-'}</td>
                <td className="p-2">{statusLabel[j.status] ?? j.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: コミット**

```bash
git add src/dashboard/app/history/
git commit -m "feat: dashboard: history page with KPI summary"
```

---

## Task 26: 設定画面 /settings

**Files:**
- Create: `src/dashboard/app/settings/page.tsx`

- [ ] **Step 1: page.tsx を実装**

```tsx
// src/dashboard/app/settings/page.tsx
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function Settings() {
  const db = getDb();
  const session = db.prepare("SELECT * FROM sessions WHERE platform_prefix = 'LAN'").get() as any;
  const exaCount = (db.prepare(
    `SELECT COUNT(*) as c FROM exa_usage WHERE called_at >= datetime('now', 'start of month')`
  ).get() as any).c;
  const platforms = db.prepare("SELECT * FROM platforms").all() as any[];

  return (
    <main className="container mx-auto max-w-3xl p-6">
      <a href="/" className="text-sm text-blue-600">← 戻る</a>
      <h1 className="mt-2 text-xl font-bold">設定</h1>

      <section className="my-6 rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold">Lancers 接続</h2>
        <dl className="space-y-1 text-sm">
          <div>状態: {session?.valid ? '✅ 有効' : '❌ 無効'}</div>
          <div>最終ログイン: {session?.logged_in_at ?? '-'}</div>
          <div>最終検証: {session?.last_validated_at ?? '-'}</div>
        </dl>
        <p className="mt-3 text-xs text-gray-500">
          再ログインが必要な場合は、ターミナルで <code className="rounded bg-gray-100 px-1">scripts/relogin.sh</code> を実行してください。
        </p>
      </section>

      <section className="my-6 rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold">媒体</h2>
        {platforms.map((p) => (
          <div key={p.prefix} className="mb-2">
            <span className="font-mono">{p.prefix}</span> — {p.name} ({p.enabled ? '有効' : '無効'})
            <ul className="ml-6 list-disc text-xs text-gray-600">
              {JSON.parse(p.search_urls).map((u: string) => <li key={u}>{u}</li>)}
            </ul>
          </div>
        ))}
      </section>

      <section className="my-6 rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold">Exa API 利用状況（今月）</h2>
        <div className="text-sm">{exaCount} / 1000 検索</div>
        <div className="mt-1 h-2 rounded bg-gray-200">
          <div className={`h-2 rounded ${exaCount >= 800 ? 'bg-orange-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, (exaCount / 1000) * 100)}%` }} />
        </div>
        {exaCount >= 800 && <p className="mt-2 text-xs text-orange-600">⚠️ 80% に到達しています</p>}
      </section>

      <section className="my-6 rounded-lg border bg-gray-50 p-4 text-sm text-gray-600">
        <h2 className="font-semibold">fit_score 配点調整</h2>
        <p className="mt-1">🔒 Phase 2 で実装予定</p>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: コミット**

```bash
git add src/dashboard/app/settings/
git commit -m "feat: dashboard: settings page with cookie / exa / platforms info"
```

---

# Milestone 6: Scripts & Integration

## Task 27: lib/env.sh — PATH 整備の共通化

**Files:**
- Create: `scripts/lib/env.sh`

- [ ] **Step 1: env.sh を実装**

```bash
# scripts/lib/env.sh
# 全スクリプトの先頭で source して使う
export BSA_PA_BASE="$(cd "$(dirname "${(%):-%x}")/.." && pwd)"
export BSA_PA_APPDATA="$HOME/Library/Application Support/bsa-pa"
export BSA_PA_DB="$BSA_PA_APPDATA/data.db"

# Claude Code CLI
if [ -x "$HOME/.local/bin/claude" ] && [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
  export PATH="$HOME/.local/bin:$PATH"
fi

# Node (nvm)
if [ -x "$HOME/.nvm/versions/node/v24.14.1/bin/node" ] && [[ ":$PATH:" != *":$HOME/.nvm/versions/node/v24.14.1/bin:"* ]]; then
  export PATH="$HOME/.nvm/versions/node/v24.14.1/bin:$PATH"
fi

# Python venv
export BSA_PA_VENV="$HOME/.venvs/bsa-pa"
```

- [ ] **Step 2: コミット**

```bash
git add scripts/lib/env.sh
git commit -m "feat: scripts: env helper for PATH and dirs"
```

---

## Task 28: setup.sh — 初回セットアップ

**Files:**
- Create: `scripts/setup.sh`

- [ ] **Step 1: setup.sh を実装**

```bash
#!/bin/zsh
# scripts/setup.sh - 初回セットアップ
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib/env.sh"

echo "🔧 BSA Proposal Automation - Setup"
echo ""

# 1. データディレクトリ
mkdir -p "$BSA_PA_APPDATA"
chmod 700 "$BSA_PA_APPDATA"
echo "✅ data dir: $BSA_PA_APPDATA"

# 2. DB 初期化
"$SCRIPT_DIR/init-db.sh"

# 3. Python venv
if [ ! -d "$BSA_PA_VENV" ]; then
  python3 -m venv "$BSA_PA_VENV"
  source "$BSA_PA_VENV/bin/activate"
  pip install --upgrade pip
  cd "$BSA_PA_BASE/src/collector"
  pip install -e ".[dev]"
  python -m playwright install chromium
  echo "✅ Python venv: $BSA_PA_VENV"
fi

# 4. Node deps
cd "$BSA_PA_BASE/src/generator" && npm install
cd "$BSA_PA_BASE/src/dashboard" && npm install
cd "$BSA_PA_BASE/src/notifier" && npm install
echo "✅ Node deps installed"

# 5. terminal-notifier
if ! command -v terminal-notifier >/dev/null; then
  brew install terminal-notifier
fi
echo "✅ terminal-notifier"

# 6. Lancers 初回ログイン
echo ""
echo "📣 Lancers に手動でログインします。Playwright がブラウザを開きます。"
echo "   ログイン後（2FA も完了してから）、ターミナルで Enter を押してください。"
read -p "Press Enter to start..."

source "$BSA_PA_VENV/bin/activate"
cd "$BSA_PA_BASE/src/collector"
python -c "
import asyncio
from playwright.async_api import async_playwright
from src.collector.session import CookieManager
from src.collector.stealth import create_stealth_context
from src.collector.db import get_connection, update_session

async def main():
    async with async_playwright() as p:
        ctx, browser = await create_stealth_context(p)
        page = await ctx.new_page()
        await page.goto('https://www.lancers.jp/user/login')
        print('ログインを完了したら Enter を押してください')
        input()
        await page.goto('https://www.lancers.jp/mypage')
        cookie_path = CookieManager.default_path('LAN')
        state = await ctx.storage_state()
        CookieManager(cookie_path).save(state)
        conn = get_connection()
        update_session(conn, 'LAN', str(cookie_path), valid=True)
        conn.commit()
        conn.close()
        print(f'✅ Cookie saved to {cookie_path}')
        await browser.close()

asyncio.run(main())
"

# 7. デスクトップアイコン
ln -sf "$BSA_PA_BASE/scripts/run.command" "$HOME/Desktop/📥 BSA 案件収集.command"
chmod +x "$BSA_PA_BASE/scripts/run.command"
echo "✅ デスクトップに「📥 BSA 案件収集.command」を配置"

echo ""
echo "🎉 セットアップ完了！"
echo "デスクトップの「📥 BSA 案件収集」をダブルクリックして実行してください。"
```

- [ ] **Step 2: コミット**

```bash
chmod +x scripts/setup.sh
git add scripts/setup.sh
git commit -m "feat: scripts: setup with venv + npm + login + desktop icon"
```

---

## Task 29: relogin.sh

**Files:**
- Create: `scripts/relogin.sh`

- [ ] **Step 1: relogin.sh を実装**

```bash
#!/bin/zsh
# scripts/relogin.sh - クッキー切れ時の再ログイン
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib/env.sh"
source "$BSA_PA_VENV/bin/activate"

echo "🔑 Lancers 再ログイン"
cd "$BSA_PA_BASE/src/collector"
python -c "
import asyncio
from playwright.async_api import async_playwright
from src.collector.session import CookieManager
from src.collector.stealth import create_stealth_context
from src.collector.db import get_connection, update_session

async def main():
    async with async_playwright() as p:
        existing = CookieManager(CookieManager.default_path('LAN')).load()
        ctx, browser = await create_stealth_context(p, storage_state=existing)
        page = await ctx.new_page()
        await page.goto('https://www.lancers.jp/user/login')
        print('再ログインしてください（2FA 含む）。完了後 Enter')
        input()
        await page.goto('https://www.lancers.jp/mypage')
        state = await ctx.storage_state()
        CookieManager(CookieManager.default_path('LAN')).save(state)
        conn = get_connection()
        update_session(conn, 'LAN', str(CookieManager.default_path('LAN')), valid=True)
        conn.commit()
        conn.close()
        print('✅ Cookie 更新完了')
        await browser.close()

asyncio.run(main())
"
```

- [ ] **Step 2: コミット**

```bash
chmod +x scripts/relogin.sh
git add scripts/relogin.sh
git commit -m "feat: scripts: relogin script for expired cookies"
```

---

## Task 30: run.command — メインエントリポイント

**Files:**
- Create: `scripts/run.command`

- [ ] **Step 1: run.command を実装**

```bash
#!/bin/zsh
# scripts/run.command - デスクトップから呼ばれるメインスクリプト
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib/env.sh"

NOTIFY="$BSA_PA_BASE/src/notifier/notify.sh"
LOG_FILE="$BSA_PA_APPDATA/run-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

trap 'on_error $?' ERR
on_error() {
  bash "$NOTIFY" "❌ BSA-PA エラー" "ステージで失敗。$LOG_FILE を確認" || true
  echo "Press Enter to close..."
  read -t 60 || true
  exit "$1"
}

START_TIME=$(date +%s)

echo "📥 BSA 案件収集を開始します..."
echo ""

# Stage 1: collector + scorer
echo "🔍 Stage 1: 案件を収集中..."
source "$BSA_PA_VENV/bin/activate"
cd "$BSA_PA_BASE/src/collector"
python -m src.collector.main || {
  bash "$NOTIFY" "🔑 Lancers セッション切れ" "scripts/relogin.sh を実行してください"
  echo "Press Enter to close"; read -t 60 || true; exit 1
}

# Stage 2: generator
echo ""
echo "📝 Stage 2: 提案文を生成中..."
cd "$BSA_PA_BASE/src/generator"
npx tsx src/main.ts

# Stage 3: notify
echo ""
echo "🔔 Stage 3: 通知中..."
COLLECTED=$(sqlite3 "$BSA_PA_DB" "SELECT COUNT(*) FROM jobs WHERE date(collected_at)=date('now','localtime')")
PROPOSED=$(sqlite3 "$BSA_PA_DB" "SELECT COUNT(*) FROM proposals WHERE date(generated_at)=date('now','localtime')")
HIGH=$(sqlite3 "$BSA_PA_DB" "SELECT COUNT(*) FROM jobs WHERE date(collected_at)=date('now','localtime') AND fit_score>=80")
MID=$(sqlite3 "$BSA_PA_DB" "SELECT COUNT(*) FROM jobs WHERE date(collected_at)=date('now','localtime') AND fit_score>=60 AND fit_score<80")
LOW=$(sqlite3 "$BSA_PA_DB" "SELECT COUNT(*) FROM jobs WHERE date(collected_at)=date('now','localtime') AND fit_score>=40 AND fit_score<60")

bash "$NOTIFY" \
  "📥 BSA 収集完了" \
  "${COLLECTED}件収集 / ${PROPOSED}件提案準備済み (🔥${HIGH} 🎯${MID} 📋${LOW})"

cd "$BSA_PA_BASE/src/notifier"
npx tsx gmail.ts || echo "⚠️ Gmail 送信失敗（無視して続行）"

# Stage 4: dashboard 起動 + ブラウザ
echo ""
echo "🌐 Stage 4: ダッシュボードを起動..."
DASH_PID_FILE="$BSA_PA_APPDATA/dashboard.pid"
if [ -f "$DASH_PID_FILE" ] && kill -0 "$(cat "$DASH_PID_FILE")" 2>/dev/null; then
  echo "Dashboard already running"
else
  cd "$BSA_PA_BASE/src/dashboard"
  nohup npm run dev > "$BSA_PA_APPDATA/dashboard.log" 2>&1 &
  echo $! > "$DASH_PID_FILE"
  sleep 4
fi

open http://127.0.0.1:3000

ELAPSED=$(($(date +%s) - START_TIME))
echo ""
echo "✅ 完了 (${ELAPSED}秒)。ブラウザでダッシュボードを確認してください。"
echo "（このウィンドウは 60秒後に自動で閉じます）"
sleep 60
exit 0
```

- [ ] **Step 2: コミット**

```bash
chmod +x scripts/run.command
git add scripts/run.command
git commit -m "feat: scripts: main run.command entrypoint"
```

---

# Milestone 7: E2E Verification

## Task 31: 初回 setup.sh で E2E

- [ ] **Step 1: setup.sh を実行**

```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation
./scripts/setup.sh
```

Expected: venv 作成、npm install、ブラウザでログイン、Cookie 保存、デスクトップアイコン配置 — 全部成功

- [ ] **Step 2: デスクトップアイコンをダブルクリック**

Finder で `📥 BSA 案件収集.command` をダブルクリック

Expected: Terminal が開いて Stage 1〜4 が順次実行される

- [ ] **Step 3: ダッシュボードで結果確認**

http://127.0.0.1:3000

Expected:
- 50件前後の案件カードが2セクションで表示される
- 上位10件は提案文プレビュー + 編集ボタンあり
- 下位40件は「提案文生成を依頼」ボタンあり

- [ ] **Step 4: 提案文編集**

`/proposals/<job_id>` で編集 → 保存ボタン → ダッシュボードに戻って反映確認

---

## Task 32: 「Claude in Chrome」フォーム入力フロー検証

- [ ] **Step 1: 実 Lancers 案件で検証**

ダッシュボードで提案文の「📥 Claude in Chrome でフォーム入力」ボタン押下 → クリップボードにプロンプトコピー → Chrome の Claude 拡張に貼り付け

Expected: Lancers の応募ページが開かれ、提案文・金額・納期がフォームに流し込まれる（送信はしない）

- [ ] **Step 2: 入力済みステータス更新**

ダッシュボードに戻って「✅ 入力済みにする」ボタン → status が `submitted` に更新

- [ ] **Step 3: 履歴画面で確認**

`/history` で `submitted` 状態が反映されているか確認

---

## Task 33: 完成度チェックリスト

- [ ] 全項目を確認

```
□ setup.sh が初回でエラーなく完走する
□ run.command ダブルクリックで 20分以内に処理完了
□ Lancers の3URLそれぞれから案件が取得できる
□ fit_score が表示されている（0〜100の範囲）
□ 上位10件の提案文が SQLite に保存される
□ ダッシュボードのカードに job_id・タイトル・予算・fit が表示
□ 提案文編集が保存される + 履歴に残る
□ Claude in Chrome 用プロンプトコピーが動く
□ macOS 通知が表示される
□ Gmail に詳細レポートが届く
□ Cookie 切れ時に通知 + relogin.sh で復旧
□ Exa API 800/1000 で警告、1000 で停止
□ 履歴画面で受注率が計算される
□ 設定画面で Cookie 状態と Exa 利用量が確認できる
□ git status で意図しないファイル（.db, cookies.json）が含まれていない
```

- [ ] **Step 2: README を作成（プロジェクト直下）**

`outputs/bsa/proposal-automation/README.md`:
```markdown
# BSA Proposal Automation

Lancers から案件を自動収集 → 提案文を Claude Code CLI で生成 → ダッシュボードで確認・編集 → Claude in Chrome でフォーム入力。

## Quick Start
1. `./scripts/setup.sh` で初回セットアップ
2. デスクトップの「📥 BSA 案件収集」をダブルクリック
3. http://127.0.0.1:3000 でダッシュボード確認

## Architecture
詳細: `03-design.md`
```

- [ ] **Step 3: 最終コミット**

```bash
git add outputs/bsa/proposal-automation/README.md
git commit -m "docs: bsa-pa: project README"
```

---

# Self-Review

## Spec Coverage

| 要件セクション | 対応タスク |
|---|---|
| FR-1 案件収集 | T6-T7 (Lancers adapter) + T11 (main) |
| FR-2 fit_score | T10 (scorer) |
| FR-3 提案文生成 | T17 (prompt) + T19 (main) |
| FR-4 リサーチ | T18 (researcher) |
| FR-5 ダッシュボード | T20-T26 |
| FR-6 フォーム入力連携 | T24 (ProposalEditor の Claude in Chrome ボタン) |
| FR-7 追加生成依頼 | T22 (api/generation-requests) + T23 (JobCard) + T19 (キュー処理) |
| FR-8 ステータス管理 | T21 (db.ts updateJobStatus) + T22 (api/status) + T23/24 |
| FR-9 通知 | T18bis + T19bis |
| FR-10 実行起点 | T30 (run.command) |
| 非機能 (パフォーマンス) | T19 直列10件で5-10分 OK |
| 非機能 (セキュリティ) | T8 (cookie 600 perm) + T28 (appdata 700) + T22 (localhost only) |
| 非機能 (規約遵守) | T11 (3-5秒間隔) + T9 (UA偽装) |
| 6.2 ID 体系 | T11 (generate_job_id) |
| 7. 人間確認ルール | T24 (Claude in Chrome ボタン = 送信前停止) |

✅ 全要件に対応タスクあり

## Placeholder Scan

- ❌ Step 内に "TBD" / "TODO" / "implement later" を含む箇所がないか → 確認済み、ゼロ
- ❌ "fill in details" や "appropriate error handling" → なし
- ❌ コードを伴うべき step に code block がない → なし

## Type Consistency

- `Job` / `Proposal` / `JobRow` / `JobWithProposal` の型は db.ts (Python) と types/ (TypeScript) で対応関係明示
- `customizePricing` / `estimateProductLine` の引数型はテストと実装で一致
- API のリクエスト・レスポンス JSON 型は dashboard 内で integrated

✅ 型不整合なし

---

# Execution Handoff

実装計画は完成し `outputs/bsa/proposal-automation/04-implementation-plan.md` に保存しました。

**Two execution options:**

**1. Subagent-Driven (recommended)** — 各タスクを fresh subagent に渡して実行、タスク間でレビュー、高速反復

**2. Inline Execution** — このセッションで `superpowers:executing-plans` を使ってバッチ実行 + チェックポイントレビュー

**どちらで進めますか？**
