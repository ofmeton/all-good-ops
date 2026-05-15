import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveActorByToken } from "@/lib/auth";
import {
  claimRequest,
  startRequest,
  RequestAlreadyClaimedError,
} from "@/lib/db/requests";
import { submitReport } from "@/lib/db/reports";
import { InvalidTransitionError } from "@/lib/status-machine";

// PATCH: ステータス操作（claim / start）
const patchSchema = z.object({
  token: z.string().min(1),
  action: z.enum(["claim", "start"]),
});

// POST: 完了報告の提出
const reportSchema = z.object({
  token: z.string().min(1),
  checklistResult: z.array(
    z.object({
      label: z.string(),
      checked: z.boolean(),
      note: z.string().optional(),
    }),
  ),
  photoPaths: z.array(z.string()).default([]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const actor = await resolveActorByToken(parsed.data.token);
  if (!actor || actor.role !== "staff")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    if (parsed.data.action === "claim") {
      await claimRequest(actor, id);
    } else {
      await startRequest(actor, id);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    // 早い者勝ち負け・状態機械違反は 409（競合）
    if (
      e instanceof RequestAlreadyClaimedError ||
      e instanceof InvalidTransitionError
    )
      return NextResponse.json({ error: e.message }, { status: 409 });
    if (e instanceof Error)
      return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = reportSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const actor = await resolveActorByToken(parsed.data.token);
  if (!actor || actor.role !== "staff")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const report = await submitReport(
      actor,
      id,
      parsed.data.checklistResult,
      parsed.data.photoPaths,
    );
    return NextResponse.json(report);
  } catch (e) {
    if (e instanceof InvalidTransitionError)
      return NextResponse.json({ error: e.message }, { status: 409 });
    if (e instanceof Error)
      return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
