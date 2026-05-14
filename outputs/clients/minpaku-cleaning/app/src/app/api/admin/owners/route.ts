import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveAdminActor } from "@/lib/supabase-auth";
import { listOwners, createOwner, updateOwner } from "@/lib/db/owners";

const createSchema = z.object({
  name: z.string().min(1),
  line_user_id: z.string().optional(),
  email: z.string().email().optional(),
});
const updateSchema = z.object({ id: z.string().uuid() }).and(createSchema.partial());

export async function GET() {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await listOwners(actor));
}

export async function POST(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json(await createOwner(actor, parsed.data));
}

export async function PATCH(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { id, ...patch } = parsed.data;
  await updateOwner(actor, id, patch);
  return NextResponse.json({ ok: true });
}
