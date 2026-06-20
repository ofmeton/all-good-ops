export type LineIdTokenClaims = {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
};

export class LineIdTokenError extends Error {}

function base64UrlDecode(segment: string): string {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  return Buffer.from(padded, "base64").toString("utf8");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function decodeLineIdTokenPayload(idToken: string): unknown {
  const segments = idToken.split(".");
  if (segments.length !== 3 || !segments[1]) {
    throw new LineIdTokenError("LINE ID token の形式が不正です");
  }
  try {
    return JSON.parse(base64UrlDecode(segments[1]));
  } catch {
    throw new LineIdTokenError("LINE ID token の payload を解析できません");
  }
}

export function extractLineUserIdFromIdToken(
  idToken: string,
  channelId: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): string {
  const payload = decodeLineIdTokenPayload(idToken);
  if (!isRecord(payload)) {
    throw new LineIdTokenError("LINE ID token の payload が不正です");
  }

  const iss = payload.iss;
  const sub = payload.sub;
  const aud = payload.aud;
  const exp = payload.exp;

  if (iss !== "https://access.line.me") {
    throw new LineIdTokenError("LINE ID token の発行者が不正です");
  }
  const audienceOk =
    aud === channelId ||
    (Array.isArray(aud) && aud.every((v) => typeof v === "string") && aud.includes(channelId));
  if (!audienceOk) {
    throw new LineIdTokenError("LINE ID token の audience が不正です");
  }
  if (typeof exp !== "number" || !Number.isFinite(exp) || exp <= nowSeconds) {
    throw new LineIdTokenError("LINE ID token の有効期限が切れています");
  }
  if (typeof sub !== "string" || sub.length === 0) {
    throw new LineIdTokenError("LINE userId を取得できません");
  }
  return sub;
}

export type LineTokenResponse = {
  id_token: string;
};

export function parseLineTokenResponse(body: unknown): LineTokenResponse {
  if (!isRecord(body) || typeof body.id_token !== "string" || body.id_token.length === 0) {
    throw new LineIdTokenError("LINE token response に id_token がありません");
  }
  return { id_token: body.id_token };
}
