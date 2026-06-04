import { redactForTrace } from "./redact-io.js";

test("文字列内の email を redact する", () => {
  const out = redactForTrace({ body: "連絡は a@b.com まで" }) as { body: string };
  expect(out.body).not.toContain("a@b.com");
});
test("ネストした構造も再帰 redact する", () => {
  const out = redactForTrace({ x: { y: "tel 090-1234-5678" } }) as { x: { y: string } };
  expect(out.x.y).not.toContain("090-1234-5678");
});
test("プリミティブ非文字列はそのまま", () => {
  expect(redactForTrace(42)).toBe(42);
});
