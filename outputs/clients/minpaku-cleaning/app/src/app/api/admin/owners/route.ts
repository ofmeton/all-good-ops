import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveAdminActor } from "@/lib/supabase-auth";
import {
  OwnerDeleteBlockedError,
  listOwners,
  createOwner,
  updateOwner,
  deleteOwner,
} from "@/lib/db/owners";
import { AuthorizationError } from "@/lib/db/scope";

const createSchema = z.object({
  name: z.string().min(1),
  line_user_id: z.string().optional(),
  email: z.string().email().optional(),
});
const updateSchema = z.object({ id: z.string().uuid() }).and(createSchema.partial());

export async function GET() {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await listOwners(actor));
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
  try {
    return NextResponse.json(await createOwner(actor, parsed.data));
  } catch (e) {
    if (e instanceof AuthorizationError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }
}

export async function PATCH(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { id, ...patch } = parsed.data;
  try {
    await updateOwner(actor, id, patch);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthorizationError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }
}

export async function DELETE(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !z.string().uuid().safeParse(id).success)
    return NextResponse.json({ error: "id が不正です" }, { status: 400 });
  try {
    await deleteOwner(actor, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof OwnerDeleteBlockedError) {
      return NextResponse.json(
        {
          error:
            "この物件オーナーは物件に紐づいているため削除できません。先に物件のオーナーを変更してください",
        },
        { status: 409 },
      );
    }
    if (e instanceof AuthorizationError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }
}
