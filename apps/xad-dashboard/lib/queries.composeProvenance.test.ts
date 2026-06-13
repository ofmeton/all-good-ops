import { describe, test, expect, afterEach } from "vitest";
import { composeProvenance } from "./queries";
import { __setSupabaseForTest } from "./supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

// from(table) ごとに返す行を差し替えできる最小 fake。
function fakeSb(data: Record<string, unknown>) {
  const sb = {
    from(table: string) {
      const builder = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        single: () => Promise.resolve({ data: (data[table] as { single?: unknown })?.single ?? null, error: null }),
        then: (resolve: (v: { data: unknown; error: null }) => unknown) =>
          resolve({ data: (data[table] as { list?: unknown })?.list ?? [], error: null }),
      };
      return builder;
    },
  } as unknown as SupabaseClient;
  return sb;
}

describe("composeProvenance", () => {
  afterEach(() => __setSupabaseForTest(null));

  test("draft→core_idea→materials を辿り各素材の collector_session を返す", async () => {
    __setSupabaseForTest(
      fakeSb({
        post_drafts: { single: { id: "d1", core_idea_id: "c1", writer_session_id: "ws1" } },
        core_ideas: { single: { id: "c1", source_material_ids: ["m1", "m2"] } },
        materials_store: {
          list: [
            { id: "m1", source_ref: "https://x.com/a", meta: { collector_session_id: "cs1" } },
            { id: "m2", source_ref: "https://x.com/b", meta: { collector_session_id: "cs2" } },
          ],
        },
      }),
    );
    const out = await composeProvenance("d1");
    expect(out.writerSessionId).toBe("ws1");
    expect(out.materials).toEqual([
      { id: "m1", sourceRef: "https://x.com/a", collectorSessionId: "cs1" },
      { id: "m2", sourceRef: "https://x.com/b", collectorSessionId: "cs2" },
    ]);
  });
});
