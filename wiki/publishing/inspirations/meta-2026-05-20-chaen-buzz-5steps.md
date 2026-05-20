---
type: source
created: 2026-05-20
updated: 2026-05-20
sources: [raw/publishing/inspirations/meta-20260520-chaen-buzz-5steps.md]
related: [[../buzz-patterns]], [[../by-media/x]], [[../by-theme/hook-patterns]]
tags: [publishing, x, ofmeton, hook-patterns, few-shot]
status: active
identity: ofmeton
---

# チャエン「Xでバズる投稿をAIで自動生成する5ステップ」

元 URL: https://digirise.ai/chaen-ai-lab/x/

## 元投稿の要点

- 17 万フォロワーを持つチャエンが解説した X バズ投稿の自動生成フロー
- **フック 1 行目の型**: 【速報】【朗報】【必見】【超朗報】の括弧見出し + 「なんと」「遂に」の感情揺さぶり
- **バズ構成 4 要素**: 大量データの高速処理 → 勝ちパターン再現 / 140 字前後の簡潔性 / 具体的ベネフィット + ストーリー性 / 詳細への誘導記号「⇩」
- システムプロンプトに過去の成功投稿を Few-Shot（3-4 件）として組み込む設計が肝
- 出力形式: 見出し → 説明 → 活用例 → 誘導

## 観察された勝ちパターン（buzz-patterns との対応）

- **パターン 1（数字 + 業務名のフック）**: 140 字の簡潔性と具体的ベネフィットは同じ方向
- **新規発見: Few-Shot 自己学習ループ**: 自分の成功投稿を 3-4 件 Few-Shot として Claude に渡し、スタイルを再現させる手法（buzz-patterns にまだない）
- **【】記号フック型**: チャエンは有効と主張するが content-quality-rubric の AI 感ゼロ NG 表現と衝突（詳細は buzz-patterns.md 「## 異論」セクション参照）

## 自分の発信に応用するなら

- ofmeton 名義の X 投稿が 10 件以上貯まったら Few-Shot アーカイブ（portfolio リポの `x-success-archive/`）を作って同じ仕組みを構築
- 【】記号は現段階では使用保留（rubric との矛盾が解消されるまで）。rubric 更新提案あり（月次レビュー候補）
- 詳細誘導記号「⇩」は AIっぽさ NG には未分類 — 追加検討素材として記録
