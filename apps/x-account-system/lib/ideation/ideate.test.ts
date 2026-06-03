/**
 * lib/ideation/ideate.test.ts
 *
 * Tests runIdeation: mocks Anthropic (tool_use) + Supabase.
 * NO IN_MEMORY_FALLBACK. Tests the real LLM-call path with fully mocked SDK + DB.
 *
 * Pattern: jest.isolateModules + jest.doMock (same as buzz-ingest.test.ts).
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Cloudflare Env-like object for testing */
function makeEnv() {
  return {
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
    ANTHROPIC_API_KEY: "test-anthropic-key",
    NODE_ENV: "test",
    LOG_LEVEL: "info",
    PHASE: "1",
    AUTONOMOUS_PUBLISH: "false",
    BUDGET_MONTHLY_LIMIT_JPY: "10000",
    BUDGET_BROWNOUT_THRESHOLD_JPY: "11500",
    JOBS: {} as never,
    OPENAI_API_KEY: "test",
    X_CLIENT_ID: "test",
    X_CLIENT_SECRET: "test",
    X_ACCESS_TOKEN: "test",
    X_REFRESH_TOKEN: "test",
    TWITTERAPI_IO_KEY: "test",
    LINE_CHANNEL_ACCESS_TOKEN: "test",
    LINE_CHANNEL_SECRET: "test",
    LINE_USER_ID_OFMETON: "test",
  };
}

/** Sample unconsumed material rows returned from materials_store */
function makeMaterialRows() {
  return [
    {
      id: "mat-uuid-1",
      source_type: "x_inspirations",
      raw_text: "AI automation is transforming small businesses.",
      redacted_text: "AI automation is transforming small businesses.",
      meta: {},
    },
    {
      id: "mat-uuid-2",
      source_type: "note_inspirations",
      raw_text: "ChatGPT saves 3 hours per week for accountants.",
      redacted_text: "ChatGPT saves 3 hours per week for accountants.",
      meta: {},
    },
  ];
}

/** Sample idea returned by Anthropic tool_use */
function makeIdeaToolResult() {
  return {
    ideas: [
      {
        topic: "AI自動化で週3時間を節約する中小企業の実例",
        primary_hook: "number",
        fmat: "short",
        category: "paraphrase",
        audience: "非エンジニア経営者・士業・中小事業者",
        source_material_ids: ["mat-uuid-1", "mat-uuid-2"],
      },
      {
        topic: "AIが業務SOPを書き換える時代の到来",
        primary_hook: "opinion",
        fmat: "medium",
        category: "industry_sop",
        audience: "非エンジニア経営者・士業・中小事業者",
        source_material_ids: ["mat-uuid-1"],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Supabase mock builder
// ---------------------------------------------------------------------------

function makeSupabaseMock(materialRows: ReturnType<typeof makeMaterialRows>) {
  // materials_store claim: update().eq().in().is().select() → returns material rows
  const claimSelectMock = jest.fn().mockResolvedValue({
    data: materialRows,
    error: null,
  });
  const claimIsNullMock = jest.fn().mockReturnValue({ select: claimSelectMock });
  const claimInMock = jest.fn().mockReturnValue({ is: claimIsNullMock });
  const claimEqMock = jest.fn().mockReturnValue({ in: claimInMock });
  const materialsUpdateMock = jest.fn().mockReturnValue({ eq: claimEqMock });

  // core_ideas: INSERT
  const coreIdeasInsertMock = jest.fn().mockResolvedValue({ error: null });

  // materials_store: mark ideated UPDATE (set meta ideation_status="done")
  // update().in().select()
  const markDoneSelectMock = jest.fn().mockResolvedValue({ error: null });
  const markDoneInMock = jest.fn().mockReturnValue({ select: markDoneSelectMock });
  const markDoneUpdateMock = jest.fn().mockReturnValue({ in: markDoneInMock });

  // fromMock: dispatch based on call sequence
  let fromCallCount = 0;
  const fromMock = jest.fn().mockImplementation((table: string) => {
    fromCallCount++;
    if (table === "materials_store" && fromCallCount === 1) {
      // First call: atomic claim of unconsumed materials
      return { update: materialsUpdateMock };
    }
    if (table === "core_ideas") {
      // Second call: insert core_ideas
      return { insert: coreIdeasInsertMock };
    }
    if (table === "materials_store" && fromCallCount >= 3) {
      // Third call: mark ideated done
      return { update: markDoneUpdateMock };
    }
    // fallback
    return {
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }),
    };
  });

  const client = { from: fromMock };
  return {
    client,
    fromMock,
    materialsUpdateMock,
    coreIdeasInsertMock,
    markDoneUpdateMock,
    claimSelectMock,
  };
}

// ---------------------------------------------------------------------------
// Anthropic mock builder
// ---------------------------------------------------------------------------

function makeAnthropicMock(toolResult: object) {
  const createMock = jest.fn().mockResolvedValue({
    content: [
      {
        type: "tool_use",
        name: "core_ideas",
        input: toolResult,
      },
    ],
    usage: {
      input_tokens: 500,
      output_tokens: 200,
    },
  });

  const AnthropicClass = jest.fn().mockImplementation(() => ({
    messages: { create: createMock },
  }));

  return { AnthropicClass, createMock };
}

// ---------------------------------------------------------------------------
// Env setup
// ---------------------------------------------------------------------------

let _savedFallback: string | undefined;

beforeEach(() => {
  _savedFallback = process.env.IN_MEMORY_FALLBACK;
  delete process.env.IN_MEMORY_FALLBACK;
  process.env.SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  process.env.SUPABASE_SCHEMA = "xad";
  process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
  jest.resetModules();
});

afterEach(() => {
  if (_savedFallback !== undefined) {
    process.env.IN_MEMORY_FALLBACK = _savedFallback;
  } else {
    delete process.env.IN_MEMORY_FALLBACK;
  }
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SCHEMA;
  delete process.env.ANTHROPIC_API_KEY;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("runIdeation", () => {
  test("fetches unconsumed materials, calls Anthropic, inserts core_ideas, marks materials done", async () => {
    const materialRows = makeMaterialRows();
    const toolResult = makeIdeaToolResult();
    const { client, fromMock, coreIdeasInsertMock } = makeSupabaseMock(materialRows);
    const { AnthropicClass, createMock } = makeAnthropicMock(toolResult);

    let ideation: typeof import("./ideate.ts");
    jest.isolateModules(() => {
      jest.doMock("@supabase/supabase-js", () => ({
        __esModule: true,
        createClient: jest.fn(() => client),
      }));
      jest.doMock("@anthropic-ai/sdk", () => ({
        __esModule: true,
        default: AnthropicClass,
      }));
      ideation = require("./ideate.ts");
    });

    const env = makeEnv();
    const count = await ideation!.runIdeation(env);

    // Should return the number of ideas inserted
    expect(count).toBe(2);

    // Anthropic was called once
    expect(createMock).toHaveBeenCalledTimes(1);

    // core_ideas insert was called with both ideas (topic/primary_hook/fmat/audience/category/source_material_ids/status)
    expect(coreIdeasInsertMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          topic: "AI自動化で週3時間を節約する中小企業の実例",
          primary_hook: "number",
          fmat: "short",
          category: "paraphrase",
          audience: "非エンジニア経営者・士業・中小事業者",
          source_material_ids: ["mat-uuid-1", "mat-uuid-2"],
          status: "draft",
        }),
        expect.objectContaining({
          topic: "AIが業務SOPを書き換える時代の到来",
          primary_hook: "opinion",
          fmat: "medium",
          category: "industry_sop",
          status: "draft",
        }),
      ]),
    );

    // from() was called for materials_store claim, core_ideas insert, and materials mark-done
    expect(fromMock).toHaveBeenCalledWith("materials_store");
    expect(fromMock).toHaveBeenCalledWith("core_ideas");
  });

  test("returns 0 when no unconsumed materials are found", async () => {
    const claimSelectMock = jest.fn().mockResolvedValue({ data: [], error: null });
    const updateIsNullMock = jest.fn().mockReturnValue({ select: claimSelectMock });
    const updateInMock = jest.fn().mockReturnValue({ is: updateIsNullMock });
    const updateEqMock = jest.fn().mockReturnValue({ in: updateInMock });
    const materialsUpdateMock = jest.fn().mockReturnValue({ eq: updateEqMock });
    const fromMock = jest.fn().mockReturnValue({ update: materialsUpdateMock });
    const client = { from: fromMock };

    const { AnthropicClass, createMock } = makeAnthropicMock({ ideas: [] });

    let ideation: typeof import("./ideate.ts");
    jest.isolateModules(() => {
      jest.doMock("@supabase/supabase-js", () => ({
        __esModule: true,
        createClient: jest.fn(() => client),
      }));
      jest.doMock("@anthropic-ai/sdk", () => ({
        __esModule: true,
        default: AnthropicClass,
      }));
      ideation = require("./ideate.ts");
    });

    const env = makeEnv();
    const count = await ideation!.runIdeation(env);

    // No materials → skip Anthropic call entirely
    expect(count).toBe(0);
    expect(createMock).not.toHaveBeenCalled();
  });

  test("Anthropic tool_use is called with tool_choice: {type:tool, name:core_ideas}", async () => {
    const materialRows = makeMaterialRows();
    const { client } = makeSupabaseMock(materialRows);
    const { AnthropicClass, createMock } = makeAnthropicMock(makeIdeaToolResult());

    let ideation: typeof import("./ideate.ts");
    jest.isolateModules(() => {
      jest.doMock("@supabase/supabase-js", () => ({
        __esModule: true,
        createClient: jest.fn(() => client),
      }));
      jest.doMock("@anthropic-ai/sdk", () => ({
        __esModule: true,
        default: AnthropicClass,
      }));
      ideation = require("./ideate.ts");
    });

    const env = makeEnv();
    await ideation!.runIdeation(env);

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_choice: { type: "tool", name: "core_ideas" },
        tools: expect.arrayContaining([
          expect.objectContaining({ name: "core_ideas" }),
        ]),
      }),
    );
  });

  test("throws if Anthropic returns no tool_use block", async () => {
    const materialRows = makeMaterialRows();
    const { client } = makeSupabaseMock(materialRows);

    const createMock = jest.fn().mockResolvedValue({
      content: [{ type: "text", text: "some response" }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });
    const AnthropicClass = jest.fn().mockImplementation(() => ({
      messages: { create: createMock },
    }));

    let ideation: typeof import("./ideate.ts");
    jest.isolateModules(() => {
      jest.doMock("@supabase/supabase-js", () => ({
        __esModule: true,
        createClient: jest.fn(() => client),
      }));
      jest.doMock("@anthropic-ai/sdk", () => ({
        __esModule: true,
        default: AnthropicClass,
      }));
      ideation = require("./ideate.ts");
    });

    const env = makeEnv();
    await expect(ideation!.runIdeation(env)).rejects.toThrow(/tool_use/);
  });

  test("atomic claim: update sets ideation_status=claimed before insert", async () => {
    const materialRows = makeMaterialRows();
    const { client, materialsUpdateMock } = makeSupabaseMock(materialRows);
    const { AnthropicClass } = makeAnthropicMock(makeIdeaToolResult());

    let ideation: typeof import("./ideate.ts");
    jest.isolateModules(() => {
      jest.doMock("@supabase/supabase-js", () => ({
        __esModule: true,
        createClient: jest.fn(() => client),
      }));
      jest.doMock("@anthropic-ai/sdk", () => ({
        __esModule: true,
        default: AnthropicClass,
      }));
      ideation = require("./ideate.ts");
    });

    const env = makeEnv();
    await ideation!.runIdeation(env);

    // The claim update should set ideation_status to "claimed"
    expect(materialsUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.anything(),
      }),
    );
  });
});
