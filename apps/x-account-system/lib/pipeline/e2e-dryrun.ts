#!/usr/bin/env tsx
/**
 * E2E dry-run pipeline: CoreIdea → Writer → Editor → Publisher (dry-run)
 *
 * Phase 0.5 smoke test。実 API 呼ばずに 3 component が連動するかを確認する。
 *
 * Usage:
 *   IN_MEMORY_FALLBACK=true tsx lib/pipeline/e2e-dryrun.ts
 *   IN_MEMORY_FALLBACK=true tsx lib/pipeline/e2e-dryrun.ts --idea-id sample-01
 */
import { draftForX } from "../writer/writer-x.ts";
import { runEditor } from "../editor/pipeline.ts";
import { publishToX } from "../publisher/x-publisher.ts";
import type { CoreIdea } from "../writer/types.ts";
import type { EditorInput } from "../editor/types.ts";

/** Sample CoreIdea (Phase 0.5 fixture) */
const SAMPLE_IDEAS: Record<string, CoreIdea> = {
  "sample-01": {
    id: "sample-01",
    topic: "請求書発行ワークフローの仕組み化",
    primaryHook: "first_hand",
    fmat: "short",
    contentType: "first_hand",
    audience: "経理担当者の方",
    sourceMaterialIds: ["mat-fh-001"],
  },
  "sample-02": {
    id: "sample-02",
    topic: "Claude で日次レポートを自動生成する手順",
    primaryHook: "tips_enum",
    fmat: "medium",
    contentType: "industry_sop",
    audience: "中小事業者の経営者",
    sourceMaterialIds: ["mat-sop-002"],
  },
};

export type E2EResult = {
  ideaId: string;
  writer: { draftId: string; body: string; llmCostUsd: number };
  editor: { decision: string; riskLevel: string; rejectReasons: string[] };
  publisher: { status: string; blockedReason?: string };
  totalDurationMs: number;
  ok: boolean;
};

/**
 * Run the full pipeline once for a given CoreIdea.
 */
export async function runE2eDryRun(idea: CoreIdea): Promise<E2EResult> {
  const startedAt = Date.now();

  // 1. Writer
  const draft = await draftForX(idea);

  // 2. Editor
  const editorInput: EditorInput = {
    traceId: `e2e-${idea.id}-${Date.now()}`,
    draftId: draft.draftId,
    coreIdeaId: idea.id,
    platform: "x",
    body: draft.body,
    fmat: idea.fmat === "carousel" ? "short" : idea.fmat,
    sourceMaterialIds: idea.sourceMaterialIds,
    hasAffiliateLink: false,
  };
  const editorOut = await runEditor(editorInput);

  // 3. Publisher (always dry-run for Phase 0.5 smoke test)
  const pubResult = await publishToX({
    draftId: draft.draftId,
    body: draft.body,
    fmat: idea.fmat === "carousel" ? "short" : idea.fmat,
    editorOutput: editorOut,
    dryRun: true,
  });

  return {
    ideaId: idea.id,
    writer: {
      draftId: draft.draftId,
      body: draft.body,
      llmCostUsd: draft.llmCostUsd,
    },
    editor: {
      decision: editorOut.decision,
      riskLevel: editorOut.riskLevel,
      rejectReasons: editorOut.rejectReasons,
    },
    publisher: {
      status: pubResult.status,
      blockedReason: pubResult.blockedReason,
    },
    totalDurationMs: Date.now() - startedAt,
    ok:
      pubResult.status === "dry_run" ||
      pubResult.status === "published" ||
      pubResult.blockedReason === "editor_rejected",
  };
}

/** CLI entry */
async function main() {
  const ideaIdArg = process.argv
    .find((a) => a.startsWith("--idea-id="))
    ?.split("=")[1];
  const ideaId =
    ideaIdArg ??
    process.argv[process.argv.indexOf("--idea-id") + 1] ??
    "sample-01";
  const idea = SAMPLE_IDEAS[ideaId];
  if (!idea) {
    console.error(
      `Unknown --idea-id=${ideaId}. Available: ${Object.keys(SAMPLE_IDEAS).join(", ")}`,
    );
    process.exit(1);
  }
  process.env.IN_MEMORY_FALLBACK = "true";
  const result = await runE2eDryRun(idea);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

// __main__ check (tsx ESM 環境では import.meta.url 比較が必要だが、Phase 0.5 では process.argv で判定)
const isCli = process.argv[1]?.endsWith("e2e-dryrun.ts");
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(2);
  });
}
