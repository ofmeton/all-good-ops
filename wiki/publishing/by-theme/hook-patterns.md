---
type: concept
created: 2026-05-20
updated: 2026-05-20
sources: [docs/superpowers/specs/2026-05-20-publishing-pivot-design.md]
related: [[../buzz-patterns]], [[../by-media/x]]
tags: [publishing, hook-patterns, ofmeton]
status: active
identity: ofmeton
---

# フック 1 行目パターン集

## パターン群

| # | パターン | 例 |
|---|---|---|
| 1 | 数字 + 業務 | 「請求書作成、3 時間 → 5 分にした」 |
| 2 | Before-After 宣言 | 「Claude 導入前後で月次〆の工数が 70% 減った」 |
| 3 | 結論先出し | 「結論: 行政書士の見積書テンプレは Claude に作らせるが正解」 |
| 4 | 【】記号 | 「【保存版】中小工務店向け Claude プロンプト 10 選」 |
| 5 | 問いかけ | 「freee の仕訳、まだ手入力してる？」 |
| 6 | 業務 + ツール名 | 「freee MCP × Claude で月次〆が 1 コマンドになった」 |
| 7 | 失敗談先行 | 「Claude に丸投げしたら炎上した。原因と対策」 |

## 媒体別優先パターン

| 媒体 | 1st choice | 2nd choice |
|---|---|---|
| X 1 行目 | 1（数字 + 業務） | 5（問いかけ） |
| note タイトル | 4（【】記号） | 6（業務 + ツール名） |
| Instagram カルーセル 1 枚目 | 1（数字 + 業務） | 2（Before-After 宣言） |

## 禁忌

- 「いかがでしょうか」「ぜひお試しください」等の定型挨拶
- 「〜について解説します」「重要なポイントは 3 つあります」
- 自己アピール先行（「私が見つけた最強の〜」等）

## チェック

`content-quality-rubric.md` の「AI 感ゼロチェック」NG 表現リストを併用。

## 観測 [2026-05-20]

出典: [[../inspirations/meta-2026-05-20-chaen-buzz-5steps]]
チャエン（17 万フォロワー）が「バズ構成 4 要素」として提示: 140 字の簡潔性 / 具体的ベネフィット + ストーリー性 / 詳細誘導記号「⇩」。詳細誘導記号「⇩」は AI 感ゼロチェックの NG 表現に未分類 — 要確認素材。

## 異論 [2026-05-20]: 【】記号は NG か？

チャエン側: 「【速報】【朗報】【必見】」はバズフックとして有効（実績あり）
rubric 側: 「AI 感ゼロチェック NG 表現リスト」と衝突する可能性

両論を保持。buzz-patterns.md の「## 異論」セクションも参照。月次 lint でユーザーが採否判断。**rubric 更新提案あり**。
