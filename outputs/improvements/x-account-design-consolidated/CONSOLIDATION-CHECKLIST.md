# Consolidation Checklist — 改訂シリーズ統合運用手順

> 目的: バージョン更新時の **抜け漏れ防止**
> 由来: 2026-05-27 PR #27 で 4 統合ファイル merge 後、ユーザー指摘で 54 件抜け漏れ (重大 18 / 詳細 24 / 軽微 12) が判明。再発防止のため運用手順を明文化。
> 関連: [`completeness-audit-report.md`](./completeness-audit-report.md) (54 件詳細) / [`INDEX.md`](./INDEX.md) (統合方針 4 ルール) / [cs:s1-71 consistency review ≠ completeness review](http://localhost:3001/rules/s1-71)

---

## 1. 統合ファイル更新の Trigger

以下のいずれかが発生したら、本 checklist を必須実行:

| Trigger | 例 |
|---|---|
| 新規バージョン追加 | メイン設計書 v10.4 / Style Guide v1.5 / Competitor Report v4 / Query Design v3 |
| 既存版の inline patch | v10.3 §X.Y の数値訂正、Style Guide v1.4 §Z 削除 |
| 新シリーズ追加 | 「Visual Design System 統合版」など第 5 シリーズの誕生 |
| 月次監査 | 毎月 1 日に過去 1 ヶ月の元 file 変更を統合版に反映 |

## 2. 統合作業の 7 ステップ手順 (必須実行順)

### Step 1: 新規元 file の特定 + diff base 確定

- `git log --since="<前回統合日>" --diff-filter=AM -- outputs/improvements/x-account-design-v*` 等で変更 file を一覧
- 各元 file の **全 `## / ### / ####` 見出し** + 中身キーワードを抽出

### Step 2: 元 16 (+α) ファイル vs 統合 4 ファイルの完全 diff

**重要 (cs:s1-71)**: 「consistency review」(SSOT 整合性) と「completeness review」(全節保持) は**別の確認ステップ**。両方必須:

```bash
# 全節タイトル diff (見出しレベル)
for src in outputs/improvements/x-account-design-v*.md outputs/improvements/x-account-design-v10-phase0*/*.md; do
  echo "===$src==="
  grep -nE "^## |^### |^#### " "$src"
done > /tmp/src-headings.txt

for tgt in outputs/improvements/x-account-design-consolidated/*-all-versions.md; do
  echo "===$tgt==="
  grep -nE "^## |^### |^#### " "$tgt"
done > /tmp/tgt-headings.txt

# 元 file 由来のキーワードが統合版でヒットするか確認
keywords=("Writer エージェント" "Hook Analyzer" "Interviewer" "Visualizer" "Optimizer 3 フェーズ" "X format 比率" "短文 60%" "Thompson Sampling" "PCR" "publishing_lag" "業法ガード" "DLP redaction" "PSM" "OAuth PKCE")
for kw in "${keywords[@]}"; do
  echo "=== $kw ==="
  grep -cE "$kw" outputs/improvements/x-account-design-consolidated/*-all-versions.md
done
```

抜け漏れ候補をリスト化。

### Step 3: 抜け漏れ箇所を統合ファイルに補完

補完時の遵守事項:
- **省略なしルール** (INDEX §1 ルール 1): 元 file の節タイトル + 本文を**一字一句変えずに**統合版に挿入。要約禁止
- **バージョン来歴ヘッダー** (INDEX §1 ルール 2): 各節冒頭に `*Version History*: ...` を 1 行
- **原値保持** (INDEX §1 ルール 4, cs:s2-68): range / 単一値 / classification 軸を縮退させない
- **Deprecated 節**: 削除された節は §3 で原文保持、`Status: Deprecated in vX (理由: ...)` 注記

### Step 4: silent reduction 検出 (cs:s2-68 / Style Guide v1.4 §2.14)

数値・分類・範囲が縮退していないか cross-doc で確認:

- 投稿頻度 (X / note / Instagram): 元値が下限のみに丸まっていないか
- cron 頻度 (海外X / GitHub Trending 等): 高優先度ソースが低優先度より粗くなっていないか (priority inversion 防止)
- 4 排他軸 / Hook 16 種: 軸数や類型数が減っていないか
- 価格設計 / KPI: range や段階区分が単一値化していないか

検出時は **元値復元 + history 注記**。silent reduction 防止策の根拠は [Style Guide 統合版 §2.14 v1.4 差分まとめ](./style-guide-all-versions.md) 参照。

### Step 5: 推定 / 未検証記述の排除 (cs:s3-72)

統合作業中、sub-agent が「○○のため」と推定で書いた記述は **原典 verify が取れない場合削除**:

- ✅ 良い例: 「v1.4 で復元 (オリジナルに切替理由の明記なし、Phase 1 で要検証)」
- ❌ 悪い例: 「コンテンツ品質を保つために 1 投稿/日 が現実的と判断され」 (原典に明記なし、推定)

判定基準: 原典 (元 file の該当節) に同等の記述が grep でヒットしなければ、**推定** として削除する。

### Step 6: Codex MCP クロスレビュー (2 観点並行)

**観点 1: Consistency Review** (SSOT 整合性 / cross-doc schema / 旧 file 名残存)
- Codex prompt に「Schema Consistency / SSOT 整合性 / cross-reference 検証」を明示

**観点 2: Completeness Review** (省略なしチェック ← 別観点)
- Codex prompt に「元 file の全節が統合版で保持されているか」を明示
- audit report の §6 補完計画と照合してもらう

[cs:s2-73 (1 ラウンド全件 fix で 4 ラウンド削減)](http://localhost:3001/rules/s2-73) に従い、全 fail を 1 ラウンドで挙げてもらう prompt 設計。

### Step 7: PR → squash merge → main URL 提示

[cs:s1-63 / s2-63 / s3-63 worktree workflow](http://localhost:3001/rules/s3-63) に従う:

1. file 単位で git add (`git add -A` 禁止、cs:p3-edb3)
2. `git diff --cached --stat` 確認
3. commit (HEREDOC + Claude footer)
4. push -u origin
5. gh pr create
6. **worktree remove (merge 前、cwd は main repo に戻す)**
7. gh pr merge --squash --delete-branch
8. main HEAD 到達確認
9. GitHub UI URL 5 本以上提示

---

## 3. 抜け漏れ防止の必須チェック (毎回)

### CL-1: 元 file の全 `## / ### / ####` 見出しが統合版に対応する節を持っているか

抜け漏れ典型例 (2026-05-27 audit で発覚):
- `Writer エージェント` / `Hook Analyzer` / `Interviewer` の個別ロジック節
- `素材レイヤー 2 系統` (v9 §3.1)
- `X format 比率` (v9-2 §1.2)
- `Optimizer 改善対象 3 区分` (v9 §4.X)
- `§11 クロスレビュー 50 件` (v10.X)
- `§9 データフロー + observability`
- `§5.2 LINE Daily Digest / Weekly Brief`
- `§3.3 コスト試算 workload 表` / brownout 発動条件
- `§13 レビュアー依頼`

### CL-2: 重要キーワードが統合版本文に出現するか

- 数値: 投稿頻度 / cron / 価格 / KPI 閾値 / Phase 別目標 / Editor +N ルール
- 分類: 4 排他軸 / Hook 16 種 / publishing_lag / Editor +5 ルール
- エージェント名: Writer / Editor / Hook Analyzer / Interviewer / 選別 / Visualizer / Optimizer
- 設計概念: 素材レイヤー 2 系統 / Thompson Sampling / PSM / OAuth PKCE / DLP redaction / 業法ガード

### CL-3: 推定記述の有無

- 「〜のため」「〜と判断され」「〜と推定される」を grep → 各箇所で原典 verify
- 原典に明記なしの場合、推定削除 + 「Phase 1 で要検証」注記

### CL-4: 数値の cross-doc 一致

- X 投稿頻度 (30/月) / note (4-6/月) / Instagram (月 12) が main-design / Style Guide / Competitor Report / Query Design 4 ファイルで一致
- 4 排他軸 (translation 10 / paraphrase 20 / opinion 30 / first_hand 40) が main-design §2.4 + Style Guide v1.3 で一致
- Hook 16 種 / publishing_lag が全 SSOT で一致

### CL-5: 旧 file 名 cross-reference が統合 file 名 + 節番号に置換済 (cs:s2-73)

```bash
grep -rE "(style-guide-v1\.[0-9]+\.md|competitor-report-v[0-9]+\.md|query-design-v[12]?\.md|x-account-design-v[0-9]+(-[0-9])?\.md)" outputs/improvements/x-account-design-consolidated/
```

進化年表 (§1) / Deprecated 注記 / historic to-do は意図的保持 OK。本文中の SSOT 参照は全置換。

---

## 4. 将来追加バージョンへの対応例

### 例: メイン設計書 v10.4 が追加された場合

1. **Step 1**: `git log` で v10.4 ファイル特定
2. **Step 2**: v10.4 の全節タイトル抽出 → 統合 `main-design-all-versions.md` に追加すべき節を特定
3. **Step 3**: 統合版 §1 進化年表に v10.4 行追加 + §2 統合本文 / §3 Deprecated / §4 マトリクスに v10.4 列追加
4. **Step 4**: silent reduction 検出 (v10.4 で数値変更があれば §3.X Deprecated に旧値保持)
5. **Step 5**: 推定記述排除 (v10.4 の改訂理由は原典記述のみ採用)
6. **Step 6**: Codex 2 観点クロスレビュー
7. **Step 7**: PR → main

### 例: 新シリーズ E (Visual Design System) 統合版が必要になった場合

1. INDEX.md §1 統合ファイル一覧に E を追加
2. `visual-design-system-all-versions.md` を新規作成 (構造は A/B/C/D と統一: §0〜§5)
3. INDEX.md §2 統合ファイル一覧テーブルに E 行追加
4. SSOT pointer を §4 現行 SSOT に追記
5. 統合作業は本 checklist の Step 1-7 に従う

---

## 5. monitor / 月次運用

毎月 1 日 (月次監査と合わせて):

- [ ] 元 file (`outputs/improvements/x-account-design-v*.md` 等) で過去 30 日変更 file を `git log` で抽出
- [ ] 変更があれば本 checklist の Step 1-7 を実行
- [ ] CONSOLIDATION-CHECKLIST.md の改訂が必要なら本ページ更新
- [ ] 月次監査レポート (`outputs/audits/202X-XX/`) に「統合 file 同期状況」を記録

---

## 6. 関連ドキュメント

- [`INDEX.md`](./INDEX.md) — 統合方針 4 ルール SSOT
- [`completeness-audit-report.md`](./completeness-audit-report.md) — 2026-05-27 監査結果 54 件
- [`review-consolidated-self.md`](./review-consolidated-self.md) — 10 軸 cross-doc 比較表 (Round 1 セルフレビュー)
- [Style Guide 統合版](./style-guide-all-versions.md) §2.14 / §4.5 — silent reduction 検出パターン SSOT
- CLAUDE.md (project root) — エージェント体制全体
