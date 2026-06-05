---
title: "Claude Code、新コードレビュー機能発表"
url: https://x.com/ClaudeCode_UT/status/2058480714048475343
source: "X @ClaudeCode_UT"
pipeline: claude_tip
detected_at: 2026-05-24T11:41:52.534915+00:00
published_at: 2026-05-24T09:30:21+00:00
claude_tip_score: 82
article_id: 3e3065ba-4b72-4a0a-b3b4-e49aba242d66
source_repo: ai-radar
---

# Claude Code、新コードレビュー機能発表

## 要約
Claude Codeのコマンドが`/simplify`から`/code-review`に変更されました。
コードレビューの際に「どれだけ深く考えるか」を5段階で指定可能に。
LOWからMAXまで、用途に応じた詳細度でコードを分析できます。

## Claude 活用 Tip 核
Claude Codeの新しい`/code-review`コマンドで、5段階の深さ指定（LOW～MAX）によるコードレビューが可能に。用途に応じた詳細度でコード分析の効率化が実現。
- 適用領域: コード生成, 自動化
- 言及ツール: Claude Code
- スコア: relevance 35 / novelty 15 / applicability 28 = **82**

### 試行プロンプト案
```
以下のコードをレビューしてください。深さレベル：MEDIUM

```python
def calculate_total(items):
  total = 0
  for item in items:
    total = total + item['price']
  return total
```

パフォーマンス、可読性、ベストプラクティスの観点から分析してください。
```

## ソース
- [【最新】
Claude Code の `/simplify` が `/code-review` に変わった

コードを触る前に「どれだけ深く考えるか」を5段階で指定できるようになっている。

https://t.co/Yf6uVcdQUr

選べる effort level：

LOW → MEDIUM → HIGH → XHIGH → MAX

さっと確認したいときは https://t.co/I2qVvEqgqL](https://x.com/ClaudeCode_UT/status/2058480714048475343)
- X @ClaudeCode_UT
