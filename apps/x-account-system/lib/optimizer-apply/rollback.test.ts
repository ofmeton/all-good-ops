import { rollbackProposal } from "./rollback.ts";

describe("rollbackProposal", () => {
  it("meta.rollback_handle.snapshot_id で復元し markRolledBack する", async () => {
    const calls: string[] = [];
    const r = await rollbackProposal("p1", {
      getRollbackHandle: async () => ({ snapshot_id: "snap_9" }),
      rollbackToSnapshot: async (id: string) => { calls.push(`rollback:${id}`); },
      markRolledBack: async (id: string) => { calls.push(`mark:${id}`); },
    });
    expect(r.ok).toBe(true);
    expect(calls).toEqual(["rollback:snap_9", "mark:p1"]);
  });

  it("handle が無ければ ok:false（rollback しない）", async () => {
    const r = await rollbackProposal("p1", {
      getRollbackHandle: async () => null,
      rollbackToSnapshot: async () => { throw new Error("must not call"); },
      markRolledBack: async () => { throw new Error("must not call"); },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/no rollback_handle/);
  });
});
