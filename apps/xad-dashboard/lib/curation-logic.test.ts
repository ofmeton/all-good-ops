import { describe, test, expect } from "vitest";
import {
  ACTION_TO_STATUS, buildEventRows, sortMaterials, filterMaterials,
  type CurationMaterial,
} from "./curation-logic";

function mat(p: Partial<CurationMaterial>): CurationMaterial {
  return {
    id: "1", source_ref: "alice", raw_text: "hello AI", created_at: "2026-06-06T00:00:00Z",
    collected_at: "2026-06-06T00:00:00Z", selection_status: "collected",
    overall_score: 50, freshness: 40, velocity: 30, target_fit: 60,
    score_reason: "r", discovery_via: "keyword", discovery_query: "AI",
    lang: "en", tweet_url: "u", conversation_id: null, media: [], engagement: null,
    translation: null, ...p,
  };
}

describe("curation-logic", () => {
  test("action→status map", () => {
    expect(ACTION_TO_STATUS.select).toBe("selected");
    expect(ACTION_TO_STATUS.reject).toBe("rejected");
    expect(ACTION_TO_STATUS.reset).toBe("collected");
    expect(ACTION_TO_STATUS.send_to_compose).toBe("queued");
  });

  test("buildEventRows が snapshot を作る", () => {
    const m = mat({ id: "x", overall_score: 90, source_ref: "bob", discovery_via: "trend" });
    const rows = buildEventRows([m], "reject", "やりすぎ");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      material_id: "x", action: "reject", from_status: "collected", to_status: "rejected",
      source_ref: "bob", note: "やりすぎ",
    });
    expect(rows[0].scores).toEqual({ freshness: 40, velocity: 30, target_fit: 60, overall: 90 });
    expect(rows[0].discovery).toEqual({ via: "trend", query: "AI" });
  });

  test("sortMaterials: overall desc 既定 / 軸切替（単一キー後方互換）", () => {
    const a = mat({ id: "a", overall_score: 10, velocity: 99 });
    const b = mat({ id: "b", overall_score: 80, velocity: 1 });
    expect(sortMaterials([a, b], "overall_score").map((m) => m.id)).toEqual(["b", "a"]);
    expect(sortMaterials([a, b], "velocity").map((m) => m.id)).toEqual(["a", "b"]);
    // 空配列は overall_score 単独にフォールバック
    expect(sortMaterials([a, b], []).map((m) => m.id)).toEqual(["b", "a"]);
  });

  test("sortMaterials: 多軸（新着順 × 総合）同日内は総合で並ぶ", () => {
    // 同日（時刻違い）。x は時刻が最も遅いが overall は低い。
    const x = mat({ id: "x", collected_at: "2026-06-10T23:00:00Z", overall_score: 30 });
    const y = mat({ id: "y", collected_at: "2026-06-10T09:00:00Z", overall_score: 90 });
    const z = mat({ id: "z", collected_at: "2026-06-08T12:00:00Z", overall_score: 99 });
    // 単一キー collected_at は時刻で x(23時) > y(9時) > z
    expect(sortMaterials([x, y, z], "collected_at").map((m) => m.id)).toEqual(["x", "y", "z"]);
    // 新着順 × 総合: 6/10 を日単位で同値→overall で y(90)>x(30)、最後に 6/8 の z
    expect(sortMaterials([x, y, z], ["collected_at", "overall_score"]).map((m) => m.id)).toEqual([
      "y", "x", "z",
    ]);
  });

  test("sortMaterials: 多軸 第1キー同値で第2キーが効く", () => {
    const p = mat({ id: "p", overall_score: 50, velocity: 10 });
    const q = mat({ id: "q", overall_score: 50, velocity: 80 });
    const r = mat({ id: "r", overall_score: 70, velocity: 1 });
    expect(sortMaterials([p, q, r], ["overall_score", "velocity"]).map((m) => m.id)).toEqual([
      "r", "q", "p",
    ]);
  });

  test("filterMaterials: via / media / lang / source / text", () => {
    const en = mat({ id: "en", lang: "en", discovery_via: "keyword", raw_text: "claude rocks", media: [] });
    const ja = mat({ id: "ja", lang: "ja", discovery_via: "trend", raw_text: "猫", media: [{ type: "photo", url: "u" }] });
    expect(filterMaterials([en, ja], { via: "trend" }).map((m) => m.id)).toEqual(["ja"]);
    expect(filterMaterials([en, ja], { hasMedia: true }).map((m) => m.id)).toEqual(["ja"]);
    expect(filterMaterials([en, ja], { lang: "en" }).map((m) => m.id)).toEqual(["en"]);
    expect(filterMaterials([en, ja], { text: "claude" }).map((m) => m.id)).toEqual(["en"]);
    expect(filterMaterials([en, ja], { source: "alice" }).map((m) => m.id)).toEqual(["en", "ja"]);
  });
});
