/**
 * Stage 4-B2 apply-code runner CLI。
 * 使い方: npm run apply-code [-- --dry-run] [-- --cap N] [-- --id <uuid>] [-- --rollback <uuid>]
 * 前提: main repo の apps/x-account-system/.env.local に prod creds。claude / gh / wrangler / ant ログイン済み。
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync, symlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { runCodeApply, runCodeRollback } from "../lib/optimizer-apply-code/run-code-apply.ts";
import { buildImplementerPrompt, buildFixerPrompt, buildReviewerPrompt } from "../lib/optimizer-apply-code/prompts.ts";
import { needsMaBootstrap, needsWranglerDeploy } from "../lib/optimizer-apply-code/allowlist.ts";
import { classifyTier } from "../lib/optimizer-apply/validation.ts";
import { pushLine } from "../lib/line/line-client.ts";
import type { CodeApplyDeps, CodeRollbackDeps, ProposalRow, Workspace } from "../lib/optimizer-apply-code/types.ts";

const MAIN_REPO = "/Users/rikukudo/Projects/private-agents/all-good-ops";
const APP_DIR = "apps/x-account-system";
const WORKER_URL = process.env.XAD_WORKER_URL ?? "https://ofmeton-x-account.off-me-ton.workers.dev";
const LOCK = path.join(tmpdir(), "optimizer-apply-code.lock");
const CLAUDE_MODEL = "claude-opus-4-8";

for (const l of readFileSync(path.join(MAIN_REPO, APP_DIR, ".env.local"), "utf8").split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
delete process.env.IN_MEMORY_FALLBACK;

function sh(cmd: string, args: string[], o: { cwd?: string; env?: Record<string, string>; timeoutMs?: number } = {}) {
  const r = spawnSync(cmd, args, {
    cwd: o.cwd, encoding: "utf8", timeout: o.timeoutMs ?? 600_000,
    env: { ...process.env, ...o.env }, maxBuffer: 64 * 1024 * 1024,
  });
  return { ok: r.status === 0, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}
function mustSh(cmd: string, args: string[], o?: Parameters<typeof sh>[2]): string {
  const r = sh(cmd, args, o);
  if (!r.ok) throw new Error(`${cmd} ${args.join(" ")} failed:\n${r.out.slice(-1500)}`);
  return r.out;
}

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "xad" } });
const COLS = "id, proposal_type, scope, hypothesis, evidence, rank, accepted, implemented, reviewer_reason, meta";

const IMPLEMENT_TOOLS = "Read,Edit,Write,Grep,Glob,Bash(npm test:*),Bash(npx jest:*),Bash(npx tsc:*),Bash(git add:*),Bash(git commit:*),Bash(git diff:*),Bash(git status:*)";
const REVIEW_TOOLS = "Read,Grep,Glob,Bash(git diff:*)";
function runClaude(cwd: string, prompt: string, allowedTools: string) {
  // headless 実行では permission-mode を明示しないとプランモードで起動し、承認待ち→即キャンセル→
  // 編集ゼロになる。worktree 隔離 + allowedTools 限定なので bypassPermissions で自動実行させる。
  const r = sh("claude", ["-p", prompt, "--model", CLAUDE_MODEL, "--permission-mode", "bypassPermissions", "--allowedTools", allowedTools],
    { cwd, timeoutMs: 1_200_000, env: { ALLOW_BRANCH_CONFLICT: "1" } });
  return { ok: r.ok, log: r.out };
}

function defaultCodeApplyDeps(): CodeApplyDeps {
  return {
    async enqueueWorkerApply() {
      const res = await fetch(`${WORKER_URL}/admin/enqueue?job=optimizer-apply`, {
        headers: { authorization: `Bearer ${process.env.OAUTH_ADMIN_SECRET}` },
      });
      if (!res.ok) throw new Error(`enqueue ${res.status}`);
    },
    async preflight() {
      const branch = mustSh("git", ["-C", MAIN_REPO, "rev-parse", "--abbrev-ref", "HEAD"]).trim();
      const dirty = sh("git", ["-C", MAIN_REPO, "status", "--porcelain"]).out.trim();
      if (branch !== "main" || dirty !== "") {
        throw new Error(`MAIN_REPO は main・クリーン必須 (branch=${branch}, dirty=${dirty ? "yes" : "no"})`);
      }
    },
    async loadTargets(cap) {
      const { data, error } = await sb.from("optimizer_proposal").select(COLS)
        .eq("accepted", true).or("implemented.is.null,implemented.eq.false")
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return ((data ?? []) as ProposalRow[]).filter((r) => {
        const st = (r.meta as { apply_status?: string } | null)?.apply_status;
        if (st != null && st !== "skipped_manual") return false;
        const tier = classifyTier(r);
        return tier === "config" || tier === "prompt";
      }).slice(0, cap);
    },
    async createWorkspace(id) {
      const slug = id.slice(0, 8);
      const branch = `task/auto-apply-${slug}`;
      const dir = path.join(tmpdir(), `auto-apply-${slug}`);
      mustSh("git", ["-C", MAIN_REPO, "fetch", "origin", "main"]);
      if (existsSync(dir)) sh("git", ["-C", MAIN_REPO, "worktree", "remove", "--force", dir]);
      sh("git", ["-C", MAIN_REPO, "branch", "-D", branch]);
      mustSh("git", ["-C", MAIN_REPO, "worktree", "add", dir, "-b", branch, "origin/main"]);
      symlinkSync(path.join(MAIN_REPO, APP_DIR, "node_modules"), path.join(dir, APP_DIR, "node_modules"), "dir");
      return { dir, branch };
    },
    async runImplementer(ws, p) { return runClaude(ws.dir, buildImplementerPrompt(p), IMPLEMENT_TOOLS); },
    async runFixer(ws, p, reasons) { return runClaude(ws.dir, buildFixerPrompt(p, reasons), IMPLEMENT_TOOLS); },
    async renderArtifacts(ws) {
      mustSh("npm", ["run", "ma:render"], { cwd: path.join(ws.dir, APP_DIR) });
      sh("git", ["-C", ws.dir, "add", `${APP_DIR}/agents`]);
      sh("git", ["-C", ws.dir, "commit", "-m", "chore(ma): render artifacts"]);
    },
    async collectDiff(ws) {
      const files = mustSh("git", ["-C", ws.dir, "diff", "--name-only", "origin/main...HEAD"])
        .split("\n").map((s) => s.trim()).filter(Boolean);
      const diffText = mustSh("git", ["-C", ws.dir, "diff", "origin/main...HEAD"]);
      return { files, diffText };
    },
    async runChecks(ws) {
      const app = path.join(ws.dir, APP_DIR);
      const jest = sh("npx", ["jest", "--silent"], { cwd: app, env: { IN_MEMORY_FALLBACK: "true" }, timeoutMs: 900_000 });
      if (!jest.ok) return { ok: false, output: `jest:\n${jest.out.slice(-1500)}` };
      const tsc = sh("npx", ["tsc", "-p", "src/tsconfig.json", "--noEmit"], { cwd: app });
      if (!tsc.ok) return { ok: false, output: `tsc:\n${tsc.out.slice(-1500)}` };
      return { ok: true, output: "jest+tsc green" };
    },
    async runReviewer(ws, p, diff) {
      const r = runClaude(ws.dir, buildReviewerPrompt(p, diff.diffText), REVIEW_TOOLS);
      try {
        const m = r.log.match(/\{[^{}]*"verdict"[^{}]*\}/s);
        const j = JSON.parse(m ? m[0] : "");
        if (j.verdict === "APPROVE" || j.verdict === "REJECT") {
          return { verdict: j.verdict, reasons: Array.isArray(j.reasons) ? j.reasons.map(String) : [] };
        }
      } catch { /* fail-closed へ */ }
      return { verdict: "REJECT", reasons: ["reviewer 出力を JSON 解釈できない（fail-closed）"] };
    },
    async pushAndCreatePr(ws, pr, draft) {
      mustSh("git", ["-C", ws.dir, "push", "-u", "origin", ws.branch]);
      const args = ["pr", "create", "--title", pr.title, "--body", pr.body, "--base", "main", "--head", ws.branch];
      if (draft) args.push("--draft");
      const out = mustSh("gh", args, { cwd: ws.dir });
      return { prUrl: out.trim().split("\n").pop()!.trim() };
    },
    async mergePr(prUrl) {
      mustSh("gh", ["pr", "merge", prUrl, "--squash"], { cwd: MAIN_REPO });
      const view = JSON.parse(mustSh("gh", ["pr", "view", prUrl, "--json", "mergeCommit"], { cwd: MAIN_REPO }));
      return { sha: view.mergeCommit.oid as string };
    },
    async deploy(files) {
      const app = path.join(MAIN_REPO, APP_DIR);
      mustSh("git", ["-C", MAIN_REPO, "pull", "origin", "main"]);
      const deployed: ("ma-bootstrap" | "wrangler")[] = [];
      let maVersions: Record<string, string> | undefined;
      if (needsMaBootstrap(files)) {
        mustSh("npm", ["run", "ma:bootstrap"], { cwd: app, timeoutMs: 300_000 });
        const { data } = await sb.from("ma_agents").select("agent_key, version");
        maVersions = Object.fromEntries(((data ?? []) as { agent_key: string; version: string }[]).map((r) => [r.agent_key, r.version]));
        deployed.push("ma-bootstrap");
      }
      if (needsWranglerDeploy(files)) {
        mustSh("npm", ["ci"], { cwd: app, timeoutMs: 600_000 });
        mustSh("npm", ["run", "worker:deploy"], { cwd: app, timeoutMs: 300_000 });
        deployed.push("wrangler");
      }
      return { deployed, maVersions };
    },
    async cleanupWorkspace(ws, keepBranch) {
      sh("git", ["-C", MAIN_REPO, "worktree", "remove", "--force", ws.dir]);
      if (!keepBranch) sh("git", ["-C", MAIN_REPO, "branch", "-D", ws.branch]);
      sh("git", ["-C", MAIN_REPO, "worktree", "prune"]);
    },
    async markApplied(id, metaPatch) {
      const { data: cur } = await sb.from("optimizer_proposal").select("meta").eq("id", id).single();
      const meta = { ...((cur?.meta as Record<string, unknown>) ?? {}), ...metaPatch };
      const { error } = await sb.from("optimizer_proposal")
        .update({ implemented: true, implemented_at: new Date().toISOString(), meta }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    async markStatus(id, applyStatus, note) {
      const { data: cur } = await sb.from("optimizer_proposal").select("meta").eq("id", id).single();
      const meta = { ...((cur?.meta as Record<string, unknown>) ?? {}), apply_status: applyStatus, apply_note: note };
      const { error } = await sb.from("optimizer_proposal").update({ meta }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    async notify(msg) {
      console.log(`[notify] ${msg}`);
      const token = process.env.LINE_CHANNEL_ACCESS_TOKEN, user = process.env.LINE_USER_ID_OFMETON;
      if (token && user) await pushLine(user, msg, token).catch((e) => console.warn("LINE failed:", String(e)));
    },
  };
}

(async () => {
  const args = process.argv.slice(2);
  const flag = (n: string) => args.includes(n);
  const opt = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };

  if (existsSync(LOCK)) { console.error(`多重起動防止 lock が存在: ${LOCK}（異常終了の残骸なら手動削除）`); process.exit(2); }
  writeFileSync(LOCK, String(process.pid));
  try {
    const deps = defaultCodeApplyDeps();
    const rbId = opt("--rollback");
    if (rbId) {
      const rbDeps: CodeRollbackDeps = {
        createWorkspace: deps.createWorkspace, collectDiff: deps.collectDiff, runChecks: deps.runChecks,
        pushAndCreatePr: deps.pushAndCreatePr, mergePr: deps.mergePr, deploy: deps.deploy,
        cleanupWorkspace: deps.cleanupWorkspace, renderArtifacts: deps.renderArtifacts, notify: deps.notify,
        preflight: deps.preflight,
        async getRollbackHandle(id) {
          const { data } = await sb.from("optimizer_proposal").select("meta").eq("id", id).single();
          return ((data?.meta as { rollback_handle?: never } | null)?.rollback_handle ?? null);
        },
        async revertCommit(ws: Workspace, sha: string) { mustSh("git", ["-C", ws.dir, "revert", "--no-edit", sha]); },
        async markRolledBack(id) {
          const { error } = await sb.from("optimizer_proposal")
            .update({ rollback: true, rollback_at: new Date().toISOString() }).eq("id", id);
          if (error) throw new Error(error.message);
        },
      };
      const r = await runCodeRollback(rbId, rbDeps);
      console.log(JSON.stringify(r));
      process.exitCode = r.ok ? 0 : 1;
      return;
    }
    const result = await runCodeApply(deps, {
      dryRun: flag("--dry-run"),
      cap: opt("--cap") ? Number(opt("--cap")) : 3,
      onlyId: opt("--id"),
    });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.errors > 0 ? 1 : 0;
  } finally {
    unlinkSync(LOCK);
  }
})();
