import { describe, test, expect } from "vitest";
import {
  THREAD_DELIM,
  THREAD_MAX_PARTS,
  TWEET_SOFT_LIMIT,
  joinThread,
  splitThread,
  validateThreadParts,
} from "./thread-logic";

describe("thread-logic", () => {
  test("THREAD_DELIM is the canonical separator", () => {
    expect(THREAD_DELIM).toBe("\n\n---\n\n");
  });

  describe("joinThread / splitThread round-trip", () => {
    test("joins parts with THREAD_DELIM", () => {
      expect(joinThread(["a", "b", "c"])).toBe(`a${THREAD_DELIM}b${THREAD_DELIM}c`);
    });

    test("splitThread reverses joinThread", () => {
      const parts = ["1本目", "2本目", "3本目"];
      expect(splitThread(joinThread(parts))).toEqual(parts);
    });

    test("single body (no delim) splits to one element", () => {
      expect(splitThread("ただの単一本文")).toEqual(["ただの単一本文"]);
    });

    test("trims each part and drops empty parts", () => {
      const body = `  first  ${THREAD_DELIM}   ${THREAD_DELIM}second`;
      expect(splitThread(body)).toEqual(["first", "second"]);
    });

    test("non-string body returns empty array", () => {
      expect(splitThread(undefined as unknown as string)).toEqual([]);
    });
  });

  describe("validateThreadParts", () => {
    test("accepts a normal thread", () => {
      const r = validateThreadParts(["フック", "本文2", "本文3"]);
      expect(r.ok).toBe(true);
      expect(r.errors).toEqual([]);
    });

    test("rejects empty array", () => {
      const r = validateThreadParts([]);
      expect(r.ok).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    });

    test("rejects empty / whitespace-only part", () => {
      const r = validateThreadParts(["ok", "  "]);
      expect(r.ok).toBe(false);
      expect(r.errors.some((e) => e.includes("2 本目"))).toBe(true);
    });

    test("rejects over THREAD_MAX_PARTS", () => {
      const parts = Array.from({ length: THREAD_MAX_PARTS + 1 }, (_, i) => `p${i}`);
      const r = validateThreadParts(parts);
      expect(r.ok).toBe(false);
      expect(r.errors.some((e) => e.includes(String(THREAD_MAX_PARTS)))).toBe(true);
    });

    test("accepts exactly THREAD_MAX_PARTS", () => {
      const parts = Array.from({ length: THREAD_MAX_PARTS }, (_, i) => `p${i}`);
      expect(validateThreadParts(parts).ok).toBe(true);
    });

    test("long tweet (> soft limit) is warn-only, stays ok", () => {
      const long = "あ".repeat(TWEET_SOFT_LIMIT + 50);
      const r = validateThreadParts([long]);
      expect(r.ok).toBe(true);
      expect(r.errors).toEqual([]);
    });
  });
});
