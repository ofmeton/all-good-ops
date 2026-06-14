import {
  generateImages,
  imageCostUsdPerImage,
  mapToOpenAIImageSize,
  OPENAI_IMAGES_ENDPOINT,
} from "./codex-image.ts";

const OLD_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...OLD_ENV };
});

describe("codex-image live path", () => {
  test("fetch mock 経由で endpoint/model/size mapping/b64/cost を検証する", async () => {
    process.env.IN_MEMORY_FALLBACK = "false";
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_IMAGE_MODEL = "gpt-image-2";

    const calls: Array<{ url: string; body: Record<string, unknown>; auth?: string }> = [];
    const mockFetch = jest.fn(async (input: string | URL, init?: RequestInit) => {
      calls.push({
        url: typeof input === "string" ? input : input.toString(),
        body: JSON.parse(String(init?.body)),
        auth: (init?.headers as Record<string, string>)?.authorization,
      });
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: [{ b64_json: "aW1hZ2UtYnl0ZXM=" }] }),
      } as unknown as Response;
    });

    const res = await generateImages(
      {
        prompt: "prompt A",
        size: "1080x1350",
        count: 1,
        brand: "はぐりん",
      },
      { fetch: mockFetch as unknown as typeof fetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      url: OPENAI_IMAGES_ENDPOINT,
      auth: "Bearer test-key",
      body: {
        model: "gpt-image-2",
        prompt: "prompt A",
        size: "1024x1536",
        quality: "low",
        output_format: "png",
        n: 1,
      },
    });
    expect(res.images).toEqual([{ b64: "aW1hZ2UtYnl0ZXM=", promptUsed: "prompt A" }]);
    expect(res.costUsd).toBe(imageCostUsdPerImage("low"));
  });

  test("stub fallback は URL を返し OpenAI を呼ばない", async () => {
    process.env.IN_MEMORY_FALLBACK = "true";
    process.env.OPENAI_API_KEY = "test-key";
    const mockFetch = jest.fn();

    const res = await generateImages(
      {
        prompt: "stub prompt",
        size: "1024x1024",
        count: 1,
        brand: "はぐりん",
      },
      { fetch: mockFetch as unknown as typeof fetch },
    );

    expect(mockFetch).not.toHaveBeenCalled();
    expect(res).toEqual({
      images: [{ url: "https://stub.images/はぐりん-1024x1024-0.png", promptUsed: "stub prompt" }],
      costUsd: 0,
    });
  });
});

describe("mapToOpenAIImageSize", () => {
  test("既存媒体サイズを GPT image API size に寄せる", () => {
    expect(mapToOpenAIImageSize("1080x1080")).toBe("1024x1024");
    expect(mapToOpenAIImageSize("1080x1350")).toBe("1024x1536");
    expect(mapToOpenAIImageSize("1536x1024")).toBe("1536x1024");
  });
});
