import { describe, it, expect, vi } from "vitest";
import { serverErrorResponse } from "@/lib/api-error";

describe("serverErrorResponse", () => {
  it("DB エラー詳細を漏らさず 500 と汎用メッセージを返す", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = serverErrorResponse(
      new Error('relation "secret_internal_table" does not exist'),
      "cron/remind",
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain("secret_internal_table");
    expect(body.error).toBe("内部エラーが発生しました");
    // 詳細はサーバログには残す
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
