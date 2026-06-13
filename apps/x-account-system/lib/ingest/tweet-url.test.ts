import { parseTweetIds } from "./tweet-url.ts";

describe("parseTweetIds", () => {
  test("extracts id from x.com status URL", () => {
    expect(parseTweetIds("https://x.com/alice/status/1234567890123456789")).toEqual(["1234567890123456789"]);
  });

  test("extracts id from twitter.com status URL", () => {
    expect(parseTweetIds("https://twitter.com/alice/status/2234567890123456789")).toEqual(["2234567890123456789"]);
  });

  test("tolerates query strings and mobile/www hosts", () => {
    expect(parseTweetIds("https://mobile.twitter.com/alice/status/3234567890123456789?s=20")).toEqual(["3234567890123456789"]);
    expect(parseTweetIds("https://www.x.com/alice/status/4234567890123456789/")).toEqual(["4234567890123456789"]);
  });

  test("accepts bare numeric ids", () => {
    expect(parseTweetIds("5234567890123456789")).toEqual(["5234567890123456789"]);
  });

  test("drops junk entries", () => {
    expect(parseTweetIds(["not-a-url", "https://example.com/alice/status/1", "https://x.com/alice"])).toEqual([]);
  });

  test("dedups preserving order across newline/space/comma input", () => {
    expect(parseTweetIds("https://x.com/a/status/111111\n222222,111111 https://twitter.com/b/status/333333")).toEqual([
      "111111",
      "222222",
      "333333",
    ]);
  });
});
