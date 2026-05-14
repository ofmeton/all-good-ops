import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveAdminActor } from "@/lib/supabase-auth";
import { listProperties, createProperty, updateProperty, archiveProperty } from "@/lib/db/properties";
import { AuthorizationError } from "@/lib/db/scope";

const createSchema = z.object({
  owner_id: z.string().uuid(),
  name: z.string().min(1),
  address: z.string().optional(),
  access_info_note: z.string().optional(),
});
const updateSchema = z.object({ id: z.string().uuid() }).and(createSchema.partial());

export async function GET() {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await listProperties(actor));
  } catch (e) {
    if (e instanceof AuthorizationError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }
}

export async function POST(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json(await createProperty(actor, parsed.data));
}

export async function PATCH(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { id, ...patch } = parsed.data;
  await updateProperty(actor, id, patch);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await archiveProperty(actor, id);
  return NextResponse.json({ ok: true });
}
