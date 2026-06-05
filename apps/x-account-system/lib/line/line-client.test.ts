/**
 * line-client.test.ts
 *
 * Tests: pushLineMessages
 *   - POST {to, messages} to LINE push API
 *   - returns parsed LINE response (sentMessages[].id)
 *   - throws on >5 messages
 *   - throws on non-ok response
 */

import { pushLineMessages } from "./line-client.ts";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("pushLineMessages", () => {
  test("POSTs {to, messages} and returns parsed response", async () => {
    const fakeFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sentMessages: [{ id: "m1" }, { id: "m2" }] }),
    } as unknown as Response);
    globalThis.fetch = fakeFetch as unknown as typeof fetch;

    const messages = [
      { type: "text", text: "本文" },
      { type: "flex", altText: "alt", contents: { type: "bubble" } },
    ];
    const resp = await pushLineMessages("U_to", messages, "tok");

    expect(fakeFetch).toHaveBeenCalledTimes(1);
    const [url, init] = fakeFetch.mock.calls[0];
    expect(url).toBe("https://api.line.me/v2/bot/message/push");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    const body = JSON.parse(init.body as string);
    expect(body.to).toBe("U_to");
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].text).toBe("本文");

    expect(resp.sentMessages).toEqual([{ id: "m1" }, { id: "m2" }]);
  });

  test("throws when messages exceeds 5", async () => {
    const fakeFetch = jest.fn();
    globalThis.fetch = fakeFetch as unknown as typeof fetch;
    const six = Array.from({ length: 6 }, () => ({ type: "text", text: "x" }));
    await expect(pushLineMessages("U", six, "tok")).rejects.toThrow(/exceeds 5/);
    expect(fakeFetch).not.toHaveBeenCalled();
  });

  test("throws on non-ok response", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "bad request",
    } as unknown as Response) as unknown as typeof fetch;
    await expect(
      pushLineMessages("U", [{ type: "text", text: "x" }], "tok"),
    ).rejects.toThrow(/LINE push failed: 400/);
  });

  test("returns {} when response body is not JSON", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error("not json");
      },
    } as unknown as Response) as unknown as typeof fetch;
    const resp = await pushLineMessages("U", [{ type: "text", text: "x" }], "tok");
    expect(resp).toEqual({});
  });
});
