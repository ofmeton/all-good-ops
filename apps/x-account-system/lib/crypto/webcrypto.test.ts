import { verifyLineSignature, pkceChallenge, base64url } from "./webcrypto.ts";
test("verifyLineSignature: 既知 body+secret で一致", async () => {
  const secret = "testsecret";
  const body = '{"events":[]}';
  const sig = "7/zjpxmsANrs8ptIk/KkFoHlDrLSXUZV+eHj+1N7Rdg=";
  expect(await verifyLineSignature(body, sig, secret)).toBe(true);
  expect(await verifyLineSignature(body, "wrong", secret)).toBe(false);
});
test("pkceChallenge: S256 が base64url", async () => {
  const c = await pkceChallenge("verifier123");
  expect(c).toMatch(/^[A-Za-z0-9_-]+$/);
});
