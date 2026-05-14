import { describe, it, expect } from "vitest";
import {
  canTransition,
  assertTransition,
  InvalidTransitionError,
} from "@/lib/status-machine";

describe("canTransition", () => {
  it("正規フローの遷移を許可する", () => {
    expect(canTransition("unassigned", "assigned")).toBe(true);
    expect(canTransition("assigned", "in_progress")).toBe(true);
    expect(canTransition("in_progress", "reported")).toBe(true);
    expect(canTransition("reported", "confirmed")).toBe(true);
  });

  it("キャンセル遷移を許可する（confirmed/cancelled 以外から）", () => {
    expect(canTransition("unassigned", "cancelled")).toBe(true);
    expect(canTransition("assigned", "cancelled")).toBe(true);
    expect(canTransition("in_progress", "cancelled")).toBe(true);
  });

  it("assigned から unassigned への割当解除を許可する", () => {
    expect(canTransition("assigned", "unassigned")).toBe(true);
  });

  it("不正な遷移を拒否する", () => {
    expect(canTransition("unassigned", "in_progress")).toBe(false);
    expect(canTransition("reported", "in_progress")).toBe(false);
    expect(canTransition("confirmed", "cancelled")).toBe(false);
    expect(canTransition("cancelled", "assigned")).toBe(false);
    expect(canTransition("confirmed", "reported")).toBe(false);
  });
});

describe("assertTransition", () => {
  it("許可された遷移では例外を投げない", () => {
    expect(() => assertTransition("in_progress", "reported")).not.toThrow();
  });

  it("不正な遷移で InvalidTransitionError を投げる", () => {
    expect(() => assertTransition("unassigned", "confirmed")).toThrow(
      InvalidTransitionError,
    );
    expect(() => assertTransition("unassigned", "confirmed")).toThrow(
      "unassigned から confirmed へは遷移できません",
    );
  });
});
