import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveAdminActor } from "@/lib/supabase-auth";
import {
  assignRequest,
  confirmRequest,
  cancelRequest,
} from "@/lib/db/requests";
import { AuthorizationError } from "@/lib/db/scope";
import { InvalidTransitionError } from "@/lib/status-machine";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("assign"), staffId: z.string().uuid() }),
  z.object({ action: z.literal("confirm") }),
  z.object({ action: z.literal("cancel") }),
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = actionSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    if (parsed.data.action === "assign") {
      await assignRequest(actor, id, parsed.data.staffId);
    } else if (parsed.data.action === "confirm") {
      await confirmRequest(actor, id);
    } else {
      await cancelRequest(actor, id);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthorizationError)
      return NextResponse.json({ error: e.message }, { status: 403 });
    // 状態機械違反・割当不可は 409（競合）として返す
    if (e instanceof InvalidTransitionError)
      return NextResponse.json({ error: e.message }, { status: 409 });
    if (e instanceof Error)
      return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
