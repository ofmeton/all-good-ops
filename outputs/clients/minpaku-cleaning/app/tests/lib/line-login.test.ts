import { describe, it, expect } from "vitest";
import {
  extractLineUserIdFromIdToken,
  LineIdTokenError,
  parseLineTokenResponse,
} from "@/lib/line-login";

function b64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function token(payload: unknown): string {
  return `${b64url({ alg: "none" })}.${b64url(payload)}.sig`;
}

describe("LINE Login id_token claim 検証", () => {
  it("正常 payload から userId を抽出する", () => {
    const idToken = token({
      iss: "https://access.line.me",
      sub: "U123",
      aud: "channel-1",
      exp: 2000,
    });

    expect(extractLineUserIdFromIdToken(idToken, "channel-1", 1000)).toBe("U123");
  });

  it("aud が違う場合は拒否する", () => {
    const idToken = token({
      iss: "https://access.line.me",
      sub: "U123",
      aud: "other-channel",
      exp: 2000,
    });

    expect(() => extractLineUserIdFromIdToken(idToken, "channel-1", 1000)).toThrow(
      LineIdTokenError,
    );
  });

  it("exp 切れは拒否する", () => {
    const idToken = token({
      iss: "https://access.line.me",
      sub: "U123",
      aud: "channel-1",
      exp: 999,
    });

    expect(() => extractLineUserIdFromIdToken(idToken, "channel-1", 1000)).toThrow(
      LineIdTokenError,
    );
  });

  it("iss 不正は拒否する", () => {
    const idToken = token({
      iss: "https://evil.example",
      sub: "U123",
      aud: "channel-1",
      exp: 2000,
    });

    expect(() => extractLineUserIdFromIdToken(idToken, "channel-1", 1000)).toThrow(
      LineIdTokenError,
    );
  });

  it("token response に id_token がなければ拒否する", () => {
    expect(() => parseLineTokenResponse({ access_token: "x" })).toThrow(LineIdTokenError);
  });
});
