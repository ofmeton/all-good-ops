import { callJson, SONNET } from "@/lib/anthropic";
import { selectVariant } from "@/lib/variant-selector";
import type { Platform, Category, DraftOutput } from "@/lib/types";

const SYSTEM = `あなたは ofmeton という個人ブランドの発信担当です。
海外のバズツイートを日本語の発信ネタに翻訳・再構成します。
非エンジニア (中小事業者・士業・コンサル) に届くトーンで。
AI 活用の透明性を保ち、誇大表現は避けてください。
出力は JSON のみ。`;

const TEMPLATE_X = `以下のバズツイートを X 投稿 (thread) として日本語化してください。

variant パラメータ:
- hook: {hook}
- tone: {tone}
- format: {format}

ツイート (by @{author}, likes: {likes}, RT: {retweets}):
"""
{body}
"""

JSON 出力:
{
  "translation_jp": "原文の日本語訳 (自然な口語)",
  "japan_application": "日本のユーザーが使うなら何ができるか (60字以内)",
  "x_thread": ["1/N hook", "2/N 詳細", "3/N まとめ・CTA"],
  "visual_brief": {"type": "image", "prompt": "画像生成プロンプト", "format": "x_thumbnail"}
}`;

const TEMPLATE_NOTE = `以下のバズツイートを note 記事の outline にしてください。

variant パラメータ: hook={hook} / tone={tone} / format={format}

ツイート (by @{author}):
"""
{body}
"""

JSON 出力:
{
  "translation_jp": "...",
  "japan_application": "...",
  "note_outline": {
    "title": "見出し (30字以内)",
    "hook": "冒頭フック (100字以内)",
    "sections": ["section1", "section2", "section3", "section4"],
    "cta": "末尾 CTA"
  },
  "visual_brief": {"type": "image", "prompt": "...", "format": "note_cover"}
}`;

const TEMPLATE_IG = `以下のバズツイートを Instagram カルーセル (9 枚) にしてください。

variant パラメータ: hook={hook} / tone={tone} / format={format}

ツイート:
"""
{body}
"""

JSON 出力:
{
  "translation_jp": "...",
  "japan_application": "...",
  "instagram_carousel": {
    "slide1_title": "...",
    "slide2_problem": "...",
    "slide3_method": "...",
    "slide4_method": "...",
    "slide5_method": "...",
    "slide6_example": "...",
    "slide7_example": "...",
    "slide8_summary": "...",
    "slide9_cta": "..."
  },
  "visual_brief": {"type": "image", "prompt": "...", "format": "ig_carousel"}
}`;

function pickTemplate(platform: Platform): string {
  if (platform === "x") return TEMPLATE_X;
  if (platform === "note") return TEMPLATE_NOTE;
  return TEMPLATE_IG;
}

export async function generateDraft(args: {
  platform: Platform;
  category: Category;
  body: string;
  author: string;
  likes: number;
  retweets: number;
}): Promise<{ draft: DraftOutput; variant_id: string }> {
  const variant = await selectVariant({
    platform: args.platform,
    category: args.category,
  });

  const userMsg = pickTemplate(args.platform)
    .replaceAll("{hook}", variant.hook_template)
    .replaceAll("{tone}", variant.tone)
    .replaceAll("{format}", variant.format)
    .replaceAll("{author}", args.author)
    .replaceAll("{likes}", String(args.likes))
    .replaceAll("{retweets}", String(args.retweets))
    .replaceAll("{body}", args.body);

  const draft = await callJson<DraftOutput>({
    model: SONNET,
    system: SYSTEM,
    user: userMsg,
    maxTokens: 2048,
  });

  return { draft, variant_id: variant.variant_id };
}
