# セッション振り返り — mf-finance データ基盤構築

- 日時: 2026-06-12 16:49（着手 2026-06-06・別セッションで再開）
- 対象: マネーフォワードME家計データ → Claude分析ダッシュボード。recon → 再連携代行(中断) → brainstorm要件 → spec → Plan1実装 → Supabase load → handoff
- 成果: データ基盤(Plan1)完成。worktree `task/260606-mf-finance`（未merge・`apps/mf-finance/HANDOFF.md`）

## §0 raw保存漏れ
借金の実態（アコム/奨学金/横浜バイクローン/修学支援貸付）は `raw/facts/contracts/2026-06-06-debts-overview.md`（worktree）に保存済。他に必須の事実保存漏れなし。

## §0.5 前回フォローアップ
improvement-log 直近（06-09〜06-12）は全て applied。2回連続openの定着不全なし。本セッションは別系統（家計データ基盤）で直接の再計測対象なし。

## §1 良かった点
- データ取得効率: `/cf/csv` GET仕様を発見、`evaluate_script`+`filePath`退避で645KBをcontextに載せず全期間3,742行DL。
- 代行の安全判断: 再連携でVpass PWがメモ上曖昧と気づき「ロックリスク」で送信せず停止→人間判断へ。
- 規律ある工程連鎖: plan mode→brainstorming→writing-plans→subagent-driven。
- TDD効果: 実装subagentがCSV複数行フィールドbugを自力発見・修正（recon値3743の誤りも訂正、正=3742）。

## §2 詰まった/二度手間
| # | 事象 | 原因 | 本来の動き |
|---|---|---|---|
|1|loadが`PGRST106 Invalid schema`|非publicスキーマのPostgREST公開設定をspec/planで見落とし（xadが既に同パターン）|スキーマ分離設計=exposed-schemas追加＋反映遅延を最初から織り込む|
|2|公開反映が即時でなくNOTIFYも効かずリトライ8回空振り→load-mgmt作成|#1同根＋Supabase反映は再起動待ち|反映待ちはManagement API迂回をデフォ手順に|
|3|認証メモを読んだがVpass PWが構造的に紐付かず停止|メモ構造を着手前に未検分|代行受諾前にID↔PW対応を1回検分|

## §3 自動化・効率化
- Supabase非publicスキーマ運用の定型 → memory化済。スキル化は時期尚早→improvement-logで寝かせ。
- MFデータ取得のcron化（Playwright永続認証）→ 未・保留。

## §4 改善提案（improvement-log に status=open で記録）
1. Supabase非publicスキーマをsupabase-jsから使う設計は計画にexposed schemas追加＋mgmt-API迂回をTask明記。
2. 外部ログイン/再連携代行は着手前に認証メモ構造を検分。
3. 外部CSVパーサは改行/特殊文字をchar-by-charで最初から要件化。

## §5 レンズ
- ⚡ Claude機能: worktree/plan mode/subagent-driven 適切。純Nodeライブラリ群を1subagentに集約（1task1subagent+2段レビューを簡略化）はトークン節約として妥当だが記録に値する。レビューsubagentがセッション上限で空振り→自分でレビューに即切替は適切。
- 🪙 トークンコスパ: filePath退避・MCP直SQL検証は good。

## §6 反映
- SAFE: improvement-log 3件追記（open）/ memory `reference_supabase_nonpublic_schema_exposed.md`（本セッション中作成・索引追加済）。
- RISKY: なし（新規スキル化・CLAUDE.md構造変更は関門で見送り）。
