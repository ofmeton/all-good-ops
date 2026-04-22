# CLAUDE.md 健全性レビュー

> 目的: CLAUDE.md が実態と乖離していないかを定期検査し、形骸化した記述・数字ミス・未反映の戦略変更を検出する。

## 発動タイミング
- 四半期1回の定期レビュー
- 戦略変更・大型プロジェクト開始時
- 月次監査（monthly-audit.sh）の補助
- ユーザーから「CLAUDE.md 精査したい」の依頼

## 壁打ち進行
- 自己判断できる数字・ファクト修正は「自己修正でいく予定」としてまとめて提示
- KGI変更・ルール変更等の判断はユーザーに具体質問で投げる
- 承認後は一気出しで書き換え案を提示 → Go をもらって一括実装

## チェックリスト

### 1. 数字の整合性
- [ ] エージェント総数: `find .claude/agents -name "*.md" | wc -l` vs CLAUDE.md の「XX エージェント」表記
  - ※ `*-sop.md` のような SOP ファイルはエージェント本体ではないので除外カウント
- [ ] 部門別内訳: `for d in .claude/agents/*/; do echo "$d: $(find "$d" -name "*.md" | wc -l)"; done` vs CLAUDE.md の部門一覧
- [ ] スキル総数: `ls .claude/skills/*.md | wc -l` vs CLAUDE.md の「XX 冊」表記
- [ ] パイプライン段階数: CLAUDE.md 見出し（N段階）vs 実際の項目数

### 2. ルーティング表 vs 実ファイル
- [ ] 表中の各エージェント名が `.claude/agents/` に存在するか
- [ ] 新規エージェントがルーティング表に入っているか
- [ ] 外部スポーク参照先パスの実在確認（`ls -d /Users/rikukudo/Projects/<spoke>`）

### 3. 戦略KGI と現状の整合
- [ ] KGI 各項目が現在のプロジェクト状況と一致しているか
- [ ] 凍結・保留・達成済み項目が更新されているか
- [ ] 優先順位が現実と一致しているか
- [ ] 現行プロジェクト（BSA 等）の核ルールが戦略KGI or 専用セクションに反映されているか

### 4. 形骸化記述の検出
- [ ] 「導入予定」「将来対応」等の記述がいつから予定のままか
- [ ] セッション開始動作など自動化されるべきルールが実運用されているか
  - `tail -20 data/usage-log.jsonl` で直近セッション種別を確認
- [ ] 熟議プロセスの発動履歴: `grep -i "deliberat\|熟議" data/usage-log.jsonl`
- [ ] GitHub運用の「develop ブランチ経由」等、実際のgit運用と乖離していないか
  - `git log --oneline -30 --all | head` で最近のブランチ運用確認

### 5. 自動化実態の確認
```bash
# cron / LaunchAgent 登録状況
ls ~/Library/LaunchAgents/ | grep -iE "claude|allgoodops"

# 改善ループの稼働状況
tail -3 data/improvement-log.jsonl

# MCP 設定（LINE/Codex 等の導入状態）
grep -iE "line|codex|<対象mcp>" ~/.claude.json | head -5

# knowledge の更新鮮度
ls -la knowledge/context/ knowledge/INDEX.md 2>/dev/null
```

### 6. 命名・名義ルールの一貫性
- [ ] 名義3ライン（工藤陸 / ofmeton / はぐりん）の切り分け表が存在し混在禁止が明記されているか
- [ ] AI表記ルール: 外部露出物に「Claude」「Opus」「Anthropic」等の固有名詞混入なし
- [ ] 価格記述が `knowledge/context/pricing-catalog.md`（SSOT）と一致

### 7. メモリとの整合
- [ ] MEMORY.md の project / reference 系記述と CLAUDE.md の現状が合うか
- [ ] 陳腐化したメモリの削除・更新
- [ ] reference 系で「〇本」等の数字が実態と合うか

## アウトプット形式

検出された乖離を以下のフォーマットで列挙：

```
| # | 項目 | CLAUDE.md 記述 | 実態 | 優先度 | 扱い |
|---|------|----------------|------|--------|------|
| 1 | エージェント数 | 33 | 34 | 中 | 自己修正 |
| 2 | AIコスト上限KGI | 月5000円 | 実態不明 | 高 | ユーザー判断 |
...
```

- 自己判断で直せる（数字修正、形骸化記述の整理）: 優先度と共にリスト化
- ユーザー判断が必要（KGI変更、エージェント新設・削除、戦略方針）: 質問形式で提示

## 注意事項
- **会話冒頭の `git status` は snapshot time のため古い**。作業開始時に必ず最新を取り直す
- untracked ファイルは最初の status では見落としやすい。`ls -la` や `find` で念入りに確認
- エージェント新設が絡む場合は `agent-onboarding.md` スキルに従う
- 書き換え前にユーザー承認を取る（CLAUDE.md の変更は「戦略変更」カテゴリに近い）
