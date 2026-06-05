# 改善提案エスカレーション 2026-05-24 (Iteration 6)

提案ファイル: `outputs/improvements/proposal-20260524-it6.md`
審査担当: 秘書 (改善提案審査モード)
審査日時: 2026-05-24

秘書の判断で適用不可と判定したもの、または SAFE 判定だったが harness 制約で適用が物理的にブロックされたものを人間にエスカレーションする。

---

## 提案1: system-engineer.md / rapid-hp-operator.md への「よくある失敗」追記 + permission 設定の併用

### 判定: RISKY (人間判断必須)

### 判定理由
提案文に **(C) 適用方法の恒久化 (人間判断項目)** として `.claude/settings.json` (project local) の `permissions` に `Edit:.claude/agents/**/*.md` を追加するか、self-improve loop の応答で permission を一括承認してもらう運用に切り替えるかをユーザーに選択してもらう、と明記されている。これは秘書の SAFE 判定基準で「**permissions 変更**」に該当し RISKY。

加えて提案文は「**本提案の Edit 実行は (C) の判断後**」と (A)(B) の文言追記すら (C) 判断を前提条件としている。提案者自身が (A)(B) のみの独立適用を意図していないため、(A)(B) の単独切り出し適用も控える。

### 推奨アクション
**修正して再提案** または **(C) の選択肢を人間判断のうえ秘書に明示**:

選択肢:
1. **選択肢 A (恒久化・最も摩擦が少ない)**: `.claude/settings.json` の `permissions.allow` に `"Edit(/Users/rikukudo/Projects/private-agents/all-good-ops/.claude/agents/**/*.md)"` を追加。以後 self-improve / retrospective のエージェント定義更新は permission prompt なしで通る
2. **選択肢 B (都度一括承認)**: 運用を変えず、self-improve サイクルの permission prompt が出たらユーザーが「全部承認」する運用
3. **選択肢 C (現状維持)**: 1 件ずつ permission prompt を承認する。memory 増加と permission 摩擦のジレンマは継続

**選択肢 A を推奨**する理由:
- 5/17 提案1 が 1 週間放置された原因は permission 摩擦. 構造的に解消できる
- `.claude/agents/**/*.md` は内部資産で外部送信や金銭関与なし. 文言調整しか発生しない
- 改善提案審査モード (SAFE 判定対象) と整合する権限スコープ

**人間判断項目**:
- 選択肢 A/B/C のいずれを採用するか
- 採用後、次サイクルで (A)(B) の文言追記内容を再提案して適用するか、本提案の内容で即時適用するか

### 反映すべき内容 (再提案時に流用可能)
- system-engineer.md の「よくある失敗」末尾に追記する候補:
  - 迂回ルート固執 / `.env.local` バックアップ / Vercel プラン制約事前確認 (5/17 分・diff 既存)
  - DDL migration を書く前に list_tables + 分布クエリで実スキーマ確認 (5/22)
  - 外部 API crawler 実装前に curl 1 サンプル + content-type 確認 (5/22)
  - 変動激しい API 料金は WebSearch で最新取得 (5/22)
  - cron 性能試算は実測ベースで perSourceLimit を逆算 (5/22)
  - Supabase Free tier 2 project/org 制限を `list_projects` で先出し確認 (5/22)
  - vercel CLI 前に cwd と `.vercel/project.json` を必ず verify (5/20)
- rapid-hp-operator.md には Vercel 文脈の 2 行 (cwd verify / `.env.local` バックアップ)

---

## 提案2: session-retrospective.md に「事前確認 (precheck) 標準項目」セクション追加

### 判定: SAFE (秘書承認可) だが harness 制約により適用ブロック → escalated

### 判定理由
内容は skill の補強・追記で、SAFE 判定基準「スキルファイルの**補強・追記**」に該当し本来は秘書が即適用可能。しかし `.claude/skills/session-retrospective.md` への Edit が harness の **sensitive file 制約**でブロックされた (1 回試行・permission required エラー)。提案文が事前に「適用時に harness 挙動を確認」と予告していた通りの結果。

### 推奨アクション
**承認** (人間が下記いずれかで適用):

選択肢:
1. **人間が手動で本セクションを追記** (提案文に diff 完全記載済み・コピペで反映可能)
2. **選択肢 A を採用** (上記提案1 と同根の構造問題). `.claude/settings.json` に `"Edit(/Users/rikukudo/Projects/private-agents/all-good-ops/.claude/skills/**/*.md)"` を追加し、次回 self-improve サイクルで再試行
3. **次回サイクルで permission を一時的に承認** して秘書に再試行させる

### 反映すべき内容 (人間手動適用時の挿入位置と内容)
**挿入位置**: `.claude/skills/session-retrospective.md` の **「## 関連リソース」セクションの直前** (ファイル末尾の独立セクションとして)

**挿入内容**:
```markdown
## 事前確認 (precheck) 標準項目

retrospective で「実装前の確認を省略して巻き戻しが発生」が 2 回以上検出されたら、本セクションに 1 行追記する。新規セッションの該当領域エージェント (system-engineer / ai-radar 等) が起動時に参照し、該当タスクで該当項目を 1 つでも踏まずに進めようとしたら自分で警告を出す.

| 領域 | 着手前に必ず確認 | 根拠 memory |
|---|---|---|
| DDL migration | `list_tables` + 該当カラムの分布クエリで実スキーマ確認 | feedback_db_migration_pre_inspect.md (2026-05-22) |
| 外部 API crawler | curl 1 サンプル + content-type 確認 | feedback_external_crawler_pre_curl.md (2026-05-22) |
| 外部 API 料金参照 | WebSearch で最新料金を取得 (training 時点と乖離前提) | feedback_external_api_pricing_websearch.md (2026-05-22) |
| cron / バッチ性能試算 | 1 件あたり実測秒数を取って perSourceLimit を逆算 | feedback_cron_perf_budget_calc.md (2026-05-22) |
| Supabase project 新設 | `list_projects` で Free tier 2/2 確認 → 残枠なしなら A〜E 代替案を先出し | feedback_supabase_project_precheck.md (2026-05-22) |
| Vercel CLI 実行 | cwd と `.vercel/project.json` を verify | feedback_vercel_subproject_cwd.md (2026-05-20) |
```

---

## 構造的所見 (提案1・提案2 共通)

- **SAFE 判定でも harness sensitive file 制約で適用がブロックされる事例が 2 サイクル連続**: 5/17 提案1 (system-engineer.md) も同根. 1 週間放置の主因
- **対策の本丸は `.claude/settings.json` の permissions 拡張**: 提案1 (C) で示された permission 恒久化の人間判断を**今サイクル中に決定**することで、提案1 と提案2 の両方が次サイクル以降で自動適用可能になる
- 提案2 単独でも適用したい場合は人間が直接 Edit するか、permission を一時承認して秘書に再試行させる

---

## 提案3 は適用済み (参考)
- `data/usage-log.jsonl` への deprecated 行 1 行追記 → SAFE 判定で適用済 (CLAUDE.md「確認不要の操作」に明記)
- 詳細は `data/improvement-log.jsonl` 参照
