import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveAdminActor } from "@/lib/supabase-auth";
import { AuthorizationError } from "@/lib/db/scope";
import {
  cancelReservationManually,
  listReservations,
  setReservationGuestCount,
} from "@/lib/db/reservations";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const listSchema = z.object({
  propertyId: z.string().uuid().optional(),
  from: dateStr.optional(),
  to: dateStr.optional(),
});
const patchSchema = z.object({
  id: z.string().uuid(),
  guest_count: z.number().int().positive(),
});

export async function GET(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const params = Object.fromEntries(new URL(req.url).searchParams.entries());
  const parsed = listSchema.safeParse({
    propertyId: params.propertyId || undefined,
    from: params.from || undefined,
    to: params.to || undefined,
  });
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json(await listReservations(actor, parsed.data));
  } catch (e) {
    if (e instanceof AuthorizationError)
      return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }
}

export async function PATCH(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    await setReservationGuestCount(actor, parsed.data.id, parsed.data.guest_count);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthorizationError)
      return NextResponse.json({ error: e.message }, { status: 403 });
    if (e instanceof Error)
      return NextResponse.json({ error: e.message }, { status: 400 });
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
    return NextResponse.json(await cancelReservationManually(actor, id));
  } catch (e) {
    if (e instanceof AuthorizationError)
      return NextResponse.json({ error: e.message }, { status: 403 });
    if (e instanceof Error)
      return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
