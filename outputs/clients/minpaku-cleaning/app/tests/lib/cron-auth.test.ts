import { describe, it, expect, afterEach, vi } from "vitest";
import { isCronAuthenticated } from "@/lib/cron-auth";
import type { NextRequest } from "next/server";

function req(auth?: string): NextRequest {
  return {
    headers: {
      get: (k: string) =>
        k.toLowerCase() === "authorization" ? auth ?? null : null,
    },
  } as unknown as NextRequest;
}

afterEach(() => vi.unstubAllEnvs());

describe("isCronAuthenticated（タイミング安全比較）", () => {
  it("正しい Bearer トークンを許可する", () => {
    vi.stubEnv("CRON_SECRET", "s3cr3t-value");
    expect(isCronAuthenticated(req("Bearer s3cr3t-value"))).toBe(true);
  });

  it("誤ったトークンを拒否する", () => {
    vi.stubEnv("CRON_SECRET", "s3cr3t-value");
    expect(isCronAuthenticated(req("Bearer wrong-value-x"))).toBe(false);
  });

  it("長さが異なるトークンでも例外を投げず false を返す", () => {
    // timingSafeEqual は長さ不一致で throw するため、実装が長さガードを持つか検証
    vi.stubEnv("CRON_SECRET", "s3cr3t-value");
    expect(() => isCronAuthenticated(req("Bearer x"))).not.toThrow();
    expect(isCronAuthenticated(req("Bearer x"))).toBe(false);
  });

  it("CRON_SECRET 未設定なら false", () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(isCronAuthenticated(req("Bearer anything"))).toBe(false);
  });

  it("Authorization ヘッダ無しは false", () => {
    vi.stubEnv("CRON_SECRET", "s3cr3t-value");
    expect(isCronAuthenticated(req(undefined))).toBe(false);
  });
});
