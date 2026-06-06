import { describe, it, expect } from "vitest";
import { validateLoginInput } from "@/lib/login-validation";

describe("validateLoginInput", () => {
  it("正常な入力は null（エラーなし）", () => {
    expect(validateLoginInput("a@example.com", "password1")).toBeNull();
  });

  it("不正なメール形式はエラー", () => {
    expect(validateLoginInput("not-an-email", "password1")).toBeTruthy();
  });

  it("空パスワードはエラー", () => {
    expect(validateLoginInput("a@example.com", "")).toBeTruthy();
  });

  it("過大な入力（DoS 防止）はエラー", () => {
    expect(validateLoginInput("a@example.com", "x".repeat(2000))).toBeTruthy();
    expect(validateLoginInput("x".repeat(2000) + "@e.com", "pw")).toBeTruthy();
  });
});
