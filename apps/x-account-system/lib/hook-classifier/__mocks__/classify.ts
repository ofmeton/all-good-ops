/**
 * Mock for lib/hook-classifier/classify.ts
 *
 * default は本文文字列を heuristic で分類 (fallback stub と同等)、
 * __setMockHook() でテスト個別に override。
 */
import type { HookClassification } from "../classify.ts";

let _override: HookClassification | null = null;

export function __resetMockHook() {
  _override = null;
}

export function __setMockHook(hook: HookClassification) {
  _override = hook;
}

export async function classifyHook(text: string): Promise<HookClassification> {
  if (_override) return _override;

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
    return {
      primary_hook: "tips_enum",
      devices: [],
      confidence: 0.2,
    };
  }
  return {
    primary_hook: "tips_enum",
    devices: [],
    confidence: 0.5,
  };
}
