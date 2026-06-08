/**
 * lib/ingest/collector-translate.ts — 海外ツイートの日本語翻訳（#6 基盤）。
 * lang≠ja かつ本文非空の candidate のみ Haiku で batch 翻訳し meta.translation に積む。
 * 翻訳は道具（配管）／判断は scoring 側。失敗・欠落は当該 id を skip して全体は止めない。
 * collector-scoring の batch + callClaudeTraced + costJpy 同式を踏襲。
 */
import { callClaudeTraced } from "../trace/llm-trace.js";
import type { ScoredCandidate } from "./collector-scoring.js";

/** meta.translation_engine に記録する翻訳エンジン名（モデル切替時の出所識別）。 */
export const TRANSLATION_ENGINE = "claude-haiku";

const TRANSLATE_TOOL = {
  name: "translate_materials",
  description: "海外ツイート（非日本語）を自然な日本語へ翻訳",
  input_schema: {
    type: "object",
    properties: {
      translations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            ja: { type: "string", description: "自然な日本語訳" },
          },
          required: ["id", "ja"],
        },
      },
    },
    required: ["translations"],
  },
} as const;

const TRANSLATE_SYSTEM = [
  "あなたは技術ツイートの翻訳者。海外（非日本語）のツイートを、意味を保った自然な日本語に翻訳する。",
  "URL・ハンドル(@xxx)・ハッシュタグはそのまま残す。誇張や脚色をせず原文の事実だけを訳す。",
  "必ず translate_materials ツールで {id, ja} の配列を返す。",
].join("\n");

interface RawTranslation {
  id?: unknown;
  ja?: unknown;
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export interface TranslateOpts {
  model: string;
  batchSize?: number;
}

export interface TranslateResult {
  /** tweet_id → 日本語訳。翻訳できなかった id は含まない。 */
  translations: Map<string, string>;
  /** 翻訳に焼いた概算コスト（JPY、scoring と同式）。 */
  costJpy: number;
}

/** lang≠ja かつ本文非空の candidate のみ Haiku で翻訳。欠落・失敗は skip（throw しない）。 */
export async function translateCandidates(
  client: Parameters<typeof callClaudeTraced>[0],
  scored: ScoredCandidate[],
  opts: TranslateOpts,
): Promise<TranslateResult> {
  const batchSize = opts.batchSize ?? 20;
  const targets = scored.filter((c) => {
    const lang = c.tweet.lang;
    const text = c.tweet.text;
    return !!lang && lang !== "ja" && typeof text === "string" && text.trim().length > 0;
  });

  const translations = new Map<string, string>();
  let costJpy = 0;
  if (targets.length === 0) return { translations, costJpy };

  for (const batch of chunk(targets, batchSize)) {
    const lines = batch.map((c) =>
      JSON.stringify({ id: c.tweet.id, lang: c.tweet.lang, text: c.tweet.text }),
    );
    const userPrompt = `次の海外ツイートを translate_materials で日本語訳せよ。\n${lines.join("\n")}`;

    let out;
    try {
      out = await callClaudeTraced(client, {
        params: {
          model: opts.model,
          max_tokens: 4096,
          system: TRANSLATE_SYSTEM,
          tools: [TRANSLATE_TOOL as never],
          tool_choice: { type: "tool", name: "translate_materials" },
          messages: [{ role: "user", content: userPrompt }],
        },
        promptText: `${TRANSLATE_SYSTEM}\n\n---\n\n${userPrompt}`,
      });
    } catch (e) {
      // fail-open: 翻訳は付加価値。失敗してもバッチを飛ばして収集自体は続ける。
      console.warn(
        JSON.stringify({
          level: "warn",
          msg: "[translate] batch failed (fail-open)",
          count: batch.length,
          error: String(e),
        }),
      );
      continue;
    }

    const rawRaw = (out.toolUse as { translations?: unknown })?.translations;
    const rawList: RawTranslation[] = Array.isArray(rawRaw) ? (rawRaw as RawTranslation[]) : [];
    for (const t of rawList) {
      // 境界で検証: id/ja が文字列で ja 非空のものだけ採用。壊れた要素はその id を skip。
      if (typeof t?.id === "string" && typeof t?.ja === "string" && t.ja.trim().length > 0) {
        translations.set(t.id, t.ja);
      }
    }
    costJpy +=
      (((out.meta.tokensIn ?? 0) / 1_000_000) * 3 +
        ((out.meta.tokensOut ?? 0) / 1_000_000) * 15) *
      150; // USD→JPY 固定（scoring と同式）
  }

  return { translations, costJpy };
}
