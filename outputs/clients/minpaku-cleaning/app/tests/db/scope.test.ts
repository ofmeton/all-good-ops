import { describe, it, expect } from "vitest";
import { assertAdmin } from "@/lib/db/scope";
import type { Actor } from "@/lib/auth";

const admin: Actor = { role: "admin", adminId: "a1", roleLevel: 1 };
const staff: Actor = { role: "staff", staffId: "s1" };

describe("assertAdmin", () => {
  it("管理者ならそのまま通す", () => {
    expect(() => assertAdmin(admin)).not.toThrow();
  });
  it("管理者以外は例外を投げる", () => {
    expect(() => assertAdmin(staff)).toThrow("管理者権限が必要です");
  });
});
