import { validateProposalSafe } from "../optimizer-apply/validation.ts";
import { checkDiffAllowed, hasDeathGuardTokens, needsMaBootstrap } from "./allowlist.ts";
import type {
  CodeApplyDeps, CodeApplyOptions, CodeApplyResult, CodeRollbackDeps,
  DiffInfo, ProposalRow, ReviewResult, Workspace,
} from "./types.ts";

type Detail = CodeApplyResult["details"][number];

async function runGates(
  ws: Workspace, deps: CodeApplyDeps,
): Promise<{ ok: boolean; failures: string[]; diff: DiffInfo }> {
  let diff = await deps.collectDiff(ws);
  if (needsMaBootstrap(diff.files)) {
    await deps.renderArtifacts(ws);
    diff = await deps.collectDiff(ws);
  }
  const failures: string[] = [];
  const allow = checkDiffAllowed(diff.files);
  if (!allow.ok) failures.push(`allowlist違反: ${allow.violations.join(", ")}`);
  if (hasDeathGuardTokens(diff.diffText)) failures.push("死守トークンが変更行に含まれる");
  if (failures.length === 0) {
    const checks = await deps.runChecks(ws);
    if (!checks.ok) failures.push(`tests/tsc 失敗: ${checks.output.slice(-400)}`);
  }
  return { ok: failures.length === 0, failures, diff };
}

function prTitle(p: ProposalRow): string {
  return `auto-apply(${p.id.slice(0, 8)}): ${p.scope}`;
}
function prBody(p: ProposalRow): string {
  return `optimizer 提案の自動適用（Stage 4-B2）。\n\n- proposal: ${p.id}\n- type: ${p.proposal_type} / rank: ${p.rank ?? "-"}\n- hypothesis: ${p.hypothesis}\n\n🤖 apply-code runner`;
}

async function applyOne(p: ProposalRow, deps: CodeApplyDeps, opts: CodeApplyOptions): Promise<Detail> {
  const safe = validateProposalSafe(p);
  if (!safe.ok) {
    await deps.markStatus(p.id, "blocked", safe.reason);
    return { id: p.id, outcome: "blocked", note: safe.reason };
  }
  const ws = await deps.createWorkspace(p.id);
  try {
    const impl = await deps.runImplementer(ws, p);
    if (!impl.ok) throw new Error(`implementer 失敗: ${impl.log.slice(-400)}`);

    let gate = await runGates(ws, deps);
    let review: ReviewResult | null = gate.ok ? await deps.runReviewer(ws, p, gate.diff) : null;

    if (!gate.ok || review?.verdict !== "APPROVE") {
      const reasons = gate.ok ? (review?.reasons ?? ["review REJECT"]) : gate.failures;
      const fix = await deps.runFixer(ws, p, reasons);
      if (fix.ok) {
        gate = await runGates(ws, deps);
        review = gate.ok ? await deps.runReviewer(ws, p, gate.diff) : null;
      }
    }

    if (!gate.ok || review?.verdict !== "APPROVE") {
      const note = (gate.ok ? (review?.reasons ?? []) : gate.failures).join("; ").slice(0, 500);
      const { prUrl } = await deps.pushAndCreatePr(ws, { title: prTitle(p), body: prBody(p) }, true);
      await deps.markStatus(p.id, "pr_pending", `自動ゲート不合格（人間レビュー要）: ${note}`);
      await deps.cleanupWorkspace(ws, true);
      return { id: p.id, outcome: "pr_pending", prUrl, note };
    }

    if (opts.dryRun) {
      await deps.cleanupWorkspace(ws, false);
      return { id: p.id, outcome: "dry_run_ok" };
    }

    const { prUrl } = await deps.pushAndCreatePr(ws, { title: prTitle(p), body: prBody(p) }, false);
    const { sha } = await deps.mergePr(prUrl);

    let deployNote: string | undefined;
    let deployed: Awaited<ReturnType<CodeApplyDeps["deploy"]>> = { deployed: [] };
    try {
      deployed = await deps.deploy(gate.diff.files);
    } catch (e) {
      deployNote = `deploy失敗・要手動: ${String(e)}`;
      await deps.notify(`🚨 apply-code: merge 済みだが deploy 失敗 (${p.id.slice(0, 8)})。手動で ma:bootstrap / worker:deploy を実行してください: ${String(e)}`);
    }

    await deps.markApplied(p.id, {
      apply_status: "applied_code",
      pr_url: prUrl,
      changed_files: gate.diff.files,
      rollback_handle: {
        git_sha: sha, pr_url: prUrl,
        deployed: deployed.deployed, ma_versions: deployed.maVersions ?? null,
      },
      ...(deployNote ? { deploy_note: deployNote } : {}),
    });
    await deps.cleanupWorkspace(ws, false);
    return { id: p.id, outcome: "applied_code", prUrl, note: deployNote };
  } catch (e) {
    await deps.cleanupWorkspace(ws, false).catch(() => {});
    throw e;
  }
}

/** accepted な config/prompt 提案を直列処理。fail-open（1件の失敗で他を止めない）。 */
export async function runCodeApply(deps: CodeApplyDeps, opts: CodeApplyOptions = {}): Promise<CodeApplyResult> {
  const cap = opts.cap ?? 3;
  await deps.enqueueWorkerApply().catch(() => {});
  let targets = await deps.loadTargets(cap);
  if (opts.onlyId) targets = targets.filter((p) => p.id === opts.onlyId);

  const result: CodeApplyResult = { processed: 0, applied: 0, prPending: 0, blocked: 0, errors: 0, details: [] };
  for (const p of targets) {
    result.processed++;
    let d: Detail;
    try {
      d = await applyOne(p, deps, opts);
    } catch (e) {
      d = { id: p.id, outcome: "error", note: String(e).slice(0, 500) };
      await deps.markStatus(p.id, "error", d.note!).catch(() => {});
    }
    result.details.push(d);
    if (d.outcome === "applied_code" || d.outcome === "dry_run_ok") result.applied++;
    else if (d.outcome === "pr_pending") result.prPending++;
    else if (d.outcome === "blocked") result.blocked++;
    else result.errors++;
  }
  await deps.notify(
    `🧬 apply-code${opts.dryRun ? "(dry-run)" : ""}: applied=${result.applied} pr_pending=${result.prPending} blocked=${result.blocked} errors=${result.errors}` +
    result.details.map((d) => `\n- ${d.id.slice(0, 8)}: ${d.outcome}${d.prUrl ? ` ${d.prUrl}` : ""}`).join(""),
  );
  return result;
}

/** applied_code 提案の可逆復元: git revert → 同レール merge → 再 deploy → rollback=true。 */
export async function runCodeRollback(
  proposalId: string, deps: CodeRollbackDeps,
): Promise<{ ok: boolean; reason?: string }> {
  const handle = await deps.getRollbackHandle(proposalId);
  if (!handle?.git_sha) return { ok: false, reason: "no rollback_handle.git_sha" };
  const ws = await deps.createWorkspace(`rb-${proposalId.slice(0, 8)}`);
  try {
    await deps.revertCommit(ws, handle.git_sha);
    let diff = await deps.collectDiff(ws);
    if (needsMaBootstrap(diff.files)) {
      await deps.renderArtifacts(ws);
      diff = await deps.collectDiff(ws);
    }
    const checks = await deps.runChecks(ws);
    if (!checks.ok) {
      await deps.cleanupWorkspace(ws, true);
      return { ok: false, reason: `revert 後の tests 失敗（人間対応要）: ${checks.output.slice(-300)}` };
    }
    const { prUrl } = await deps.pushAndCreatePr(ws, {
      title: `auto-apply rollback(${proposalId.slice(0, 8)})`,
      body: `revert of ${handle.git_sha}\n\n🤖 apply-code runner`,
    }, false);
    await deps.mergePr(prUrl);
    await deps.deploy(diff.files).catch(async (e) => {
      await deps.notify(`🚨 apply-code rollback: merge 済みだが deploy 失敗。手動対応要: ${String(e)}`);
    });
    await deps.markRolledBack(proposalId);
    await deps.cleanupWorkspace(ws, false);
    await deps.notify(`↩️ apply-code rollback 完了 (${proposalId.slice(0, 8)}) ${prUrl}`);
    return { ok: true };
  } catch (e) {
    await deps.cleanupWorkspace(ws, false).catch(() => {});
    return { ok: false, reason: String(e) };
  }
}
