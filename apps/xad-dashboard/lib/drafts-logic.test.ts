import { describe, test, expect } from "vitest";
import {
  ACTION_TO_STATUS,
  validateBody,
  canApprove,
  BODY_MAX_LEN,
} from "./drafts-logic";

describe("drafts-logic", () => {
  test("ACTION_TO_STATUS map", () => {
    expect(ACTION_TO_STATUS.approve).toBe("approved");
    expect(ACTION_TO_STATUS.reject).toBe("rejected");
  });

  describe("validateBody", () => {
    test("trims and accepts normal body", () => {
      const r = validateBody("  こんにちは  ");
      expect(r).toEqual({ ok: true, value: "こんにちは" });
    });

    test("rejects empty / whitespace-only", () => {
      expect(validateBody("").ok).toBe(false);
      expect(validateBody("   \n  ").ok).toBe(false);
    });

    test("rejects non-string", () => {
      expect(validateBody(undefined).ok).toBe(false);
      expect(validateBody(123).ok).toBe(false);
    });

    test("accepts exactly BODY_MAX_LEN, rejects over", () => {
      expect(validateBody("a".repeat(BODY_MAX_LEN)).ok).toBe(true);
      expect(validateBody("a".repeat(BODY_MAX_LEN + 1)).ok).toBe(false);
    });
  });

  describe("canApprove", () => {
    test("pending + unpublished + unscheduled → true", () => {
      expect(
        canApprove({ human_approval_status: "pending", published_at: null, scheduled_for: null }),
      ).toBe(true);
    });

    test("already approved → false", () => {
      expect(
        canApprove({ human_approval_status: "approved", published_at: null, scheduled_for: null }),
      ).toBe(false);
    });

    test("published → false", () => {
      expect(
        canApprove({
          human_approval_status: "pending",
          published_at: "2026-06-08T00:00:00Z",
          scheduled_for: null,
        }),
      ).toBe(false);
    });

    test("scheduled → false", () => {
      expect(
        canApprove({
          human_approval_status: "pending",
          published_at: null,
          scheduled_for: "2026-06-09T00:00:00Z",
        }),
      ).toBe(false);
    });
  });
});
