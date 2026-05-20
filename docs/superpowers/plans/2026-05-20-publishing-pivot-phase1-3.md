# BSA撤退（Phase 1-3）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** BSA戦略を完全撤退する。BSA-PA を即時停止し、CLAUDE.md / wiki の BSA セクションを archive 化し、関連エージェント3体を凍結 / 役割転換する。

**Architecture:**
3 段階で進める。Phase 1（環境変数・cron）は即時可逆。Phase 2（ドキュメント書き換え）は実行後も git revert で復旧可能。Phase 3（エージェント凍結）は frontmatter `status: archived` 追加のみで、ファイル本体は残す（戻し道を確保）。各 Phase は独立 commit。

**Tech Stack:** zsh / crontab / markdown / git / sqlite3（BSA-PA 検証用）

**Related:**
- spec: `docs/superpowers/specs/2026-05-20-publishing-pivot-design.md`
- branch: `task/260520-publishing-pivot`

---

## Files Touched Overview

**Phase 1（BSA-PA 停止）:**
- Modify: `~/.zshenv` または `~/.zshrc`（環境変数 `BSA_PA_NO_AUTO_SUBMIT=1` 恒久化）
- Modify: ユーザーの crontab（BSA-PA 関連エントリ削除）

**Phase 2（ドキュメント書き換え）:**
- Modify: `CLAUDE.md`（BSA セクション・ルーティング・KGI を発信系に書き換え）
- Modify: `wiki/business/bsa/overview.md`（status: archived）
- Create: `wiki/business/bsa/archive-notice.md`（撤退理由記録）
- Modify: `wiki/business/bsa/*` 配下の status frontmatter（archived）
- Modify: `~/.claude/projects/.../memory/MEMORY.md` 内の BSA 関連エントリの description 更新

**Phase 3（エージェント凍結）:**
- Modify: `.claude/agents/business-ops/rapid-hp-operator.md`（frontmatter `status: archived` 追加）
- Modify: `.claude/agents/business-ops/freelance-scout.md`（役割を「紹介経由の受け口管理」に変更）
- Modify: `.claude/agents/business-ops/ad-ops-specialist.md`（役割を「note 記事素材提供係」に変更）

---

## Phase 1: BSA-PA 即時停止

### Task 1.1: 現状の crontab・環境変数を確認

- [ ] **Step 1: crontab 確認**

Run: `crontab -l 2>/dev/null | grep -iE "bsa|proposal" || echo "no bsa cron"`
Expected: BSA-PA 関連の cron エントリがあれば表示。なければ "no bsa cron"

- [ ] **Step 2: 現環境変数確認**

Run: `env | grep -i BSA_PA || echo "no env var"`
Expected: 既に設定済みなら表示。未設定なら "no env var"

- [ ] **Step 3: .zshenv 内の既存設定確認**

Run: `grep -n "BSA_PA\|BSA戦略" ~/.zshenv 2>/dev/null || echo "no entry in zshenv"`
Expected: 既存記述があれば行番号付きで表示

### Task 1.2: kill-switch 環境変数を恒久化

- [ ] **Step 1: ~/.zshenv に追記**

Run:
```bash
cat >> ~/.zshenv <<'EOF'

# BSA-PA 自動送信停止 (2026-05-20 戦略撤退)
# 参照: docs/superpowers/specs/2026-05-20-publishing-pivot-design.md
export BSA_PA_NO_AUTO_SUBMIT=1
EOF
```

- [ ] **Step 2: 設定の syntax 検証**

Run: `zsh -n ~/.zshenv && echo "OK"`
Expected: "OK"（syntax エラーなし）

- [ ] **Step 3: 新シェルで環境変数が効いていることを確認**

Run: `zsh -i -c 'echo BSA_PA_NO_AUTO_SUBMIT=$BSA_PA_NO_AUTO_SUBMIT'`
Expected: `BSA_PA_NO_AUTO_SUBMIT=1`

### Task 1.3: BSA-PA 関連 cron エントリを削除

- [ ] **Step 1: 現 crontab をバックアップ**

Run: `crontab -l > ~/.crontab.backup.2026-05-20.txt && wc -l ~/.crontab.backup.2026-05-20.txt`
Expected: バックアップ行数表示

- [ ] **Step 2: BSA-PA 関連エントリを除外した新 crontab を生成**

Run:
```bash
crontab -l | grep -viE "bsa-pa|proposal-automation|proposal_automation|outputs/bsa" > /tmp/crontab.new
diff ~/.crontab.backup.2026-05-20.txt /tmp/crontab.new || echo "no diff (= no bsa cron entries to remove)"
```
Expected: 差分が表示される（削除されたエントリ）OR "no diff"

- [ ] **Step 3: 新 crontab を適用**

Run: `crontab /tmp/crontab.new && crontab -l | grep -ciE "bsa|proposal"`
Expected: `0`（BSA関連が0件）

### Task 1.4: BSA-PA DB の status snapshot を記録

撤退時点の状態を凍結スナップショットとして残す。後で「最終的にいくつの提案が投げられたか」を参照できるように。

- [ ] **Step 1: スナップショットファイル作成**

Run:
```bash
mkdir -p outputs/bsa/archive-snapshot
sqlite3 "$HOME/Library/Application Support/bsa-pa/data.db" \
  "SELECT platform_prefix, status, COUNT(*) FROM jobs GROUP BY platform_prefix, status ORDER BY platform_prefix, status;" \
  > outputs/bsa/archive-snapshot/2026-05-20-jobs-status.txt
sqlite3 "$HOME/Library/Application Support/bsa-pa/data.db" \
  "SELECT COUNT(*) AS total_proposals FROM proposals;" \
  > outputs/bsa/archive-snapshot/2026-05-20-proposals-total.txt
sqlite3 "$HOME/Library/Application Support/bsa-pa/data.db" \
  "SELECT COUNT(*) AS deals_won FROM deals;" \
  > outputs/bsa/archive-snapshot/2026-05-20-deals-total.txt
```

- [ ] **Step 2: スナップショット内容確認**

Run: `cat outputs/bsa/archive-snapshot/2026-05-20-*.txt`
Expected: jobs status 内訳・proposals 総数（31前後）・deals 総数（0）が出る

### Task 1.5: Phase 1 commit

- [ ] **Step 1: 変更ファイル確認**

Run: `git status -s`
Expected: `outputs/bsa/archive-snapshot/` が untracked として表示

- [ ] **Step 2: stage**

Run: `git add outputs/bsa/archive-snapshot/`

- [ ] **Step 3: commit**

Run:
```bash
git commit -m "$(cat <<'EOF'
chore(bsa): Phase 1 BSA-PA 即時停止 (kill-switch + cron 削除)

- ~/.zshenv に BSA_PA_NO_AUTO_SUBMIT=1 恒久化
- crontab から BSA-PA 関連エントリ削除
- outputs/bsa/archive-snapshot/ に撤退時点の DB スナップショット保存
  - jobs status / proposals total / deals total

撤退根拠: spec docs/superpowers/specs/2026-05-20-publishing-pivot-design.md §1.1
(受注0件 / 返信率 3.2% / 中止判定ライン抵触)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

Expected: commit 成功

---

## Phase 2: ドキュメント書き換え

### Task 2.1: wiki/business/bsa/archive-notice.md 作成

撤退理由を SSOT として記録。後から「なぜやめたか」を辿れるようにする。

- [ ] **Step 1: ファイル作成**

Create: `wiki/business/bsa/archive-notice.md`

```markdown
---
type: source
created: 2026-05-20
updated: 2026-05-20
sources: [docs/superpowers/specs/2026-05-20-publishing-pivot-design.md]
related: [[overview]], [[pricing-catalog]], [[proven-track-record]]
tags: [bsa, archive, lessons]
status: active
identity: 工藤陸
---

# BSA 戦略 撤退記録（2026-05-20）

## 撤退判断の根拠

BSA 自身が overview.md に定義した中止判定ラインに、開始から4週で抵触。

| 指標 | 4週実績 | 中止判定ライン |
|---|---|---|
| 返信率 | 3.2%（31件中1件） | 連続2週で5%未満 |
| 受注 | 0件 | 連続2週で0件 |

## 武器とのミスマッチ（学び）

`proven-track-record.md` の主力は **広告運用（CPA 84%削減）** と
**業務自動化（工数 90-98%削減）** の二枚看板。HP制作は付随スキル。
BSA は本人の主力武器を活かせない土俵で4週戦った。

## 撤退時点の DB スナップショット

`outputs/bsa/archive-snapshot/` 配下:
- `2026-05-20-jobs-status.txt` — 案件収集状況
- `2026-05-20-proposals-total.txt` — 提案投下総数
- `2026-05-20-deals-total.txt` — 受注総数（0）

## 残すもの

- portfolio リポジトリ → 役割転換（HP受託の窓 → note 記事の作例集）
- `proven-track-record.md` → そのまま温存（note 記事素材）
- `pricing-catalog.md` → 参考資料として archive
- 進行中個人案件（terra-isshiki / minpaku-cleaning）→ 完走

## 次戦略

`docs/superpowers/specs/2026-05-20-publishing-pivot-design.md`
3 媒体発信（note / X / Instagram）→ AI 自動化代行への布石
```

- [ ] **Step 2: ファイル存在確認**

Run: `ls -l wiki/business/bsa/archive-notice.md && head -10 wiki/business/bsa/archive-notice.md`
Expected: ファイル存在 + frontmatter 確認

### Task 2.2: wiki/business/bsa/overview.md の status を archived に変更

- [ ] **Step 1: 現 frontmatter 確認**

Run: `head -15 wiki/business/bsa/overview.md`
Expected: `status: active` が見える

- [ ] **Step 2: status を archived に変更 + 撤退ヘッダー追加**

Edit `wiki/business/bsa/overview.md`:
- frontmatter の `status: active` → `status: archived`
- frontmatter の `updated: 2026-05-10` → `updated: 2026-05-20`
- frontmatter `related` に `archive-notice` を追加
- 冒頭 H1「# BSA 戦略全体像」直後に以下のブロックを挿入:

```markdown
> **⚠ ARCHIVED 2026-05-20**: BSA 戦略は完全撤退しました。
> 撤退記録: [[archive-notice]]
> 後継戦略: `docs/superpowers/specs/2026-05-20-publishing-pivot-design.md`
```

- [ ] **Step 3: 変更確認**

Run: `head -20 wiki/business/bsa/overview.md`
Expected: archived 表示と撤退ブロックが見える

### Task 2.3: wiki/business/bsa/ 配下他ページの status を archived に

- [ ] **Step 1: 対象ファイル一覧**

Run: `grep -l "status: active" wiki/business/bsa/*.md 2>/dev/null`
Expected: pricing-catalog.md / proven-track-record.md / lessons-proposal-patterns.md 等が出る

- [ ] **Step 2: 各ファイルの status を archived に変更**

ただし `proven-track-record.md` は引き続き **note 記事素材として活用** するため、status はそのまま active 維持。frontmatter `tags` から `[bsa, ...]` の `bsa` だけ archived 化されたコンテキストに合うよう調整不要（tag は概念タグ）。

archive 対象（status: archived に変更）:
- `wiki/business/bsa/pricing-catalog.md`
- `wiki/business/bsa/lessons-proposal-patterns.md`
- `wiki/business/bsa/proposals/*.md`（存在する場合）
- `wiki/business/bsa/clients/*.md`（存在する場合）

各ファイル frontmatter:
- `status: active` → `status: archived`
- `updated:` 行を `2026-05-20` に更新

維持（status: active のまま）:
- `wiki/business/bsa/proven-track-record.md`（note 記事素材 SSOT として継続）
- `wiki/business/bsa/archive-notice.md`（撤退記録自体）

- [ ] **Step 3: 確認**

Run: `grep "status:" wiki/business/bsa/*.md`
Expected: archive-notice / proven-track-record のみ active、他は archived

### Task 2.4: CLAUDE.md の BSA セクションを書き換え

CLAUDE.md は LLM が起動毎に読む最上位ドキュメント。BSA 記述が残ったままだと混乱を招く。

- [ ] **Step 1: 現状の BSA セクション位置確認**

Run: `grep -n "^## " CLAUDE.md | head -30`
Expected: セクション一覧。BSA関連のセクション行番号を把握

- [ ] **Step 2: BSA関連セクションを以下に置換**

該当箇所:
- `## BSA戦略（2026-04-22〜2026-08-22）` セクション全体
- `## 最上位ミッション` 内の戦略KGI 1番目（BSA完走関連）

書き換え方針:
- 「## BSA戦略」セクション全体を「## 発信戦略（2026-05-20 ピボット）」に置換
- 戦略 KGI を発信中心に書き換え
- ルーティング表の BSA キーワード行を発信系に置換（具体内容は §2.5 ルーティング更新へ）

具体的な置換ブロックは spec §2 / §5 / §6 から導出。Edit ツールで該当範囲を一括置換する。

- [ ] **Step 3: 置換後の確認**

Run: `grep -n "BSA" CLAUDE.md | head`
Expected: 残存する BSA 言及は「archive 化された」「過去戦略」等のコンテキスト言及のみ

### Task 2.5: CLAUDE.md のルーティング表を発信系に更新

- [ ] **Step 1: 現ルーティング表内の BSA 関連行確認**

Run: `grep -nE "BSA|rapid-hp-operator|freelance-scout|工藤陸|Lancers|Coconala" CLAUDE.md | head -20`

- [ ] **Step 2: ルーティング表に発信系キーワード追加 / BSA 関連削除**

CLAUDE.md のルーティング表に追加するキーワード行:

```markdown
| note発信、note記事、Claude活用事例、AI tips、業務自動化記事、発信戦略、3媒体 | business-ops | brand-publisher（発信ストラテジスト統括） |
| バズ投稿、参考投稿、inspiration、ingest（publishing系）、wiki/publishing | business-ops | brand-publisher（`publishing-wiki-ingest.md` skill 参照） |
| コンテンツレビュー、AI感チェック、画像リッチ度、専門用語チェック、rubric | 横断 | content-reviewer |
| 画像生成、カルーセル、サムネ、note 図解、Instagram カルーセル、visual design system | 横断 | visual-designer |
```

削除するルーティング行（BSA 関連）:
- 「BSA、工藤陸、Lancers、Coconala、認定ランサー、提案投下、Week KPI」行
- 「ad-ops-specialist」を主担当としていた行（役割転換後は note 記事素材提供係）

- [ ] **Step 3: ルーティング確認**

Run: `grep -A1 "brand-publisher\|content-reviewer\|visual-designer" CLAUDE.md | head -20`

### Task 2.6: MEMORY.md の BSA 関連エントリの description 更新

memory は context window に常に load されるので、BSA 関連 description は「(archived)」を明示。

- [ ] **Step 1: 対象 entry 確認**

Run:
```bash
grep -n "bsa\|BSA" "$HOME/.claude/projects/-Users-rikukudo-Projects-private-agents-all-good-ops/memory/MEMORY.md"
```

- [ ] **Step 2: 該当行に "(archived 2026-05-20)" マーカー追加**

対象例:
- `[BSA戦略（ブートストラップ・アサシン）](project_bsa_strategy.md) — pointer 化済（SSOT は wiki/business/bsa/ 配下）。BSA キーワードでの wiki 入口役`

書き換え:
- 末尾に `— (archived 2026-05-20、後継は publishing-pivot spec)` を追加

同様に以下も:
- `[BSA Proposal Automation システム構成](reference_bsa_pa_system.md)` → archived マーカー追加
- `[ランサーズ提案画面 DOM 構造](reference_lancers_propose_dom.md)` → archived マーカー
- `[クラウドワークス提案画面 DOM 構造](reference_crowdworks_propose_dom.md)` → archived マーカー
- `[Coconala 提案画面 DOM 構造](reference_coconala_propose_dom.md)` → archived マーカー
- `[CrowdWorks Web 制作系カテゴリ ID](reference_crowdworks_categories.md)` → archived マーカー
- `[Coconala 公開依頼 Web 制作系カテゴリ ID](reference_coconala_request_categories.md)` → archived マーカー
- `[BSA戦略ドラフトファイル群](reference_bsa_drafts.md)` → archived マーカー
- `[価格・サービス表記 正本カタログ](reference_pricing_catalog.md)` → archived マーカー

維持（archive しない）:
- proven-track-record 系の reference は note 記事素材として継続活用
- 失業手当系・税法系・経理系は BSA と独立して維持

- [ ] **Step 3: 確認**

Run: `grep "archived 2026-05-20" "$HOME/.claude/projects/-Users-rikukudo-Projects-private-agents-all-good-ops/memory/MEMORY.md" | wc -l`
Expected: 8件前後（実際の archive 対象数）

### Task 2.7: Phase 2 commit

- [ ] **Step 1: 変更ファイル確認**

Run: `git status -s`
Expected:
- `M  CLAUDE.md`
- `M  wiki/business/bsa/overview.md`
- `M  wiki/business/bsa/pricing-catalog.md`
- `M  wiki/business/bsa/lessons-proposal-patterns.md`
- `?? wiki/business/bsa/archive-notice.md`
- など

- [ ] **Step 2: 個別 stage（git add -A は使わない）**

Run:
```bash
git add CLAUDE.md
git add wiki/business/bsa/archive-notice.md
git add wiki/business/bsa/overview.md
git add wiki/business/bsa/pricing-catalog.md
git add wiki/business/bsa/lessons-proposal-patterns.md
# その他 archive 対象を個別 add
```

- [ ] **Step 3: staged 確認**

Run: `git diff --cached --stat`
Expected: archive 対象ファイルのみ staged

- [ ] **Step 4: MEMORY.md の変更も別 stage（memory ファイルは home 配下）**

memory ファイルは all-good-ops リポ外の `~/.claude/projects/...` 配下。
別途確認して、必要なら git 管理外として直接保存。リポへの commit は不要。

- [ ] **Step 5: commit**

Run:
```bash
git commit -m "$(cat <<'EOF'
docs(bsa): Phase 2 BSA関連ドキュメント archive 化

- CLAUDE.md: BSA セクション削除、発信戦略セクション追加、
  ルーティング表に brand-publisher / content-reviewer / visual-designer
  追加、BSA関連キーワード削除
- wiki/business/bsa/overview.md: status archived + ARCHIVED ヘッダ
- wiki/business/bsa/pricing-catalog.md: status archived
- wiki/business/bsa/lessons-proposal-patterns.md: status archived
- wiki/business/bsa/archive-notice.md: 撤退記録 SSOT 新設

維持: proven-track-record.md (note 記事素材として継続活用)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3: エージェント凍結・役割転換

### Task 3.1: rapid-hp-operator.md を archive 化

- [ ] **Step 1: 現状確認**

Run: `head -20 .claude/agents/business-ops/rapid-hp-operator.md`
Expected: 既存 frontmatter（あれば）の確認

- [ ] **Step 2: frontmatter 追加 / status: archived 明記**

ファイル冒頭に以下を追加（既存内容の前に挿入。既存 frontmatter があれば status のみ追加）:

```markdown
---
status: archived
archived_at: 2026-05-20
archive_reason: BSA戦略撤退に伴う凍結。後継は brand-publisher。
related_spec: docs/superpowers/specs/2026-05-20-publishing-pivot-design.md
---

> **⚠ ARCHIVED 2026-05-20**: このエージェントは凍結中です。BSA 戦略撤退に伴い、
> 受注フロー（提案→受注→納品→継続運用）の責務は廃止。
> 後継: `brand-publisher`（発信統括）+ `content-reviewer`（品質）+ `visual-designer`（画像）
> 復活させる場合は spec を読んで判断すること。

```

(残りは既存内容そのまま)

- [ ] **Step 3: 確認**

Run: `head -15 .claude/agents/business-ops/rapid-hp-operator.md`
Expected: archived マーカーが見える

### Task 3.2: freelance-scout.md の役割を「紹介経由の受け口管理」に転換

- [ ] **Step 1: 現状の役割定義確認**

Run: `head -30 .claude/agents/business-ops/freelance-scout.md`

- [ ] **Step 2: 役割転換マーカーを追加**

ファイル冒頭に挿入:

```markdown
---
status: transitioned
transitioned_at: 2026-05-20
transition_reason: BSA戦略撤退。新規スキャン業務は停止し、紹介経由の問い合わせ受け口管理に転換。
related_spec: docs/superpowers/specs/2026-05-20-publishing-pivot-design.md
---

> **🔄 ROLE TRANSITIONED 2026-05-20**: 役割が変更されました。
>
> 旧役割: Lancers/Coconala/CrowdWorks のスキャン・提案投下
> 新役割: 紹介経由（個人ネットワーク・portfolio URL 経由）の問い合わせ受け口管理
>
> やらないこと:
> - 新規プラットフォームスキャン
> - 提案投下
> - BSA-PA との連動
>
> やること:
> - 紹介経由の問い合わせ受信時のヒアリング・要件整理
> - 案件可否判定（standard-stack 対応可否）
> - 受注確定後の client-manager 引継ぎ

```

- [ ] **Step 3: 確認**

Run: `grep -A1 "ROLE TRANSITIONED" .claude/agents/business-ops/freelance-scout.md`

### Task 3.3: ad-ops-specialist.md の役割を「note 記事素材提供係」に転換

- [ ] **Step 1: 現状確認**

Run: `head -30 .claude/agents/business-ops/ad-ops-specialist.md`

- [ ] **Step 2: 役割転換マーカーを追加**

ファイル冒頭に挿入:

```markdown
---
status: transitioned
transitioned_at: 2026-05-20
transition_reason: BSA戦略撤退に伴い、広告運用代行案件の提案責務を停止。note 記事素材提供係に転換。
related_spec: docs/superpowers/specs/2026-05-20-publishing-pivot-design.md
---

> **🔄 ROLE TRANSITIONED 2026-05-20**: 役割が変更されました。
>
> 旧役割: Google/Meta 広告運用、L3 提案（広告運用代行）、LPO ループ
> 新役割: 広告運用の実体験を note / X / Instagram 用の素材として整理・提供
>
> やらないこと:
> - 新規広告運用代行案件の提案
> - L3 商品ラインの推進
>
> やること:
> - proven-track-record の広告運用実績（CPA 84%削減等）を note 記事用に咀嚼
> - 広告運用 tips / Before-After 事例を brand-publisher / writer に提供
> - 過去案件の数字・学びを inspirations として wiki に整理（協力）

```

- [ ] **Step 3: 確認**

Run: `grep -A1 "ROLE TRANSITIONED" .claude/agents/business-ops/ad-ops-specialist.md`

### Task 3.4: Phase 3 commit

- [ ] **Step 1: 変更確認**

Run: `git status -s .claude/agents/`
Expected: 3 ファイルが Modified

- [ ] **Step 2: stage**

Run:
```bash
git add .claude/agents/business-ops/rapid-hp-operator.md
git add .claude/agents/business-ops/freelance-scout.md
git add .claude/agents/business-ops/ad-ops-specialist.md
```

- [ ] **Step 3: staged 確認**

Run: `git diff --cached --stat`

- [ ] **Step 4: commit**

Run:
```bash
git commit -m "$(cat <<'EOF'
chore(agents): Phase 3 BSA関連エージェント 3 体を凍結 / 役割転換

- rapid-hp-operator: status archived (BSA 撤退に伴う凍結)
- freelance-scout: status transitioned
  (新規スキャン停止、紹介経由の受け口管理に転換)
- ad-ops-specialist: status transitioned
  (広告運用代行提案停止、note 記事素材提供係に転換)

各エージェントは frontmatter + 冒頭ブロックで状態を明示。
ファイル本体は残し、戻し道を確保。

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 1-3 完了後の検証

### Verification: 撤退完了の確認

- [ ] **Verification 1: BSA-PA が走らないこと**

Run:
```bash
env | grep BSA_PA_NO_AUTO_SUBMIT
# Expected: BSA_PA_NO_AUTO_SUBMIT=1

crontab -l 2>/dev/null | grep -iE "bsa|proposal" | wc -l
# Expected: 0
```

- [ ] **Verification 2: wiki/business/bsa/ の status**

Run:
```bash
grep "^status:" wiki/business/bsa/*.md
# Expected: archive-notice と proven-track-record だけ active、他は archived
```

- [ ] **Verification 3: CLAUDE.md に BSA 関連 active 言及がないこと**

Run:
```bash
grep -c "BSA" CLAUDE.md
# Expected: 数件（archive コンテキスト言及のみ。アクティブな戦略記述はない）

grep -n "BSA戦略（2026-04-22" CLAUDE.md
# Expected: 0 件（BSA戦略セクション自体が削除されているか archive 注記のみ）
```

- [ ] **Verification 4: エージェント 3 体の status**

Run:
```bash
head -5 .claude/agents/business-ops/rapid-hp-operator.md | grep -E "status|archived"
head -5 .claude/agents/business-ops/freelance-scout.md | grep -E "status|transitioned"
head -5 .claude/agents/business-ops/ad-ops-specialist.md | grep -E "status|transitioned"
# Expected: それぞれの status マーカーが見える
```

- [ ] **Verification 5: 進行中案件が影響を受けていないこと**

Run:
```bash
ls outputs/clients/terra-isshiki/site/ 2>/dev/null | head
ls outputs/clients/minpaku-cleaning/ 2>/dev/null | head
# Expected: ファイルが普通に存在（撤退で影響を受けていない）
```

- [ ] **Verification 6: BSA-PA DB スナップショットの保全**

Run:
```bash
cat outputs/bsa/archive-snapshot/2026-05-20-deals-total.txt
# Expected: 0 (deals は最初から 0)

cat outputs/bsa/archive-snapshot/2026-05-20-jobs-status.txt | head
# Expected: CN/CW/LAN の status 内訳
```

### Final commit / push 判断

- [ ] **Step 1: ブランチ全体の commit ログ確認**

Run: `git log --oneline task/260520-publishing-pivot ^main | head -10`
Expected: spec + Phase 1 + Phase 2 + Phase 3 の commits

- [ ] **Step 2: push する場合**

Phase 1-3 は本ブランチ `task/260520-publishing-pivot` でまとめる。push は ユーザー判断。
本 plan の範囲では push は明示指示があるまでしない（spec 〜 Phase 3 まで自律実行で OK）。

- [ ] **Step 3: 次の Plan へ引き継ぎ**

Phase 4（新規エージェント・スキル・wiki 連携）の plan は別ファイルとして
`docs/superpowers/plans/2026-05-20-publishing-pivot-phase4.md` に作成する。
Phase 1-3 完了後、ユーザー確認の上で Phase 4 plan の writing-plans skill を再起動。

---

## トラブルシューティング想定

### crontab が空 (`no crontab for user`)

- Step 1.3.2 で削除対象がない場合、エラーではなく正常終了。スキップして Step 1.3.3 へ。
- crontab -l が exit code 1 で fail する場合: `crontab -l 2>/dev/null || true` で吸収。

### `~/.zshenv` が存在しない

- Step 1.2.1 の `>>` リダイレクトでファイル新規作成される。zsh は自動で読み込む。
- 念のため `chmod 644 ~/.zshenv` で権限調整。

### 既に `BSA_PA_NO_AUTO_SUBMIT=1` が設定済み

- Step 1.1.2 で確認した時点で既に設定済みなら、Step 1.2 全体スキップして Step 1.3 へ。

### CLAUDE.md の編集量が大きすぎる場合

- Phase 2 の Task 2.4 〜 Task 2.5 を 2 commit に分けても可。
- ただし 1 ブランチ内で完結させる。

### 進行中案件への影響発覚

- terra-isshiki / minpaku-cleaning は CLAUDE.md / wiki/business/personal/ 配下で独立管理。
- BSA archive で関係するファイルがない。
- もし影響があった場合は Phase 全体を revert し、影響範囲を spec に反映してやり直し。

---

## Self-Review チェックリスト

実装担当者 (subagent / inline) が Phase 1-3 完了後に確認:

- [ ] spec の §6.1（撤退対象）全 7 行に対応する task があるか
- [ ] spec の §6.2（残すもの）4 行が **触られていない**ことを確認
- [ ] BSA-PA 自動スクリプトが今後動かないことを cron / env 両方で確認
- [ ] wiki/business/bsa/proven-track-record.md は active のまま（note 記事素材）
- [ ] エージェント 3 体は **削除されていない**（凍結 / 役割転換のみ）
- [ ] ブランチが `task/260520-publishing-pivot` のままで、main に直接 commit していない
- [ ] 各 Phase 末で個別 commit されている（1 Phase = 1 commit が原則）

---

**最終更新**: 2026-05-20
**次のステップ**: Phase 4 plan の作成（別ファイル）
