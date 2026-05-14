import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveAdminActor } from "@/lib/supabase-auth";
import { listStaff, createStaff, updateStaff, archiveStaff, StaffArchiveBlockedError } from "@/lib/db/staff";

const baseSchema = z.object({
  name: z.string().min(1),
  line_user_id: z.string().optional(),
  email: z.string().email().optional(),
  property_ids: z.array(z.string().uuid()).default([]),
});
const updateSchema = z
  .object({ id: z.string().uuid() })
  .and(baseSchema.partial())
  .and(z.object({ property_ids: z.array(z.string().uuid()).default([]) }));

export async function GET() {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await listStaff(actor));
}

export async function POST(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = baseSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { property_ids, ...input } = parsed.data;
  return NextResponse.json(await createStaff(actor, input, property_ids));
}

export async function PATCH(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { id, property_ids, ...patch } = parsed.data;
  await updateStaff(actor, id, patch, property_ids);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    await archiveStaff(actor, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof StaffArchiveBlockedError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    throw e;
  }
}
