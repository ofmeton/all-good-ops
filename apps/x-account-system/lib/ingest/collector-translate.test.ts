import { translateCandidates } from "./collector-translate.ts";
import type { ScoredCandidate } from "./collector-scoring.ts";

function scored(id: string, lang: string | undefined, text = `t${id}`): ScoredCandidate {
  return {
    tweet: {
      id,
      text,
      author: { userName: "a" },
      createdAt: "x",
      lang,
    },
    discovery: { via: "keyword", query: "Claude" },
    scores: { freshness: 1, velocity: 2, target_fit: 3, overall: 4 },
    scoreReason: "r",
    costJpy: 0.1,
  };
}

describe("translateCandidates", () => {
  test("translates only non-ja, non-empty candidates and returns a Map", async () => {
    let seenIds: string[] = [];
    const fakeClient = {
      messages: {
        create: async (params: { messages: { content: string }[] }) => {
          const body = params.messages[0].content;
          seenIds = body
            .split("\n")
            .map((l) => {
              try {
                return (JSON.parse(l) as { id?: string }).id;
              } catch {
                return undefined;
              }
            })
            .filter((x): x is string => !!x);
          return {
            content: [
              {
                type: "tool_use",
                input: { translations: seenIds.map((id) => ({ id, ja: `訳-${id}` })) },
              },
            ],
            usage: { input_tokens: 100, output_tokens: 50 },
          };
        },
      },
    };
    const { translations, costJpy } = await translateCandidates(
      fakeClient as never,
      [scored("1", "en"), scored("2", "ja"), scored("3", "es"), scored("4", "en", "")],
      { model: "claude-haiku-4-5-20251001" },
    );
    // ja (#2) と 空文字 (#4) は除外。en/es のみ。
    expect(seenIds.sort()).toEqual(["1", "3"]);
    expect(translations.get("1")).toBe("訳-1");
    expect(translations.get("3")).toBe("訳-3");
    expect(translations.has("2")).toBe(false);
    expect(translations.has("4")).toBe(false);
    expect(costJpy).toBeGreaterThan(0);
  });

  test("no foreign candidates → no LLM call, empty map, zero cost", async () => {
    const create = jest.fn();
    const fakeClient = { messages: { create } };
    const { translations, costJpy } = await translateCandidates(
      fakeClient as never,
      [scored("1", "ja"), scored("2", undefined)],
      { model: "claude-haiku-4-5-20251001" },
    );
    expect(create).not.toHaveBeenCalled();
    expect(translations.size).toBe(0);
    expect(costJpy).toBe(0);
  });

  test("broken tool output (missing/empty fields) → that id skipped, no throw", async () => {
    const fakeClient = {
      messages: {
        create: async () => ({
          content: [
            {
              type: "tool_use",
              input: {
                translations: [
                  { id: "1", ja: "良い訳" },
                  { id: "2" }, // ja 欠落
                  { ja: "id 欠落" }, // id 欠落
                  { id: "3", ja: "" }, // 空訳
                ],
              },
            },
          ],
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      },
    };
    const { translations } = await translateCandidates(
      fakeClient as never,
      [scored("1", "en"), scored("2", "en"), scored("3", "en")],
      { model: "claude-haiku-4-5-20251001" },
    );
    expect(translations.get("1")).toBe("良い訳");
    expect(translations.has("2")).toBe(false);
    expect(translations.has("3")).toBe(false);
  });

  test("non-array translations (e.g. string) → empty map, no throw", async () => {
    const fakeClient = {
      messages: {
        create: async () => ({
          content: [{ type: "tool_use", input: { translations: "oops" } }],
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      },
    };
    const { translations } = await translateCandidates(
      fakeClient as never,
      [scored("1", "en")],
      { model: "claude-haiku-4-5-20251001" },
    );
    expect(translations.size).toBe(0);
  });

  test("LLM throwing → fail-open: batch skipped, no throw", async () => {
    const fakeClient = {
      messages: {
        create: async () => {
          throw new Error("haiku down");
        },
      },
    };
    const { translations, costJpy } = await translateCandidates(
      fakeClient as never,
      [scored("1", "en")],
      { model: "claude-haiku-4-5-20251001" },
    );
    expect(translations.size).toBe(0);
    expect(costJpy).toBe(0);
  });
});
