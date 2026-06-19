import { createHmac } from "node:crypto";
import { describe, it, expect, afterEach } from "vitest";
import { POST } from "@/app/api/line/webhook/route";
import type { NextRequest } from "next/server";

const originalSecret = process.env.LINE_CHANNEL_SECRET;
const originalToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

function restoreEnv(key: "LINE_CHANNEL_SECRET" | "LINE_CHANNEL_ACCESS_TOKEN", value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}

function signature(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64");
}

function req(body: string, sig: string): NextRequest {
  return {
    text: async () => body,
    headers: new Headers({ "x-line-signature": sig }),
  } as unknown as NextRequest;
}

afterEach(() => {
  restoreEnv("LINE_CHANNEL_SECRET", originalSecret);
  restoreEnv("LINE_CHANNEL_ACCESS_TOKEN", originalToken);
});

describe("POST /api/line/webhook", () => {
  it("正しい署名なら 200 を返す", async () => {
    const secret = "webhook-secret";
    const body = JSON.stringify({ events: [] });
    process.env.LINE_CHANNEL_SECRET = secret;
    process.env.LINE_CHANNEL_ACCESS_TOKEN = "";

    const res = await POST(req(body, signature(body, secret)));

    expect(res.status).toBe(200);
  });

  it("改竄された body と署名の組み合わせは 401", async () => {
    const secret = "webhook-secret";
    const body = JSON.stringify({ events: [] });
    process.env.LINE_CHANNEL_SECRET = secret;
    process.env.LINE_CHANNEL_ACCESS_TOKEN = "";

    const res = await POST(
      req(JSON.stringify({ events: [{ type: "follow" }] }), signature(body, secret)),
    );

    expect(res.status).toBe(401);
  });
});
