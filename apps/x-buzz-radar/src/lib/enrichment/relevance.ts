import { callJson, HAIKU } from "@/lib/anthropic";
import type { RelevanceJudgment } from "@/lib/types";

const SYSTEM = `あなたは Claude 活用情報のフィルタです。出力は JSON のみ。`;

const USER = (body: string, author: string) =>
  `以下のツイートが Claude (Anthropic 製 AI) または Claude Code (CLI) の
実用活用 / Tips / 事例 / ニュースに関係するか 0-100 で判定してください。

関連カテゴリ:
- tips: プロンプト・workflow・自動化の Tips
- news: Anthropic 公式アナウンス・モデル更新
- compare: 他 AI (GPT/Gemini) との比較・選択基準
- case: 具体的なユースケース・成果報告
- other: 関連だが上記に当てはまらない

無関係 (score < 40):
- 純粋な生成 AI 一般論
- GPT-only Tips
- 画像 / 音楽生成系のみ

ツイート (by @${author}):
"""
${body}
"""

JSON で出力:
{"score": 0-100, "reason": "判定理由 (50字以内)", "category": "tips|news|compare|case|other"}`;

export async function judgeRelevance(args: {
  body: string;
  author: string;
}): Promise<RelevanceJudgment> {
  return await callJson<RelevanceJudgment>({
    model: HAIKU,
    system: SYSTEM,
    user: USER(args.body, args.author),
    maxTokens: 256,
  });
}
