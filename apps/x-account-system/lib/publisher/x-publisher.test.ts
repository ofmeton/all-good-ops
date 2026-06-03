/**
 * X Publisher tests (8 fixtures)
 *
 * Gate 順序の確認 + retry / token expired / dry_run の挙動を検証。
 */
import fs from "node:fs";
import path from "node:path";

process.env.IN_MEMORY_FALLBACK = "true";

import {
  publishToX,
  __setKillSwitchOverride,
  __setBrownoutOverride,
  __setFetchImpl,
} from "./x-publisher.ts";
import {
  __setTokenOverride,
  __setRefreshImpl,
  __setSupabaseUpsertImpl,
  __setSupabaseAuthBlockedImpl,
} from "./token-store.ts";
import {
  __resetKillSwitchInMemory,
  getKillSwitchState,
} from "../safety/kill-switch.ts";
import type { PublishRequest, PublishResult } from "./types.ts";
import type { OAuthTokenState } from "./types.ts";

const FIXTURES_DIR = path.join(__dirname, "__fixtures__");

type FetchScenario = "always_500" | "always_400" | "first_500_then_201";

type Fixture = {
  name: string;
  description?: string;
  input: Omit<PublishRequest, "noBackoff"> & { noBackoff?: boolean };
  overrides?: {
    killSwitch?: boolean;
    brownout?: boolean;
    token?: { accessToken: string; expiresAt?: number };
    fetchScenario?: FetchScenario;
  };
  expected: {
    status: PublishResult["status"];
    blockedReason?: string;
    retryCount?: number;
    errorContains?: string;
  };
};

function loadFixtures(): Fixture[] {
  return fs
    .readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) =>
      JSON.parse(
        fs.readFileSync(path.join(FIXTURES_DIR, f), "utf-8"),
      ) as Fixture,
    );
}

/** fetch を Response-like で stub する */
function mockResponse(status: number, body: object): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: new Headers(),
    redirected: false,
    statusText: String(status),
    type: "basic",
    url: "",
    clone: () => this as Response,
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    bytes: async () => new Uint8Array(),
  } as unknown as Response;
}

function buildFetchStub(scenario: FetchScenario): typeof fetch {
  let callCount = 0;
  return (async () => {
    callCount++;
    if (scenario === "always_500") {
      return mockResponse(500, { errors: [{ message: "server error" }] });
    }
    if (scenario === "always_400") {
      return mockResponse(400, { errors: [{ message: "bad request" }] });
    }
    if (scenario === "first_500_then_201") {
      if (callCount === 1) {
        return mockResponse(500, { errors: [{ message: "server error" }] });
      }
      return mockResponse(201, {
        data: { id: "tweet-stub-id", text: "ok" },
      });
    }
    throw new Error(`unknown scenario: ${scenario}`);
  }) as typeof fetch;
}

describe("Publisher X (8 fixtures)", () => {
  beforeEach(() => {
    __setKillSwitchOverride(null);
    __setBrownoutOverride(null);
    __setTokenOverride(null);
    __setFetchImpl(null);
    delete process.env.X_ACCESS_TOKEN;
  });

  afterAll(() => {
    __setKillSwitchOverride(null);
    __setBrownoutOverride(null);
    __setTokenOverride(null);
    __setFetchImpl(null);
  });

  const fixtures = loadFixtures();

  test.each(fixtures.map((fx) => [fx.name, fx] as const))(
    "%s",
    async (_name, fx) => {
      if (fx.overrides?.killSwitch) __setKillSwitchOverride(true);
      if (fx.overrides?.brownout) __setBrownoutOverride(true);
      if (fx.overrides?.token) __setTokenOverride(fx.overrides.token);
      if (fx.overrides?.fetchScenario) {
        __setFetchImpl(buildFetchStub(fx.overrides.fetchScenario));
      }

      const result = await publishToX(fx.input as PublishRequest);

      expect(result.status).toBe(fx.expected.status);
      if (fx.expected.blockedReason) {
        expect(result.blockedReason).toBe(fx.expected.blockedReason);
      }
      if (fx.expected.retryCount !== undefined) {
        expect(result.retryCount).toBe(fx.expected.retryCount);
      }
      if (fx.expected.errorContains) {
        expect(result.error ?? "").toContain(fx.expected.errorContains);
      }
    },
  );

  test("retry recovers on first 500 then 201", async () => {
    __setTokenOverride({ accessToken: "test-token" });
    __setFetchImpl(buildFetchStub("first_500_then_201"));
    const result = await publishToX({
      draftId: "retry-recovery",
      body: "通常本文",
      fmat: "short",
      dryRun: false,
      noBackoff: true,
      editorOutput: {
        draftId: "retry-recovery",
        decision: "approved",
        rejectReasons: [],
        rules: [],
        riskLevel: "low",
        riskReasons: [],
        businessLawRiskFlag: false,
        businessLawKeywords: [],
        totalDurationMs: 100,
        llmCostUsd: 0,
      },
    });
    expect(result.status).toBe("published");
    expect(result.tweetId).toBe("tweet-stub-id");
    expect(result.retryCount).toBe(1);
  });

  test("4xx response fails without retry", async () => {
    __setTokenOverride({ accessToken: "test-token" });
    __setFetchImpl(buildFetchStub("always_400"));
    const result = await publishToX({
      draftId: "4xx-fail",
      body: "通常本文",
      fmat: "short",
      dryRun: false,
      noBackoff: true,
      editorOutput: {
        draftId: "4xx-fail",
        decision: "approved",
        rejectReasons: [],
        rules: [],
        riskLevel: "low",
        riskReasons: [],
        businessLawRiskFlag: false,
        businessLawKeywords: [],
        totalDurationMs: 100,
        llmCostUsd: 0,
      },
    });
    expect(result.status).toBe("failed");
    expect(result.retryCount).toBe(0);
    expect(result.error).toContain("HTTP 400");
  });

  test("high-risk approved bypasses risk gate", async () => {
    __setTokenOverride({ accessToken: "test-token" });
    __setFetchImpl(buildFetchStub("first_500_then_201"));
    const result = await publishToX({
      draftId: "high-risk-approved",
      body: "本文",
      fmat: "short",
      dryRun: true, // dry_run で実投稿なし
      highRiskApproved: true,
      editorOutput: {
        draftId: "high-risk-approved",
        decision: "approved",
        rejectReasons: [],
        rules: [],
        riskLevel: "high",
        riskReasons: ["業法独占キーワード: 税務代理"],
        businessLawRiskFlag: true,
        businessLawKeywords: ["税務代理"],
        totalDurationMs: 100,
        llmCostUsd: 0,
      },
    });
    expect(result.status).toBe("dry_run");
  });
});

// ---------------------------------------------------------------------------
// Reactive 401 recovery: refresh + retry once
// ---------------------------------------------------------------------------
function buildStatusSequenceFetch(statuses: number[]): {
  fetch: typeof fetch;
  attempts: () => number;
} {
  let callCount = 0;
  const fetchImpl = (async () => {
    const status = statuses[callCount] ?? statuses[statuses.length - 1];
    callCount++;
    if (status >= 200 && status < 300) {
      return mockResponse(status, { data: { id: "tweet-after-refresh", text: "ok" } });
    }
    return mockResponse(status, { errors: [{ message: `http ${status}` }] });
  }) as typeof fetch;
  return { fetch: fetchImpl, attempts: () => callCount };
}

const approvedEditorOutput = {
  decision: "approved" as const,
  rejectReasons: [],
  rules: [],
  riskLevel: "low" as const,
  riskReasons: [],
  businessLawRiskFlag: false,
  businessLawKeywords: [],
  totalDurationMs: 100,
  llmCostUsd: 0,
};

describe("Publisher X — reactive 401 token refresh", () => {
  beforeEach(() => {
    __setKillSwitchOverride(null);
    __setBrownoutOverride(null);
    __setTokenOverride(null);
    __setFetchImpl(null);
    __setRefreshImpl(null);
    __setSupabaseUpsertImpl(null);
    __setSupabaseAuthBlockedImpl(null);
    __resetKillSwitchInMemory();
    delete process.env.X_ACCESS_TOKEN;
  });

  afterAll(() => {
    __setTokenOverride(null);
    __setFetchImpl(null);
    __setRefreshImpl(null);
    __setSupabaseUpsertImpl(null);
    __setSupabaseAuthBlockedImpl(null);
  });

  test("first post 401 → refresh → retry → 200 success (2 post attempts + refresh between)", async () => {
    __setTokenOverride({ accessToken: "stale", refreshToken: "valid-refresh" });

    const newToken: OAuthTokenState = {
      accessToken: "fresh",
      refreshToken: "rotated-refresh",
      expiresAt: Date.now() + 7200_000,
    };
    const mockRefresh = jest.fn().mockResolvedValue(newToken);
    __setRefreshImpl(mockRefresh as typeof import("../oauth/token-exchange.ts").refreshToken);
    const upserted: OAuthTokenState[] = [];
    __setSupabaseUpsertImpl(async (t) => { upserted.push(t); });

    const seq = buildStatusSequenceFetch([401, 200]);
    __setFetchImpl(seq.fetch);

    const result = await publishToX({
      draftId: "reactive-401",
      body: "通常本文",
      fmat: "short",
      dryRun: false,
      noBackoff: true,
      editorOutput: { draftId: "reactive-401", ...approvedEditorOutput },
    });

    expect(result.status).toBe("published");
    expect(result.tweetId).toBe("tweet-after-refresh");
    // exactly 2 post attempts (401 then 200), one refresh between
    expect(seq.attempts()).toBe(2);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    // rotated refresh_token persisted
    expect(upserted).toHaveLength(1);
    expect(upserted[0].refreshToken).toBe("rotated-refresh");
  });

  test("401 → refresh fails → failed + kill-switch (no infinite retry)", async () => {
    __setTokenOverride({ accessToken: "stale", refreshToken: "expired-refresh" });

    const mockRefresh = jest
      .fn()
      .mockRejectedValue(new Error("X token endpoint error 401: refresh token expired"));
    __setRefreshImpl(mockRefresh as typeof import("../oauth/token-exchange.ts").refreshToken);
    __setSupabaseAuthBlockedImpl(async () => {});

    const seq = buildStatusSequenceFetch([401, 401]);
    __setFetchImpl(seq.fetch);

    const result = await publishToX({
      draftId: "reactive-401-fail",
      body: "通常本文",
      fmat: "short",
      dryRun: false,
      noBackoff: true,
      editorOutput: { draftId: "reactive-401-fail", ...approvedEditorOutput },
    });

    expect(result.status).toBe("failed");
    // only the FIRST post attempt happened; no retry after refresh failure (no loop)
    expect(seq.attempts()).toBe(1);
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    // kill-switch triggered by refreshAccessToken failure path
    const ks = await getKillSwitchState();
    expect(ks.publishing_enabled).toBe(false);
    expect(ks.triggered_by).toBe("oauth_blocked");
  });
});
