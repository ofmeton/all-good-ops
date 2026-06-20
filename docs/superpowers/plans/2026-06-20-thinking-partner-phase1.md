# 思考パートナー Phase 1（MVP）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 考えるべきテーマを捕捉→置き場→起動→完結まで運ぶ思考パートナーのローカルMVPを敷き、1人で1周回せる状態にする。

**Architecture:** journaling の型を土台にした「双子」。私的データは `~/journal/think`（git管理外）に置き、起動は `.claude/skills/thinking/SKILL.md`。捕捉はローカル `inbox.md` への追記、着手は毎朝の cloud routine ナッジ。journaling と違い「結論／次の一手」まで押し込む grill-me 寄り伴走。

**Tech Stack:** Markdown（CARTE / inbox / entries）、Claude Code skill（SKILL.md）、claude.ai cloud routine。コード・依存追加なし。

## Global Constraints

- 思考の中身（対話・結論）は `~/journal/think` のみ。`raw/facts/`・`outputs/`・wiki 等の git push 対象に思考の中身を書かない（journaling と同じ私的領域扱い）
- `~/journal` は git管理外・リポジトリ外
- リポジトリ成果物（SKILL.md / CLAUDE.md 追記）は worktree `worktree-thinking-partner-design` で作業し commit する
- 対話の核：毎回「結論 / 次の一手 / 次に考える問い」のどれかに必ず落とす。ただしナッジ・着手は強制しない（スキップOK）
- 内省・感情の深掘りは journaling へ送る（越境しない）。仕事の振り返りは session-retrospective（別物）

---

### Task 1: ローカルデータ土台（CARTE / inbox / entries）

思考パートナーの SSOT とインボックス・記録置き場を `~/journal/think` に作る。私的・git管理外。

**Files:**
- Create: `~/journal/think/CARTE.md`
- Create: `~/journal/think/inbox.md`
- Create: `~/journal/think/entries/.gitkeep`（ディレクトリ作成用・実際は git 管理外なので空ファイルで足りる）

**Interfaces:**
- Produces: `~/journal/think/CARTE.md`（skill が起動時に読む SSOT）、`~/journal/think/inbox.md`（状態マーク付きテーマ一覧）、`~/journal/think/entries/`（1セッション=1ファイルの記録先）

- [ ] **Step 1: ディレクトリ作成**

Run:
```bash
mkdir -p ~/journal/think/entries
```
Expected: エラーなし

- [ ] **Step 2: CARTE.md を書く**

`~/journal/think/CARTE.md` に以下を作成：
```markdown
# 思考パートナー CARTE（SSOT）

陸さんが「考えなきゃ」と思いつつ考えられないテーマに、Claude が対話で伴走する。
内省・感情の記録（journaling）とは別物。仕事の振り返り（session-retrospective）とも別物。

## 役割
- 一緒に考える伴走者。答えを押し付けず、根拠と問いをセットで返す。決めるのは本人
- **目的は結論への前進**。journaling と違い「考えっぱなし」で終わらせない

## 対話の核
- grill-me 式に前提・抜け・反例・機会費用を突く。ただし詰問でなく一緒に考えるトーン
- 白紙を渡さない。最初の問いをこちらから置く
- いつもの思考ループをぐるぐるしてると感じたら、ルートから外れる問いを一つ差し込む
- 過剰な称賛はしない。温かく、でも忖度しない

## テーマ種別ごとの深さ
- 判断・意思決定 → 選択肢と決め手（基準）を明確化し、保留してる理由を言語化
- 戦略・長期の問い → 問いそのものを再定義してから考える
- アイデア・構想 → 発散させてから1個に絞る
- 内省・自分の状態 → journaling 側へ送る（ここでは深掘りしない）

## 完結（必ず）
一区切りで **結論 / 次の一手 / 次に考える問い** のどれかを言語化し、entries に記録する。
どれにも落ちないなら「なぜ落ちないか」を1行残す（それも前進）。

## entry 索引
（ここに 1 行ずつ追記：YYYY-MM-DD-<slug> — 一行要約）
```
Expected: ファイル作成

- [ ] **Step 3: inbox.md を書く**

`~/journal/think/inbox.md` に以下を作成：
```markdown
# 思考インボックス

> 状態マーク: `[ ]` 未着手 / `[~]` 思考中 / `[x]` 完結
> 捕捉は「考えたい：〇〇」と一言 → ここに1行追記するだけ（評価・着手はその場でしない）

## テーマ
```
Expected: ファイル作成

- [ ] **Step 4: entries ディレクトリの保持**

Run:
```bash
touch ~/journal/think/entries/.gitkeep
```
Expected: エラーなし

- [ ] **Step 5: 検証**

Run:
```bash
ls -la ~/journal/think ~/journal/think/entries
```
Expected: `CARTE.md`・`inbox.md`・`entries/` が存在。これらは git管理外（コミット不要）

---

### Task 2: thinking skill（SKILL.md）

「考えたい」等で起動し、CARTE を読んで思考パートナーモードに入る skill。

**Files:**
- Create: `.claude/skills/thinking/SKILL.md`

**Interfaces:**
- Consumes: Task 1 の `~/journal/think/CARTE.md`・`inbox.md`・`entries/`
- Produces: skill `thinking`（起動フレーズで自動起動・description に起動条件）

- [ ] **Step 1: SKILL.md を書く**

`.claude/skills/thinking/SKILL.md` に以下を作成：
```markdown
---
name: thinking
description: 陸さんが「考えなきゃ」と思いつつ考えられないテーマに、Claude が対話で伴走して結論／次の一手まで押し込む。ユーザーが「考えたい」「思考タイム」「頭の棚卸し」「思考する」「これ考えなきゃ」「一緒に考えて」等、思考テーマに向き合いたい時に起動する。感情・内省の記録（journaling）、仕事の振り返り（session-retrospective）とは別物。
---

# 思考パートナー伴走

陸さんの「考えるべきテーマ」に対話で伴走する。結論まで押し込むのが journaling との違い。

## 起動時に必ず
1. `~/journal/think/CARTE.md` を読む（役割・型・方針の SSOT。git管理外）
2. `~/journal/think/inbox.md` を読む（未着手 `[ ]` / 思考中 `[~]` のテーマを把握）

## 進め方
1. inbox から今日向き合うテーマを1つ提示（複数あれば本人に選ばせる。捕捉だけしたいなら inbox に追記して終了）
2. 白紙を渡さない。テーマ種別を見極め、最初の問いをこちらから置く（CARTE のテーマ種別ガイド準拠）
3. grill-me 式に前提・抜け・反例・機会費用を突きながら一緒に考える。決めるのは本人
4. 内省・感情の話に逸れたら journaling へ送る（越境しない）

## 完結（必ず）
一区切りで **結論 / 次の一手 / 次に考える問い** のどれかを言語化する。
- `~/journal/think/entries/YYYY-MM-DD-<slug>.md` に作成/追記（きっかけ・見えたこと・落とした結論/次の一手）
- inbox の状態を更新（`[~]` 継続 / `[x]` 完結）
- CARTE 末尾の entry 索引を1行更新

## 捕捉だけのとき
「考えたい：〇〇」と放られたら、対話に入らず inbox に1行追記して終わる（着手はしない）。

## プライバシー（厳守）
- 保存先は `~/journal/think/`（git管理外・リポジトリ外）のみ。git push 対象（raw/facts・outputs・wiki）に思考の中身を書かない
- 完結内容が契約・案件の**事実決定**の時のみ「raw に記録する？」と確認して raw/facts へ昇格（自動ではしない）
- 詳細は memory `project_journaling_system.md` のプライバシー規約に準ずる
```
Expected: ファイル作成

- [ ] **Step 2: 起動確認**

Run:
```bash
ls .claude/skills/thinking/SKILL.md && head -3 .claude/skills/thinking/SKILL.md
```
Expected: ファイル存在・frontmatter の name/description が出る

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/thinking/SKILL.md
git commit -m "feat(thinking): 思考パートナー skill（思考版ジャーナリング）"
```

---

### Task 3: CLAUDE.md に捕捉導線とルーティングを追記

捕捉運用（「考えたい：〇〇」→ inbox）と skill の存在を CLAUDE.md に1〜2行で着地させる。肥大させない。

**Files:**
- Modify: `CLAUDE.md`（「秘書が唯一の一次窓口 + ルーティング」内の「非自明なルーティング」付近）

**Interfaces:**
- Consumes: Task 2 の skill `thinking`、Task 1 の `~/journal/think/inbox.md`

- [ ] **Step 1: 現状の該当箇所を確認**

Run:
```bash
grep -n "振り返り = secretary 直処理" CLAUDE.md
```
Expected: 「非自明なルーティング」内の該当行番号が出る

- [ ] **Step 2: 1行追記**

`CLAUDE.md` の「非自明なルーティング」リストに以下の1行を追加（journaling 行があればその近く）：
```markdown
- 個人の思考テーマ = `thinking` skill（思考版ジャーナリング・対話で結論まで）。捕捉は「考えたい：〇〇」→ `~/journal/think/inbox.md` 追記。内省・感情は journaling（別物）
```
Expected: 1行追加のみ。他の行は変えない

- [ ] **Step 3: 差分確認**

Run:
```bash
git diff CLAUDE.md
```
Expected: 1行追加のみの diff

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(thinking): CLAUDE.md に思考パートナーの捕捉導線とルーティング追記"
```

---

### Task 4: 毎朝の cloud routine（ナッジ）

journaling の22:00 routine と同型の、毎朝の一声ナッジ。強制しない。

**Files:**
- 設定先: claude.ai cloud routines（https://claude.ai/code/routines）。リポジトリ成果物なし

**Interfaces:**
- Consumes: skill `thinking`（ナッジから本人が `/think` 相当を起動）

- [ ] **Step 1: routine 文面を確定**

ナッジ文面（強制しないトーン）：
> おはようございます。今日の思考タイム、インボックスに溜まってるテーマを1つだけ一緒に考えませんか？ 気が乗らなければスキップでOK。「考えたい：〇〇」と新しく放るだけでも◎

- [ ] **Step 2: cloud routine を作成**

`schedule` skill または https://claude.ai/code/routines で毎朝（例：平日 08:00 JST）に上記文面をプッシュする routine を作成。journaling routine（22:00）と時間が被らないこと。
※この手順は人間（陸さん）が claude.ai 上で実行。routine id を控える。

- [ ] **Step 3: 記録**

作成した routine id を Task 5 完了時に memory へ残す（journaling の記載に倣う）。

---

### Task 5: エンドツーエンド検証（1周回す）

捕捉→着手→起動→完結が実際に1周回ることを確認する。これがこの計画の「テスト」。

**Files:**
- 検証のみ（`~/journal/think/` の中身が更新される）

- [ ] **Step 1: 捕捉**

任意のセッションで「考えたい：〇〇（実テーマ）」と発話 → `~/journal/think/inbox.md` に `[ ] 〇〇` が追記されることを確認。

- [ ] **Step 2: 起動**

「思考タイム」と発話 → `thinking` skill が起動し、CARTE と inbox を読み、テーマを提示して最初の問いを置くことを確認。

- [ ] **Step 3: 対話→完結**

数往復対話 → 一区切りで「結論／次の一手／次に考える問い」のどれかに落ち、`~/journal/think/entries/YYYY-MM-DD-<slug>.md` が作成され、inbox の状態が更新され、CARTE の索引が1行増えることを確認。

- [ ] **Step 4: プライバシー確認**

Run:
```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops && git status --porcelain | grep -i journal || echo "OK: journal は git に出ていない"
```
Expected: `OK: journal は git に出ていない`（思考の中身が push 対象に漏れていない）

- [ ] **Step 5: memory 反映**

`project_journaling_system.md` に倣い、新規 memory `project_thinking_partner.md` を作成（仕組み・保存先・routine id・プライバシー規約・Phase2予定）、MEMORY.md 索引に1行追加。

---

## Phase 2（別計画・予約）

Telegram からの捕捉は hermes（GCP VM 24/7）改修を伴う別サブシステム。MVP の1周実証後に別計画として起こす：
1. Notion「思考インボックス」DB 作成（見出し・状態・捕捉日のみ）
2. hermes の Telegram 受けに思考捕捉ルート追加（`考えたい：` プレフィックスで task でなく思考インボックスへ）
3. skill が Notion インボックスとローカル inbox.md 両方を読むよう更新
4. 完結時に Notion 側状態も done に更新

## Self-Review

- **Spec coverage:** 4関所（捕捉=Task1/3/5・着手=Task4・起動=Task2/5・完結=Task2/5）／データ分離（Task1）／対話スタイル（Task2 CARTE）／プライバシー（Global + Task5 Step4）／Phase分割（本文 + Phase2予約）すべて対応。
- **Placeholder scan:** TBD/TODO なし。CARTE・SKILL・CLAUDE 追記は実コンテンツを記載済。
- **Type consistency:** パス（`~/journal/think/{CARTE.md,inbox.md,entries/}`）・skill 名（`thinking`）・状態マーク（`[ ]`/`[~]`/`[x]`）・完結3択（結論/次の一手/次に考える問い）を全タスクで統一。
