# Retrospective — 2026-06-19 03:19 / mf-finance（DB移設→UI/IA刷新→カード引落の作り込み）

対象: mf-finance 家計ダッシュボードの長尺セッション（PR #215〜#231）。DB を main repo へ移設(#215)、見切れ修正(#216)、web-ui-bridge(Cue)統合+永続化(#217)、UI/IA刷新 Phase①(サイドバー+全幅+5系統ナビ #218)、カード引落 Phase②(#220)とその連鎖修正、MF データ再取得(#222)、optimizer アクション作成(#226)。

## §0.5 前回フォローアップ
- `feedback_browser_test_all_user_ops`（全ユーザー操作を実機+目視で検証）= **今回しっかり実践**。chrome-devtools/Playwright で DOM probe + 実データ突合を毎 PR。
- `project_mf_finance_dashboard` のデータ層方針（resolver で worktree 非依存・DB は main repo）= 踏襲・強化。
- 2回連続 open の再発項目: なし。

## §0 raw 保存漏れ
- カード締め日/引落先/MF残高は app DB（card_charge_schedules / account_balances）に格納済み＝データから導出可のため raw/facts 対象外。新規事実の保存漏れなし。

## §1 良かった点
- systematic-debugging を毎回データで実証してから修正（「反映されない」→active=0、金額ズレ→transfer取りこぼし→締め日）。憶測修正を回避。
- 実機検証の徹底（DOM probe + 実データ数値突合）。`feedback_browser_test_all_user_ops` 実践。
- Codex委任＋Claude設計/レビュー/実機検証の二段が機能（純ロジック+テストは Codex 向き・低トークン）。
- DB を main repo へ移し worktree 非依存化（resolver）。「キュー」一語トリガー確立（UX）。

## §2 詰まった/二度手間
| # | 事象 | 原因 | 本来 |
|---|---|---|---|
| 1 | カード引落が5回反復（variable→transfer込み→offset→締め日→引落先口座） | カード請求のドメインモデルを front-load せず素朴な暦月モデルで実装→毎回ズレ指摘 | 着手前に計算ルール（締め日/対象期間/含む含まない/帰属先）を確定してから設計 |
| 2 | 金額不一致を自分の仮定で検証→再発 | ユーザーの期待値を聞く前に直した | 「金額違う」報告に先に期待値を聞く |
| 3 | build失敗 `Failed to collect page data`（offset/closing_dayで2回） | カラム追加migration適用前にbuild | dev再起動→migration確認→build |

## §3 自動化・効率化
- カード請求集計（included/is_transfer・締め日期間・引落先）を何度も触った＝最初に「全チャージ込み・締め日区切り・引落先銀行」を確定していれば1回で済んだ。反復はトークンも高い。

## §4 次回への改善提案（アクション可能）
1. ドメイン依存の数値ロジック（カード請求/税/利息）は着手前に計算モデルを1問確認してから設計。
2. 「金額/件数が合わない」報告は修正着手前に正しい期待値（実額・対象期間）を1つ聞く。
3. ローカルSQLiteの ALTER ADD COLUMN 変更は dev再起動→migration確認→build の順。

## §5 レンズ
- 💬 プロンプト改善: 「カードは締め日◯日・引落先◯◯・Suicaチャージも請求に含む」と最初に一言あれば反復が1-2回で済んだ（ただし聞くのは実装側責務）。
- 🪙 トークン: Codex委任で実装は節約。一方カード反復は front-load 不足で高コスト。

## §6 反映（SAFE・承認不要で反映済み）
- memory `feedback_user_perception_vs_data_check.md` に「数値の不一致報告は期待値を先に聞く」を追記。
- wiki `self/engineering-principles.md` に「ドメイン依存の数値ロジックは計算モデルを先に確定」原則（+ migration→restart→build 順の運用知見）を追記。
- `data/improvement-log.jsonl` に本 retro を status=open で追記（次回 watch: ドメイン数値機能の着手時に計算ルール確認をしたか）。
- RISKY: なし。
