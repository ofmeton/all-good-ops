import { runComposeStub } from "./compose-stub.ts";

function sbWith(rows: Array<{ id: string }>) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: async () => ({ data: rows, error: null }),
        }),
      }),
    }),
  };
}

describe("compose-stub", () => {
  test("queued 素材IDと件数を返す", async () => {
    const out = await runComposeStub(sbWith([{ id: "a" }, { id: "b" }]) as never);
    expect(out.count).toBe(2);
    expect(out.materialIds).toEqual(["a", "b"]);
  });

  test("0件でも ok（空配列）", async () => {
    const out = await runComposeStub(sbWith([]) as never);
    expect(out.count).toBe(0);
    expect(out.materialIds).toEqual([]);
  });
});
