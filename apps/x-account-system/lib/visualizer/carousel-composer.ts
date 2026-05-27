/**
 * Instagram カルーセル 9 枚構成 composer (PR-E)
 *
 * SSoT:
 *   - main-design-all-versions.md §6.4.5 (Instagram カルーセル 9 枚 5 テンプレ)
 *   - initial-values-design.md §4.2 (visual-designer skill 連動)
 *   - visual-design-system.md (Noto Sans Heavy / 4 色 / 文字サイズ ≥24pt)
 *
 * 5 テンプレ (main-design §6.4.5):
 *   T1 (hook_evidence)      : Hook → 9 項目 → まとめ → CTA   (まとめ型由来)
 *   T2 (number_breakdown)   : Hook → 3 Step → コスト → CTA   (段階型由来)
 *   T3 (failure_chronicle)  : 自己紹介 → 業務 → 失敗 → 成功 → 提言 (専門職×AI 型由来)
 *   T4 (how_to_steps)       : Hook → 比較軸 → A vs B → 結論 (ツール比較型由来)
 *   T5 (hot_take_data)      : おさらい → 今回 → 結果 → 次回予告 (シリーズ実践記型由来)
 *
 * 注: spec の T1-T5 名称は実装上の id。main-design §6.4.5 の A-E テンプレと 1:1 対応。
 */

import type {
  CarouselComposition,
  CarouselSlide,
  CarouselTemplateId,
} from "./types.ts";
import type { CoreIdea } from "../writer/types.ts";

/** 1 テンプレあたり 9 スロット (title, body, image_prompt の骨格) */
type SlotSpec = {
  title: string;
  bodyPrefix: string;
  imagePromptKind: string;
};

/**
 * 5 テンプレ × 9 スロット の骨格。
 * Phase 0.5 では deterministic に題目を埋める。
 * Phase 1+ で Writer LLM 経由で本文を埋める実装に差し替え予定。
 */
const TEMPLATE_SLOTS: Record<CarouselTemplateId, SlotSpec[]> = {
  T1_hook_evidence: [
    { title: "Hook", bodyPrefix: "目を引く 1 行", imagePromptKind: "hook" },
    { title: "問題提起", bodyPrefix: "詰まりどころ", imagePromptKind: "problem" },
    { title: "evidence 1", bodyPrefix: "根拠 1", imagePromptKind: "evidence" },
    { title: "evidence 2", bodyPrefix: "根拠 2", imagePromptKind: "evidence" },
    { title: "evidence 3", bodyPrefix: "根拠 3", imagePromptKind: "evidence" },
    { title: "解決", bodyPrefix: "ofmeton 流の答え", imagePromptKind: "solution" },
    { title: "How to", bodyPrefix: "再現手順", imagePromptKind: "howto" },
    { title: "まとめ", bodyPrefix: "結論を 1 行で", imagePromptKind: "summary" },
    { title: "CTA", bodyPrefix: "note へ誘導", imagePromptKind: "cta" },
  ],
  T2_number_breakdown: [
    { title: "数字 hook", bodyPrefix: "数字の衝撃", imagePromptKind: "number" },
    { title: "Step 1", bodyPrefix: "1 段階目", imagePromptKind: "step" },
    { title: "Step 2", bodyPrefix: "2 段階目", imagePromptKind: "step" },
    { title: "Step 3", bodyPrefix: "3 段階目", imagePromptKind: "step" },
    { title: "コスト", bodyPrefix: "投資と回収", imagePromptKind: "cost" },
    { title: "Before", bodyPrefix: "導入前の状況", imagePromptKind: "before" },
    { title: "After", bodyPrefix: "導入後の数値", imagePromptKind: "after" },
    { title: "1 行 takeaway", bodyPrefix: "持ち帰り 1 行", imagePromptKind: "summary" },
    { title: "CTA", bodyPrefix: "note へ誘導", imagePromptKind: "cta" },
  ],
  T3_failure_chronicle: [
    { title: "自己紹介", bodyPrefix: "ofmeton 名乗り", imagePromptKind: "intro" },
    { title: "業務", bodyPrefix: "対象業務の説明", imagePromptKind: "context" },
    { title: "失敗 1", bodyPrefix: "1 つ目の失敗", imagePromptKind: "failure" },
    { title: "失敗 2", bodyPrefix: "2 つ目の失敗", imagePromptKind: "failure" },
    { title: "気づき", bodyPrefix: "学びの瞬間", imagePromptKind: "insight" },
    { title: "成功", bodyPrefix: "回復した結果", imagePromptKind: "success" },
    { title: "再現手順", bodyPrefix: "誰でもできる手順", imagePromptKind: "howto" },
    { title: "提言", bodyPrefix: "同業界に向けた提言", imagePromptKind: "advice" },
    { title: "CTA", bodyPrefix: "note へ誘導", imagePromptKind: "cta" },
  ],
  T4_how_to_steps: [
    { title: "Hook", bodyPrefix: "How to の入口", imagePromptKind: "hook" },
    { title: "前提", bodyPrefix: "必要な道具・知識", imagePromptKind: "context" },
    { title: "Step 1", bodyPrefix: "1 段階目", imagePromptKind: "step" },
    { title: "Step 2", bodyPrefix: "2 段階目", imagePromptKind: "step" },
    { title: "Step 3", bodyPrefix: "3 段階目", imagePromptKind: "step" },
    { title: "Step 4", bodyPrefix: "4 段階目", imagePromptKind: "step" },
    { title: "Step 5", bodyPrefix: "5 段階目", imagePromptKind: "step" },
    { title: "結論", bodyPrefix: "完了状態の確認", imagePromptKind: "summary" },
    { title: "CTA", bodyPrefix: "note へ誘導", imagePromptKind: "cta" },
  ],
  T5_hot_take_data: [
    { title: "Hot take", bodyPrefix: "逆張り 1 行", imagePromptKind: "contrarian" },
    { title: "通説", bodyPrefix: "世間の主張", imagePromptKind: "common" },
    { title: "data 1", bodyPrefix: "数値根拠 1", imagePromptKind: "data" },
    { title: "data 2", bodyPrefix: "数値根拠 2", imagePromptKind: "data" },
    { title: "counter", bodyPrefix: "反証", imagePromptKind: "counter" },
    { title: "実体験", bodyPrefix: "ofmeton の現場感", imagePromptKind: "evidence" },
    { title: "新しい view", bodyPrefix: "再構築した view", imagePromptKind: "insight" },
    { title: "提言", bodyPrefix: "読者への提言", imagePromptKind: "advice" },
    { title: "CTA", bodyPrefix: "note へ誘導", imagePromptKind: "cta" },
  ],
};

/**
 * テンプレ id から slide 9 枚を生成する。
 *
 * Phase 0.5: deterministic な title / body / image_prompt を返す。
 * Phase 1+: idea を Writer LLM に渡して各 slide の本文を生成する。
 */
export function composeCarousel(
  idea: CoreIdea,
  templateId: CarouselTemplateId,
): CarouselComposition {
  const slots = TEMPLATE_SLOTS[templateId];
  if (!slots) {
    throw new Error(`Unknown carousel template id: ${templateId}`);
  }
  if (slots.length !== 9) {
    throw new Error(
      `Internal error: template ${templateId} must have 9 slots (got ${slots.length})`,
    );
  }

  const slides: CarouselSlide[] = slots.map((slot, i) => ({
    index: i + 1,
    title: `${slot.title}`,
    body: `${slot.bodyPrefix}: ${idea.topic}`,
    image_prompt: buildImagePrompt(idea, slot.imagePromptKind, i + 1),
  }));

  return {
    templateId,
    slides,
  };
}

/**
 * visual-design-system.md SSOT (Noto Sans Heavy / 4 色限定 / 文字 ≥24pt) を含む
 * 1080x1350 Instagram カルーセル用の image prompt skeleton を組み立てる。
 *
 * Phase 0.5 では deterministic な文字列を返す。Phase 1+ で Writer LLM が prompt を生成する。
 */
function buildImagePrompt(
  idea: CoreIdea,
  kind: string,
  slideIndex: number,
): string {
  return [
    `[ofmeton brand carousel slide ${slideIndex}/9]`,
    `kind: ${kind}`,
    `topic: ${idea.topic}`,
    `audience: ${idea.audience}`,
    "design: Noto Sans Heavy / 4-color limited palette / minimum font 24pt",
    "no AI-generated photo, screenshot or text overlay style",
  ].join(" / ");
}

/**
 * 5 テンプレを order 配列で公開 (test や Optimizer 用)
 */
export const CAROUSEL_TEMPLATE_IDS: CarouselTemplateId[] = [
  "T1_hook_evidence",
  "T2_number_breakdown",
  "T3_failure_chronicle",
  "T4_how_to_steps",
  "T5_hot_take_data",
];
