import { z } from "zod";

import {
  approvalHook,
  approvalTokenForRun,
  type ApprovalDecision,
} from "../../../workflows/daily-publish";
import { recordApprovalDecision } from "../../../lib/publishers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const payloadSchema = z.object({
  runId: z.string().min(1),
  approved: z.boolean(),
  edits: z
    .object({
      title: z.string().optional(),
      body: z.string().optional(),
      snsTweet: z.string().optional(),
    })
    .optional(),
  decidedBy: z.string().optional(),
});

export async function POST(req: Request): Promise<Response> {
  const raw = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ ok: false, error: parsed.error.format() }, { status: 400 });
  }
  const { runId, approved, edits, decidedBy } = parsed.data;

  try {
    await recordApprovalDecision({
      runId,
      approved,
      edits: edits ?? null,
      ...(decidedBy ? { decidedBy } : {}),
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: `approval persist failed: ${String(err)}` },
      { status: 500 },
    );
  }

  const decision: ApprovalDecision = {
    approved,
    ...(edits ? { edits } : {}),
    ...(decidedBy ? { decidedBy } : {}),
  };

  try {
    await approvalHook.resume(approvalTokenForRun(runId), decision);
  } catch (err) {
    return Response.json(
      { ok: false, error: `hook resume failed: ${String(err)}` },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, runId, approved });
}
