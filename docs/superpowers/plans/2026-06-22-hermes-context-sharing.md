# hermes ⇄ Claude Code 文脈共有・学習ループ 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** hermes の捕捉・分類を「陸さんは何者か」を前提にした文脈ありきに格上げし（Phase B＝読み）、さらに hermes の訂正・好みを Claude Code の memory に昇華して "使うほど育つ" を点火する（Phase A＝書き戻し）。単一真実源は終始 Claude Code memory に固定する。

**Architecture:** Claude Code memory/wiki を git 内のコンパクトな投影ファイル `USER_PROFILE.md` に落とし、Mac/GCP VM 両拠点の hermes 分類プロンプトへ注入する（B）。hermes は分類訂正・好み・Project 紐付けの「学び候補」を Notion 学習インボックスに積み、次の Claude Code セッションが SAFE/RISKY ゲート経由で memory に昇華し投影を再生成する（A）。B が読みの半分、A が書き戻しの半分で 1 つの学習ループを成す。新しい独立ブレインは作らない（二重ブレイン＝ドリフト回避）。

**Tech Stack:** Python 3（stdlib のみ・既存 hermes スクリプトに準拠／urllib + OpenRouter Haiku）、Notion MCP（学習インボックス）、Claude Code memory（`~/.claude/projects/.../memory/*.md`）、wiki（`wiki/self/*`）、git（投影ファイルの配送経路）。

## Global Constraints

- 本家 OSS hermes-agent の記憶設計に倣い投影は**わざと小さく保つ**: `USER_PROFILE.md` は **3,000 字（~1,000 トークン）以内**。超過時は要約・統合（自動要約はせず生成時に圧縮）。
- **単一真実源 = Claude Code memory**。hermes に独立した永続プロファイル store を持たせない。投影ファイルは memory/wiki からの**読み取り専用の生成物**。
- hermes 実装コードは **main 未マージ**で `worktree-hermes-todo-partner-spec` ブランチにのみ存在（`data/hermes/*.py`）。コード変更はそのブランチが対象（→ Pre-req 参照）。
- GCP VM(35.222.76.101) は `memory/`（`~/.claude/...`・**git 管理外**）に届かない。VM へ渡す情報は必ず **git repo 内**に置き `git pull` 経由で配送する。
- 既存スクリプト規約厳守: stdlib のみ・`--dry-run` を持つ・失敗時は fail-safe（分類失敗は skip 扱い、`{"is_task": False}` 等）・`log()` で 1 行ログ。
- memory への書き込みは既存の **SAFE 即適用 / RISKY 人間承認**ゲートに従う（`session-retrospective` の規律）。hermes が memory を直接書くことはしない。
- 投影に注入する文脈は injection/exfil の観点で安全な範囲に限定（機密・パスワード・私的内省＝journaling 領域は投影に含めない）。

---

## Pre-req（着手前の確定事項）

実装着手前に 1 点だけ人間決定が必要:

- **配送ブランチ問題**: hermes コードは `worktree-hermes-todo-partner-spec` に隔離され main 未マージ。投影ファイルと注入コードを (a) その hermes ブランチに足す か (b) **先に hermes を main へ merge してから main 上で進める**か。**推奨 = (b)**（long-lived task ブランチは規律違反・VM の配送元も main に一本化できる）。本計画のタスクは「hermes コードが居るブランチ＝以後 `<hermes-branch>` と表記」で記述。
- **VM の git pull 元/cadence の確認**: VM 上 hermes が repo の checkout を持ち、どのブランチをどの頻度で pull しているか（投影更新が VM に届く経路）。Task B4 で確認・配線する。

---

## File Structure

| ファイル | 責務 | 新規/変更 |
|---|---|---|
| `data/hermes/context/USER_PROFILE.md` | 投影本体（≤3,000 字）。WHO / STYLE / PROJECTS / CONSTRAINTS の 4 節。git で VM/Mac 両配送 | 新規（生成物） |
| `data/hermes/gen_user_profile.py` | 投影ジェネレータ。wiki/self/* と memory `user_*` を読み Haiku で圧縮 → `USER_PROFILE.md` 出力。`--dry-run` | 新規 |
| `data/hermes/hermes_context.py` | `load_user_profile()` 共通ヘルパ（投影を読み上限 cap して返す。欠損時は空文字でデグレード）。各分類器が import | 新規 |
| `data/hermes/applenotes_capture.py` | `classify()` の prompt 先頭に投影注入（既存 `classify()` 内 prompt 組立箇所） | 変更 |
| `data/hermes/calendar_capture.py` | 同上（`classify()` 内 prompt） | 変更 |
| Telegram agent（hermes-agent 本体の分類箇所） | 同上の注入 | 変更 |
| `data/hermes/learn_queue.py` | 学び候補を Notion 学習インボックスへ積む `enqueue_learning()`（A） | 新規 |
| `.claude/skills/hermes-learn-review.md`（or `session-retrospective` への 1 節追記） | 学習インボックスの pending を読み SAFE/RISKY 分類 → memory 昇華 → 投影再生成 → Notion を approved/rejected 更新（A） | 新規 or 追記 |

---

## Phase B — 読みの半分（MVP・低リスク・先行）

### Task B1: 投影フォーマットと初版 `USER_PROFILE.md` の確定

**Files:**
- Create: `data/hermes/context/USER_PROFILE.md`
- 参照（読み取り）: `wiki/self/profile.md`, `wiki/self/goals.md`, `wiki/self/streams.md`, memory `user_basic_profile.md` / `user_skills.md` / `user_career_history.md`

**Interfaces:**
- Produces: `USER_PROFILE.md`（4 節固定: `## WHO` / `## STYLE` / `## PROJECTS` / `## CONSTRAINTS`、合計 ≤3,000 字）。後続 Task が読む契約フォーマット。

- [ ] **Step 1: ソースを読み 4 節へ手動圧縮した初版を書く**

実際のソース（wiki/self/*・memory user_*）から抽出。例の骨子（値は実ソースで埋める）:

```markdown
# ユーザー文脈（hermes 判断の前提・Claude Code memory/wiki からの投影・自動生成）

## WHO
工藤陸（1996-12-05）。エンジニア兼マーケ実装者。発信ポジション=「難しいことを平易に噛み砕いて届ける実装者」。

## STYLE
日本語・簡潔・箇条書き中心。曖昧な迎合より論点整理。断り/調整/金銭/繊細連絡は誠実で必要事項が伝わる文面を好む。

## PROJECTS（Notion Project 紐付け用）
- all-good-ops: 個人用エージェントチーム本体
- StayClean: 民泊清掃UI（本番稼働）
- X発信(ofmeton名義): brand-publisher 主軸
- RICE CREAM / Shopify / 家庭教師 / mf-finance …（active なもののみ）

## CONSTRAINTS
- 名義境界: ofmeton=個人ブランド発信+個人案件 / 工藤陸=既存契約の請求・契約のみ
- 硬ゲート（hermes は自走しない）: 金銭・外部送信・migration・繊細な連絡
- 私的領域（journaling/内省/感情）は捕捉・投影の対象外
```

- [ ] **Step 2: 字数を検証する**

Run: `wc -m data/hermes/context/USER_PROFILE.md`
Expected: 3000 以下（超えていれば PROJECTS/STYLE を削って再調整）

- [ ] **Step 3: Commit**

```bash
git add data/hermes/context/USER_PROFILE.md
git commit -m "feat(hermes): add USER_PROFILE projection (Claude Code memory→hermes context)"
```

---

### Task B2: 投影ローダ `hermes_context.py`

**Files:**
- Create: `data/hermes/hermes_context.py`
- Test: `data/hermes/tests/test_hermes_context.py`

**Interfaces:**
- Produces: `load_user_profile(max_chars: int = 3000) -> str`。投影ファイルを読み `max_chars` で cap した文字列を返す。ファイル欠損・読込失敗時は **空文字**（注入なし＝従来挙動にデグレード）。

- [ ] **Step 1: 失敗テストを書く**

```python
# data/hermes/tests/test_hermes_context.py
import os, tempfile
from hermes_context import load_user_profile, PROFILE_PATH

def test_returns_empty_when_missing(monkeypatch):
    monkeypatch.setattr("hermes_context.PROFILE_PATH", "/nonexistent/USER_PROFILE.md")
    assert load_user_profile() == ""

def test_reads_and_caps(tmp_path, monkeypatch):
    p = tmp_path / "USER_PROFILE.md"
    p.write_text("A" * 5000, encoding="utf-8")
    monkeypatch.setattr("hermes_context.PROFILE_PATH", str(p))
    out = load_user_profile(max_chars=3000)
    assert len(out) == 3000
```

- [ ] **Step 2: テスト実行で失敗を確認**

Run: `cd data/hermes && python -m pytest tests/test_hermes_context.py -v`
Expected: FAIL（`ModuleNotFoundError: hermes_context`）

- [ ] **Step 3: 最小実装を書く**

```python
# data/hermes/hermes_context.py
"""Claude Code memory/wiki からの投影 USER_PROFILE.md を hermes 分類器へ供給する。"""
import os

PROFILE_PATH = os.path.join(os.path.dirname(__file__), "context", "USER_PROFILE.md")


def load_user_profile(max_chars: int = 3000) -> str:
    """投影を読み max_chars で cap。欠損/失敗時は空文字（注入なしにデグレード）。"""
    try:
        with open(PROFILE_PATH, encoding="utf-8") as f:
            return f.read()[:max_chars]
    except Exception:
        return ""


def profile_block() -> str:
    """分類プロンプト先頭に差し込む文脈ブロック。投影が無ければ空文字。"""
    prof = load_user_profile()
    if not prof:
        return ""
    return f"# ユーザー文脈（判断の前提）\n{prof}\n\n"
```

- [ ] **Step 4: テスト実行で成功を確認**

Run: `cd data/hermes && python -m pytest tests/test_hermes_context.py -v`
Expected: PASS（2 passed）

- [ ] **Step 5: Commit**

```bash
git add data/hermes/hermes_context.py data/hermes/tests/test_hermes_context.py
git commit -m "feat(hermes): add load_user_profile helper for context injection"
```

---

### Task B3: 分類器への投影注入（applenotes / calendar / Telegram）

**Files:**
- Modify: `data/hermes/applenotes_capture.py`（`classify()` 内 prompt 組立）
- Modify: `data/hermes/calendar_capture.py`（`classify()` 内 prompt 組立）
- Modify: Telegram agent の分類プロンプト組立箇所
- Test: `data/hermes/tests/test_injection.py`

**Interfaces:**
- Consumes: `hermes_context.profile_block()`（Task B2）
- Produces: 各 `classify()` の prompt が `profile_block()` 始まりになる。投影欠損時は従来 prompt（後方互換）。

- [ ] **Step 1: 注入を検証する失敗テストを書く**

```python
# data/hermes/tests/test_injection.py
import applenotes_capture as an

def test_prompt_starts_with_profile(monkeypatch):
    monkeypatch.setattr(an, "profile_block", lambda: "# ユーザー文脈（判断の前提）\nTESTPROFILE\n\n")
    # build_prompt は Step 3 で classify から抽出する純関数
    note = {"name": "X社に連絡", "folder": "仕事", "body": "明日まで"}
    p = an.build_prompt(note)
    assert p.startswith("# ユーザー文脈（判断の前提）\nTESTPROFILE")
    assert "メモ分類器" in p
```

- [ ] **Step 2: テスト実行で失敗を確認**

Run: `cd data/hermes && python -m pytest tests/test_injection.py -v`
Expected: FAIL（`build_prompt` 未定義）

- [ ] **Step 3: `classify()` から prompt 組立を純関数 `build_prompt()` に抽出し投影を前置**

`applenotes_capture.py`（既存 `classify()` 冒頭・現状 `prompt = ( "あなたはメモ分類器..." )` を置換）:

```python
from hermes_context import profile_block  # ファイル冒頭の import 群へ追加

def build_prompt(note: dict) -> str:
    body = (note["body"] or "")[:1500]
    return (
        profile_block() +
        "あなたはメモ分類器。次の Apple メモが『あとでやるタスク/依頼/要対応』か判定する。\n"
        "JSONのみ出力: {\"is_task\": true/false, \"is_private\": true/false, \"title\": \"タスクの短い要約(20字程度)\"}\n"
        "- is_private=true: 日記/感情の記録/パスワードや機密/個人的な内省。これらはタスクでもtask扱いしない。\n"
        "- is_task=true: 行動が要る(連絡/購入/手続き/調査/作成/予約 等)。単なる情報メモ/リンク集/完了済みは false。\n"
        f"メモタイトル: {note['name']}\nフォルダ: {note['folder']}\n本文:\n{body}\n"
    )

def classify(env: dict, note: dict) -> dict:
    prompt = build_prompt(note)
    # …以下 payload 以降は既存のまま…
```

`calendar_capture.py` も同様に `build_prompt(ev, human_time)` を抽出し `profile_block() + "あなたは予定の事前準備判定器…"` とする。Telegram agent の分類も同様に投影を前置。

- [ ] **Step 4: テスト実行で成功を確認**

Run: `cd data/hermes && python -m pytest tests/test_injection.py -v`
Expected: PASS

- [ ] **Step 5: 実分類の dry-run スモーク**

Run: `cd data/hermes && python applenotes_capture.py --dry-run`（既存 dry-run フラグ）
Expected: 例外なく完走。ログに分類結果が出る。プロファイル投影でクラッシュしないこと（投影が無くても従来通り動くことも `mv context/USER_PROFILE.md /tmp` で 1 度確認 → 戻す）

- [ ] **Step 6: Commit**

```bash
git add data/hermes/applenotes_capture.py data/hermes/calendar_capture.py data/hermes/tests/test_injection.py
git commit -m "feat(hermes): inject USER_PROFILE context into classifiers"
```

---

### Task B4: VM 配送の配線（git pull で投影が VM に届く）

**Files:**
- Modify: hermes の VM 側起動ループ or deploy スクリプト（`git pull` の存在確認・追加）。場所は Pre-req の VM 確認で特定。

**Interfaces:**
- Produces: VM 上 hermes が分類前に最新の `USER_PROFILE.md` を持つ状態。

- [ ] **Step 1: VM の hermes checkout がどのブランチを pull しているか確認**

Run（VM へ ssh、または deploy スクリプトを Read）: `ssh user@35.222.76.101 'cd <hermes-repo> && git rev-parse --abbrev-ref HEAD && git log -1 --oneline'`
Expected: 配送元ブランチ（main 推奨）が判明

- [ ] **Step 2: 分類サイクル前に `git pull --ff-only` を入れる（無ければ）**

VM 側 hermes の cron ラッパ（捕捉ループ起動部）に投影更新の取り込みを追加:

```bash
cd <hermes-repo> && git pull --ff-only origin <配送ブランチ> 2>&1 | tail -1 || echo "pull skipped"
```

- [ ] **Step 3: 配送を実証**

ローカルで `USER_PROFILE.md` に一意マーカー（例 `## WHO` に `TESTMARKER`）を入れて push → VM で pull → `grep TESTMARKER <hermes-repo>/data/hermes/context/USER_PROFILE.md`
Expected: マーカーが VM 側に出る → 確認後マーカーを戻して再 push

- [ ] **Step 4: Commit（VM ラッパ変更分）**

```bash
git add <vm wrapper path>
git commit -m "chore(hermes): pull latest USER_PROFILE before capture cycle on VM"
```

---

### Task B5: 投影ジェネレータ `gen_user_profile.py`（更新を半自動化）

**Files:**
- Create: `data/hermes/gen_user_profile.py`
- Test: `data/hermes/tests/test_gen_user_profile.py`

**Interfaces:**
- Consumes: ソースファイル群（wiki/self/*・memory `user_*`）
- Produces: CLI `python gen_user_profile.py [--dry-run]`。ソースを連結 → Haiku で 4 節 ≤3,000 字へ圧縮 → `USER_PROFILE.md` 出力（`--dry-run` は stdout のみ）。memory/ は Mac ローカルのため**生成は Mac で実行**（VM は生成しない・pull のみ）。

- [ ] **Step 1: ソース連結部の純関数に失敗テストを書く**

```python
# data/hermes/tests/test_gen_user_profile.py
import gen_user_profile as g

def test_collect_sources_skips_missing(tmp_path):
    f = tmp_path / "profile.md"; f.write_text("私はテスト", encoding="utf-8")
    text = g.collect_sources([str(f), str(tmp_path / "missing.md")])
    assert "私はテスト" in text          # 存在分は連結
    assert "missing" not in text          # 欠損はスキップ（例外を投げない）
```

- [ ] **Step 2: テスト実行で失敗を確認**

Run: `cd data/hermes && python -m pytest tests/test_gen_user_profile.py -v`
Expected: FAIL（`gen_user_profile` 未定義）

- [ ] **Step 3: 実装（連結＝決定的、圧縮＝Haiku）**

```python
# data/hermes/gen_user_profile.py
"""wiki/self/* と memory user_* を投影 USER_PROFILE.md に圧縮生成する（Mac で実行）。"""
import os, sys, json, urllib.request

MODEL = "anthropic/claude-haiku-4.5"
OUT = os.path.join(os.path.dirname(__file__), "context", "USER_PROFILE.md")
# repo ルートからの相対 + memory 絶対パス（Mac 固定）
MEMORY_DIR = os.path.expanduser(
    "~/.claude/projects/-Users-rikukudo-Projects-private-agents-all-good-ops/memory")
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SOURCES = [
    os.path.join(REPO, "wiki/self/profile.md"),
    os.path.join(REPO, "wiki/self/goals.md"),
    os.path.join(REPO, "wiki/self/streams.md"),
    os.path.join(MEMORY_DIR, "user_basic_profile.md"),
    os.path.join(MEMORY_DIR, "user_skills.md"),
    os.path.join(MEMORY_DIR, "user_career_history.md"),
]

INSTR = (
    "次の素材から、AIアシスタント hermes がタスク分類の前提に使う『ユーザー文脈』を"
    "日本語・3000字以内で要約せよ。節は固定で ## WHO / ## STYLE / ## PROJECTS / ## CONSTRAINTS。"
    "私的内省・感情・パスワード・機密は除外。冒頭に『# ユーザー文脈（…自動生成）』を付ける。"
)

def collect_sources(paths) -> str:
    out = []
    for p in paths:
        try:
            with open(p, encoding="utf-8") as f:
                out.append(f"### {os.path.basename(p)}\n{f.read()}")
        except Exception:
            continue
    return "\n\n".join(out)

def compress(raw: str, api_key: str) -> str:
    payload = {"model": MODEL, "max_tokens": 1200, "temperature": 0,
               "messages": [{"role": "user", "content": f"{INSTR}\n\n素材:\n{raw[:18000]}"}]}
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))["choices"][0]["message"]["content"][:3000]

def main():
    dry = "--dry-run" in sys.argv
    raw = collect_sources(SOURCES)
    key = os.environ.get("OPENROUTER_API_KEY") or _load_env_key()
    profile = compress(raw, key)
    if dry:
        print(profile); return
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(profile)
    print(f"wrote {OUT} ({len(profile)} chars)")

def _load_env_key():
    # 既存 hermes と同じ ~/.hermes/.env から読む
    env = {}
    with open(os.path.expanduser("~/.hermes/.env"), encoding="utf-8") as f:
        for line in f:
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.strip().split("=", 1); env[k] = v.strip().strip('"')
    return env["OPENROUTER_API_KEY"]

if __name__ == "__main__":
    main()
```

- [ ] **Step 4: テスト実行で成功を確認**

Run: `cd data/hermes && python -m pytest tests/test_gen_user_profile.py -v`
Expected: PASS

- [ ] **Step 5: dry-run で生成結果を目視**

Run: `cd data/hermes && python gen_user_profile.py --dry-run`
Expected: 4 節構成・3,000 字以内のプロファイルが stdout に出る。内容が妥当か目視（私的領域が混入していないこと）

- [ ] **Step 6: 本生成 → git diff で人間レビュー → commit**

```bash
cd data/hermes && python gen_user_profile.py
cd "$REPO" && git diff data/hermes/context/USER_PROFILE.md   # 目視
git add data/hermes/gen_user_profile.py data/hermes/tests/test_gen_user_profile.py data/hermes/context/USER_PROFILE.md
git commit -m "feat(hermes): add USER_PROFILE generator (memory/wiki -> projection)"
```

- [ ] **Step 7: 更新トリガを文書化**

`session-end` / `session-retrospective` スキルの末尾に「memory の `user_*` や `wiki/self/*` を更新したら `python data/hermes/gen_user_profile.py` で投影を再生成し commit」の 1 行を追記（別 commit）。

---

**Phase B 完了条件（検証）:** ① `pytest data/hermes/tests/ -v` 全 PASS ② `python applenotes_capture.py --dry-run` がプロファイル注入込みで完走 ③ VM で `grep WHO data/hermes/context/USER_PROFILE.md` が最新内容 ④ 投影削除時も分類が従来通り動く（デグレード確認）。**ここまでで B は単独で出荷可能。**

---

## Phase A — 書き戻しの半分（"育つ" 本体・B の上に載る）

### Task A1: 学習インボックス（Notion DB）の用意と enqueue

**Files:**
- Create: `data/hermes/learn_queue.py`
- 参照: memory `reference_notion_mcp_id_and_sharing.md`（ID 種別・連携共有のハマり）

**Interfaces:**
- Produces: `enqueue_learning(env, kind, observation, evidence_url, proposed_edit) -> bool`。Notion 学習インボックス DB に pending 行を作る。`kind ∈ {preference, correction, project-mapping}`。

- [ ] **Step 1: Notion に「hermes 学習インボックス」DB を作成（人間操作 1 回）**

プロパティ: `Observation`(title) / `Kind`(select: preference/correction/project-mapping) / `Status`(select: pending/approved/rejected) / `Evidence`(url) / `ProposedEdit`(rich text) / `Created`(date)。
作成後、Notion UI で対象インテグレーションに **Connections 追加**（API では自動共有されない・404 はアクセス拒否と誤読しない）。database_id / data_source_id を控える。

- [ ] **Step 2: enqueue の失敗テスト（ペイロード組立の純関数）を書く**

```python
# data/hermes/tests/test_learn_queue.py
import learn_queue as lq

def test_build_props():
    props = lq.build_props("correction", "これはタスクではない", "https://notion/abc", "user_skills: 追記X")
    assert props["Kind"]["select"]["name"] == "correction"
    assert props["Status"]["select"]["name"] == "pending"
    assert props["Observation"]["title"][0]["text"]["content"].startswith("これは")
```

- [ ] **Step 3: テスト実行で失敗確認 → 実装**

```python
# data/hermes/learn_queue.py
"""hermes の学び候補を Notion 学習インボックスへ pending で積む（A）。"""
import json, urllib.request

LEARN_DB_ID = "<手順 Step1 で控えた database_id>"

def build_props(kind, observation, evidence_url, proposed_edit):
    return {
        "Observation": {"title": [{"text": {"content": observation[:200]}}]},
        "Kind": {"select": {"name": kind}},
        "Status": {"select": {"name": "pending"}},
        "Evidence": {"url": evidence_url or None},
        "ProposedEdit": {"rich_text": [{"text": {"content": (proposed_edit or "")[:1800]}}]},
    }

def enqueue_learning(env, kind, observation, evidence_url="", proposed_edit="") -> bool:
    payload = {"parent": {"database_id": LEARN_DB_ID},
               "properties": build_props(kind, observation, evidence_url, proposed_edit)}
    req = urllib.request.Request(
        "https://api.notion.com/v1/pages",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {env['NOTION_TOKEN']}",
                 "Content-Type": "application/json", "Notion-Version": "2022-06-28"})
    try:
        urllib.request.urlopen(req, timeout=30); return True
    except Exception:
        return False  # fail-safe: 学び取りこぼしは許容、捕捉本流は止めない
```

Run: `cd data/hermes && python -m pytest tests/test_learn_queue.py -v` → PASS

- [ ] **Step 4: Commit**

```bash
git add data/hermes/learn_queue.py data/hermes/tests/test_learn_queue.py
git commit -m "feat(hermes): add learning-inbox enqueue (write-back queue)"
```

---

### Task A2: 学び候補の発火点を hermes に埋める

**Files:**
- Modify: Telegram agent の返信ハンドリング（ユーザー訂正の検知）
- Modify: `data/hermes/applenotes_capture.py` / `calendar_capture.py`（誤分類の人手訂正を拾う経路があれば）

**Interfaces:**
- Consumes: `learn_queue.enqueue_learning`（A1）

- [ ] **Step 1: 訂正検知 → enqueue を入れる（Telegram 返信）**

ユーザーが Telegram で分類/Autonomy を否定する返信（例「これはタスクじゃない」「cc-auto にして」）を検知した分岐で:

```python
from learn_queue import enqueue_learning
# 例: ユーザーが誤分類を訂正したとき
enqueue_learning(env, "correction",
                 observation=f"『{card_title}』はtask扱い不要と訂正された",
                 evidence_url=card_url,
                 proposed_edit="user_skills or feedback: この種のメモはtask化しない傾向")
```

- [ ] **Step 2: 好み・Project 紐付けの発火も同様に追加**

Autonomy ラベルを人間が変更した／Project を手動で紐付け直した検知点で `kind="preference"` / `kind="project-mapping"` を enqueue。

- [ ] **Step 3: dry-run で enqueue が pending を作るのを確認**

Run: 実際に Telegram で 1 件訂正 → Notion 学習インボックスに pending 行が出ることを目視（または `--dry-run` 経路でログ確認）

- [ ] **Step 4: Commit**

```bash
git add <telegram agent path> data/hermes/applenotes_capture.py data/hermes/calendar_capture.py
git commit -m "feat(hermes): emit learning candidates on user corrections/preferences"
```

---

### Task A3: 同意ゲート → memory 昇華 → 投影再生成（Claude Code 側）

**Files:**
- Create: `.claude/skills/hermes-learn-review/SKILL.md`（または `session-retrospective` に 1 フェーズ追記）

**Interfaces:**
- Consumes: Notion 学習インボックスの pending 行、`gen_user_profile.py`（B5）
- Produces: 承認分が memory `*.md` に反映され `USER_PROFILE.md` が再生成される。Notion 行は approved/rejected に更新。

- [ ] **Step 1: スキル手順を書く（決定的な運用フロー）**

SKILL.md の手順（人間トリガー or session-retrospective 末尾）:
1. Notion 学習インボックスを `Status=pending` で取得（読みは `notion-search`+`notion-fetch`、query 系はプラン制限・memory 参照）
2. 各候補を **SAFE/RISKY 分類**（SAFE=好み・分類傾向の追記／RISKY=名義境界・戦略に触れる変更）
3. SAFE は即 memory 該当ファイル（`user_*` / `feedback_*`）へ追記。RISKY は人間承認を取ってから反映
4. 反映後 `python data/hermes/gen_user_profile.py` で投影再生成 → git diff 目視 → commit（B のループへ還流）
5. 処理済み Notion 行を approved / rejected に更新（外部書込＝人間確認の原則に従い、まとめて 1 回）

- [ ] **Step 2: 1 サイクル実走で end-to-end を実証**

A2 で積んだ pending を本スキルで処理 → memory に追記され → `USER_PROFILE.md` が更新され → 次回 `applenotes_capture.py --dry-run` の prompt に反映が乗ることを確認（B の注入経由）。

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/hermes-learn-review/SKILL.md
git commit -m "feat(hermes): consent-gated learning review (Notion inbox -> memory -> projection)"
```

---

## Self-Review（spec 照合）

- **B（読み）**: 投影フォーマット(B1)・ローダ(B2)・注入(B3)・VM 配送(B4)・生成自動化(B5) で「Claude Code memory/wiki を hermes 分類へ注入」を網羅。✓
- **A（書き）**: enqueue(A1)・発火点(A2)・同意ゲート昇華(A3) で「hermes の学びを memory に還流して育つ」を網羅。✓
- **単一真実源**: memory が唯一の昇華先（A3）、投影は読み取り生成物（B5）、hermes 独立 store なし。✓
- **VM 到達性**: 投影は git 経由(B4)、生成は Mac 限定(B5)、memory 直接アクセスを VM に要求しない。✓
- **後方互換/デグレード**: 投影欠損時 `profile_block()` が空 → 従来分類(B2/B3 Step5)。✓
- **規約準拠**: stdlib のみ・`--dry-run`・fail-safe・外部書込は人間確認(A3 Step1/5)・私的領域除外(Global Constraints・B5 INSTR)。✓

## Execution Handoff

本リポの実装規約では実装は **Codex 半委任が既定**（`skill:codex-implement`、設計=architect / レビュー=pr-review-toolkit）。本計画はその spec として使える。superpowers 流の実行なら subagent-driven-development（タスク毎に fresh subagent＋2 段レビュー）も可。

**まず Phase B（B1–B5）を MVP として出荷 → 動作確認後に Phase A を着手**、が推奨順序。
