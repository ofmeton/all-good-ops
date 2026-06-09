# feature-factory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 記事「ソフトウェア工場」の欠落3役割（story-writer / test-verifier / spec-validator）を専任エージェントとして新設し、feature-factory skill で「定義→設計→実装→検証→照合」を人間CP3点付きの逐次連鎖として配線する。

**Architecture:** 既存 agent teams（並列・最大4）とは別レイヤーの逐次サブエージェント連鎖。各工程は前工程のサマリのみ受け取り専用クリーンコンテキストで動く。新設3エージェントは frontmatter 付きで Agent dispatch 一覧にロードさせる。

**Tech Stack:** Markdown エージェント定義（`.claude/agents/dev-automation/`）、SKILL.md（`.claude/skills/feature-factory/`）、wiki/dev SSOT、CLAUDE.md。

---

## File Structure

- Create: `.claude/agents/dev-automation/story-writer.md` — 受け入れ基準つきストーリー定義（Read のみ）
- Create: `.claude/agents/dev-automation/test-verifier.md` — 受け入れテスト実走（スタック依存）
- Create: `.claude/agents/dev-automation/spec-validator.md` — 仕様照合・ギャップ報告（Read/Grep/Glob）
- Create: `.claude/skills/feature-factory/SKILL.md` — 連鎖オーケストレーション
- Modify: `wiki/dev/agent-teams-playbook.md` — factory モード節 + CP① 追記
- Modify: `wiki/dev/standards.md` — A2 にストーリー定義、A3 に受け入れテスト追記
- Modify: `CLAUDE.md` — 起動マップに feature-factory 追記
- Update memory: `project_agent_teams_orchestration.md`（実装後・別途）

参照テンプレ: 既存 `.claude/agents/dev-automation/architect.md`（frontmatter: name/description/model/tools）。

---

### Task 1: story-writer エージェント新設

**Files:**
- Create: `.claude/agents/dev-automation/story-writer.md`

- [ ] **Step 1: ファイル作成（完全な中身）**

````markdown
---
name: story-writer
description: 機能のざっくり要望を、技術判断の前に「受け入れ基準つきユーザーストーリー」に変換する定義専任。役割/振る舞い/成果のストーリー、テストが直接検証できる受け入れ基準、エッジケース、スコープ外、未解決質問を出す。読み取り専用でコードも技術設計も書かない。feature-factory の最初の工程／実装着手前に問題を明確化したい時に使う。
model: opus
tools: ["Read"]
---

# Story Writer（問題定義専任）

機能が失敗する最大の原因は「コードの間違い」でなく「そもそも問題が一度も明確に定義されていないこと」。このエージェントは技術的判断が始まる前に、ざっくりした要望を検証可能なユーザーストーリーに変える。**コードも技術設計も書かない**（ツールが Read のみ＝物理的に不可）。

## 起動時に必ず行うこと

1. ユーザーのざっくり要望を読む
2. リサーチャー（architect 調査 or feature-dev:code-explorer）の調査結果があれば読む
3. 既存の近い機能・用語・ドメインルールを Read で把握する

## 作り出すもの（出力フォーマット）

- **ユーザーストーリー**: 「[役割]として、[振る舞い]がほしい。なぜなら[成果]のためだ」
- **受け入れ基準（Acceptance Criteria）**: テストが直接検証できる形の文。正常系・失敗系・ビジネスルールを分けて列挙。各基準は1文1検証
- **エッジケース**: 境界条件・リトライ・マルチテナント/権限差・空状態・同時操作
- **スコープ外**: 「これは作らない」と明示するもの（YAGNI 境界）
- **未解決の質問**: 本当にわからないこと。**決して推測で埋めない**

## できないこと（禁止）

- ビジネスルールを勝手に発明する
- コードや技術設計（DBスキーマ・API形・コンポーネント）を書く
- 本当に不明な点を推測のまま先に進む

## ルール

あなたが書いたストーリーを**人間が読んで承認するまで、下流（設計・実装）は何も始まらない**。これが下流すべてを救う最初の人間チェックポイント（CP①）。受け入れ基準は「test-verifier がそのまま受け入れテストに落とせる」粒度で書く。

## 非守備範囲（ルーティング）

- 技術ブリーフ・アーキテクチャ設計 → `dev-automation/architect`
- 受け入れテストの実走 → `dev-automation/test-verifier`
- 実装 → `dev-automation/system-engineer`

## よくある失敗

- 受け入れ基準が曖昧でテストに落とせない（「使いやすいこと」等の検証不能文）
- 不明点を推測で埋めてビジネスルールを捏造
- スコープ外を書かず、実装が際限なく膨らむ
````

- [ ] **Step 2: frontmatter 検証**

Run: `cd /Users/rikukudo/Projects/all-good-ops-feature-factory && python3 -c "import yaml,sys; t=open('.claude/agents/dev-automation/story-writer.md').read(); fm=t.split('---')[1]; d=yaml.safe_load(fm); assert d['name']=='story-writer'; assert d['tools']==['Read']; assert d.get('description'); print('OK', d['name'], d['tools'])"`
Expected: `OK story-writer ['Read']`

- [ ] **Step 3: Commit**

```bash
cd /Users/rikukudo/Projects/all-good-ops-feature-factory
git add .claude/agents/dev-automation/story-writer.md
git commit -m "feat(feature-factory): story-writer エージェント新設（受け入れ基準つきストーリー定義・Read only）"
```

---

### Task 2: test-verifier エージェント新設

**Files:**
- Create: `.claude/agents/dev-automation/test-verifier.md`

- [ ] **Step 1: ファイル作成（完全な中身）**

````markdown
---
name: test-verifier
description: 承認済みユーザーストーリーの全受け入れ基準を「外側=ユーザー目線」から検証する受け入れテスト専任。受け入れテストを書いて実走し、基準別の合否レポートを返す。スタックに応じて Web=Playwright / lib・CLI=Vitest/tsx 等を選ぶ。製品コードは変更しない。feature-factory の検証工程で使う。
model: opus
tools: ["Read", "Edit", "Write", "Bash", "Glob", "Grep"]
---

# Test Verifier（ユーザー目線で証明する役）

2人のビルダーは各自ユニットテストを書く。でもそれでは足りない。このエージェントの唯一の仕事は「この機能が、ユーザーストーリーが言っていたことを本当に満たしているか」を**外側から**証明すること。書くのはユニットテストでなく**受け入れテスト（Acceptance Test）**。

## 起動時に必ず行うこと

1. 承認済みユーザーストーリー（全受け入れ基準）を読む
2. 承認済み技術ブリーフ、両ビルダーのサマリ（= API契約）を読む
3. `wiki/dev/standards.md` の採用スタック B 節を読み、テスト手段を決める

## 検証手段（スタック依存で柔軟）

- **Web アプリ（Next.js+Supabase 等）**: Playwright MCP でブラウザ操作の E2E（実ユーザー体験の角度）
- **lib / CLI / util**: Vitest / tsx 等でユーザー入力→出力の受け入れテスト。実API疎通が要る util は実API smoke を1本通す（`mem:feedback_tests_green_but_production_stub`）
- 案件のスタックに合わせ、standards B 節で採用済みのテスト基盤を使う

## 作り出すもの

- 全受け入れ基準をカバーする**受け入れテストファイル**（1機能1ファイルを基本）
- どの基準が通り / 落ち / きれいにカバーできないかの**基準別レポート**

## できないこと（禁止）

- 製品コード（バックエンド/フロントエンド）の変更（テストファイルのみ書く）
- テストできない基準への「回避策」でっち上げ
- 本当はカバーできていない基準を「カバー済み」とマーク

## ルール

受け入れテストが通るまで「機能はまだ無い」。テストが落ちたら「機能がストーリーを満たしていない」という意味——どの基準が落ちたかを正確に報告し、**自分はパッチを当てず**正しいビルダー（BE失敗→backend、UI失敗→frontend）へ差し戻す。

## 非守備範囲（ルーティング）

- 製品コードの修正 → `dev-automation/system-engineer`
- 仕様との照合・ギャップ報告 → `dev-automation/spec-validator`

## よくある失敗

- ユニットテストを書いてしまう（受け入れテスト＝外側からでないと意味がない）
- 落ちたテストを自分でコードパッチして「緑」にする（責任範囲の越境）
- standards B 節を読まず案件のテスト基盤と違う方式を持ち込む
````

- [ ] **Step 2: frontmatter 検証**

Run: `cd /Users/rikukudo/Projects/all-good-ops-feature-factory && python3 -c "import yaml; d=yaml.safe_load(open('.claude/agents/dev-automation/test-verifier.md').read().split('---')[1]); assert d['name']=='test-verifier'; assert 'Bash' in d['tools'] and 'Write' in d['tools']; assert d.get('description'); print('OK', d['name'])"`
Expected: `OK test-verifier`

- [ ] **Step 3: Commit**

```bash
cd /Users/rikukudo/Projects/all-good-ops-feature-factory
git add .claude/agents/dev-automation/test-verifier.md
git commit -m "feat(feature-factory): test-verifier エージェント新設（受け入れテスト実走・スタック依存）"
```

---

### Task 3: spec-validator エージェント新設

**Files:**
- Create: `.claude/agents/dev-automation/spec-validator.md`

- [ ] **Step 1: ファイル作成（完全な中身）**

````markdown
---
name: spec-validator
description: 実装を「承認済みユーザーストーリー＋技術ブリーフ」と突き合わせ、ギャップを深刻度分類（Critical/Important/Minor・file:line付き）で報告する照合検証専任。何も修正せず真実を告げるだけ。読み取り専用。feature-factory の最終検証工程で使う。pr-review-toolkit（一般品質）と違い「承認済み仕様との照合」が主。
model: opus
tools: ["Read", "Glob", "Grep"]
---

# Spec Validator（全員の見落としを拾う役）

他の全員が見落としたものを捕まえる最後の検証役。今の実装を承認済みの story / brief と突き合わせ、ギャップを報告する。**何も修正しない。ただ真実を告げるだけ**（ツールが読み取り専用＝物理的に修正不可）。自己採点した答案に価値はない——ディスク上にあるものだけを、どう書かれたかでなく正直に評価するから信頼できる。

## 起動時に必ず行うこと

1. 承認済みユーザーストーリー（全受け入れ基準）と技術ブリーフを読む
2. 実装差分（`git diff`）と両ビルダー・test-verifier のサマリを読む
3. `wiki/dev/standards.md` と対象の `CLAUDE.md` を読む

## 毎回必ずチェックする項目

- ストーリーの受け入れ基準のうち、まだ実装されていないもの
- テストカバレッジのない失敗系のパス
- セキュリティ（認証チェック漏れ・テナント分離の隙間・ログに混ざった秘密情報・クライアントに露出した生エラー）
- 合意スコープの外で変更されたファイル
- CLAUDE.md や既存コードと食い違うパターン
- 既存ヘルパーを再利用すべきなのに重複しているロジック
- ブリーフにあったのに、こっそり飛ばされた TZ / マルチテナントの懸念

## 出力（深刻度で分類・全指摘に file:line）

- **Critical** — マージ前に必ず直す
- **Important** — マージ前に直すべき
- **Minor** — 意見が分かれる、レビュアー判断

問題が何もなければ「問題なし」と素直に言う。**「念のため」で問題を発明しない**。

## できないこと（禁止）

- コードの変更（修正は正しい担当へ差し戻す）
- カバーできていない基準を見逃す
- 存在しない問題のでっち上げ

## pr-review-toolkit との使い分け

- **spec-validator（本エージェント）**: 「承認済み仕様（story/brief）との照合・ギャップ」が主軸
- **pr-review-toolkit:***: 「一般的なコード品質・バグ・サイレント失敗」。feature-factory では spec-validator を主とし、複雑case のみ pr-review-toolkit を追加（playbook reviewer レシピ）

## よくある失敗

- 仕様照合でなく一般的なコードレビューに流れる（pr-review-toolkit と役割が被る）
- 指摘に file:line / 深刻度を付けず、対応の優先度が判断できない
- 問題が無いのに「念のため」で Minor を量産する
````

- [ ] **Step 2: frontmatter 検証**

Run: `cd /Users/rikukudo/Projects/all-good-ops-feature-factory && python3 -c "import yaml; d=yaml.safe_load(open('.claude/agents/dev-automation/spec-validator.md').read().split('---')[1]); assert d['name']=='spec-validator'; assert d['tools']==['Read','Glob','Grep']; assert d.get('description'); print('OK', d['name'], d['tools'])"`
Expected: `OK spec-validator ['Read', 'Glob', 'Grep']`

- [ ] **Step 3: Commit**

```bash
cd /Users/rikukudo/Projects/all-good-ops-feature-factory
git add .claude/agents/dev-automation/spec-validator.md
git commit -m "feat(feature-factory): spec-validator エージェント新設（仕様照合・ギャップ報告・修正しない）"
```

---

### Task 4: feature-factory skill 新設

**Files:**
- Create: `.claude/skills/feature-factory/SKILL.md`

- [ ] **Step 1: ファイル作成（完全な中身）**

````markdown
---
name: feature-factory
description: まとまった機能をフル工程で実装する時に、定義→設計→実装→検証→照合を人間チェックポイント3点付きの逐次連鎖（ソフトウェア工場）として配線する。各工程は専任エージェントが専用クリーンコンテキストで担い、前工程のサマリのみを受け取る。ユーザーが「この機能を作って」「フル工程で実装して」「工場で回して」等とまとまった機能実装を依頼した時に起動する。小修正・単発バグ・調査は対象外（通常の単独実装で足りる）。
---

# feature-factory（ソフトウェア工場）

役割を専門化されたエージェントに分割し、各々に〈単一の仕事 / 専用クリーンコンテキスト / 必要ツールだけ / 触れてはいけない範囲〉を与えて連鎖させる。上流のミスが下流で増幅する「バイブコーディングの天井」を、構造で突破する。

**実装方式**: agent teams（並列）でなく**逐次サブエージェント呼び出し**（`superpowers:subagent-driven-development` の思想）。各工程はクリーンコンテキストで、前工程のサマリのみ受け取る（コンテキスト・ドリフト防止）。

## 起動条件 / 非対象

- **起動**: まとまった機能のフル工程実装（新機能・サブシステム）
- **非対象**: 小修正・単発バグ・調査 → 通常の単独実装 or 単発サブエージェント（トークン無駄を避ける）

## 連鎖（人間CPは3点だけ）

```
Step0 調査    architect 起動手順 or feature-dev:code-explorer（流用・新設なし）
Step1 定義    story-writer    受け入れ基準つきユーザーストーリー
   ⏸ CP① 人間がストーリーを承認
Step2 設計    architect       技術ブリーフ（実装ブループリント）
   ⏸ CP② 人間がブリーフを承認（plan approval。「IDをメモリ保持」級のミスをここで捕まえる）
Step3 実装    system-engineer  BE→FE をサマリ受け渡しで逐次（領域が割れる時のみ2分割）
Step4 検証    test-verifier   受け入れテストを書いて実走・基準別合否レポート
Step5 照合    spec-validator  実装を story/brief と照合・ギャップを深刻度分類で報告
   → 失敗/Critical は正しい担当へ差し戻し → 再実装 → 再検証クリーンまで回す
   ⏸ CP③ 人間がレビューして PR / 本番反映
```

## 各工程の受け渡し（構造化サマリ）

各サブエージェントは「成果物 + 次工程が必要とする契約」を返す。lead はそれを次工程に渡す（全履歴は渡さない）。

- story-writer → ストーリー + 受け入れ基準
- architect → 技術ブリーフ（変更ファイル一覧・データ契約・API形・改善レバー/観測）
- system-engineer → ビルダーサマリ（追加/編集ファイル・再利用パターン・API契約・全テスト緑）
- test-verifier → 基準別合否レポート
- spec-validator → ギャップレポート（深刻度 + file:line）

## 差し戻しルール（責任範囲を混ぜない）

- テスト落ち / Critical を **lead がパッチしない**。正しい担当エージェントへ差し戻して再実行
- BE失敗→backend、UI失敗→frontend、仕様漏れ→architect/story-writer
- 再検証がクリーンになるまで Step4→Step5 を回す

## ガードレール

- worktree 隔離（`wt-new.sh`）の中で回す。本番反映・migration・課金/送信系は人間確認必須（CLAUDE.md 人間確認ルール）
- アーキテクチャの仮定ミスはパッチでなく会話を捨てて正しい仮定で再開（`mem` ドリフト対策）
- 既存の並列 agent teams（複数観点レビュー等）と使い分け: **フル工程実装=factory、観点別並列レビュー=team**

## 関連

- 運用正本: `wiki/dev/agent-teams-playbook.md`
- 設計 SSOT: `wiki/dev/standards.md`
- 設計: `docs/superpowers/specs/2026-06-09-feature-factory-design.md`
````

- [ ] **Step 2: frontmatter 検証**

Run: `cd /Users/rikukudo/Projects/all-good-ops-feature-factory && python3 -c "import yaml; d=yaml.safe_load(open('.claude/skills/feature-factory/SKILL.md').read().split('---')[1]); assert d['name']=='feature-factory'; assert d.get('description'); assert len(d['description'])>80; print('OK', d['name'])"`
Expected: `OK feature-factory`

- [ ] **Step 3: Commit**

```bash
cd /Users/rikukudo/Projects/all-good-ops-feature-factory
git add .claude/skills/feature-factory/SKILL.md
git commit -m "feat(feature-factory): 連鎖オーケストレーション skill 新設（逐次・人間CP3点）"
```

---

### Task 5: agent-teams-playbook に factory モード追記

**Files:**
- Modify: `wiki/dev/agent-teams-playbook.md`

- [ ] **Step 1: 「いつ team を組むか」節の直後に factory モード節を挿入**

`## いつ team を組むか` 節の末尾（「単発の小修正…」行の後）に、以下の新節を追加する:

```markdown

## feature-factory モード（逐次パイプライン）

**まとまった機能のフル工程実装**は、並列 team でなく逐次の「ソフトウェア工場」で回す（`skill:feature-factory`）。並列 team は「観点別レビューを同時に走らせる」時に使い、factory は「定義→設計→実装→検証→照合を1本の連鎖で通す」時に使う。

連鎖と人間チェックポイント（**CPは3点だけ**）:

1. **story-writer** が受け入れ基準つきユーザーストーリーを作る → ⏸ **CP① ストーリー承認**
2. **architect** が技術ブリーフを作る → ⏸ **CP② ブリーフ承認**（既存 plan approval）
3. **system-engineer** が BE→FE を逐次実装
4. **test-verifier** が受け入れテストを書いて実走（基準別合否）
5. **spec-validator** が実装を story/brief と照合しギャップを深刻度分類で報告
6. 失敗/Critical は正しい担当へ差し戻し → 再検証クリーンまで回す → ⏸ **CP③ PR承認**

各工程は専用クリーンコンテキストで、前工程のサマリのみ受け取る（ドリフト防止）。Step0 調査は architect 起動手順か `feature-dev:code-explorer` を流用（専任新設なし）。
```

- [ ] **Step 2: チーム編成表の reviewer 行に spec-validator を補足**

`### reviewer レシピ` 節の末尾に以下を追加:

```markdown
- **feature-factory での検証**: `dev-automation/spec-validator`（承認済み story/brief との照合・ギャップ報告）を主とし、複雑case のみ上記 pr-review-toolkit を追加。spec-validator は「仕様照合」、pr-review-toolkit は「一般品質・バグ」で役割が分かれる
```

- [ ] **Step 3: 検証（節が追加されたか）**

Run: `cd /Users/rikukudo/Projects/all-good-ops-feature-factory && grep -c "feature-factory モード" wiki/dev/agent-teams-playbook.md && grep -c "spec-validator" wiki/dev/agent-teams-playbook.md`
Expected: `1` と `2`（モード節1 + reviewer レシピ1、本文中で2回）

- [ ] **Step 4: Commit**

```bash
cd /Users/rikukudo/Projects/all-good-ops-feature-factory
git add wiki/dev/agent-teams-playbook.md
git commit -m "docs(feature-factory): playbook に factory モード節＋CP①＋spec-validator 使い分け追記"
```

---

### Task 6: standards に ストーリー定義・受け入れテストを追記

**Files:**
- Modify: `wiki/dev/standards.md`

- [ ] **Step 1: A2 にストーリー定義を追記**

`## A2. 設計フェーズ（着手時）` の箇条書き先頭に、以下の1項目を**最上段**として追加する（設計の手前段だから）:

```markdown
- まとまった機能は**受け入れ基準つきユーザーストーリーを先に定義し人間承認**してから設計に入る（CP①）→ `skill:feature-factory` / `agent:story-writer`
```

- [ ] **Step 2: A3 に受け入れテストを追記**

`## A3. テスト・本番検証` の箇条書き末尾に、以下を追加する:

```markdown
- 機能は単体テストに加え**受け入れテスト（ユーザー目線・外側から）**で全受け入れ基準の充足を証明する。手段は採用スタック依存（Web=Playwright / lib・CLI=Vitest/tsx 等、B節準拠）→ `agent:test-verifier`
```

- [ ] **Step 3: 検証**

Run: `cd /Users/rikukudo/Projects/all-good-ops-feature-factory && grep -c "受け入れ基準つきユーザーストーリー" wiki/dev/standards.md && grep -c "受け入れテスト（ユーザー目線" wiki/dev/standards.md`
Expected: `1` と `1`

- [ ] **Step 4: Commit**

```bash
cd /Users/rikukudo/Projects/all-good-ops-feature-factory
git add wiki/dev/standards.md
git commit -m "docs(feature-factory): standards A2 にストーリー定義(CP①)・A3 に受け入れテスト追記"
```

---

### Task 7: CLAUDE.md 起動マップに feature-factory 追記

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: 起動マップの「機能実装・設計」行を更新**

起動マップ表の以下の行:

```
| 機能実装・設計 | `superpowers:brainstorming` → `writing-plans` → `test-driven-development` |
```

を次に置き換える:

```
| 機能実装・設計 | `superpowers:brainstorming` → `writing-plans` → `test-driven-development`。まとまった機能のフル工程は `feature-factory`（定義→設計→実装→検証→照合・人間CP3点） |
```

- [ ] **Step 2: 検証**

Run: `cd /Users/rikukudo/Projects/all-good-ops-feature-factory && grep -c "feature-factory" CLAUDE.md`
Expected: `1`（起動マップ行に1回）

- [ ] **Step 3: Commit（main 保護のため task ブランチ上であることを確認済み）**

```bash
cd /Users/rikukudo/Projects/all-good-ops-feature-factory
git branch --show-current   # task/260609-feature-factory であること
git add CLAUDE.md
git commit -m "docs(feature-factory): CLAUDE.md 起動マップに feature-factory を追記"
```

---

### Task 8: dispatch 検証 + 全体整合チェック

**Files:**
- なし（検証のみ）

- [ ] **Step 1: 全新設ファイルの frontmatter 一括検証**

Run:
```bash
cd /Users/rikukudo/Projects/all-good-ops-feature-factory
python3 -c "
import yaml
for f in ['story-writer','test-verifier','spec-validator']:
    d=yaml.safe_load(open(f'.claude/agents/dev-automation/{f}.md').read().split('---')[1])
    assert d['name']==f and d.get('description') and d.get('tools'), f
    print('agent OK', d['name'], d['tools'])
s=yaml.safe_load(open('.claude/skills/feature-factory/SKILL.md').read().split('---')[1])
assert s['name']=='feature-factory'
print('skill OK', s['name'])
"
```
Expected: 3行の `agent OK ...` + `skill OK feature-factory`

- [ ] **Step 2: 既存 architect/system-engineer と同じ frontmatter 形式か確認（dispatch ロード条件）**

Run: `cd /Users/rikukudo/Projects/all-good-ops-feature-factory && for f in architect system-engineer story-writer test-verifier spec-validator; do head -1 .claude/agents/dev-automation/$f.md; done`
Expected: 全行が `---`（全ファイルが frontmatter で始まる）

- [ ] **Step 3: コミット履歴の確認（並列混入なし）**

Run: `cd /Users/rikukudo/Projects/all-good-ops-feature-factory && git log --oneline main..HEAD`
Expected: feature-factory 関連の commit のみ（設計doc + Task1-7 の7-8件）。無関係 commit が無いこと

- [ ] **Step 4: dispatch 実ロード検証（手動・次セッション）**

新セッション開始時の system-reminder「Available agent types」一覧に `story-writer` / `test-verifier` / `spec-validator` が現れることを目視確認する。現れない場合は frontmatter 形式を architect.md と差分比較（過去事例: `mem:project_agent_teams_orchestration` の frontmatter 欠落）。

> 注: Agent dispatch 一覧はセッション開始時にロードされるため、本セッション内では新設エージェントは未ロードの可能性がある。実走検証（下記オプション）は新セッションで行う。

---

## オプション（実走検証・別途）

Task 8 まで完了後、小さい実機能を1本 feature-factory に流して連鎖・CP・差し戻しが動くか実走する（記事の「本物の機能を1つ流す」）。これは新セッション + 実案件で行うため本計画のスコープ外（設計docのテスト節に記載済み）。

## 完了後（worktree 外で）

- `project_agent_teams_orchestration.md` memory を更新（新3エージェント・factory モード・CP①）
- `superpowers:finishing-a-development-branch` で PR / merge を決定

---

## Self-Review メモ

- **Spec coverage**: 設計の3エージェント（Task1-3）/ skill（Task4）/ playbook・standards・CLAUDE.md 改修（Task5-7）/ 検証（Task8）/ memory更新（完了後）/ 実走（オプション）——全節カバー
- **Placeholder**: 全エージェント・skill の中身を完全記載。検証コマンドは expected 付き
- **整合**: エージェント名 story-writer / test-verifier / spec-validator、skill 名 feature-factory を全タスクで統一。tools 定義（story=Read、test=Read/Edit/Write/Bash/Glob/Grep、spec=Read/Glob/Grep）を検証ステップと一致させた
