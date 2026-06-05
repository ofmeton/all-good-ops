import { callJson, HAIKU } from "@/lib/anthropic";
import type { PatternJudgment, Category } from "@/lib/types";

const SYSTEM = "あなたは SNS 投稿の構造分析者です。出力は JSON のみ。";

const USER = (body: string, category: Category) =>
  `以下のバズツイートの「型」を分析してください (category: ${category})。

ツイート:
"""
${body}
"""

選択肢:
- buzz_pattern: "before-after" | "controversial-take" | "list-of-N" | "demo-screenshot" | "counter-intuitive" | "personal-story"
- hook_structure: "数値見出し" | "問いかけ" | "対比" | "失敗談" | "リスト"
- visual_hint: "screenshot" | "diagram" | "video" | "none"

JSON:
{"buzz_pattern": "...", "hook_structure": "...", "visual_hint": "..."}`;

export async function extractPattern(args: {
  body: string;
  category: Category;
}): Promise<PatternJudgment> {
  return await callJson<PatternJudgment>({
    model: HAIKU,
    system: SYSTEM,
    user: USER(args.body, args.category),
    maxTokens: 256,
  });
}
