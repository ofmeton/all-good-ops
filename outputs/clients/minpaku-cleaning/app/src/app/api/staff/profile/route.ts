import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveActorByToken } from "@/lib/auth";
import { updateStaffSelf } from "@/lib/db/staff";
import { StaffOnlyError } from "@/lib/db/scope";

const patchSchema = z.object({
  token: z.string().min(1),
  email: z.string().email().nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const actor = await resolveActorByToken(parsed.data.token);
  if (!actor || actor.role !== "staff")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    await updateStaffSelf(actor, { email: parsed.data.email });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof StaffOnlyError)
      return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }
}
