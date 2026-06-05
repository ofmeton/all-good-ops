/**
 * Hook classifier TS entry point
 *
 * classify.py の代替として純 TS 実装 (classify-rules.ts) を呼び出す。
 * Cloudflare Workers 対応 (child_process / Node.js API を使用しない)。
 * Editor pipeline Stage 0 で使用。
 *
 * 環境変数:
 *   IN_MEMORY_FALLBACK=true → 簡易 stub を返す (テスト用後方互換)
 */
import { classifyRules } from "./classify-rules.ts";

export type HookClassification = {
  primary_hook: "failure_story" | "business_repro" | "critique" | "tips_enum";
  devices: string[];
  confidence: number;
  raw_features?: Record<string, string>;
};

const FALLBACK: HookClassification = {
  primary_hook: "tips_enum",
  devices: [],
  confidence: 0.3,
};

export async function classifyHook(text: string): Promise<HookClassification> {
  if (process.env.IN_MEMORY_FALLBACK === "true") {
    // In fallback 時は失敗談キーワードがあれば failure_story を返し、
    // それ以外は tips_enum default を返す deterministic stub。
    if (/失敗|ハマった|詰まった|落とし穴|うまくいかな/.test(text)) {
      return {
        primary_hook: "failure_story",
        devices: ["first_hand_past"],
        confidence: 0.7,
      };
    }
    if (/Before|before|→|前 ?→ ?後/.test(text)) {
      return {
        primary_hook: "business_repro",
        devices: ["before_after", "number"],
        confidence: 0.6,
      };
    }
    if (/みんな.+実は|思われがちだが/.test(text)) {
      return {
        primary_hook: "critique",
        devices: ["contrarian"],
        confidence: 0.55,
      };
    }
    if (text.length < 30) {
      return { ...FALLBACK, confidence: 0.2 };
    }
    return { ...FALLBACK, confidence: 0.5 };
  }

  return classifyRules(text);
}
