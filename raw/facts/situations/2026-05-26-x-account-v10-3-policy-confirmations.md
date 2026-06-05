---
date: 2026-05-26
category: situations
source: session
---

# x-account-design v10.3 方針確定 (2026-05-26 セッション、振り返り時 raw 補完保存)

本セッションで確定したユーザー方針 4 件。各々 claude-smart memory に登録済だが、CLAUDE.md §事実情報の自動 raw 保存ルールに従い raw/facts/situations/ にも記録。

## 1. 既存 10 アカ参考度評価 (Phase 0 競合調査の品質問題)

ユーザーが 2026-05-26 セッション内で明示:

- **めっちゃ参考になる (4 アカ)**: Shimayus / SuguruKun_ai / masahirochaen / ClaudeCode_love
- **全然参考にならない (6 アカ)**: umiyuki_ai / kosuke_agos / minorun365 / icoxfog417 / ai_jitan / milbon_

→ Phase 0 調査の致命的欠陥確定。50 項目集計の実質母集団は 4 アカに縮小。

## 2. 顧客素材方針変更 (許諾済前提全投入)

> v10.2 §10.7.4 「Phase 1 では顧客素材は投入禁止、本人事業のみ」は無視。
> 基本クライアントには許諾取ってます。全て許諾取ってる前提で進めてください。
> ただ投稿文には具体名個人名は出さない。

→ v10.3 §10.7 で確定。本人事業 4 種 + 案件 client (terra-isshiki / minpaku-cleaning 等) 全て許諾済前提で投入 OK、Editor +5 DLP で固有名詞 mask。

## 3. 投稿スタイル: 翻訳 NG / 所感前面

> 翻訳っぽさを出したくない、あくまで自分の意見、所感を述べてる感じ出したいから。
> 多少有用性を誇張してもいいくらい。

> 引用はOK引用元の記載も。
> 投稿内容のニュアンスで言うと、こんなリリースがあった、こんなスキル...
> それをどれだけ膨らませるか... は競合調査で引き出し作ってほしい

→ v10.3 §10.2 / §4.3.6 で確定。軸 1 = 所感 1 : 翻案 3 : 実体験 4 : 業種別 SOP 2。所感の本文骨格は事前定義せず Phase 0 v2 から引き出し抽出 + Optimizer 学習。

## 4. PR 自動 merge デフォルト

> mergeしておｋ
> てか今度からPRしたら基本勝手にmergeまでしちゃってください
> 断ることないんで

→ memory `feedback_pr_auto_merge_default.md` 保存済。PR 作成完了 → squash merge + worktree cleanup まで一気通貫、確認不要。

## 5. 調査コスト方針

> 仕入れ方法分析に必要な情報収集のためのapiコストなら提案もらえたら承認するので提案してほしい
> 調査コスト損くらいなら全然問題ない。
> 定点観測もコストそれくらいならしちゃおう。

→ raw/facts/situations/2026-05-26-monitoring-cost-approval.md に詳細保存済。¥260/月 定点観測 + 追加調査 API は Claude が提案 → 即承認スタンス。

## 取りこぼし防止メモ

本セッションで「方針確定」級の発話を 4-5 件受けたが raw 保存が遅れた (PR #20 merge 後の振り返り時に補完)。今後は **方針確定キーワード ("無視で / 撤回 / こうしよう / ...しちゃおう") 検知時に即 raw save** を機械化したい。memory `feedback_raw_save_on_merge.md` の "merge / 重大状況変化" trigger を「方針確定発話」にも拡張すべきだが、今のところ拡張せず、振り返り時補完で運用。
