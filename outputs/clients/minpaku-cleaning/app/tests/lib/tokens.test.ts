import { describe, it, expect } from "vitest";
import { generateToken } from "@/lib/tokens";

describe("generateToken", () => {
  it("URLセーフな文字だけを含む", () => {
    const token = generateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("常に43文字（32バイトの base64url は決定論的に43文字）", () => {
    expect(generateToken().length).toBe(43);
  });

  it("呼ぶたびに異なる値を返す", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateToken()));
    expect(tokens.size).toBe(100);
  });
});
