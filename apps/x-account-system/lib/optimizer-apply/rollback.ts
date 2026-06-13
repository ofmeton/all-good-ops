export type RollbackDeps = {
  getRollbackHandle: (id: string) => Promise<{ snapshot_id?: string } | null>;
  rollbackToSnapshot: (snapshotId: string) => Promise<unknown>;
  markRolledBack: (id: string) => Promise<void>;
};

/** meta.rollback_handle の snapshot で optimizer_state を復元し、proposal を rollback=true に。 */
export async function rollbackProposal(
  proposalId: string,
  deps: RollbackDeps,
): Promise<{ ok: boolean; reason?: string }> {
  const handle = await deps.getRollbackHandle(proposalId);
  if (!handle?.snapshot_id) return { ok: false, reason: "no rollback_handle" };
  await deps.rollbackToSnapshot(handle.snapshot_id);
  await deps.markRolledBack(proposalId);
  return { ok: true };
}
