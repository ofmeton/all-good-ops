/**
 * x-publisher-db-gate.test.ts
 *
 * Tests for publisher DB gate: publishToX must block when
 * safety_state.publishing_enabled=false (assertPublishingEnabled throws).
 *
 * NOTE: IN_MEMORY_FALLBACK must NOT be set — we test the real assertPublishingEnabled path.
 * We mock kill-switch.ts so we control what assertPublishingEnabled returns.
 */

// ---- mock kill-switch before any import ----
const mockAssertPublishingEnabled = jest.fn();
jest.mock("../safety/kill-switch.ts", () => ({
  assertPublishingEnabled: mockAssertPublishingEnabled,
  getKillSwitchState: jest.fn().mockResolvedValue({ publishing_enabled: true }),
}));

// ---- set env ----
beforeAll(() => {
  delete process.env.IN_MEMORY_FALLBACK;
  delete process.env.X_PUBLISHER_KILL_SWITCH;
  delete process.env.X_PUBLISHER_BROWNOUT;
});

afterAll(() => {
  delete process.env.X_PUBLISHER_KILL_SWITCH;
});

// ---- imports AFTER mocks ----
import {
  publishToX,
  __setKillSwitchOverride,
  __setBrownoutOverride,
  __setFetchImpl,
  __setDirectApiEnabled,
} from "./x-publisher.ts";
import { __setTokenOverride } from "./token-store.ts";
import type { PublishRequest } from "./types.ts";
import type { EditorOutput } from "../editor/types.ts";

const APPROVED_EDITOR: EditorOutput = {
  draftId: "gate-test",
  decision: "approved",
  rejectReasons: [],
  rules: [],
  riskLevel: "low",
  riskReasons: [],
  businessLawRiskFlag: false,
  businessLawKeywords: [],
  totalDurationMs: 0,
  llmCostUsd: 0,
};

const BASE_REQ: PublishRequest = {
  draftId: "gate-test",
  body: "テスト本文",
  fmat: "short",
  dryRun: false,
  editorOutput: APPROVED_EDITOR,
};

// Stub fetch so we don't actually call X API in non-blocked cases
const stubFetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 201,
  json: async () => ({ data: { id: "tweet-123", text: "ok" } }),
  text: async () => '{"data":{"id":"tweet-123","text":"ok"}}',
}) as unknown as typeof fetch;

beforeEach(() => {
  mockAssertPublishingEnabled.mockReset();
  __setKillSwitchOverride(null);
  __setBrownoutOverride(null);
  __setTokenOverride(null);
  __setFetchImpl(null);
  // この test は DB gate 通過後の posting 経路を検証するため直投を有効化。
  __setDirectApiEnabled(true);
  delete process.env.X_PUBLISHER_KILL_SWITCH;
  delete process.env.X_PUBLISHER_BROWNOUT;
});

afterAll(() => {
  __setKillSwitchOverride(null);
  __setBrownoutOverride(null);
  __setTokenOverride(null);
  __setFetchImpl(null);
  __setDirectApiEnabled(null);
});

// ============================================================
// DB gate tests
// ============================================================
describe("publishToX → DB gate (assertPublishingEnabled)", () => {
  test("blocks with kill_switch when assertPublishingEnabled throws", async () => {
    mockAssertPublishingEnabled.mockRejectedValue(
      new Error("[kill-switch] publishing disabled until manual_resume (by !stop)"),
    );
    __setFetchImpl(stubFetch);

    const result = await publishToX(BASE_REQ);

    expect(result.status).toBe("blocked");
    expect(result.blockedReason).toBe("kill_switch");
    expect(result.retryCount).toBe(0);
    // assertPublishingEnabled was called
    expect(mockAssertPublishingEnabled).toHaveBeenCalledTimes(1);
    // fetch was NOT called (blocked before actual post)
    expect(stubFetch).not.toHaveBeenCalled();
  });

  test("passes through when assertPublishingEnabled resolves (publishing enabled)", async () => {
    mockAssertPublishingEnabled.mockResolvedValue(undefined);
    __setTokenOverride({ accessToken: "test-token" });
    __setFetchImpl(stubFetch);

    const result = await publishToX(BASE_REQ);

    expect(result.status).toBe("published");
    expect(result.tweetId).toBe("tweet-123");
    expect(mockAssertPublishingEnabled).toHaveBeenCalledTimes(1);
  });

  test("直投封印時は DB gate 通過後でも blocked: direct_api_disabled (X API を叩かない)", async () => {
    mockAssertPublishingEnabled.mockResolvedValue(undefined);
    __setTokenOverride({ accessToken: "test-token" });
    (stubFetch as unknown as jest.Mock).mockClear(); // 先行 test の呼び出し履歴を消す
    __setFetchImpl(stubFetch);
    __setDirectApiEnabled(false); // 本番の既定 = 封印

    const result = await publishToX(BASE_REQ);

    expect(result.status).toBe("blocked");
    expect(result.blockedReason).toBe("direct_api_disabled");
    expect(stubFetch).not.toHaveBeenCalled();
  });

  test("env kill-switch still blocks independently (Gate 3 preserved)", async () => {
    // assertPublishingEnabled resolves, but env kill switch is on
    mockAssertPublishingEnabled.mockResolvedValue(undefined);
    __setKillSwitchOverride(true);

    const result = await publishToX(BASE_REQ);

    expect(result.status).toBe("blocked");
    expect(result.blockedReason).toBe("kill_switch");
  });

  test("editor-rejected blocks before DB gate is reached", async () => {
    mockAssertPublishingEnabled.mockResolvedValue(undefined);

    const result = await publishToX({
      ...BASE_REQ,
      editorOutput: { ...APPROVED_EDITOR, decision: "rejected" },
    });

    expect(result.status).toBe("blocked");
    expect(result.blockedReason).toBe("editor_rejected");
    // DB gate not reached for editor_rejected
    expect(mockAssertPublishingEnabled).not.toHaveBeenCalled();
  });
});
