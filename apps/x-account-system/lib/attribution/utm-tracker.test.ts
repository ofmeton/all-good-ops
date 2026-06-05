/**
 * UTM tracker tests (5 fixtures + roundtrip + inferSourceFromReferer).
 */

import fs from "node:fs";
import path from "node:path";

process.env.IN_MEMORY_FALLBACK = "true";
delete process.env.SUPABASE_URL;

import {
  addUtm,
  buildTrackedUrl,
  inferSourceFromReferer,
  logAttribution,
  parseUtmFromIncomingUrl,
} from "./utm-tracker.ts";
import type { UtmParams } from "./types.ts";

const FIXTURES_DIR = path.join(__dirname, "__fixtures__");

type Fixture = {
  name: string;
  description?: string;
  input: {
    url: string;
    params: UtmParams;
  };
  expected: {
    trackedUrlContains: string[];
    parseRoundtripMatches: boolean;
    parseRawNoUtmReturnsNull?: boolean;
  };
};

function loadFixtures(): Fixture[] {
  return fs
    .readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) =>
      JSON.parse(
        fs.readFileSync(path.join(FIXTURES_DIR, f), "utf-8"),
      ) as Fixture,
    );
}

describe("UTM tracker (5 fixtures)", () => {
  const fixtures = loadFixtures();

  test.each(fixtures.map((fx) => [fx.name, fx] as const))(
    "%s",
    (_name, fx) => {
      const tracked = addUtm(fx.input.url, fx.input.params);
      for (const fragment of fx.expected.trackedUrlContains) {
        expect(tracked).toContain(fragment);
      }
      if (fx.expected.parseRoundtripMatches) {
        const parsed = parseUtmFromIncomingUrl(tracked);
        expect(parsed).not.toBeNull();
        expect(parsed?.source).toBe(fx.input.params.source);
        expect(parsed?.medium).toBe(fx.input.params.medium);
        expect(parsed?.campaign).toBe(fx.input.params.campaign);
        if (fx.input.params.content) {
          expect(parsed?.content).toBe(fx.input.params.content);
        }
      }
      if (fx.expected.parseRawNoUtmReturnsNull) {
        const parsedRaw = parseUtmFromIncomingUrl(fx.input.url);
        expect(parsedRaw).toBeNull();
      }
    },
  );
});

describe("addUtm edge cases", () => {
  test("invalid URL throws", () => {
    expect(() =>
      addUtm("not-a-url", {
        source: "x",
        medium: "post",
        campaign: "test",
      }),
    ).toThrow();
  });

  test("buildTrackedUrl returns structured object", () => {
    const result = buildTrackedUrl("https://note.com/x", {
      source: "instagram",
      medium: "story",
      campaign: "month3",
    });
    expect(result.url).toContain("utm_source=instagram");
    expect(result.params.medium).toBe("story");
  });

  test("existing utm_* params are overwritten", () => {
    const url = "https://note.com/y?utm_source=stale&utm_medium=stale";
    const out = addUtm(url, {
      source: "x",
      medium: "pinned",
      campaign: "fresh",
    });
    const parsed = parseUtmFromIncomingUrl(out);
    expect(parsed?.source).toBe("x");
    expect(parsed?.medium).toBe("pinned");
  });
});

describe("parseUtmFromIncomingUrl", () => {
  test("returns null when missing utm_campaign", () => {
    const u = "https://note.com/x?utm_source=x&utm_medium=post";
    expect(parseUtmFromIncomingUrl(u)).toBeNull();
  });
  test("returns null on invalid URL", () => {
    expect(parseUtmFromIncomingUrl("not-a-url")).toBeNull();
  });
});

describe("inferSourceFromReferer", () => {
  test.each([
    ["https://x.com/ofmeton/status/1", "x"],
    ["https://twitter.com/ofmeton/status/1", "x"],
    ["https://www.instagram.com/ofmeton/", "instagram"],
    ["https://note.com/ofmeton/n/abc", "note"],
    ["https://line.me/R/ti/p/@ofmeton", "line"],
    ["https://google.com/search", "direct"],
    [null, "direct"],
    ["", "direct"],
  ])("%s → %s", (referer, expected) => {
    expect(inferSourceFromReferer(referer)).toBe(expected);
  });
});

describe("logAttribution (Phase 0.5 console.log)", () => {
  test("logs event with parsed UTM", () => {
    const url = addUtm("https://note.com/ofmeton/n/log-test", {
      source: "x",
      medium: "post",
      campaign: "test_campaign",
      content: "tweet_1",
    });
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    const ev = logAttribution({
      url,
      sourcePost: "tweet_1",
      landedAt: new Date("2026-05-27T00:00:00Z"),
    });
    expect(ev.params?.campaign).toBe("test_campaign");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
